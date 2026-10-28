/**
 * Farbe der Person (Julian 28.10.): a Termin is tinted by who it belongs to,
 * the icon still tells what it is. Both parents or nobody get a quiet family
 * tone; a Termin only for a child or grandparent takes that person's colour.
 */
import { persons, personPalette, shade, nightBg } from '../theme';
import { get } from '../state/store';
import type { CalEvent } from '../state/types';

const FAMILY = '#ECEAE4';

export function evTint(e: Pick<CalEvent, 'who' | 'people'>): string {
  if (e.who === 'J' || e.who === 'T') return persons[e.who].tint;
  if (!e.who && e.people?.length === 1) {
    const p = get().people.find((x) => x.id === e.people![0]);
    const c = p && personPalette.find((x) => x.name === p.color);
    if (c) return shade(c).bg;
  }
  return nightBg(FAMILY);
}
