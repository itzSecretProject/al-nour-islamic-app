// Cross-device settings sync, backed by Vercel Edge Config.
// The client sends `email` already hashed (SHA-256) and we store the settings
// under the item `settings_<hash>`.

const EC_ID = process.env.EC_ID;
const EC_READ_TOKEN = process.env.EC_READ_TOKEN;
const EC_WRITE_TOKEN = process.env.VERCEL_API_TOKEN;
const EC_TEAM = process.env.VERCEL_TEAM_ID;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (!EC_ID || !EC_READ_TOKEN || !EC_WRITE_TOKEN) {
    // Signal the client to use its local fallback.
    res.status(200).json({ error: 'KV_NOT_CONFIGURED' });
    return;
  }

  const email = req.query?.email;
  if (!email) { res.status(400).json({ error: 'EMAIL_REQUIRED' }); return; }
  const key = `settings_${String(email).replace(/[^A-Za-z0-9_-]/g, '')}`;

  try {
    if (req.method === 'GET') {
      const r = await fetch(`https://edge-config.vercel.com/${EC_ID}/item/${key}?token=${EC_READ_TOKEN}`);
      if (r.status === 404) { res.status(200).json({ settings: null }); return; }
      if (!r.ok) throw new Error(`read ${r.status}`);
      const settings = await r.json();
      res.status(200).json({ settings });
    } else if (req.method === 'POST') {
      const { settings } = req.body || {};
      if (!settings) { res.status(400).json({ error: 'SETTINGS_REQUIRED' }); return; }
      const url = `https://api.vercel.com/v1/edge-config/${EC_ID}/items${EC_TEAM ? `?teamId=${EC_TEAM}` : ''}`;
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${EC_WRITE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ operation: 'upsert', key, value: settings }] }),
      });
      if (!r.ok) throw new Error(`write ${r.status}: ${await r.text()}`);
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
  } catch (e: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: e.message });
  }
}
