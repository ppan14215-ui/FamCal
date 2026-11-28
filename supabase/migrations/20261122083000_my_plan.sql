-- The app asks which plan the family has (src/lib/plan.ts), so free families do not even try the cloud ears.
-- Read only, same rule as use_ai_call / use_hear_call (famcal_tier). Julian 22.11.2026, MVP gates.
create or replace function public.my_plan() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  fam public.families;
begin
  if me is null then raise exception 'not signed in'; end if;
  select f.* into fam from public.families f
    join public.family_members m on m.family_id = f.id
    where m.user_id = me order by m.joined_at limit 1;
  return jsonb_build_object(
    'tier', public.famcal_tier(fam, me),
    'plus_until', fam.plus_until,
    'tester', exists (select 1 from public.ai_testers t where t.user_id = me));
end $$;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;
