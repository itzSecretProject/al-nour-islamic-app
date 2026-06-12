// Triggered frequently by an external cron (e.g. cron-job.org every minute) — or
// Vercel cron on Pro. Reads all device schedules from Vercel Edge Config and
// sends a web-push for any prayer that has just become due.
//
// Robust to imperfect triggers: instead of requiring an *exact* minute match,
// a prayer is "due" once its time has passed and is still within a grace window.
// Per-device dedup (`fired` list) guarantees each prayer is sent exactly once,
// even if the trigger runs late, runs twice, or skips a minute.

import webpush from 'web-push';

interface ScheduleEntry { prayer: string; ts: number; title: string; body: string; }
interface PushRecord {
  subscription: webpush.PushSubscription;
  schedule: ScheduleEntry[];
  language: string;
  showRakats: boolean;
  fired?: number[]; // entry timestamps already notified (dedup fallback)
}

const EC_ID = process.env.EC_ID;
const EC_READ_TOKEN = process.env.EC_READ_TOKEN;
const EC_WRITE_TOKEN = process.env.VERCEL_API_TOKEN;
const EC_TEAM = process.env.VERCEL_TEAM_ID;

// Primary dedup uses Supabase (atomic INSERT ON CONFLICT DO NOTHING — no
// eventual-consistency race like Edge Config writes have).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// A prayer fires once its time has passed, as long as we catch it within this
// window. When Supabase dedup is active, 12 min gives plenty of buffer for late
// triggers. Without Supabase, this also acts as a hard cap: narrower window =
// fewer duplicates if Edge Config write propagation is slow (EC eventual-
// consistency issue is the root cause of duplicate notifications).
// 12 min grace window: wide enough to catch late/skipped cron triggers.
// Storage-based dedup below guarantees each prayer fires exactly once,
// so the wide window only adds reliability — never duplicates.
const GRACE_MS = 20 * 60 * 1000;
// How long to remember a fired prayer before forgetting it (keeps records small).
const FIRED_TTL_MS = 24 * 60 * 60 * 1000;

// Atomically claim a prayer send slot using Supabase Storage as a key-value
// lock. Storage upload with x-upsert:false succeeds (200) only the FIRST time
// a given path is written; subsequent attempts return 409 Duplicate. This is
// strongly consistent — no eventual-consistency race like Edge Config writes.
async function claimPrayerSend(dedupKey: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return true;
  try {
    const safePath = dedupKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/push-dedup/${safePath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: '1',
    });
    if (res.status === 200) return true; // first upload → send
    if (res.status === 409) return false; // explicit conflict header → skip
    if (res.status === 400) {
      // Supabase Storage returns HTTP 400 (not 409) for duplicate objects,
      // with body {"statusCode":"409","error":"Duplicate",...}
      const body = await res.json().catch(() => ({}));
      if (body?.error === 'Duplicate' || body?.statusCode === '409') return false;
    }
    return true; // any other error (5xx, auth) → fail open rather than miss a prayer
  } catch {
    return true;
  }
}

async function ecReadAll(): Promise<Record<string, any>> {
  const res = await fetch(`https://edge-config.vercel.com/${EC_ID}/items?token=${EC_READ_TOKEN}`);
  if (!res.ok) return {};
  return res.json();
}

