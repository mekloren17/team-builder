-- Team Builder — goals and assists of each player, entered (optionally) with the result.
-- They are statistics only: ratings and cards do not use them (decided with Lorenzo, 07/11/2026).
-- They follow the result: confirmed with it, replaced when the result is entered again.

alter table public.match_players
  add column goals smallint not null default 0 check (goals between 0 and 99),
  add column assists smallint not null default 0 check (assists between 0 and 99);

-- Same rules as before, plus the scorers. p_stats: {"<player id>": {"g": goals, "a": assists}}, players
-- left out have none. Per team: goals at most the team's score (the rest are own goals or unknown),
-- assists at most its goals.
drop function public.submit_result(uuid, smallint, smallint);

create function public.submit_result(mid uuid, p_score_a smallint, p_score_b smallint, p_stats jsonb default '{}')
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
  bad record;
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

  -- scorers: only players of this match, sensible numbers
  p_stats := coalesce(p_stats, '{}');
  if jsonb_typeof(p_stats) <> 'object' then
    raise exception 'Invalid scorers';
  end if;
  if exists (
    select 1 from jsonb_each(p_stats) s
    where not exists (
      select 1 from public.match_players mp where mp.match_id = mid and mp.player_id::text = s.key and mp.team is not null
    )
  ) then
    raise exception 'Scorers must be players of this match';
  end if;
  if exists (
    select 1 from jsonb_each(p_stats) s
    where coalesce((s.value ->> 'g')::int, 0) not between 0 and 99 or coalesce((s.value ->> 'a')::int, 0) not between 0 and 99
  ) then
    raise exception 'Invalid scorers';
  end if;
  select mp.team, sum(coalesce((p_stats -> mp.player_id::text ->> 'g')::int, 0)) as g,
         sum(coalesce((p_stats -> mp.player_id::text ->> 'a')::int, 0)) as a
  into bad
  from public.match_players mp
  where mp.match_id = mid and mp.team is not null
  group by mp.team
  having sum(coalesce((p_stats -> mp.player_id::text ->> 'g')::int, 0)) > case when mp.team = 'A' then p_score_a else p_score_b end
      or sum(coalesce((p_stats -> mp.player_id::text ->> 'a')::int, 0)) > sum(coalesce((p_stats -> mp.player_id::text ->> 'g')::int, 0))
  limit 1;
  if found then
    raise exception 'Team %: more scorers than goals, or more assists than goals', bad.team;
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
  update public.match_players set
    goals = coalesce((p_stats -> player_id::text ->> 'g')::smallint, 0),
    assists = coalesce((p_stats -> player_id::text ->> 'a')::smallint, 0)
  where match_id = mid;
  return new_status;
end;
$$;
