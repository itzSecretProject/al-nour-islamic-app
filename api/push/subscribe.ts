// Accepts a push subscription + 30-day prayer schedule from the client and
// stores it in Vercel Edge Config (one item per device: `sub_<hash>`), so the
// cron in send.ts can deliver notifications when the app is closed.

const EC_ID = process.env.EC_ID;
const EC_READ_TOKEN = process.env.EC_READ_TOKEN;
const EC_WRITE_TOKEN = process.env.VERCEL_API_TOKEN;
const EC_TEAM = process.env.VERCEL_TEAM_ID;

async function ecReadItem(key: string): Promise<any | null> {
  if (!EC_ID || !EC_READ_TOKEN) return null;
  try {
    const res = await fetch(`https://edge-config.vercel.com/${EC_ID}/item/${key}?token=${EC_READ_TOKEN}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function ecPatch(items: any[]) {
  const url = `https://api.vercel.com/v1/edge-config/${EC_ID}/items${EC_TEAM ? `?teamId=${EC_TEAM}` : ''}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${EC_WRITE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`Edge Config write ${res.status}: ${await res.text()}`);
  return res.json();
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

  if (!EC_ID || !EC_WRITE_TOKEN) {
    res.status(503).json({ error: 'EDGE_CONFIG_NOT_CONFIGURED' });
    return;
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body || {};
    if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
    const hash = await digestHash(endpoint);
    await ecPatch([{ operation: 'delete', key: `sub_${hash}` }]).catch(() => {});
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { subscription, schedule, language, showRakats, userId } = req.body || {};
  if (!subscription?.endpoint || !Array.isArray(schedule)) {
    res.status(400).json({ error: 'subscription and schedule required' });
    return;
  }

  // Keep the stored schedule small (Edge Config size limits): next ~16 days only.
  const horizon = Date.now() + 16 * 24 * 60 * 60 * 1000;
  const trimmed = schedule.filter((e: any) => e && e.ts <= horizon);

  const hash = await digestHash(subscription.endpoint);
  // Preserve fired[] from the existing record so re-subscribing (e.g. opening
  // the app) doesn't wipe the dedup state mid-grace-window.
  const existing = await ecReadItem(`sub_${hash}`);
  const record = {
    subscription,
    schedule: trimmed,
    language: language || 'es',
    showRakats: showRakats !== false,
    updatedAt: Date.now(),
    ...(userId ? { userId } : {}),
    ...(Array.isArray(existing?.fired) ? { fired: existing.fired } : {}),
  };

  try {
    await ecPatch([{ operation: 'upsert', key: `sub_${hash}`, value: record }]);
    res.status(200).json({ success: true, hash });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'write failed' });
  }
}
