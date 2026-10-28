-- Qualitätstest (Julian 28.10.): 30 feste Sätze laufen aus der Test App durch
-- "verstehen"; jedes Ergebnis landet hier, damit die Auswertung ohne Handy geht.
create table if not exists public.eval_runs (
  id bigint generated always as identity primary key,
  run_id text not null,
  case_id text not null,
  said text not null,
  ok boolean not null,
  failed text[] not null default '{}',
  got jsonb,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.eval_runs enable row level security;

create policy "eval_runs insert own" on public.eval_runs
  for insert to authenticated with check (user_id = auth.uid());

create policy "eval_runs read own" on public.eval_runs
  for select to authenticated using (user_id = auth.uid());

create index if not exists eval_runs_run on public.eval_runs (run_id);
