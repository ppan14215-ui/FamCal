-- Testkonten (Julian 28.10.): the daily cap of 60 stopped the quality test, so test
-- accounts get 1000 sentences a day and no month cap. Rows are added by hand with the
-- service role; nobody can read or write this table through the API.
create table public.ai_testers (user_id uuid primary key references auth.users on delete cascade);
alter table public.ai_testers enable row level security;
revoke all on public.ai_testers from anon, authenticated;

create or replace function public.use_ai_call() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  fam public.families;
  tier text;
  today_calls int;
  month_calls int;
  tester boolean := exists (select 1 from public.ai_testers t where t.user_id = auth.uid());
  day_cap int := 60;
begin
  if me is null then raise exception 'not signed in'; end if;

  select f.* into fam from public.families f
    join public.family_members m on m.family_id = f.id
    where m.user_id = me order by m.joined_at limit 1;

  tier := case
    when fam.plus_until > now() then 'plus'
    when coalesce(fam.created_at, (select u.created_at from auth.users u where u.id = me)) > now() - interval '14 days' then 'test'
    else 'gratis' end;

  select coalesce(sum(a.calls) filter (where a.user_id = me and a.day = current_date), 0),
         coalesce(sum(a.calls), 0)
    into today_calls, month_calls
    from public.ai_usage a
    where a.day >= date_trunc('month', current_date)::date
      and (a.user_id = me or a.user_id in (select m.user_id from public.family_members m where m.family_id = fam.id));

  -- Cost guard for everyone, Plus too: about 20 sentences is a busy day, 60 stops scripts.
  -- Test accounts (Julian 28.10.): 1000 a day, no month cap. Not unlimited, because the
  -- test password ships inside the preview APK.
  if tester then day_cap := 1000; end if;
  if today_calls >= day_cap then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'day'); end if;
  if tier = 'gratis' and not tester and month_calls >= 30 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'month', 'left', 0); end if;

  insert into public.ai_usage (user_id, day, calls) values (me, current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1;

  return jsonb_build_object('ok', true, 'tier', tier, 'left', case when tier = 'gratis' then 29 - month_calls end);
end $$;
