import { supabase } from '../lib/supabase';
import type { Profile } from '../context/AuthContext';

// Thin data layer over Supabase for the social module. All access is guarded by
// Row Level Security in supabase/schema.sql, so these are intentionally simple.

export interface SearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  current_streak: number;
}

export interface Friendship {
  id: string;
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface FriendEdge {
  friendshipId: string;
  profile: Profile;
}

export interface SocialGraph {
  friends: FriendEdge[];
  incoming: FriendEdge[]; // requests waiting for me to accept
  outgoing: FriendEdge[]; // requests I sent, still pending
}

export type ShareKind = 'verse' | 'dua' | 'annotation' | 'nudge';

export interface SharedItem {
  id: string;
  sender: string;
  recipient: string;
  kind: ShareKind;
  payload: Record<string, any>;
  note: string;
  read: boolean;
  created_at: string;
  senderProfile?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>;
}

function db() {
  if (!supabase) throw new Error('Supabase no configurado');
  return supabase;
}

export async function searchUsers(q: string): Promise<SearchResult[]> {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await db().rpc('search_profiles', { q: term });
  if (error) { console.warn('searchUsers', error); return []; }
  return (data || []) as SearchResult[];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await db().from('profiles').select('*').eq('id', id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function loadGraph(uid: string): Promise<SocialGraph> {
  const { data: edges, error } = await db()
    .from('friendships')
    .select('*')
    .or(`requester.eq.${uid},addressee.eq.${uid}`);
  if (error || !edges) { console.warn('loadGraph', error); return { friends: [], incoming: [], outgoing: [] }; }

  const otherIds = Array.from(
    new Set((edges as Friendship[]).map(e => (e.requester === uid ? e.addressee : e.requester))),
  );
  const profiles = otherIds.length
    ? ((await db().from('profiles').select('*').in('id', otherIds)).data as Profile[] | null) || []
    : [];
  const byId = new Map(profiles.map(p => [p.id, p]));

  const friends: FriendEdge[] = [];
  const incoming: FriendEdge[] = [];
  const outgoing: FriendEdge[] = [];
  for (const e of edges as Friendship[]) {
    const otherId = e.requester === uid ? e.addressee : e.requester;
    const profile = byId.get(otherId);
    if (!profile) continue;
    const edge: FriendEdge = { friendshipId: e.id, profile };
    if (e.status === 'accepted') friends.push(edge);
    else if (e.addressee === uid) incoming.push(edge);
    else outgoing.push(edge);
  }
  return { friends, incoming, outgoing };
}

export async function sendFriendRequest(uid: string, addresseeId: string): Promise<{ error?: string }> {
  const { error } = await db().from('friendships').insert({ requester: uid, addressee: addresseeId, status: 'pending' });
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una solicitud o amistad' };
    return { error: error.message };
  }
  return {};
}

export async function acceptRequest(friendshipId: string): Promise<{ error?: string }> {
  const { error } = await db().from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  return error ? { error: error.message } : {};
}

export async function removeFriendship(friendshipId: string): Promise<{ error?: string }> {
  const { error } = await db().from('friendships').delete().eq('id', friendshipId);
  return error ? { error: error.message } : {};
}

export async function shareItem(
  uid: string,
  recipientId: string,
  kind: ShareKind,
  payload: Record<string, any>,
  note = '',
): Promise<{ error?: string }> {
  const { error } = await db().from('shared_items').insert({
    sender: uid,
    recipient: recipientId,
    kind,
    payload,
    note,
  });
  if (!error) {
    const bodyText = kind === 'nudge' ? '🤲 Alguien te anima a rezar' : `📬 Tienes un nuevo ${kind === 'verse' ? 'versículo' : 'duá'}`;
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, title: 'Al Nour', body: bodyText }),
    }).catch(() => {});
  }
  return error ? { error: error.message } : {};
}

