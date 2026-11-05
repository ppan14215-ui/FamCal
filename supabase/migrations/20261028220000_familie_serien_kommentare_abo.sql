-- Lücken zu TimeTree (Julian 28.10.: "Alles umsetzen").
-- 1. More people than the two parents: children, grandparents and others, as profiles in the family.
-- 2. Termine get who else is there, a note, a countdown and proper series (end, skipped days).
-- 3. Comments on a Termin, so the partner sees "Ich hol ihn ab".
-- 4. A secret calendar feed per family, for Apple and Google Kalender (Abo) and for export.

-- 1. People. J and T stay the two parents (family_members); everyone else lives here.
create table public.family_people (
  family_id uuid not null references public.families on delete cascade,
  id text not null check (id ~ '^p_[a-z0-9]{4,24}$'),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'kind' check (kind in ('kind', 'grosseltern', 'andere')),
  color text not null default 'Mint' check (char_length(color) <= 20),
  birthday date,
  created_at timestamptz not null default now(),
  primary key (family_id, id)
);
alter table public.family_people enable row level security;
create policy "Personen lesen" on public.family_people for select using (public.is_member(family_id));
create policy "Personen anlegen" on public.family_people for insert with check (public.is_member(family_id));
create policy "Personen ändern" on public.family_people for update using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "Personen löschen" on public.family_people for delete using (public.is_member(family_id));
grant select, insert, update, delete on public.family_people to authenticated;

-- 2. Termine.
alter table public.events
  add column people text[] not null default '{}' check (cardinality(people) <= 20),
  add column note text check (char_length(note) <= 2000),
  add column countdown boolean not null default false,
  add column repeat_until date,
  add column skip_dates date[] not null default '{}' check (cardinality(skip_dates) <= 400);

-- 3. Comments. Only the author changes or deletes their own; everyone in the family reads them.
create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  event_id text not null references public.events on delete cascade,
  author uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('J', 'T')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index event_comments_event on public.event_comments (event_id, created_at);
alter table public.event_comments enable row level security;
create policy "Kommentare lesen" on public.event_comments for select using (public.is_member(family_id));
create policy "Kommentare schreiben" on public.event_comments for insert with check (public.is_member(family_id) and author = auth.uid());
create policy "Eigene Kommentare löschen" on public.event_comments for delete using (author = auth.uid());
grant select, insert, delete on public.event_comments to authenticated;
-- The role comes from the membership, never from the phone.
create function public.comment_role() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select m.role into new.role from public.family_members m where m.family_id = new.family_id and m.user_id = auth.uid();
  if new.role is null then raise exception 'not a member'; end if;
  return new;
end $$;
create trigger event_comments_role before insert on public.event_comments for each row execute function public.comment_role();
alter publication supabase_realtime add table public.event_comments;
alter publication supabase_realtime add table public.family_people;

-- 4. Calendar feed. The token is the only key: whoever has the link sees the Termine, so it can be renewed.
alter table public.families add column ics_token uuid not null default gen_random_uuid();
create unique index families_ics_token on public.families (ics_token);

create function public.renew_ics_token() returns uuid
language plpgsql security definer set search_path = '' as $$
declare f uuid; t uuid := gen_random_uuid();
begin
  select m.family_id into f from public.family_members m where m.user_id = auth.uid() order by m.joined_at limit 1;
  if f is null then raise exception 'no family'; end if;
  update public.families set ics_token = t where id = f;
  return t;
end $$;
revoke all on function public.renew_ics_token() from public, anon;
grant execute on function public.renew_ics_token() to authenticated;

-- Read by the "kalender" edge function with the anon key. Only shared Termine, never the phone's own calendars,
-- and nothing older than a year so the feed stays small.
create function public.ics_feed(token uuid) returns table (
  id text, title text, sub text, place text, note text, date date, end_date date, start_time text, end_time text,
  all_day boolean, repeat text, repeat_until date, skip_dates date[], updated_at timestamptz, family_name text
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.title, e.sub, e.place, e.note, e.date, e.end_date, e.start_time, e.end_time,
         e.all_day, e.repeat, e.repeat_until, e.skip_dates, e.updated_at, f.name
  from public.families f join public.events e on e.family_id = f.id
  where f.ics_token = token and e.work = false and coalesce(e.end_date, e.date) >= current_date - 365
  order by e.date limit 2000;
$$;
revoke all on function public.ics_feed(uuid) from public;
grant execute on function public.ics_feed(uuid) to anon, authenticated;
