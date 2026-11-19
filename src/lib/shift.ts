/**
 * Work as a block (Julian 16.11.: "Striped work blockers should show differently"): a work shift, or a Termin with
 * hours that is only called work. Heute and the hour grids draw it striped behind the day's Termine instead of as
 * one of them, so a Termin during work stands on it at its own time.
 */
import type { CalEvent } from '../state/types';
import { persons, allColors, personPalette, shade, blend } from '../theme';
import { get } from '../state/store';

const NAMED = /^(arbeit|arbeiten|work|working)$/i;

export const isShift = (e: CalEvent) =>
  !!e.work || (!e.allDay && !(e.endDate && e.endDate > e.date) && NAMED.test(e.title.trim()));

/** Its hours. Work without hours ("Arbeit bis Weihnachten") fills a usual working day, so it never vanishes (Julian 30.10.). */
export const shiftSpan = (e: CalEvent): [string, string] =>
  e.allDay || !e.end || e.end <= e.start ? ['08:00', '17:00'] : [e.start, e.end];

/**
 * Whose work it is and in which colours (Julian 16.11.: the calendar must work for a family of six or seven too): a
 * parent's own, or the family person's it is entered for (a teenager's job, grandpa's shift). `key` keeps everyone on
 * the same side when several work at once: the parents first, then the others.
 */
export function shiftLook(e: CalEvent): { key: string; name: string; tint: string; ink: string; stripe: string } {
  const one = !e.who && e.people?.length ? get().people.find((x) => x.id === e.people![0]) : undefined;
  if (one) {
    const c = shade(allColors.find((x) => x.name === one.color) ?? personPalette[2]);
    return { key: one.id, name: one.name, tint: c.bg, ink: c.fg, stripe: blend(c.bg, c.fg, 0.16) };
  }
  const id = e.who === 'J' ? 'J' : 'T';
  const p = persons[id];
  return { key: id, name: p.name, tint: p.tint, ink: p.ink, stripe: p.stripe };
}
