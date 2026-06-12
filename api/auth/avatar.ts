// Server-side avatar upload. Uses the service_role key so no Storage RLS
// policies are needed. Verifies the request JWT matches the claimed userId
// before writing to prevent cross-user overwrites.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    res.status(503).json({ error: 'Storage not configured' });
    return;
  }

  const { userId, base64, mimeType } = req.body || {};
  if (!userId || !base64 || !mimeType) {
    res.status(400).json({ error: 'userId, base64, mimeType required' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const meRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${jwt}` },
  });
  if (!meRes.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
  const me = await meRes.json();
  if (me.id !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    res.status(500).json({ error: err });
    return;
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;
  res.status(200).json({ url });
}
