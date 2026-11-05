-- Familienchat (Julian 29.10., decision card "Ja, Tabelle anlegen"): one log per
-- family. Each row is what someone said or typed, and either a plain message or
-- a snapshot of the card it made, so the partner sees it even before lists sync.
create table public.family_feed (
  id text primary key check (char_length(id) between 4 and 64),
  family_id uuid not null references public.families on delete cascade,
  author uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('J', 'T')),
  kind text not null check (kind in ('made', 'msg')),
  said text not null check (char_length(said) between 1 and 2000),
  card jsonb not null default '{}'::jsonb check (pg_column_size(card) < 16000),
  undone boolean not null default false,
  created_at timestamptz not null default now()
);
create index family_feed_family on public.family_feed (family_id, created_at);
alter table public.family_feed enable row level security;
create policy "Chat lesen" on public.family_feed for select using (public.is_member(family_id));
create policy "Chat schreiben" on public.family_feed for insert with check (public.is_member(family_id) and author = auth.uid());
create policy "Eigenes rückgängig" on public.family_feed for update using (author = auth.uid()) with check (author = auth.uid() and public.is_member(family_id));
create policy "Eigenes löschen" on public.family_feed for delete using (author = auth.uid());
grant select, insert, update, delete on public.family_feed to authenticated;
-- The role comes from the membership, never from the phone (same function as for comments).
create trigger family_feed_role before insert on public.family_feed for each row execute function public.comment_role();
alter publication supabase_realtime add table public.family_feed;
