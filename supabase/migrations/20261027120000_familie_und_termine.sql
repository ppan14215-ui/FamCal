-- FamCal: one family, two parents, one shared calendar (Julian 27.10.).
-- Every row belongs to a family; only its members can read or change it.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Familie',
  -- Six letters the partner types to join; no 0/O/1/I so it reads aloud cleanly.
  invite_code text not null unique default substr(translate(upper(encode(extensions.gen_random_bytes(8), 'base64')), '+/=0O1I', 'ABCDEFG'), 1, 6),
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  -- J is whoever started the family, T the partner. The app maps both to names and colours.
  role text not null check (role in ('J', 'T')),
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (family_id, role)
);
create index family_members_user on public.family_members (user_id);

create table public.events (
  id text primary key,
  family_id uuid not null references public.families on delete cascade,
  title text not null,
  sub text,
  icon text not null default 'kalender',
  date date not null,
  end_date date,
  start_time text not null default '00:00',
  end_time text,
  all_day boolean not null default false,
  who text check (who in ('J', 'T', 'both')),
  place text,
  bring jsonb not null default '[]',
  repeat text,
  reminder text,
  source text,
  -- Calendar it was imported from (google, icloud, outlook) and its id there, so a second import skips it.
  origin text,
  origin_id text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
create index events_family_date on public.events (family_id, date);
create unique index events_origin on public.events (family_id, origin, origin_id) where origin_id is not null;

-- Membership check used by every policy. Security definer so the policy on
-- family_members does not recurse into itself.
create function public.is_member(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id = f and m.user_id = auth.uid());
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;

create policy "Mitglieder sehen ihre Familie" on public.families for select using (public.is_member(id));
create policy "Mitglieder ändern ihre Familie" on public.families for update using (public.is_member(id));
create policy "Mitglieder sehen einander" on public.family_members for select using (public.is_member(family_id));
create policy "Eigenen Namen ändern" on public.family_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Termine lesen" on public.events for select using (public.is_member(family_id));
create policy "Termine anlegen" on public.events for insert with check (public.is_member(family_id));
create policy "Termine ändern" on public.events for update using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "Termine löschen" on public.events for delete using (public.is_member(family_id));

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

-- First sign-in: start a family and become J. Returns the family either way.
create function public.my_family(name text default '') returns public.families
language plpgsql security definer set search_path = '' as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select fam.* into f from public.families fam join public.family_members m on m.family_id = fam.id where m.user_id = auth.uid() limit 1;
  if found then return f; end if;
  insert into public.families (created_by) values (auth.uid()) returning * into f;
  insert into public.family_members (family_id, user_id, role, display_name) values (f.id, auth.uid(), 'J', coalesce(name, ''));
  return f;
end $$;

-- Partner joins with the code. Leaves an empty family of their own behind, never one with Termine.
create function public.join_family(code text, name text default '') returns public.families
language plpgsql security definer set search_path = '' as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into f from public.families where invite_code = upper(trim(code));
  if not found then raise exception 'Code unbekannt'; end if;
  if exists (select 1 from public.family_members where family_id = f.id and user_id = auth.uid()) then return f; end if;
  if exists (select 1 from public.family_members where family_id = f.id and role = 'T') then raise exception 'Familie ist schon vollständig'; end if;
  delete from public.families old where old.created_by = auth.uid() and old.id <> f.id
    and not exists (select 1 from public.events e where e.family_id = old.id);
  insert into public.family_members (family_id, user_id, role, display_name) values (f.id, auth.uid(), 'T', coalesce(name, ''));
  return f;
end $$;

revoke execute on function public.my_family(text), public.join_family(text, text) from anon, public;
grant execute on function public.my_family(text), public.join_family(text, text) to authenticated;

-- Live updates: the partner's phone sees a new Termin right away.
alter publication supabase_realtime add table public.events;
