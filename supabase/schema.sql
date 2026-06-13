-- ============================================================================
-- Al Nour — Social module schema (Supabase / Postgres)
-- Run this once in the Supabase SQL Editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (one row per auth user; public-ish, controlled by RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null,
  display_name  text not null default '',
  avatar_url    text not null default '',
  wallpaper     text not null default 'arafat',
  -- denormalised social stats (updated by the client; cheap to read for friends)
  current_streak    int  not null default 0,
  best_streak       int  not null default 0,
  total_memorized   int  not null default 0,
  prayers_today     int  not null default 0,
  last_active       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- Case-insensitive username lookups for friend search.
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- 2. FRIENDSHIPS  (one row per pair; status pending -> accepted)
--    requester sends, addressee accepts/declines.
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  requester   uuid not null references public.profiles (id) on delete cascade,
  addressee   uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint friendship_not_self check (requester <> addressee),
  constraint friendship_unique unique (requester, addressee)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee, status);
create index if not exists friendships_requester_idx on public.friendships (requester, status);

-- ---------------------------------------------------------------------------
-- 3. SHARED ITEMS  (a friend sends you a verse / dua / annotation)
-- ---------------------------------------------------------------------------
create table if not exists public.shared_items (
  id          uuid primary key default gen_random_uuid(),
  sender      uuid not null references public.profiles (id) on delete cascade,
  recipient   uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('verse', 'dua', 'annotation', 'nudge')),
  payload     jsonb not null default '{}'::jsonb,
  note        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists shared_items_recipient_idx
  on public.shared_items (recipient, read, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: are two users accepted friends? (used by RLS on shared_items)
-- ---------------------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b)
        or (f.requester = b and f.addressee = a))
  );
$$;

-- ---------------------------------------------------------------------------
-- Friend search RPC: find profiles by username/display name, excluding self.
-- ---------------------------------------------------------------------------
create or replace function public.search_profiles(q text)
returns table (
  id uuid, username text, display_name text, avatar_url text, current_streak int
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.current_streak
  from public.profiles p
  where p.id <> auth.uid()
    and (p.username ilike '%' || q || '%' or p.display_name ilike '%' || q || '%')
  order by (p.username ilike q || '%') desc, p.username
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Auto-touch updated_at on friendships.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch
  before update on public.friendships
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles     enable row level security;
alter table public.friendships  enable row level security;
alter table public.shared_items enable row level security;

-- ----- profiles -----
-- Anyone authenticated can read profiles (needed for friend search & viewing
-- a friend's stats). Tighten later if you want friends-only visibility.
drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----- friendships -----
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);

drop policy if exists "send friend request" on public.friendships;
create policy "send friend request"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester);

-- Only the addressee can accept; either party can update (e.g. accept).
drop policy if exists "update own friendship" on public.friendships;
create policy "update own friendship"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester or auth.uid() = addressee)
  with check (auth.uid() = requester or auth.uid() = addressee);

drop policy if exists "delete own friendship" on public.friendships;
create policy "delete own friendship"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);

-- ----- shared_items -----
drop policy if exists "see items i sent or received" on public.shared_items;
create policy "see items i sent or received"
  on public.shared_items for select
  to authenticated
  using (auth.uid() = sender or auth.uid() = recipient);

-- Can only send to people you are friends with.
drop policy if exists "send item to friends" on public.shared_items;
create policy "send item to friends"
  on public.shared_items for insert
  to authenticated
  with check (auth.uid() = sender and public.are_friends(sender, recipient));

-- Recipient can mark read / delete; sender can delete.
drop policy if exists "recipient updates item" on public.shared_items;
create policy "recipient updates item"
  on public.shared_items for update
  to authenticated
  using (auth.uid() = recipient)
  with check (auth.uid() = recipient);

drop policy if exists "delete own item" on public.shared_items;
create policy "delete own item"
  on public.shared_items for delete
  to authenticated
  using (auth.uid() = sender or auth.uid() = recipient);

-- ============================================================================
-- REALTIME — broadcast inbox + friendship changes to clients.
-- (Synchronised recitation uses ephemeral Realtime Broadcast channels, which
--  need no table.)
-- ============================================================================
alter publication supabase_realtime add table public.shared_items;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.profiles;

-- ============================================================================
-- 4. CHALLENGES  (friendly group challenges — "who keeps the longest streak")
--    Progress is read LIVE from each member's profile stats (no extra writes),
--    so a challenge is just a definition + a membership list.
-- ============================================================================
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  creator     uuid not null references public.profiles (id) on delete cascade,
  title       text not null default '',
  metric      text not null default 'streak'
              check (metric in ('streak', 'memorized', 'prayers_today')),
  target      int  not null default 7,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index if not exists challenge_members_user_idx on public.challenge_members (user_id);

-- Is `uid` a member of challenge `cid`? (security definer so RLS can call it
-- without recursing into challenge_members' own policies).
create or replace function public.is_challenge_member(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.challenge_members m
    where m.challenge_id = cid and m.user_id = uid
  );
$$;

alter table public.challenges        enable row level security;
alter table public.challenge_members enable row level security;

-- ----- challenges -----
drop policy if exists "see challenges i'm in" on public.challenges;
create policy "see challenges i'm in"
  on public.challenges for select to authenticated
  using (public.is_challenge_member(id, auth.uid()) or creator = auth.uid());

drop policy if exists "create challenge" on public.challenges;
create policy "create challenge"
  on public.challenges for insert to authenticated
  with check (creator = auth.uid());

drop policy if exists "creator deletes challenge" on public.challenges;
create policy "creator deletes challenge"
  on public.challenges for delete to authenticated
  using (creator = auth.uid());

-- ----- challenge_members -----
drop policy if exists "see members of my challenges" on public.challenge_members;
create policy "see members of my challenges"
  on public.challenge_members for select to authenticated
  using (public.is_challenge_member(challenge_id, auth.uid()));

-- The creator can add members (invite friends); anyone can add THEMSELVES (join).
drop policy if exists "add members" on public.challenge_members;
create policy "add members"
  on public.challenge_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or auth.uid() = (select creator from public.challenges c where c.id = challenge_id)
  );

drop policy if exists "leave challenge" on public.challenge_members;
create policy "leave challenge"
  on public.challenge_members for delete to authenticated
  using (
    user_id = auth.uid()
    or auth.uid() = (select creator from public.challenges c where c.id = challenge_id)
  );

alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.challenge_members;
