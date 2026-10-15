-- Team Builder — groups, invites, player profile and guests
-- All writes go through these functions: they check who is calling and change only what that person may change.

-- ---------- Helpers ----------

-- Role of the signed-in user in a group ('owner', 'admin', 'player'), or null if not a member.
create function public.my_role(gid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.players
  where group_id = gid and user_id = (select auth.uid());
$$;

-- Adds a user to a group. The questionnaire is copied from the user's most recent
-- filled-in profile in another group, so it only has to be answered once.
create function public._add_member(gid uuid, uid uuid, member_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
begin
  insert into public.players (
    group_id, user_id, display_name, role,
    birth_year, max_level, years_played, frequency, positions, gk_rotation, foot, attributes, gk_rating,
    prior_overall, mu
  )
  select
    gid, uid, coalesce(src.display_name, pr.name), member_role,
    src.birth_year, src.max_level, src.years_played, src.frequency, coalesce(src.positions, '{}'),
    coalesce(src.gk_rotation, false), src.foot, src.attributes, src.gk_rating,
    src.prior_overall, src.prior_overall
  from public.profiles pr
  left join lateral (
    select * from public.players p
    where p.user_id = uid and p.prior_overall is not null
    order by p.created_at desc
    limit 1
  ) src on true
  where pr.id = uid
  returning id into pid;

  if pid is null then
    raise exception 'Profile not found';
  end if;
  return pid;
end;
$$;

revoke execute on function public._add_member(uuid, uuid, text) from public, anon, authenticated;

-- ---------- Groups and invites ----------

create function public.create_group(group_name text, group_format smallint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  insert into public.groups (name, default_format, owner_id)
  values (trim(group_name), group_format, uid)
  returning id into gid;
  perform public._add_member(gid, uid, 'owner');
  return gid;
end;
$$;

-- What the invite page shows before joining. Knowing the code is what grants access.
create function public.group_preview(code text)
returns table (id uuid, name text, member_count bigint, is_member boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name,
    (select count(*) from public.players p where p.group_id = g.id),
    exists (select 1 from public.players p where p.group_id = g.id and p.user_id = (select auth.uid()))
  from public.groups g
  where g.invite_code = code;
$$;

create function public.join_group(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select id into gid from public.groups where invite_code = code;
  if gid is null then
    raise exception 'Invalid invite link';
  end if;
  if not exists (select 1 from public.players where group_id = gid and user_id = uid) then
    perform public._add_member(gid, uid, 'player');
  end if;
  return gid;
end;
$$;

-- ---------- Player profile ----------

-- Saves the questionnaire of the signed-in user in all their groups.
-- prior_overall is computed by the app with the engine (initialOverall); the database only checks its range.
-- The rating (mu) follows the new overall only where no match has been played yet:
-- after that it is recomputed from the match history.
create function public.save_my_profile(
  p_display_name text,
  p_birth_year smallint,
  p_max_level text,
  p_years_played text,
  p_frequency text,
  p_positions text[],
  p_gk_rotation boolean,
  p_foot text,
  p_attributes smallint[],
  p_gk_rating smallint,
  p_prior_overall smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(array_length(p_positions, 1), 0) = 0 then
    raise exception 'Choose at least one position';
  end if;
  update public.players set
    display_name = trim(p_display_name),
    birth_year = p_birth_year,
    max_level = p_max_level,
    years_played = p_years_played,
    frequency = p_frequency,
    positions = p_positions,
    gk_rotation = p_gk_rotation,
    foot = p_foot,
    attributes = p_attributes,
    gk_rating = case when 'GK' = any (p_positions) then p_gk_rating end,
    prior_overall = p_prior_overall,
    mu = case when matches_played = 0 then p_prior_overall else mu end
  where user_id = auth.uid();
end;
$$;

-- ---------- Guests and roles (group settings) ----------

-- A player without an account, added by an owner or admin with an estimated overall.
create function public.add_guest(gid uuid, guest_name text, estimated_overall smallint, guest_positions text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
begin
  if coalesce(public.my_role(gid), 'player') = 'player' then
    raise exception 'Only owners and admins can add guests';
  end if;
  insert into public.players (group_id, display_name, role, positions, prior_overall, mu)
  values (gid, trim(guest_name), 'player', guest_positions, estimated_overall, estimated_overall)
  returning id into pid;
  return pid;
end;
$$;

-- Removes a guest added by mistake (only while they have no matches).
create function public.remove_guest(pid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  select group_id into gid from public.players
  where id = pid and user_id is null and matches_played = 0;
  if gid is null then
    raise exception 'Guest not found, or already played';
  end if;
  if coalesce(public.my_role(gid), 'player') = 'player' then
    raise exception 'Only owners and admins can remove guests';
  end if;
  delete from public.players where id = pid;
end;
$$;

-- The owner makes a member admin, or back to player.
create function public.set_member_role(pid uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if new_role not in ('admin', 'player') then
    raise exception 'Invalid role';
  end if;
  select group_id into gid from public.players
  where id = pid and user_id is not null and role <> 'owner';
  if gid is null then
    raise exception 'Member not found';
  end if;
  if public.my_role(gid) is distinct from 'owner' then
    raise exception 'Only the owner can change roles';
  end if;
  update public.players set role = new_role where id = pid;
end;
$$;
