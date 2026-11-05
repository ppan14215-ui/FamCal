-- RevenueCat webhook log (05.11.2026): every event once, so retries never apply twice.
-- Only the service role (the webhook) reads and writes; no policy for app users.
create table if not exists public.revenuecat_events (
  id text primary key,
  type text not null,
  app_user_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
alter table public.revenuecat_events enable row level security;
