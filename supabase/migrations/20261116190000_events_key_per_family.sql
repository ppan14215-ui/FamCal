-- A Termin's id is only unique inside its family. Ids from the phone calendar (imp-<phone id>-<day>)
-- repeat across families, so one family's save hit another family's row and the whole save was refused (16.11.).
alter table public.event_comments drop constraint event_comments_event_id_fkey;
alter table public.events drop constraint events_pkey;
alter table public.events add constraint events_pkey primary key (family_id, id);
alter table public.event_comments add constraint event_comments_event_fkey foreign key (family_id, event_id) references public.events (family_id, id) on delete cascade;
notify pgrst, 'reload schema';
