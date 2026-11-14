-- Name der Partnerin oder des Partners, bevor sie beitritt (Julian 28.10.: "Julian und Sophia").
-- Until the partner joins with the code there is no member row for T, so the name the family
-- typed in onboarding lives here. Once T joins, their own display_name wins.
alter table public.families add column partner_name text check (char_length(partner_name) <= 40);
grant update (partner_name) on public.families to authenticated;
