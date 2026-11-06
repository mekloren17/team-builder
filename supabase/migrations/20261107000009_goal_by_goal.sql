-- Team Builder — goals one by one: who scored and who assisted each goal, so the match can show
-- "Scorer (Assist)". match_players.goals / assists stay as totals for the statistics, recomputed
-- from these rows every time the result is entered.

create table public.match_goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  scorer_id uuid references public.players (id) on delete set null, -- null: own goal or not known
  assist_id uuid references public.players (id) on delete set null,
  check (assist_id is null or (scorer_id is not null and assist_id <> scorer_id))
);

create index match_goals_match_id_idx on public.match_goals (match_id);

alter table public.match_goals enable row level security;

create policy "Members read match goals" on public.match_goals
  for select to authenticated using (
    exists (select 1 from public.matches m where m.id = match_id and public.is_group_member(m.group_id))
  );

-- Totals already entered become goal rows; each assist goes with a goal of a teammate of the same
-- match that has none yet (with one goal per team, as so far, that is the right one).
do $$
declare
  r record;
  i int;
begin
  for r in select match_id, team, player_id, goals from public.match_players where goals > 0 and team is not null loop
    for i in 1 .. r.goals loop
      insert into public.match_goals (match_id, team, scorer_id) values (r.match_id, r.team, r.player_id);
    end loop;
  end loop;
  for r in select match_id, team, player_id, assists from public.match_players where assists > 0 and team is not null loop
    for i in 1 .. r.assists loop
      update public.match_goals set assist_id = r.player_id
      where id = (
        select id from public.match_goals
        where match_id = r.match_id and team = r.team and assist_id is null
          and scorer_id is not null and scorer_id <> r.player_id
        limit 1
      );
    end loop;
  end loop;
end;
$$;

-- p_goals: [{"team": "A", "scorer": "<player id>" | null, "assist": "<player id>" | null}, ...]
-- At most as many goals per team as its score; scorer and assist must be players of that team.
drop function public.submit_result(uuid, smallint, smallint, jsonb);

create function public.submit_result(mid uuid, p_score_a smallint, p_score_b smallint, p_goals jsonb default '[]')
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

  -- the goals: right team, players of that team, no more than the score
  p_goals := coalesce(p_goals, '[]');
  if jsonb_typeof(p_goals) <> 'array' then
    raise exception 'Invalid scorers';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_goals) g
    where g ->> 'team' is distinct from 'A' and g ->> 'team' is distinct from 'B'
  ) then
    raise exception 'Invalid scorers';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_goals) g, lateral (values (g ->> 'scorer'), (g ->> 'assist')) v (pid)
    where v.pid is not null and not exists (
      select 1 from public.match_players mp
      where mp.match_id = mid and mp.player_id::text = v.pid and mp.team = g ->> 'team'
    )
  ) then
    raise exception 'Scorers and assists must be players of their team';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_goals) g
    where g ->> 'assist' is not null and (g ->> 'scorer' is null or g ->> 'assist' = g ->> 'scorer')
  ) then
    raise exception 'An assist needs a scorer, and a different player';
  end if;
  if (select count(*) from jsonb_array_elements(p_goals) g where g ->> 'team' = 'A') > p_score_a
     or (select count(*) from jsonb_array_elements(p_goals) g where g ->> 'team' = 'B') > p_score_b then
    raise exception 'More goals listed than the score';
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

  delete from public.match_goals where match_id = mid;
  insert into public.match_goals (match_id, team, scorer_id, assist_id)
  select mid, g ->> 'team', (g ->> 'scorer')::uuid, (g ->> 'assist')::uuid
  from jsonb_array_elements(p_goals) g
  where g ->> 'scorer' is not null; -- goals with no scorer are just the rest of the score

  update public.match_players mp set
    goals = (select count(*) from public.match_goals g where g.match_id = mid and g.scorer_id = mp.player_id),
    assists = (select count(*) from public.match_goals g where g.match_id = mid and g.assist_id = mp.player_id)
  where mp.match_id = mid;
  return new_status;
end;
$$;
