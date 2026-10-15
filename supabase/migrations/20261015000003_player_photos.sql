-- Team Builder — player photos on the cards
-- Photos live in a public storage bucket under unguessable file names:
--   users/<user id>/<random>.webp    the user's own photo (shown in all their groups)
--   guests/<player id>/<random>.webp a guest's photo, uploaded by an owner or admin
-- Without an uploaded photo, the card uses the Google profile picture, then initials.

alter table public.players add column photo_url text;

-- Existing members start with their Google picture.
update public.players p
set photo_url = pr.avatar_url
from public.profiles pr
where p.user_id = pr.id and p.photo_url is null;

-- New members too: same as before, plus the photo (from another group, else from Google).
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
    prior_overall, mu, photo_url
  )
  select
    gid, uid, coalesce(src.display_name, pr.name), member_role,
    src.birth_year, src.max_level, src.years_played, src.frequency, coalesce(src.positions, '{}'),
    coalesce(src.gk_rotation, false), src.foot, src.attributes, src.gk_rating,
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

-- ---------- Storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', true, 1048576, array['image/webp', 'image/jpeg']);

-- True if the signed-in user is an owner or admin of the group of this guest (player id as text, from the path).
create function public.can_manage_guest(pid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players g
    join public.players me on me.group_id = g.group_id and me.user_id = (select auth.uid())
    where g.id::text = pid and g.user_id is null and me.role in ('owner', 'admin')
  );
$$;

create policy "Users upload their own photo" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "Users delete their own photo" on storage.objects
  for delete to authenticated using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "Admins upload guest photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = 'guests'
    and public.can_manage_guest((storage.foldername(name))[2])
  );

create policy "Admins delete guest photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = 'guests'
    and public.can_manage_guest((storage.foldername(name))[2])
  );

-- ---------- Setting the photo on the card ----------

-- Only photos from our bucket (or null, to remove it).
create function public._valid_photo_url(url text)
returns boolean
language sql
immutable
set search_path = ''
as $
  select url is null or url like 'https://%/storage/v1/object/public/player-photos/%';
$$;

create function public.set_my_photo(url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not public._valid_photo_url(url) then
    raise exception 'Invalid photo';
  end if;
  update public.players set photo_url = url where user_id = auth.uid();
end;
$$;

create function public.set_guest_photo(pid uuid, url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_guest(pid::text) then
    raise exception 'Only owners and admins can change a guest''s photo';
  end if;
  if not public._valid_photo_url(url) then
    raise exception 'Invalid photo';
  end if;
  update public.players set photo_url = url where id = pid;
end;
$$;
