// Server-side signup endpoint. Uses the Supabase Admin API to create users with
// email_confirm:true, bypassing the email confirmation requirement that blocks
// users from logging in immediately after registration.

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({ error: 'Auth service not configured' });
    return;
  }

  const { email, password, display_name } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  // Create user via admin API with email pre-confirmed
  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: display_name ? { full_name: display_name } : undefined,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    const msg = (err as any)?.msg || (err as any)?.message || 'Signup failed';
    res.status(createRes.status).json({ error: msg });
    return;
  }

  res.status(200).json({ ok: true });
}
