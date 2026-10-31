/**
 * Rezepte der Familie (Julian 28.10.: "Ich schicke das Rezept von Bolognese,
 * jedes Mal wenn ich wieder Bolognese kochen will, weiß die App, dass es das
 * Rezept war"). A pasted or shared link is read by the server, the family
 * keeps it, and the next "Ich koche Bolognese" offers the same ingredients.
 */
import { supabase } from './cloud';
import { getAuth } from './auth';
import { getFamily } from './sync';
import { LANG } from '../i18n/lang';

export type Recipe = { id?: string; name: string; url?: string; host?: string; servings?: string; image?: string; ingredients: string[] };

let mine: Recipe[] = [];
let loadedFor: string | null = null;

/** The first web link in what was said or shared, if any. */
export const linkIn = (said: string) => said.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[).,;!?]+$/, '');

/** The family's recipes, read once per family after sign-in. */
export async function loadRecipes() {
  const fam = getFamily();
  if (!supabase || !fam || loadedFor === fam.id) return mine;
  const { data, error } = await supabase.from('recipes').select('id, name, url, host, servings, image, ingredients').eq('family_id', fam.id).order('used_at', { ascending: false }).limit(200);
  if (!error && data) { mine = data as Recipe[]; loadedFor = fam.id; }
  return mine;
}

export type FromLink = { recipe: Recipe } | { error: 'offline' | 'bad_url' | 'unreachable' | 'no_recipe' | 'limit' };

/** The server reads the page; null fields mean it found no recipe there. */
export async function recipeFromLink(url: string): Promise<FromLink> {
  if (!supabase || !getAuth().session) return { error: 'offline' };
  const { data, error } = await supabase.functions.invoke<{ recipe: Recipe | null; reason?: string }>('liste', { body: { action: 'rezept', url, lang: LANG } });
  if (error) return { error: (error as { context?: Response }).context?.status === 429 ? 'limit' : 'unreachable' };
  if (!data?.recipe) return { error: (data?.reason as 'bad_url' | 'unreachable' | 'no_recipe') ?? 'no_recipe' };
  return { recipe: data.recipe };
}

/** Kept for the family; the same link again only refreshes it. */
export async function keepRecipe(r: Recipe) {
  const fam = getFamily();
  if (!supabase || !fam) return;
  const row = { family_id: fam.id, name: r.name, url: r.url ?? null, host: r.host ?? null, servings: r.servings ?? null, image: r.image ?? null, ingredients: r.ingredients, used_at: new Date().toISOString() };
  const { data, error } = r.url
    ? await supabase.from('recipes').upsert(row, { onConflict: 'family_id,url' }).select('id').single()
    : await supabase.from('recipes').insert(row).select('id').single();
  if (error) { console.warn('[rezepte]', error.message); return; }
  const kept = { ...r, id: (data as { id: string }).id };
  mine = [kept, ...mine.filter((m) => m.id !== kept.id && (!r.url || m.url !== r.url))];
}

const stem = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !/^(rezept|recipe|spaghetti|klassisch|classic|einfach|easy|schnell|quick|beste|best)$/.test(w));

/** A kept recipe that fits the dish ("Bolognese" finds "Spaghetti Bolognese von chefkoch"), newest first. */
export function savedFor(dish: string): Recipe | undefined {
  const want = stem(dish);
  if (!want.length) return undefined;
  return mine.find((r) => {
    const have = stem(r.name);
    return want.some((w) => have.some((h) => h.startsWith(w.slice(0, 6)) || w.startsWith(h.slice(0, 6))));
  });
}