export async function loadInbox(uid: string): Promise<SharedItem[]> {
  const { data, error } = await db()
    .from('shared_items')
    .select('*')
    .eq('recipient', uid)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];

  const senderIds = Array.from(new Set((data as SharedItem[]).map(i => i.sender)));
  const profiles = senderIds.length
    ? ((await db().from('profiles').select('id,username,display_name,avatar_url').in('id', senderIds)).data as any[]) || []
    : [];
  const byId = new Map(profiles.map((p: any) => [p.id, p]));
  return (data as SharedItem[]).map(i => ({ ...i, senderProfile: byId.get(i.sender) }));
}

export async function markRead(id: string): Promise<void> {
  await db().from('shared_items').update({ read: true }).eq('id', id);
}

export async function unreadCount(uid: string): Promise<number> {
  const { count } = await db()
    .from('shared_items')
    .select('id', { count: 'exact', head: true })
    .eq('recipient', uid)
    .eq('read', false);
  return count || 0;
}

// ── Challenges ───────────────────────────────────────────────────────────────

export type ChallengeMetric = 'streak' | 'memorized' | 'prayers_today';

export interface Challenge {
  id: string;
  creator: string;
  title: string;
  metric: ChallengeMetric;
  target: number;
  ends_at: string | null;
  created_at: string;
}

export interface ChallengeStanding {
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  value: number; // the member's current value of the challenge metric
}

export interface ChallengeWithStandings extends Challenge {
  standings: ChallengeStanding[];
}

const METRIC_COLUMN: Record<ChallengeMetric, string> = {
  streak: 'current_streak',
  memorized: 'total_memorized',
  prayers_today: 'prayers_today',
};

export async function createChallenge(
  uid: string,
  title: string,
  metric: ChallengeMetric,
  target: number,
  friendIds: string[],
  durationDays: number,
): Promise<{ error?: string; id?: string }> {
  const ends_at = durationDays > 0
    ? new Date(Date.now() + durationDays * 86400000).toISOString()
    : null;
  const { data, error } = await db()
    .from('challenges')
    .insert({ creator: uid, title, metric, target, ends_at })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message || 'create failed' };

  const memberRows = [uid, ...friendIds].map(user_id => ({ challenge_id: data.id, user_id }));
  const { error: mErr } = await db().from('challenge_members').insert(memberRows);
  if (mErr) return { error: mErr.message };

  for (const fid of friendIds) {
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: fid, title: 'Al Nour', body: `🏆 ${title}` }),
    }).catch(() => {});
  }
  return { id: data.id };
}

export async function loadChallenges(uid: string): Promise<ChallengeWithStandings[]> {
  const { data: myMemberships } = await db()
    .from('challenge_members')
    .select('challenge_id')
    .eq('user_id', uid);
  const ids = (myMemberships || []).map((m: any) => m.challenge_id);
  if (!ids.length) return [];

  const { data: challenges } = await db()
    .from('challenges')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (!challenges) return [];

  const { data: members } = await db()
    .from('challenge_members')
    .select('challenge_id, user_id')
    .in('challenge_id', ids);
  const memberIds = Array.from(new Set((members || []).map((m: any) => m.user_id)));

  const { data: profiles } = memberIds.length
    ? await db().from('profiles').select('id,username,display_name,avatar_url,current_streak,total_memorized,prayers_today').in('id', memberIds)
    : { data: [] as any[] };
  const byId = new Map((profiles || []).map((p: any) => [p.id, p]));

  return (challenges as Challenge[]).map((c) => {
    const col = METRIC_COLUMN[c.metric];
    const standings: ChallengeStanding[] = (members || [])
      .filter((m: any) => m.challenge_id === c.id)
      .map((m: any) => {
        const p: any = byId.get(m.user_id);
        return p
          ? { profile: { id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }, value: p[col] ?? 0 }
          : null;
      })
      .filter(Boolean) as ChallengeStanding[];
    standings.sort((a, b) => b.value - a.value);
    return { ...c, standings };
  });
}

export async function leaveChallenge(uid: string, challengeId: string, isCreator: boolean): Promise<void> {
  if (isCreator) {
    await db().from('challenges').delete().eq('id', challengeId);
  } else {
    await db().from('challenge_members').delete().eq('challenge_id', challengeId).eq('user_id', uid);
  }
}
