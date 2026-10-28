-- Spoken working hours ("Arbeit 8 bis 17 Uhr ab Dienstag") are shared with the partner (Julian 28.10.).
alter table public.events add column if not exists work boolean not null default false;
