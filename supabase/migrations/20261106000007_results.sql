-- Team Builder — match results and ratings
-- A result entered by a player who played is pending until a player of the other team (or an admin)
-- confirms it. A result entered by an owner or admin is final at once. A disputed result is settled
-- by an admin entering the right score. Ratings are recomputed by the app server (engine:
-- estimateRatings) after each confirmed result and written with apply_ratings, which only the
-- server's secret key can call.

-- The signed-in user's player in a group (null if not a member).
create function public.my_player(gid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.players where group_id = gid and user_id = (select auth.uid());
$$;

-- ---------- Enter the result ----------

-- Owners and admins: the result is confirmed (also to correct a pending, disputed or confirmed one).
-- Players who played: the result is pending, while no result is confirmed or disputed yet.
-- Returns the new result_status.
create function public.submit_result(mid uuid, p_score_a smallint, p_score_b smallint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  me uuid;
  manager boolean;
  new_status text;
begin
  select * into m from public.matches where id = mid;
  if m.id is null then
    raise exception 'Match not found';
  end if;
  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0 or p_score_a > 99 or p_score_b > 99 then
    raise exception 'Invalid score';
  end if;
  if m.status = 'open' then
    raise exception 'The teams are not set yet';
  end if;
  if m.starts_at > now() then
    raise exception 'The match has not started yet';
  end if;

  me := public.my_player(m.group_id);
  manager := public.is_manager(m.group_id);
  if not manager then
    if not exists (select 1 from public.match_players where match_id = mid and player_id = me and team is not null) then
      raise exception 'Only players of this match or an admin can enter the result';
    end if;
    if m.result_status in ('confirmed', 'disputed') then
      raise exception 'The result is already %: ask an admin', m.result_status;
    end if;
  end if;

  new_status := case when manager then 'confirmed' else 'pending' end;
  update public.matches set
    status = 'played',
    score_a = p_score_a,
    score_b = p_score_b,
    result_status = new_status,
    result_by = me,
    confirmed_by = case when manager then me else null end
  where id = mid;
  return new_status;
end;
$$;

-- True if the signed-in user may confirm or dispute the pending result: an owner or admin,
-- or a player of the other team than the one who entered it.
create function public.can_answer_result(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.is_manager(m.group_id)
    or exists (
      select 1
      from public.match_players me_mp
      join public.match_players by_mp on by_mp.match_id = me_mp.match_id and by_mp.player_id = m.result_by
      where me_mp.match_id = m.id
        and me_mp.player_id = public.my_player(m.group_id)
        and me_mp.team is not null
        and me_mp.team <> by_mp.team
    ),
    false
  )
  from public.matches m
  where m.id = mid;
$$;

create function public.confirm_result(mid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = mid;
  if m.id is null or m.result_status is null then
    raise exception 'No result to confirm';
  end if;
  if m.result_status = 'confirmed' then
    return;
  end if;
  -- a disputed result is settled only by an admin
  if m.result_status = 'disputed' and not public.is_manager(m.group_id) then
    raise exception 'The result is disputed: an admin decides';
  end if;
  if not public.can_answer_result(mid) then
    raise exception 'Only a player of the other team or an admin can confirm the result';
  end if;
  update public.matches set result_status = 'confirmed', confirmed_by = public.my_player(m.group_id) where id = mid;
end;
$$;

create function public.dispute_result(mid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = mid;
  if m.id is null or m.result_status is distinct from 'pending' then
    raise exception 'Only a pending result can be disputed';
  end if;
  if not public.can_answer_result(mid) then
    raise exception 'Only a player of the other team or an admin can dispute the result';
  end if;
  update public.matches set result_status = 'disputed' where id = mid;
end;
$$;

-- ---------- Ratings (server only) ----------

-- Writes the ratings recomputed by the app (ratings: {"<player id>": mu}) and recounts the
-- confirmed matches of each player. With mid, also stores each of its players' rating before and
-- after that match (the "before" is kept from the first time, if the result is later corrected).
-- One call = one transaction.
create function public.apply_ratings(gid uuid, ratings jsonb, mid uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if mid is not null then
    update public.match_players mp set
      mu_before = coalesce(mp.mu_before, p.mu, p.prior_overall),
      mu_after = (ratings ->> p.id::text)::real
    from public.players p
    where mp.match_id = mid and p.id = mp.player_id and mp.team is not null and ratings ? p.id::text;
  end if;

  update public.players p set mu = (ratings ->> p.id::text)::real
  where p.group_id = gid and ratings ? p.id::text;

  update public.players p set matches_played = (
    select count(*)
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
    where mp.player_id = p.id and mp.team is not null and m.result_status = 'confirmed'
  )
  where p.group_id = gid;
end;
$$;

-- Postgres lets everyone execute new functions by default: apply_ratings is for the server only.
revoke execute on function public.apply_ratings(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.apply_ratings(uuid, jsonb, uuid) to service_role;
