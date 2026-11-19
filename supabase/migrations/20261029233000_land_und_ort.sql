-- Feiertage für jedes Land (Julian 29.10.: "wenn man aus den USA joined sollte es ähnlich funktionieren").
-- country: ISO code (DE, US, ...); land is then the Bundesland or the region code (US-CA).
-- ort: only for holidays that depend on the Gemeinde (Bayern: Mariä Himmelfahrt, Augsburg: Friedensfest).
alter table public.families
  add column country text check (country ~ '^[A-Z]{2}$'),
  add column ort text check (char_length(ort) <= 80);
grant update (country, ort) on public.families to authenticated;
