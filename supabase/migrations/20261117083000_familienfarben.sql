-- The parents' colours for the whole family (Julian 17.11.: "Ja, und Farben für beide Handys"). Until now the
-- colour of J and T lived only on the phone that chose it; now both phones show the same.
-- colors: the place in the colour row by role, e.g. {"J": 2, "T": 1}. Empty means the standard colours.
-- One new column, nothing is deleted; older app versions do not read it and notice nothing.
alter table public.families
  add column colors jsonb not null default '{}'::jsonb
    check (jsonb_typeof(colors) = 'object' and pg_column_size(colors) < 200);
grant update (colors) on public.families to authenticated;
