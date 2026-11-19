/**
 * Farbe der Person (Julian 28.10.): a Termin is tinted by who it belongs to,
 * the icon still tells what it is. Both parents or nobody get a quiet family
 * tone; a Termin only for a child or grandparent takes that person's colour.
 */
import { persons, personPalette, allColors, shade, tokens } from '../theme';
import { get } from '../state/store';
import type { CalEvent } from '../state/types';
import { categoryOf, categoryIndex } from './iconCategory';
import { colorBy } from '../theme/mode';

type Ev = Pick<CalEvent, 'who' | 'people'> & { icon?: string };
/** Julian 04.11.: by category, the icon's group picks the colour from the active theme. */
function catBg(e: Ev): string | undefined {
  if (colorBy() !== 'kategorie') return undefined;
  const c = categoryOf(e.icon);
  if (!c) return undefined;
  const pal = personPalette[categoryIndex(c) % personPalette.length];
  return pal ? shade(pal).bg : undefined;
}


export function evTint(e: Ev): string {
  if (colorBy() === 'kategorie') return catBg(e) ?? tokens.row;
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
export function evShared(e: Ev): boolean {
  if (colorBy() === 'kategorie') return !catBg(e);
  if (e.who === 'J' || e.who === 'T') return false;
  if (!e.who && e.people?.length === 1) {
    const p = get().people.find((x) => x.id === e.people![0]);
    if (p && allColors.some((x) => x.name === p.color)) return false;
  }
  return true;
}
export const sharedBorder = () => ({ borderWidth: 1.5, borderColor: tokens.ink });

/** The strong colour of a Termin, for dots in the month (Julian 04.11.: the simple month with dots). */
export function evInk(e: Ev): string {
  if (colorBy() === 'kategorie') {
    const c = categoryOf(e.icon);
    const pal = c ? personPalette[categoryIndex(c) % personPalette.length] : undefined;
    return pal ? shade(pal).fg : tokens.sub;
  }
  if (e.who === 'J' || e.who === 'T') return persons[e.who].ink;
  if (!e.who && e.people?.length === 1) {
    const p = get().people.find((x) => x.id === e.people![0]);
    const c = p && allColors.find((x) => x.name === p.color);
    if (c) return shade(c).fg;
  }
  return tokens.sub;
}
