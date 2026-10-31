-- Urlaubstage pro Person und Bundesland der Familie (Julian 29.10.: "Pro Person unterschiedlich und sollte
-- im Onboarding bzw. Settings einstellbar sein"; "Feiertage sind automatisch eingetragen").
-- vacation: days per year by role, e.g. {"J": 30, "T": 28}. land decides which holidays the calendar shows.
alter table public.families
  add column vacation jsonb not null default '{}'::jsonb
    check (jsonb_typeof(vacation) = 'object' and pg_column_size(vacation) < 200),
  add column land text check (char_length(land) <= 40);
grant update (vacation, land) on public.families to authenticated;