async function ecPatch(items: any[]) {
  if (items.length === 0) return;
  const url = `https://api.vercel.com/v1/edge-config/${EC_ID}/items${EC_TEAM ? `?teamId=${EC_TEAM}` : ''}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${EC_WRITE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  }).catch(() => {});
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).end(); return; }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!EC_ID || !EC_READ_TOKEN || !vapidPublic || !vapidPrivate) {
    res.status(503).json({ error: 'Missing env vars' }); return;
  }

  webpush.setVapidDetails('mailto:adamelouinissi@gmail.com', vapidPublic, vapidPrivate);

  const items = await ecReadAll();
  const subKeys = Object.keys(items).filter(k => k.startsWith('sub_'));

  // One-off delivery test: send an immediate notification to every device,
  // bypassing schedule/dedup. Used to confirm the push path end-to-end.
  if (req.query?.test === '1') {
    let ok = 0, bad = 0;
    await Promise.all(subKeys.map(async (key) => {
      const record = items[key] as PushRecord;
      if (!record?.subscription) return;
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({ title: 'Al Nour ✅', body: 'Las notificaciones funcionan correctamente.', prayer: 'Test', lang: record.language || 'es' }),
        );
        ok++;
      } catch { bad++; }
    }));
    res.status(200).json({ ok: true, test: true, devices: subKeys.length, sent: ok, failed: bad });
    return;
  }

  const now = Date.now();
  let sent = 0, errors = 0;
  const staleKeys: string[] = [];
  const updates: { operation: 'upsert'; key: string; value: PushRecord }[] = [];

  // Lightweight observability (no secrets): schedule freshness per device.
  const debug = req.query?.debug === '1';
  const diag: any[] = [];

  await Promise.all(subKeys.map(async (key) => {
    const record = items[key] as PushRecord;
    if (!record?.subscription || !Array.isArray(record.schedule)) return;

    const fired = new Set<number>(Array.isArray(record.fired) ? record.fired : []);

    if (debug) {
      const future = record.schedule.filter(e => e.ts > now).sort((a, b) => a.ts - b.ts);
      diag.push({
        device: key.slice(0, 12),
        total: record.schedule.length,
        future: future.length,
        next: future[0] ? new Date(future[0].ts).toISOString() : null,
        nextPrayer: future[0]?.prayer ?? null,
      });
    }

    // Due = time has passed, still within grace window, not already sent.
    const due = record.schedule.filter(
      e => e.ts <= now && e.ts > now - GRACE_MS && !fired.has(e.ts),
    );

    let changed = false;
    let dead = false;
    for (const entry of due) {
      // Atomic dedup via Supabase Storage. Round ts to nearest minute so that
      // a re-subscribe with slightly different milliseconds still hits the same
      // dedup key (prayer times from the API can vary by a few ms each recalc).
      const tsMin = Math.round(entry.ts / 60000) * 60000;
      const dedupKey = `${key}_${tsMin}`;
      const claimed = await claimPrayerSend(dedupKey);
      if (!claimed) continue;

      try {
        // _pre and jumuah entries are informational — SW should not show prayed/missed actions.
        // The SW reads `isPreAlert` to decide this.
        const isPreAlert = entry.prayer.endsWith('_pre') || entry.prayer === 'jumuah';
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({ title: entry.title, body: entry.body, prayer: entry.prayer, lang: record.language || 'en', isPreAlert }),
        );
        sent++;
        fired.add(entry.ts);
        changed = true;
      } catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) { dead = true; }
        else errors++;
      }
    }

    if (dead) { staleKeys.push(key); return; }

    if (changed) {
      // Persist dedup state; prune old fired entries and long-past schedule.
      const prunedFired = [...fired].filter(ts => ts > now - FIRED_TTL_MS);
      const prunedSchedule = record.schedule.filter(e => e.ts > now - GRACE_MS);
      updates.push({ operation: 'upsert', key, value: { ...record, fired: prunedFired, schedule: prunedSchedule } });
    }
  }));

  // Heartbeat: record real trigger hits (skip debug/test so they don't pollute
  // it — lets us confirm the external cron is actually firing every minute).
  const heartbeatUpdate = debug
    ? []
    : [{ operation: 'upsert' as const, key: 'meta_heartbeat', value: { ts: now, sent } }];

  await ecPatch([
    ...updates,
    ...heartbeatUpdate,
    ...staleKeys.map(k => ({ operation: 'delete' as const, key: k })),
  ]);

  const hb = items['meta_heartbeat'];
  res.status(200).json({
    ok: true,
    devices: subKeys.length,
    sent,
    errors,
    stale: staleKeys.length,
    serverTime: new Date(now).toISOString(),
    lastTriggerAgoSec: hb?.ts ? Math.round((now - hb.ts) / 1000) : null,
    ...(debug ? { diag } : {}),
  });
}
