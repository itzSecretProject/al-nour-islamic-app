import webpush from 'web-push';

interface ScheduleEntry { prayer: string; ts: number; title: string; body: string; }
interface PushRecord {
  subscription: webpush.PushSubscription;
  schedule: ScheduleEntry[];
  language: string;
  showRakats: boolean;
  fired?: number[];
  // Stored on first subscribe so the server can rebuild the schedule autonomously.
  lat?: number;
  lng?: number;
  method?: number;
  offsets?: Record<string, number>;
  preAlertMinutes?: number;
  silentHoursEnabled?: boolean;
  silentHoursStart?: number;
  silentHoursEnd?: number;
  jumuahReminder?: boolean;
}

const EC_ID = process.env.EC_ID;
const EC_READ_TOKEN = process.env.EC_READ_TOKEN;
const EC_WRITE_TOKEN = process.env.VERCEL_API_TOKEN;
const EC_TEAM = process.env.VERCEL_TEAM_ID;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GRACE_MS = 20 * 60 * 1000;
const FIRED_TTL_MS = 24 * 60 * 60 * 1000;
// Rebuild schedule when fewer than this many days of future entries remain.
const REBUILD_TRIGGER_DAYS = 5;
// How many days to store after a rebuild.
const REBUILD_HORIZON_DAYS = 30;

// ── Notification text (mirrors usePushNotifications.ts) ──────────────────────

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const RAKAT_MAP: Record<string, number> = { Fajr: 2, Dhuhr: 4, Asr: 4, Maghrib: 3, Isha: 4 };

