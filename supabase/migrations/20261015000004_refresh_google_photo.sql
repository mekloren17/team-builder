-- Team Builder — keep the Google picture up to date
-- Supabase refreshes the user's Google data at every sign-in. When the picture changes,
-- update the profile and every card that still shows the old Google picture
-- (cards with an uploaded photo, or with the photo removed, are left alone).

create function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_avatar text;
  new_avatar text := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
begin
  select avatar_url into old_avatar from public.profiles where id = new.id;
  if new_avatar is not null and new_avatar is distinct from old_avatar then
    update public.profiles set avatar_url = new_avatar where id = new.id;
    update public.players set photo_url = new_avatar
    where user_id = new.id and photo_url = old_avatar;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();
