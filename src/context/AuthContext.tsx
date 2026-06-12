import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// Real account identity for the social module, backed by Supabase Auth.
// Separate from SettingsContext's local "currentUser" (which only drives local
// settings + cloud settings sync). When Supabase is not configured the whole
// social module is disabled via `enabled === false`.

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  wallpaper: string;
  bio?: string;
  current_streak: number;
  best_streak: number;
  total_memorized: number;
  prayers_today: number;
  last_active: string;
  created_at: string;
}

export type StatsPatch = Partial<
  Pick<Profile, 'current_streak' | 'best_streak' | 'total_memorized' | 'prayers_today'>
>;

interface AuthContextType {
  enabled: boolean;            // Supabase configured?
  ready: boolean;             // finished initial session check
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUpEmail: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signInEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'username' | 'display_name' | 'avatar_url' | 'wallpaper' | 'bio'>>) => Promise<{ error?: string }>;
  updateStats: (patch: StatsPatch) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function deriveUsername(user: User): string {
  const raw = (user.email?.split('@')[0] || (user.user_metadata as any)?.user_name || 'user') as string;
  return raw.replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 16) || 'user';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (u: User): Promise<Profile | null> => {
    if (!supabase) return null;
    const bio = (u.user_metadata as any)?.bio || '';
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
    if (data) return { ...(data as Profile), bio };

    // First sign-in: create a profile, resolving username collisions.
    const base = deriveUsername(u);
    const meta = (u.user_metadata as any) || {};
    for (let i = 0; i < 6; i++) {
      const username = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: created, error } = await supabase
        .from('profiles')
        .insert({
          id: u.id,
          username,
          display_name: meta.full_name || meta.name || base,
          avatar_url: meta.avatar_url || meta.picture || '',
        })
        .select()
        .single();
      if (!error && created) return { ...(created as Profile), bio };
      if (error && (error.code === '23505' || /duplicate/i.test(error.message))) continue;
      console.warn('profile create failed', error);
      break;
    }
    return null;
  }, []);

  const applyUser = useCallback(async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      const p = await loadProfile(s.user);
      setProfile(p);
    } else {
      setProfile(null);
    }
  }, [loadProfile]);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await applyUser(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      applyUser(s);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [applyUser]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: 'Supabase no configurado' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    if (!supabase) return { error: 'Supabase no configurado' };
    // Use server-side signup to skip email confirmation (admin creates confirmed user)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (body as any).error || 'Error al registrar' };
    // Sign in immediately after creation
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase no configurado' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) setProfile(data as Profile);
  }, [user]);

  const updateProfile = useCallback<AuthContextType['updateProfile']>(async (patch) => {
    if (!supabase || !user) return { error: 'No autenticado' };
    const { bio, ...dbPatch } = patch as any;
    // bio is stored in auth user_metadata (no DB column needed)
    if (bio !== undefined) {
      await supabase.auth.updateUser({ data: { bio } });
    }
    if (Object.keys(dbPatch).length > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .update(dbPatch)
        .eq('id', user.id)
        .select()
        .single();
      if (error) return { error: error.message };
      if (data) setProfile(prev => ({ ...(data as Profile), bio: bio ?? prev?.bio ?? '' }));
    } else if (bio !== undefined) {
      setProfile(prev => prev ? { ...prev, bio } : null);
    }
    return {};
  }, [user]);

  const updateStats = useCallback<AuthContextType['updateStats']>(async (patch) => {
    if (!supabase || !user) return;
    const payload = { ...patch, last_active: new Date().toISOString() };
    const { data } = await supabase.from('profiles').update(payload).eq('id', user.id).select().maybeSingle();
    if (data) setProfile(data as Profile);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        enabled: isSupabaseConfigured,
        ready,
        session,
        user,
        profile,
        signInWithGoogle,
        signUpEmail,
        signInEmail,
        signOut,
        refreshProfile,
        updateProfile,
        updateStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
