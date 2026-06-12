// Accepts a push subscription + prayer schedule from the client and stores it in
// Supabase Storage (one JSON per device: `state/sub_<hash>.json`), so send.ts can
// deliver notifications when the app is closed.
//
// NOTE: storage moved from Vercel Edge Config to Supabase Storage because Edge
// Config writes are capped at 250/month on Hobby — the push pipeline exhausts
// that in hours, after which all writes silently fail for ~30 days. Supabase
// Storage has no such cap. Edge Config is still read by send.ts as a legacy
// fallback for devices subscribed before this migration.

const EC_ID = process.env.EC_ID;
const EC_READ_TOKEN = process.env.EC_READ_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SB_BUCKET = 'push-dedup';
const STATE_PREFIX = 'state/';

function sbHeaders() {
  return { apikey: SUPABASE_SERVICE_KEY as string, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
}

async function sbGet(path: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SB_BUCKET}/${path}`, { headers: sbHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function sbPut(path: string, obj: any): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SB_BUCKET}/${path}`, {
      method: 'POST',
      headers: { ...sbHeaders(), 'Content-Type': 'application/json', 'x-upsert': 'true' },
      body: JSON.stringify(obj),
    });
    return res.ok;
  } catch { return false; }
}

async function sbDelete(path: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${SB_BUCKET}/${path}`, { method: 'DELETE', headers: sbHeaders() });
  } catch {}
}

// Legacy read so we can carry over fired[] (dedup state) from an Edge Config
// record created before the Supabase migration.
async function ecReadItem(key: string): Promise<any | null> {
  if (!EC_ID || !EC_READ_TOKEN) return null;
  try {
    const res = await fetch(`https://edge-config.vercel.com/${EC_ID}/item/${key}?token=${EC_READ_TOKEN}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function digestHash(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }
  const { createHash } = await import('crypto');
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(503).json({ error: 'STORAGE_NOT_CONFIGURED' });
    return;
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body || {};
    if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
    const hash = await digestHash(endpoint);
    await sbDelete(`${STATE_PREFIX}sub_${hash}.json`);
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const {
    subscription, schedule, language, showRakats, userId,
    lat, lng, method, offsets, preAlertMinutes,
    silentHoursEnabled, silentHoursStart, silentHoursEnd, jumuahReminder,
  } = req.body || {};

  if (!subscription?.endpoint || !Array.isArray(schedule)) {
    res.status(400).json({ error: 'subscription and schedule required' });
    return;
  }

  // Store 30 days so the server has plenty of runway before auto-rebuild kicks in.
  const horizon = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const trimmed = schedule.filter((e: any) => e && e.ts <= horizon);

  const hash = await digestHash(subscription.endpoint);
  // Prefer an existing Supabase record; fall back to the legacy Edge Config one
  // so dedup state (fired[]) survives the migration.
  const existing = (await sbGet(`${STATE_PREFIX}sub_${hash}.json`)) || (await ecReadItem(`sub_${hash}`));

  const record = {
    subscription,
    schedule: trimmed,
    language: language || 'es',
    showRakats: showRakats !== false,
    updatedAt: Date.now(),
    // Coordinates + settings let the server rebuild the schedule without the app being open.
    ...(lat != null ? { lat } : existing?.lat != null ? { lat: existing.lat } : {}),
    ...(lng != null ? { lng } : existing?.lng != null ? { lng: existing.lng } : {}),
    ...(method != null ? { method } : existing?.method != null ? { method: existing.method } : {}),
    ...(offsets != null ? { offsets } : existing?.offsets != null ? { offsets: existing.offsets } : {}),
    ...(preAlertMinutes != null ? { preAlertMinutes } : existing?.preAlertMinutes != null ? { preAlertMinutes: existing.preAlertMinutes } : {}),
    ...(silentHoursEnabled != null ? { silentHoursEnabled } : existing?.silentHoursEnabled != null ? { silentHoursEnabled: existing.silentHoursEnabled } : {}),
    ...(silentHoursStart != null ? { silentHoursStart } : existing?.silentHoursStart != null ? { silentHoursStart: existing.silentHoursStart } : {}),
    ...(silentHoursEnd != null ? { silentHoursEnd } : existing?.silentHoursEnd != null ? { silentHoursEnd: existing.silentHoursEnd } : {}),
    ...(jumuahReminder != null ? { jumuahReminder } : existing?.jumuahReminder != null ? { jumuahReminder: existing.jumuahReminder } : {}),
    ...(userId ? { userId } : {}),
    ...(Array.isArray(existing?.fired) ? { fired: existing.fired } : {}),
  };

  const ok = await sbPut(`${STATE_PREFIX}sub_${hash}.json`, record);
  if (ok) res.status(200).json({ success: true, hash });
  else res.status(500).json({ error: 'write failed' });
}
