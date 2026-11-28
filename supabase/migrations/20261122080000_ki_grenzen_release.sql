-- KI Grenzen für den Release (Julian 22.11.2026: "Mach, was du selber machen kannst", Go über den Koordinator;
-- Rechnung in /mnt/project-files/famcal/business/ki-kosten-und-release-2026-11-21.md).
-- Ersetzt die nie eingespielten Dateien 20261105221500, 20261105223000 und 20261105224500.
--
-- Sätze (Claude, use_ai_call), pro FAMILIE:
--   Plus und die 14 Probetage: 30 am Tag, 600 im Monat bei bis zu zwei Logins, je weiterem Login +10 / +200,
--   höchstens 60 / 1200 (Julian 05.11.2026 "Große Familien?").
--   Gratis: 30 im Monat (wie bisher).
-- Aufnahmen (Scribe, use_hear_call):
--   Nur Plus und Probetage. Gratis hört mit der Spracherkennung des Handys (kostet nichts; die App fällt bei
--   429 von selbst darauf zurück, src/lib/hoeren.ts und liveEars.ts).
--   40 pro Person am Tag, 1200 pro Familie im Monat.
-- Notbremse gegen Missbrauch: alle Familien zusammen höchstens 5000 Sätze und 5000 Aufnahmen am Tag
--   (etwa 14 $ Claude und 4,50 $ Scribe). Danach antwortet die App mit den Offline Regeln und den Worten
--   des Handys, bis Mitternacht UTC. Normalbetrieb heute: unter 20 am Tag. Vor Wachstum anheben.
-- Testkonten (ai_testers): 1000 am Tag, wie bisher. Vor dem Release wird ai_testers geleert (docs/SICHERHEIT.md).
--
-- Julians eigene Familie bekommt Plus bis Ende 2027, damit seine Probetage am 25.11. nicht seine eigene
-- Nutzung abschneiden. Rückgängig: update families set plus_until = null where id = '79970d8a-...'.

create or replace function public.famcal_tier(fam public.families, me uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when fam.plus_until > now() then 'plus'
    when coalesce(fam.created_at, (select u.created_at from auth.users u where u.id = me)) > now() - interval '14 days' then 'test'
    else 'gratis' end
$$;
revoke all on function public.famcal_tier(public.families, uuid) from public, anon, authenticated;

create or replace function public.use_ai_call() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  fam public.families;
  tier text;
  today_calls int;
  month_calls int;
  all_today int;
  tester boolean := exists (select 1 from public.ai_testers t where t.user_id = auth.uid());
  day_cap int;
  month_cap int;
  members int;
begin
  if me is null then raise exception 'not signed in'; end if;

  select f.* into fam from public.families f
    join public.family_members m on m.family_id = f.id
    where m.user_id = me order by m.joined_at limit 1;
  tier := public.famcal_tier(fam, me);

  select count(*) into members from public.family_members m where m.family_id = fam.id;
  members := greatest(coalesce(members, 1), 2);
  day_cap := least(30 + (members - 2) * 10, 60);
  month_cap := least(600 + (members - 2) * 200, 1200);

  select coalesce(sum(a.calls) filter (where a.day = current_date), 0), coalesce(sum(a.calls), 0)
    into today_calls, month_calls
    from public.ai_usage a
    where a.day >= date_trunc('month', current_date)::date
      and (a.user_id = me or a.user_id in (select m.user_id from public.family_members m where m.family_id = fam.id));

  select coalesce(sum(a.calls), 0) into all_today from public.ai_usage a where a.day = current_date;
  if all_today >= 5000 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'busy'); end if;

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
revoke all on function public.use_ai_call() from public, anon;
grant execute on function public.use_ai_call() to authenticated;

create or replace function public.use_hear_call() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  fam public.families;
  tier text;
  today_hears int;
  month_hears int;
  all_today int;
  tester boolean := exists (select 1 from public.ai_testers t where t.user_id = auth.uid());
begin
  if me is null then raise exception 'not signed in'; end if;

  select f.* into fam from public.families f
    join public.family_members m on m.family_id = f.id
    where m.user_id = me order by m.joined_at limit 1;
  tier := public.famcal_tier(fam, me);

  select coalesce(sum(a.hears), 0) into all_today from public.ai_usage a where a.day = current_date;
  if all_today >= 5000 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'busy'); end if;

  select coalesce(a.hears, 0) into today_hears from public.ai_usage a where a.user_id = me and a.day = current_date;
  today_hears := coalesce(today_hears, 0);

  if tester then
    if today_hears >= 1000 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'day'); end if;
  else
    if tier = 'gratis' then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'plus'); end if;
    if today_hears >= 40 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'day'); end if;
    select coalesce(sum(a.hears), 0) into month_hears from public.ai_usage a
      where a.day >= date_trunc('month', current_date)::date
        and (a.user_id = me or a.user_id in (select m.user_id from public.family_members m where m.family_id = fam.id));
    if month_hears >= 1200 then return jsonb_build_object('ok', false, 'tier', tier, 'reason', 'month'); end if;
  end if;

  insert into public.ai_usage (user_id, day, calls, hears) values (me, current_date, 0, 1)
  on conflict (user_id, day) do update set hears = public.ai_usage.hears + 1;
  return jsonb_build_object('ok', true, 'tier', tier);
end $$;
revoke all on function public.use_hear_call() from public, anon;
grant execute on function public.use_hear_call() to authenticated;

update public.families set plus_until = '2027-12-31 23:59:59+00'
  where id = '79970d8a-dc92-495d-87c5-72eb71695036' and plus_until is null;
