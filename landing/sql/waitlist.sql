-- Warteliste der Landing Page (Supabase Projekt jzfubxcdpznzxqtvnodm). Besucher dürfen nur eintragen, nie lesen.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lang text check (lang in ('de','en')),
  source text check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_lower on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
grant insert (email, lang, source) on public.waitlist to anon;
drop policy if exists "landing can insert" on public.waitlist;
create policy "landing can insert" on public.waitlist for insert to anon with check (true);
