-- Standarddauer neuer Termine for the whole family (Julian 19.11.: settings by telling Memo, "Ja" to family settings).
-- termin_dauer: minutes a new Termin with a start and no end lasts; 0 = none set on purpose, null = never set.
-- One new column, nothing is deleted; older app versions do not read it and notice nothing.
alter table public.families
  add column termin_dauer smallint
    check (termin_dauer is null or termin_dauer = 0 or termin_dauer between 15 and 720);
grant update (termin_dauer) on public.families to authenticated;
