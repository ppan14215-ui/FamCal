-- Plus test and free limit (Julian 27.10.: "14 Tage Plus, dann 30 Sätze im Monat").
-- Every family starts with 14 days of Plus. After that, talking to Claude stays free for
-- 30 sentences a month per family; Plus makes it unlimited. Invited members use their family's plan.

-- Set only by the payment webhook (RevenueCat, later) with the service role; members can read it.
alter table public.families add column plus_until timestamptz;

-- Replaces count_ai_call (kept, but nobody may call it any more): checks the plan first and
-- counts only calls that go through, so a blocked sentence costs nothing and uses no quota.
revoke execute on function public.count_ai_call() from authenticated;

create function public.use_ai_call() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  fam public.families;
  tier text;
  today_calls int;
  month_calls int;
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
  if today_calls >= 60 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'day'); end if;
  if tier = 'gratis' and month_calls >= 30 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'month', 'left', 0); end if;

  insert into public.ai_usage (user_id, day, calls) values (me, current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1;

  return jsonb_build_object('ok', true, 'tier', tier, 'left', case when tier = 'gratis' then 29 - month_calls end);
end $$;
revoke execute on function public.use_ai_call() from anon, public;
grant execute on function public.use_ai_call() to authenticated;

-- Members may rename their family but never give themselves Plus.
revoke update on public.families from anon, authenticated;
grant update (name) on public.families to authenticated;
