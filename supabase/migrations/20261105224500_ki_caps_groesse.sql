-- AI caps scale with family size (Julian 05.11.2026 22:16 "Große Familien?"): 30 a day and 600 a month
-- for up to two logins, +10 a day and +200 a month for each further member with an own login, at most
-- 60 / 1200. Free tier stays 30 a month, test accounts 1000 a day. Replaces 20261105223000.
-- At any cap the app falls back to the offline rules, so entries still land (src/lib/verstehen.ts capped()).
create or replace function public.use_ai_call() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  fam public.families;
  tier text;
  today_calls int;
  month_calls int;
  tester boolean := exists (select 1 from public.ai_testers t where t.user_id = auth.uid());
  day_cap int;
  month_cap int;
  members int;
begin
  if me is null then raise exception 'not signed in'; end if;

  select f.* into fam from public.families f
    join public.family_members m on m.family_id = f.id
    where m.user_id = me order by m.joined_at limit 1;

  tier := case
    when fam.plus_until > now() then 'plus'
    when coalesce(fam.created_at, (select u.created_at from auth.users u where u.id = me)) > now() - interval '14 days' then 'test'
    else 'gratis' end;

  -- Bigger families get more: 30 a day / 600 a month cover two logins, +10 / +200 for each further login,
  -- at most 60 / 1200.
  select count(*) into members from public.family_members m where m.family_id = fam.id;
  members := greatest(coalesce(members, 1), 2);
  day_cap := least(30 + (members - 2) * 10, 60);
  month_cap := least(600 + (members - 2) * 200, 1200);

  -- The whole family (all logins) this day and this month.
  select coalesce(sum(a.calls) filter (where a.day = current_date), 0),
         coalesce(sum(a.calls), 0)
    into today_calls, month_calls
    from public.ai_usage a
    where a.day >= date_trunc('month', current_date)::date
      and (a.user_id = me or a.user_id in (select m.user_id from public.family_members m where m.family_id = fam.id));

  if tester then
    select coalesce(sum(a.calls), 0) into today_calls from public.ai_usage a where a.user_id = me and a.day = current_date;
    if today_calls >= 1000 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'day'); end if;
  else
    if tier = 'gratis' and month_calls >= 30 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'month', 'left', 0); end if;
    if today_calls >= day_cap then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'day'); end if;
    if month_calls >= month_cap then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'month'); end if;
  end if;

  insert into public.ai_usage (user_id, day, calls) values (me, current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1;

  return jsonb_build_object('ok', true, 'tier', tier, 'left', case when tier = 'gratis' and not tester then 29 - month_calls end);
end $$;
