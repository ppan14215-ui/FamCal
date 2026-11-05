/**
 * Every German municipality and its Bundesland (src/data/places.ts). Same
 * names exist more than once (Fürth in Bayern and in Hessen): the most
 * populous comes first, and the app shows which one it took so the family
 * can correct it.
 */
import { LAENDER, PLACES } from '../data/places';

export type Place = { name: string; land: string; pop: number };

let list: Place[] | null = null;
const all = () => (list ??= PLACES.split('\n').map((r) => { const [name, l, p] = r.split(';'); return { name, land: LAENDER[+l], pop: +p * 100 }; }));

const norm = (s: string) => s.trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/^stadt\s+/, '').replace(/\s+/g, ' ');

const base = (name: string) => norm(name.split(/ \(|\//)[0]);

/** The place a typed name most likely means. */
export function findPlace(q?: string | null): Place | undefined {
  const n = norm(q ?? '');
  if (n.length < 2) return undefined;
  // "Halle" means Halle (Saale), not the village Halle: the list is sorted by size.
  return all().find((p) => norm(p.name) === n || base(p.name) === n);
}

/** Other places with the same name (to offer the other Fürth). */
export const namesakes = (p: Place) => all().filter((x) => base(x.name) === base(p.name) && x.land !== p.land);

/** Prefix matches, biggest first, for suggestions under the field. */
export function suggestPlaces(q: string, n = 4): Place[] {
  const s = norm(q);
  if (s.length < 2) return [];
  const out: Place[] = [];
  for (const p of all()) { if (norm(p.name).startsWith(s)) { out.push(p); if (out.length === n) break; } }
  return out;
}
