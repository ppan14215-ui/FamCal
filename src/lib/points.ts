/**
 * Punkte-Liste, the first tool built from blocks (Julian 30.10.: "wir spielen gerade Rommé,
 * ich sage dir nur die Zahlen und du addierst"). The entries of the list are the players;
 * "Julian 35, Sophia 12, Oma minus 5" is one round. "Hand", "auf einmal raus", "mal zwei"
 * or "doppelt" doubles that round. A name nobody has yet becomes a new player.
 */
import type { List, Item } from '../state/types';
import { tx } from '../i18n/lang';

export type Round = { who: string; points: number }[];

const NUM_WORDS: Record<string, number> = {
  null: 0, zero: 0, eins: 1, ein: 1, one: 1, zwei: 2, two: 2, drei: 3, three: 3, vier: 4, four: 4, fünf: 5, five: 5,
  sechs: 6, six: 6, sieben: 7, seven: 7, acht: 8, eight: 8, neun: 9, nine: 9, zehn: 10, ten: 10, elf: 11, eleven: 11,
  zwölf: 12, twelve: 12, zwanzig: 20, twenty: 20, dreißig: 30, thirty: 30, vierzig: 40, forty: 40, fünfzig: 50, fifty: 50, hundert: 100, hundred: 100,
};
const DOUBLE = /(hand[\s-]?romm[eé]|\bhand\b|auf einmal|in einem rutsch|mal zwei|\bx\s?2\b|×\s?2|doppelt|verdoppel\w*|times two|\bdouble[ds]?\b)/gi;
const FILLER = /^(hat|haben|hatte|bekommt|kriegt|macht|minus|plus|und|and|has|had|got|gets|punkte?|points?|pkt|ist|war|ging|geht|raus|out|went|is|was|der|die|das|bei|for|für|:|=|-)$/i;

export const isPoints = (l?: List) => !!l?.blueprint?.blocks.includes('points');
export const players = (l: List): Item[] => l.sections.flatMap((s) => s.items);
export const total = (i: Item) => (i.data?.rounds ?? []).reduce((a, b) => a + b, 0);

/** Pairs of name and number from a sentence; null when it holds no number at all. */
export function parseRound(said: string): { round: Round; double: boolean } | null {
  const double = new RegExp(DOUBLE.source, 'i').test(said);
  // Commas and "und" end a name, so "Sophia ist raus, Julian 50" gives Julian, not "Sophia Julian".
  const words = said.replace(DOUBLE, ' ').replace(/[,;.!?]|\s(und|and)\s/gi, ' | ').split(/\s+/).filter(Boolean);
  const round: Round = [];
  let name: string[] = [];
  let neg = false;
  for (const w of words) {
    const low = w.toLowerCase();
    const n = /^[+-]?\d+$/.test(w) ? parseInt(w, 10) : low in NUM_WORDS ? NUM_WORDS[low] : null;
    if (low === 'minus' || low === 'negativ') { neg = true; continue; }
    if (n !== null && name.length) {
      round.push({ who: name.join(' '), points: neg ? -Math.abs(n) : n });
      name = []; neg = false; continue;
    }
    if (w === '|') { name = []; neg = false; continue; }
    if (FILLER.test(low)) continue;
    name.push(w.replace(/^./, (c) => c.toUpperCase()));
    if (name.length > 2) name = name.slice(-2);
  }
  return round.length ? { round, double } : null;
}

/** The player a spoken name means: same name, or the start of it ("Oma" for "Oma Gisela"). */
export function matchPlayer(list: Item[], who: string): Item | undefined {
  const w = who.toLowerCase();
  return list.find((p) => p.name.toLowerCase() === w) ?? list.find((p) => p.name.toLowerCase().startsWith(w) || w.startsWith(p.name.toLowerCase()));
}

/** "Sophia 40, Julian 71" in the order that wins. */
export function standLine(l: List): string {
  const low = !!l.blueprint?.points?.lowWins;
  const ps = players(l).filter((p) => p.data?.rounds?.length).sort((a, b) => (low ? total(a) - total(b) : total(b) - total(a)));
  return ps.map((p) => `${p.name} ${total(p)}`).join(', ');
}

export const roundsOf = (l: List) => Math.max(0, ...players(l).map((p) => p.data?.rounds?.length ?? 0));

export const doubledText = () => tx('mal zwei', 'doubled');
