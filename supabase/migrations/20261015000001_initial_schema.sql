-- Team Builder — initial schema
-- Tables, row level security (read access) and the profile created at first sign-in.
-- Writes go through server-side functions added in later migrations (groups, matches, results),
-- so that no client can change ratings, roles or confirmed results directly.

-- ---------- Profiles (one per account) ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Copy name, email and avatar from the sign-in provider when an account is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Groups ----------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  default_format smallint not null default 5 check (default_format in (5, 7)),
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Players (one per person per group; guests have no user_id) ----------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role text not null default 'player' check (role in ('owner', 'admin', 'player')),
  -- questionnaire (null until filled in)
  birth_year smallint check (birth_year between 1930 and 2020),
  max_level text check (max_level in ('never', 'amateur', 'youth', 'semipro', 'elite')),
  years_played text check (years_played in ('0-2', '3-5', '6-10', '10+')),
  frequency text check (frequency in ('lt1m', '1-3m', '1w', '2w')),
  positions text[] not null default '{}' check (positions <@ array['GK', 'DEF', 'MID', 'ATT']),
  gk_rotation boolean not null default false,
  foot text check (foot in ('right', 'left', 'both')),
  attributes smallint[] check (
    attributes is null
    or (array_length(attributes, 1) = 6 and 1 <= all (attributes) and 5 >= all (attributes))
  ),
  gk_rating smallint check (gk_rating between 1 and 5),
  -- rating: prior = overall from the questionnaire (or the admin's estimate for a guest),
  -- mu = current rating, recomputed from the whole history (estimateRatings)
  prior_overall smallint check (prior_overall between 40 and 92),
  mu real,
  matches_played integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index players_user_id_idx on public.players (user_id);

-- ---------- Matches ----------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  format smallint not null check (format in (5, 7)),
  starts_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'teams_set', 'played')),
  score_a smallint check (score_a >= 0),
  score_b smallint check (score_b >= 0),
  result_status text check (result_status in ('pending', 'confirmed', 'disputed')),
  result_by uuid references public.players (id),
  confirmed_by uuid references public.players (id),
  win_prob_a real,
  created_by uuid references public.players (id),
  created_at timestamptz not null default now()
);

create index matches_group_id_idx on public.matches (group_id, starts_at desc);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  form smallint not null default 3 check (form between 1 and 5),
  team char(1) check (team in ('A', 'B')),
  position text check (position in ('GK', 'DEF', 'MID', 'ATT')),
  mu_before real,
  mu_after real,
  primary key (match_id, player_id)
);

create index match_players_player_id_idx on public.match_players (player_id);

create table public.team_proposals (
  match_id uuid not null references public.matches (id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  team_a uuid[] not null,
  team_b uuid[] not null,
  win_prob_a real not null,
  primary key (match_id, rank)
);

create table public.pair_constraints (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  player_a uuid not null references public.players (id) on delete cascade,
  player_b uuid not null references public.players (id) on delete cascade,
  type text not null check (type in ('together', 'apart')),
  check (player_a <> player_b)
);

-- ---------- Row level security ----------

-- True if the signed-in user is a member of the group. Security definer so that
-- policies on players can use it without recursing into themselves.
create function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players
    where group_id = gid and user_id = (select auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.team_proposals enable row level security;
alter table public.pair_constraints enable row level security;

-- Profiles hold the email: each user sees and edits only their own.
-- Other members see people through players.display_name.
create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Everything else is visible to the members of the group, and only to them.
create policy "Members read their groups" on public.groups
  for select to authenticated using (public.is_group_member(id));

create policy "Members read the players of their groups" on public.players
  for select to authenticated using (public.is_group_member(group_id));

create policy "Members read the matches of their groups" on public.matches
  for select to authenticated using (public.is_group_member(group_id));

create policy "Members read match players" on public.match_players
  for select to authenticated using (
    exists (select 1 from public.matches m where m.id = match_id and public.is_group_member(m.group_id))
  );

create policy "Members read team proposals" on public.team_proposals
  for select to authenticated using (
    exists (select 1 from public.matches m where m.id = match_id and public.is_group_member(m.group_id))
  );

create policy "Members read pair constraints" on public.pair_constraints
  for select to authenticated using (
    exists (select 1 from public.matches m where m.id = match_id and public.is_group_member(m.group_id))
  );
