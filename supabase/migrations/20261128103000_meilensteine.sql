-- Erstes Jahr (Julian 28.11.): who takes a step and whether it is done, for both parents.
-- milestones: one object, key "<birth date>|<step id>", value { who, whoAt, done, doneAt } (times in ms; the newer answer wins).
-- One new column, nothing is deleted; older app versions do not read it and notice nothing.
alter table public.families
  add column milestones jsonb not null default '{}'::jsonb
    check (jsonb_typeof(milestones) = 'object' and pg_column_size(milestones) < 65536);
grant update (milestones) on public.families to authenticated;
