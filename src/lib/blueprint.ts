/**
 * Which building blocks a new list gets (Julian 27.10.: "eine App, die sich
 * den Anfragen der Nutzer anpasst"). The rules know a few kinds at once;
 * Claude reads any other name and answers with a blueprint from the same
 * blocks a moment later. Lists that need no blocks stay plain.
 */
import { supabase } from './cloud';
import { getAuth } from './auth';
import { LANG, tx } from '../i18n/lang';
import type { Block, Blueprint } from '../state/types';

const BLOCKS: Block[] = ['cover', 'stars', 'seen', 'year', 'by', 'link', 'date', 'price', 'place', 'note'];

const RULES: { re: RegExp; bp: () => Blueprint }[] = [
  { re: /film|movie|kino|serie|series|watch/i, bp: () => ({ blocks: ['cover', 'year', 'by', 'stars', 'seen'], source: 'movies', seenLabel: tx('Gesehen', 'Watched') }) },
  { re: /buch|bücher|book|lesen|read/i, bp: () => ({ blocks: ['cover', 'by', 'year', 'stars', 'seen'], source: 'books', seenLabel: tx('Gelesen', 'Read') }) },
  { re: /rezept|recipe|kochen|cook/i, bp: () => ({ blocks: ['link', 'note', 'stars', 'seen'], source: null, seenLabel: tx('Gekocht', 'Cooked') }) },
  { re: /geschenk|wunsch|gift|wish/i, bp: () => ({ blocks: ['price', 'link', 'by', 'seen'], source: null, seenLabel: tx('Besorgt', 'Got it') }) },
  { re: /restaurant|café|cafe|essen gehen|ausflug|trip|places/i, bp: () => ({ blocks: ['place', 'link', 'stars', 'seen'], source: null, seenLabel: tx('Waren da', 'Been there') }) },
];

export function blueprintFor(name: string): Blueprint | null {
  return RULES.find((r) => r.re.test(name))?.bp() ?? null;
}

/** Claude's blueprint for any list name; null offline or when a plain list fits. */
export async function blueprintOnline(name: string): Promise<Blueprint | null> {
  if (!supabase || !getAuth().session) return null;
  const { data, error } = await supabase.functions.invoke<{ blueprint: Blueprint | null }>('liste', { body: { action: 'bauplan', name, lang: LANG } });
  const bp = error ? null : data?.blueprint;
  if (!bp?.blocks?.length) return null;
  return { blocks: bp.blocks.filter((b) => BLOCKS.includes(b)).slice(0, 5), source: bp.source === 'books' || bp.source === 'movies' ? bp.source : null, seenLabel: bp.seenLabel?.slice(0, 20) };
}

const NAMES: Record<Block, () => string> = {
  cover: () => tx('Cover', 'cover'), stars: () => tx('Bewertung', 'rating'), seen: () => '', year: () => tx('Jahr', 'year'),
  by: () => tx('Autor oder Regie', 'author or director'), link: () => 'Link', date: () => tx('Datum', 'date'),
  price: () => tx('Preis', 'price'), place: () => tx('Ort', 'place'), note: () => tx('Notiz', 'note'),
};

/** "Mit Cover, Bewertung und Gesehen." for the plan and the new list screen. */
export function blocksLine(bp: Blueprint): string {
  const parts = bp.blocks.map((b) => (b === 'seen' ? bp.seenLabel ?? tx('Erledigt', 'Done') : NAMES[b]())).filter(Boolean).slice(0, 4);
  const list = parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} ${tx('und', 'and')} ${parts[parts.length - 1]}`;
  return tx(`Mit ${list}.`, `With ${list}.`) + (bp.source ? tx(' Cover suche ich selbst.', ' I find the covers myself.') : '');
}
