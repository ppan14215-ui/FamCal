-- Datenschutz (Julian 05.11.2026 22:21 / 22:34).
--
-- 1. Ohne KI: one switch for the whole family. While it is on, the functions
--    assistent, verstehen, hoeren and liste refuse every call of this family,
--    so no phone of theirs sends the family's data to Claude or ElevenLabs.
alter table public.families add column if not exists ohne_ki boolean not null default false;
grant update (ohne_ki) on public.families to authenticated;

-- 2. Alle Daten löschen: the account and everything only it holds.
--    The family's shared calendar stays with the partner while one is left;
--    with nobody left, the family and all its rows go (on delete cascade).
--    families.created_by cascades too, so it first moves to the remaining member.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  f record;
  heir uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  for f in select m.family_id from public.family_members m where m.user_id = me loop
    select m.user_id into heir from public.family_members m
      where m.family_id = f.family_id and m.user_id <> me order by m.joined_at limit 1;
    if heir is null then
      delete from public.families where id = f.family_id;
    else
      update public.families set created_by = heir where id = f.family_id and created_by = me;
    end if;
  end loop;
  delete from public.ai_usage where user_id = me;
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
