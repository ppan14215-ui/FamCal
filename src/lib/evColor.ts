/**
 * Farbe der Person (Julian 28.10.): a Termin is tinted by who it belongs to,
 * the icon still tells what it is. Both parents or nobody get a quiet family
 * tone; a Termin only for a child or grandparent takes that person's colour.
 */
import { persons, personPalette, allColors, shade, tokens } from '../theme';
import { get } from '../state/store';
import type { CalEvent } from '../state/types';


export function evTint(e: Pick<CalEvent, 'who' | 'people'>): string {
  if (e.who === 'J' || e.who === 'T') return persons[e.who].tint;
  if (!e.who && e.people?.length === 1) {
    const p = get().people.find((x) => x.id === e.people![0]);
    const c = p && allColors.find((x) => x.name === p.color);
    if (c) return shade(c).bg;
  }
  return tokens.row;
}

/**
 * Shared or nobody's (Julian 04.11.: the old family grey looked like Salbei).
 * Such a Termin is white with a thin ink outline, so it never reads as a person's colour.
 */
export function evShared(e: Pick<CalEvent, 'who' | 'people'>): boolean {
  if (e.who === 'J' || e.who === 'T') return false;
  if (!e.who && e.people?.length === 1) {
    const p = get().people.find((x) => x.id === e.people![0]);
    if (p && allColors.some((x) => x.name === p.color)) return false;
  }
  return true;
}
export const sharedBorder = () => ({ borderWidth: 1.5, borderColor: tokens.ink });
