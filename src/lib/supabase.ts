// Single Supabase client for the whole app (auth + database + realtime).
//
// The app must keep working even when Supabase is not configured (local dev
// without env vars, or the legacy local-only "login"). So if the env vars are
// missing we export `null` and let callers fall back gracefully via
// `isSupabaseConfigured`.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[Al Nour] Supabase no configurado: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'El módulo social queda deshabilitado y la app usa el perfil local.',
  );
}
