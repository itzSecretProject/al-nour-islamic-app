// Sends a push notification to all subscriptions belonging to a specific
// Supabase user. Used by the social module (inbox items, streak nudges).
import webpush from 'web-push';

const EC_ID = process.env.EC_ID;
const EC_READ_TOKEN = process.env.EC_READ_TOKEN;
const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

async function ecReadAll(): Promise<Record<string, any>> {
  if (!EC_ID || !EC_READ_TOKEN) return {};
  try {
    const res = await fetch(`https://edge-config.vercel.com/${EC_ID}?token=${EC_READ_TOKEN}`);
    if (!res.ok) return {};
    const d = await res.json();
    return d?.items ?? {};
  } catch { return {}; }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { recipientId, title, body } = req.body || {};
  if (!recipientId) { res.status(400).json({ error: 'recipientId required' }); return; }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) { res.status(200).json({ sent: 0 }); return; }

  webpush.setVapidDetails('mailto:adamelouinissi@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

  const items = await ecReadAll();
  const keys = Object.keys(items).filter(
    k => k.startsWith('sub_') && items[k]?.userId === recipientId,
  );

  let sent = 0;
  await Promise.all(
    keys.map(async key => {
      try {
        await webpush.sendNotification(
          items[key].subscription,
          JSON.stringify({
            title: title ?? 'Al Nour',
            body: body ?? 'Tienes un nuevo mensaje',
          }),
        );
        sent++;
      } catch { /* stale or invalid subscription — skip */ }
    }),
  );

  res.status(200).json({ sent });
}
