-- Listen und Aufgaben teilen (Julian 29.10., decision card "Ja, Listen teilen").
-- One row per list, per list item and per task, so two people changing the
-- same list at once only collide on the very same row.
create table public.family_docs (
  family_id uuid not null references public.families on delete cascade,
  type text not null check (type in ('list', 'item', 'task')),
  id text not null check (char_length(id) between 1 and 80),
  parent text,
  section text,
  pos integer not null default 0,
  data jsonb not null check (pg_column_size(data) < 32000),
  updated_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  primary key (family_id, type, id)
);
alter table public.family_docs enable row level security;
create policy "Listen lesen" on public.family_docs for select using (public.is_member(family_id));
create policy "Listen anlegen" on public.family_docs for insert with check (public.is_member(family_id));
create policy "Listen ändern" on public.family_docs for update using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "Listen löschen" on public.family_docs for delete using (public.is_member(family_id));
grant select, insert, update, delete on public.family_docs to authenticated;
-- Who changed it comes from the session, never from the phone.
create function public.docs_touch() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.docs_touch() from public, anon, authenticated;
create trigger family_docs_touch before insert or update on public.family_docs for each row execute function public.docs_touch();
alter publication supabase_realtime add table public.family_docs;
