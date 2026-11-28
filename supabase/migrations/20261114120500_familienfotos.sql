-- Fotos für die Personen Kreise (Julian 14.11.2026: "people bubbles ... with outline of user profile.
-- which means ppl must be able to upload pictures", Speicher freigegeben 11:26 UTC).
-- Ein privater Speicher, den nur die eigene Familie lesen und schreiben kann.
-- Pfad: <family_id>/<J|T|person_id>.jpg. Es gibt keine öffentlichen Links: die Fotos zeigen auch Kinder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Die Familie, zu der ein Foto gehört: der erste Ordner im Pfad. Kein gültiger Ordner ergibt null, und null ist nie Mitglied.
create or replace function public.photo_family(object_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(object_name, '/', 1)::uuid
  end;
$$;
revoke all on function public.photo_family(text) from public, anon;
grant execute on function public.photo_family(text) to authenticated;

create policy "Familienfotos lesen" on storage.objects for select to authenticated
  using (bucket_id = 'family-photos' and public.is_member(public.photo_family(name)));
create policy "Familienfotos anlegen" on storage.objects for insert to authenticated
  with check (bucket_id = 'family-photos' and public.is_member(public.photo_family(name)));
create policy "Familienfotos ändern" on storage.objects for update to authenticated
  using (bucket_id = 'family-photos' and public.is_member(public.photo_family(name)))
  with check (bucket_id = 'family-photos' and public.is_member(public.photo_family(name)));
create policy "Familienfotos löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'family-photos' and public.is_member(public.photo_family(name)));