const PRAYER_TITLES: Record<string, Record<string, string>> = {
  en: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  es: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  ar: { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  fr: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  de: { Fajr: 'Fadschr', Dhuhr: 'Duhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Ischa' },
  tr: { Fajr: 'İmsak', Dhuhr: 'Öğle', Asr: 'İkindi', Maghrib: 'Akşam', Isha: 'Yatsı' },
  pt: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};

const NOTIF_TITLES: Record<string, string> = {
  en: 'Prayer Reminder', es: 'Recordatorio de Rezo', ar: 'تنبيه الصلاة',
  fr: 'Rappel de Prière', de: 'Gebetserinnerung', tr: 'Namaz Hatırlatıcısı', pt: 'Lembrete de Oração',
};

const NOTIF_BODIES: Record<string, (n: string) => string> = {
  en: (n) => `Time for ${n} prayer.`,
  es: (n) => `Es hora del rezo de ${n}.`,
  ar: (n) => `حان وقت صلاة ${n}.`,
  fr: (n) => `C'est l'heure de la prière de ${n}.`,
  de: (n) => `Es ist Zeit für das ${n}-Gebet.`,
  tr: (n) => `${n} namaz vakti geldi.`,
  pt: (n) => `Chegou a hora da oração de ${n}.`,
};

const PRE_BODIES: Record<string, (n: string, m: number) => string> = {
  en: (n, m) => `${n} in ${m} minutes.`,
  es: (n, m) => `${n} en ${m} minutos.`,
  ar: (n, m) => `صلاة ${n} بعد ${m} دقائق.`,
  fr: (n, m) => `${n} dans ${m} minutes.`,
  de: (n, m) => `${n} in ${m} Minuten.`,
  tr: (n, m) => `${n} ${m} dakika sonra.`,
  pt: (n, m) => `${n} em ${m} minutos.`,
};

const JUMUAH_TITLES: Record<string, string> = {
  en: "Jumu'ah Reminder", es: "Recordatorio de Jumu'ah", ar: 'تذكير صلاة الجمعة',
  fr: "Rappel du Jumu'ah", de: "Jumu'ah Erinnerung", tr: 'Cuma Namazı Hatırlatıcı', pt: "Lembrete do Jumu'ah",
};
const JUMUAH_BODIES: Record<string, string> = {
  en: "Jumu'ah begins in 30 minutes. Prepare with wudu.",
  es: "El Jumu'ah comienza en 30 minutos. Prepárate con wudu.",
  ar: 'موعد صلاة الجمعة خلال 30 دقيقة. استعد بالوضوء.',
  fr: "Le Jumu'ah commence dans 30 minutes. Préparez-vous avec le wudu.",
  de: "Jumu'ah beginnt in 30 Minuten. Bereite dich mit Wudu vor.",
  tr: 'Cuma namazı 30 dakika sonra. Abdestini al.',
  pt: 'Jumu\'ah começa em 30 minutos. Prepare-se com wudu.',
};

function isInSilentHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

// ── Server-side schedule builder ──────────────────────────────────────────────

function buildServerSchedule(monthlyData: any[], record: PushRecord, now: number): ScheduleEntry[] {
  const lang = record.language || 'es';
  const horizon = now + REBUILD_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const preMin = record.preAlertMinutes ?? 0;
  const offsets = record.offsets ?? {};
  const schedule: ScheduleEntry[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (const dayData of monthlyData) {
    const greg = dayData?.date?.gregorian;
    if (!greg) continue;
    const monthNum = typeof greg.month === 'object' ? parseInt(greg.month?.number) : parseInt(greg.month);
    const baseDate = new Date(parseInt(greg.year), monthNum - 1, parseInt(greg.day));
    if (baseDate < today) continue;
    const isFriday = baseDate.getDay() === 5;

    for (const prayer of PRAYER_NAMES) {
      const timeStr = dayData.timings?.[prayer];
      if (!timeStr) continue;
      const clean = timeStr.replace(/ \(.*?\)/, '').trim();
      const [h, m] = clean.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;

      const prayerDate = new Date(baseDate);
      prayerDate.setHours(h, m, 0, 0);

      const mainTs = prayerDate.getTime() + (offsets[prayer] ?? 0) * 60_000;
      if (mainTs <= now || mainTs > horizon) continue;

      const prayerHour = new Date(mainTs).getHours();
      const silent = (record.silentHoursEnabled ?? false) && prayer !== 'Fajr'
        && isInSilentHours(prayerHour, record.silentHoursStart ?? 23, record.silentHoursEnd ?? 5);

      if (!silent) {
        const localName = (PRAYER_TITLES[lang] ?? PRAYER_TITLES.en)[prayer] ?? prayer;
        let body = (NOTIF_BODIES[lang] ?? NOTIF_BODIES.en)(localName);
        if (record.showRakats && RAKAT_MAP[prayer]) {
          body += lang === 'ar' ? ` (${RAKAT_MAP[prayer]} ركعات)` : ` (${RAKAT_MAP[prayer]} Rakats)`;
        }
        schedule.push({ prayer, ts: mainTs, title: NOTIF_TITLES[lang] ?? NOTIF_TITLES.en, body });

        if (preMin > 0) {
          const preTs = prayerDate.getTime() - preMin * 60_000;
          if (preTs > now && preTs <= horizon) {
            const preBody = (PRE_BODIES[lang] ?? PRE_BODIES.en)(localName, preMin);
            schedule.push({ prayer: `${prayer}_pre`, ts: preTs, title: NOTIF_TITLES[lang] ?? NOTIF_TITLES.en, body: preBody });
          }
        }
      }

      if (isFriday && prayer === 'Dhuhr' && (record.jumuahReminder ?? true)) {
        const jumuahTs = prayerDate.getTime() - 30 * 60_000;
        const jHour = new Date(jumuahTs).getHours();
        const jSilent = (record.silentHoursEnabled ?? false)
          && isInSilentHours(jHour, record.silentHoursStart ?? 23, record.silentHoursEnd ?? 5);
        if (!jSilent && jumuahTs > now && jumuahTs <= horizon) {
          schedule.push({
            prayer: 'jumuah',
            ts: jumuahTs,
            title: JUMUAH_TITLES[lang] ?? JUMUAH_TITLES.en,
            body: JUMUAH_BODIES[lang] ?? JUMUAH_BODIES.en,
          });
        }
      }
    }
  }

  return schedule.sort((a, b) => a.ts - b.ts);
}

async function fetchAndRebuildSchedule(record: PushRecord, now: number): Promise<ScheduleEntry[] | null> {
  if (!record.lat || !record.lng) return null;
  try {
    const method = record.method ?? 2;
    const months: any[] = [];
    const d = new Date(now);
    for (let i = 0; i < 2; i++) {
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      const url = `https://api.aladhan.com/v1/calendar/${y}/${mo}?latitude=${record.lat}&longitude=${record.lng}&method=${method}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) { d.setMonth(d.getMonth() + 1); continue; }
      const json = await res.json();
      if (Array.isArray(json.data)) months.push(...json.data);
      d.setMonth(d.getMonth() + 1);
    }
    if (!months.length) return null;
    const rebuilt = buildServerSchedule(months, record, now);
    return rebuilt.length ? rebuilt : null;
  } catch {
    return null;
  }
}

// ── Edge Config helpers ───────────────────────────────────────────────────────

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

// ── Supabase dedup ────────────────────────────────────────────────────────────

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
    if (res.status === 200) return true;
    if (res.status === 409) return false;
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      if (body?.error === 'Duplicate' || body?.statusCode === '409') return false;
    }
    return true;
  } catch {
    return true;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

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

  if (req.query?.test === '1') {
    let ok = 0, bad = 0;
    await Promise.all(subKeys.map(async (key) => {
      const record = items[key] as PushRecord;
      if (!record?.subscription) return;
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({ title: 'Al Nour', body: 'Las notificaciones funcionan correctamente.', prayer: 'Test', lang: record.language || 'es' }),
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
  const debug = req.query?.debug === '1';
  const diag: any[] = [];

  await Promise.all(subKeys.map(async (key) => {
    const record = items[key] as PushRecord;
    if (!record?.subscription || !Array.isArray(record.schedule)) return;

    const fired = new Set<number>(Array.isArray(record.fired) ? record.fired : []);

    if (debug) {
      const future = record.schedule.filter(e => e.ts > now).sort((a, b) => a.ts - b.ts);
      const daysLeft = future.length
        ? Math.round((future[future.length - 1].ts - now) / 86_400_000)
        : 0;
      diag.push({
        device: key.slice(0, 12),
        total: record.schedule.length,
        future: future.length,
        daysLeft,
        next: future[0] ? new Date(future[0].ts).toISOString() : null,
        nextPrayer: future[0]?.prayer ?? null,
        hasCoords: !!(record.lat && record.lng),
      });
    }

    const due = record.schedule.filter(
      e => e.ts <= now && e.ts > now - GRACE_MS && !fired.has(e.ts),
    );

    let changed = false;
    let dead = false;
    for (const entry of due) {
      const tsMin = Math.round(entry.ts / 60_000) * 60_000;
      const claimed = await claimPrayerSend(`${key}_${tsMin}`);
      if (!claimed) continue;
      try {
        const isPreAlert = entry.prayer.endsWith('_pre') || entry.prayer === 'jumuah';
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({ title: entry.title, body: entry.body, prayer: entry.prayer, lang: record.language || 'en', isPreAlert }),
        );
        sent++;
        fired.add(entry.ts);
        changed = true;
      } catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) dead = true;
        else errors++;
      }
    }

    if (dead) { staleKeys.push(key); return; }

    // ── Auto-rebuild: if fewer than REBUILD_TRIGGER_DAYS of future entries remain,
    // fetch fresh prayer times from the Aladhan API and replenish the schedule.
    // This keeps notifications running indefinitely without the user opening the app.
    const futureEntries = record.schedule.filter(e => e.ts > now);
    const lastFutureTs = futureEntries.length
      ? futureEntries.reduce((mx, e) => Math.max(mx, e.ts), 0)
      : 0;
    const daysRemaining = (lastFutureTs - now) / 86_400_000;

    if (daysRemaining < REBUILD_TRIGGER_DAYS) {
      const rebuilt = await fetchAndRebuildSchedule(record, now);
      if (rebuilt && rebuilt.length > 0) {
        const prunedFired = [...fired].filter(ts => ts > now - FIRED_TTL_MS);
        updates.push({ operation: 'upsert', key, value: { ...record, schedule: rebuilt, fired: prunedFired } });
        return; // schedule updated, skip the regular prune-only update
      }
    }

    if (changed) {
      const prunedFired = [...fired].filter(ts => ts > now - FIRED_TTL_MS);
      const prunedSchedule = record.schedule.filter(e => e.ts > now - GRACE_MS);
      updates.push({ operation: 'upsert', key, value: { ...record, fired: prunedFired, schedule: prunedSchedule } });
    }
  }));

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
