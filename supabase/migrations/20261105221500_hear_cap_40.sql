-- Cost guard (Julian 05.11.2026 22:05 "1-5 machen"): cloud speech cap 120 -> 40 sentences per person per day.
-- Typical use is far below (Julian: 50 in 10 days); 40 still covers a busy day, worst case ~3 €/month per person.
create or replace function public.use_hear_call()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := auth.uid();
  today_hears int;
  day_cap int := 40;
begin
  if me is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.ai_testers t where t.user_id = me) then day_cap := 1000; end if;
  select coalesce(a.hears, 0) into today_hears from public.ai_usage a where a.user_id = me and a.day = current_date;
  if coalesce(today_hears, 0) >= day_cap then return jsonb_build_object('ok', false, 'reason', 'day'); end if;
  insert into public.ai_usage (user_id, day, calls, hears) values (me, current_date, 0, 1)
  on conflict (user_id, day) do update set hears = public.ai_usage.hears + 1;
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.use_hear_call() from public, anon;
grant execute on function public.use_hear_call() to authenticated;
