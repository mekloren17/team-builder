-- Team Builder — matches, sign-ups ("I'm in" with form), admin constraints and teams
-- Team proposals are computed by the app with the engine on demand; only the chosen teams are stored.

-- True if the signed-in user is an owner or admin of the group.
create function public.is_manager(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.my_role(gid) in ('owner', 'admin'), false);
$$;

-- ---------- Matches ----------

create function public.create_match(gid uuid, p_starts_at timestamptz, p_format smallint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid uuid;
begin
  if not public.is_manager(gid) then
    raise exception 'Only owners and admins can create matches';
  end if;
  insert into public.matches (group_id, format, starts_at, created_by)
  values (
    gid, p_format, p_starts_at,
    (select id from public.players where group_id = gid and user_id = (select auth.uid()))
  )
  returning id into mid;
  return mid;
end;
$$;

create function public.delete_match(mid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  select group_id into gid from public.matches where id = mid and status <> 'played';
  if gid is null then
    raise exception 'Match not found, or already played';
  end if;
  if not public.is_manager(gid) then
    raise exception 'Only owners and admins can delete matches';
  end if;
  delete from public.matches where id = mid;
end;
$$;

-- ---------- Sign-ups ----------

-- Signs a player in (with their form, 1..5) or out. Players sign themselves; owners and admins
-- can sign anyone, guests included. Only while the teams are not set.
create function public.set_attendance(mid uuid, pid uuid, attending boolean, p_form smallint default 3)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  match_status text;
begin
  select group_id, status into gid, match_status from public.matches where id = mid;
  if gid is null then
    raise exception 'Match not found';
  end if;
  if not exists (select 1 from public.players where id = pid and group_id = gid) then
    raise exception 'Player not in this group';
  end if;
  if not (
    public.is_manager(gid)
    or exists (select 1 from public.players where id = pid and user_id = (select auth.uid()))
  ) then
    raise exception 'You can only sign yourself up';
  end if;
  if match_status <> 'open' then
    raise exception 'Teams are already set: ask an admin to reopen them';
  end if;

  if attending then
    insert into public.match_players (match_id, player_id, form)
    values (mid, pid, p_form)
    on conflict (match_id, player_id) do update set form = excluded.form;
  else
    delete from public.match_players where match_id = mid and player_id = pid;
  end if;
end;
$$;

-- ---------- Constraints (admin) ----------

-- Two players always together, always apart, or no constraint (null).
create function public.set_pair_constraint(mid uuid, pa uuid, pb uuid, constraint_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  select group_id into gid from public.matches where id = mid;
  if gid is null or not public.is_manager(gid) then
    raise exception 'Only owners and admins can set constraints';
  end if;
  delete from public.pair_constraints
  where match_id = mid and ((player_a = pa and player_b = pb) or (player_a = pb and player_b = pa));
  if constraint_type is not null then
    insert into public.pair_constraints (match_id, player_a, player_b, type)
    values (mid, pa, pb, constraint_type);
  end if;
end;
$$;

-- ---------- Teams (admin) ----------

-- Stores the chosen teams. Every signed-up player must be in exactly one team.
-- positions: {"<player id>": "GK" | "DEF" | "MID" | "ATT"}, computed by the app (assignPositions).
create function public.save_teams(mid uuid, team_a uuid[], team_b uuid[], positions jsonb, p_win_prob_a real)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  match_status text;
  signed uuid[];
begin
  select group_id, status into gid, match_status from public.matches where id = mid;
  if gid is null or not public.is_manager(gid) then
    raise exception 'Only owners and admins can set the teams';
  end if;
  if match_status = 'played' then
    raise exception 'This match has already been played';
  end if;
  if cardinality(team_a) = 0 or cardinality(team_b) = 0 or team_a && team_b then
    raise exception 'Invalid teams';
  end if;
  select coalesce(array_agg(player_id), '{}') into signed from public.match_players where match_id = mid;
  if not (signed <@ (team_a || team_b) and (team_a || team_b) <@ signed
          and cardinality(signed) = cardinality(team_a) + cardinality(team_b)) then
    raise exception 'The teams must contain exactly the players signed up';
  end if;

  update public.match_players set
    team = case when player_id = any (team_a) then 'A' else 'B' end,
    position = positions ->> player_id::text
  where match_id = mid;
  update public.matches set status = 'teams_set', win_prob_a = p_win_prob_a where id = mid;
end;
$$;

-- Back to sign-ups (e.g. someone dropped out): teams are cleared.
create function public.reopen_match(mid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  select group_id into gid from public.matches where id = mid and status = 'teams_set';
  if gid is null or not public.is_manager(gid) then
    raise exception 'Only owners and admins can reopen a match with teams set';
  end if;
  update public.match_players set team = null, position = null where match_id = mid;
  update public.matches set status = 'open', win_prob_a = null where id = mid;
end;
$$;
