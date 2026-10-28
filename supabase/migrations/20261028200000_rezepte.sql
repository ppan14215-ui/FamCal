-- Rezepte der Familie (Julian 28.10.): a recipe link fills the shopping list,
-- and the next "Ich koche Bolognese" takes the same ingredients again.
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  name text not null check (char_length(name) <= 120),
  url text check (char_length(url) <= 600),
  host text check (char_length(host) <= 120),
  servings text check (char_length(servings) <= 40),
  image text check (char_length(image) <= 600),
  ingredients jsonb not null default '[]' check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) <= 60),
  created_by uuid default auth.uid() references auth.users on delete set null,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index recipes_family on public.recipes (family_id);
create unique index recipes_family_url on public.recipes (family_id, url) where url is not null;

alter table public.recipes enable row level security;
create policy "Rezepte lesen" on public.recipes for select using (public.is_member(family_id));
create policy "Rezepte anlegen" on public.recipes for insert with check (public.is_member(family_id));
create policy "Rezepte ändern" on public.recipes for update using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "Rezepte löschen" on public.recipes for delete using (public.is_member(family_id));
