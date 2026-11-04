-- Team Builder — goalkeepers get their own questionnaire
-- A player who plays mostly in goal ("keeper") answers six keeper skills instead of the outfield ones:
-- Reflexes, Positioning, Handling, Coming out, Distribution, Playing with feet (each 1..5).
-- Their overall and card come from those answers. The old single gk_rating stays in the table but is no longer asked.

alter table public.players
  add column keeper boolean not null default false,
  add column gk_attributes smallint[] check (
    gk_attributes is null
    or (array_length(gk_attributes, 1) = 6 and 1 <= all (gk_attributes) and 5 >= all (gk_attributes))
  );

-- New members copy the questionnaire from their other groups: now including the keeper answers.
create or replace function public._add_member(gid uuid, uid uuid, member_role text)
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
    keeper, gk_attributes,
    prior_overall, mu, photo_url
  )
  select
    gid, uid, coalesce(src.display_name, pr.name), member_role,
    src.birth_year, src.max_level, src.years_played, src.frequency, coalesce(src.positions, '{}'),
    coalesce(src.gk_rotation, false), src.foot, src.attributes, src.gk_rating,
    coalesce(src.keeper, false), src.gk_attributes,
    src.prior_overall, src.prior_overall, coalesce(src.photo_url, pr.avatar_url)
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

-- The questionnaire save, now with the keeper answers. Same rules as before (all the user's groups,
-- mu follows the new overall only before the first match).
drop function public.save_my_profile(text, smallint, text, text, text, text[], boolean, text, smallint[], smallint, smallint);

create function public.save_my_profile(
  p_display_name text,
  p_birth_year smallint,
  p_max_level text,
  p_years_played text,
  p_frequency text,
  p_positions text[],
  p_gk_rotation boolean,
  p_foot text,
  p_keeper boolean,
  p_attributes smallint[],
  p_gk_attributes smallint[],
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
  if p_keeper and (p_gk_attributes is null or not 'GK' = any (p_positions)) then
    raise exception 'A keeper needs the goalkeeper answers';
  end if;
  if not p_keeper and p_attributes is null then
    raise exception 'Answer the skill questions';
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
    keeper = p_keeper,
    -- keep the answers of the other role, in case the player switches back later
    attributes = coalesce(p_attributes, attributes),
    gk_attributes = coalesce(p_gk_attributes, gk_attributes),
    prior_overall = p_prior_overall,
    mu = case when matches_played = 0 then p_prior_overall else mu end
  where user_id = auth.uid();
end;
$$;
