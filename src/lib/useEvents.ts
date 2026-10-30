/** Termine for the calendar views, with every series spelled out (see repeat.ts). */
import { useMemo } from 'react';
import { useStore, get } from '../state/store';
import type { CalEvent } from '../state/types';
import { expand, WINDOW, seriesId, isInstance } from './repeat';

export function useCalEvents(): CalEvent[] {
  const events = useStore((s) => s.events);
  const who = useStore((s) => s.calWho);
  const people = useStore((s) => s.people);
  return useMemo(() => {
    const all = expand(events, WINDOW.from, WINDOW.to);
    const name = people.find((p) => p.id === who)?.name.split(' ')[0];
    return who ? all.filter((e) => forWho(e, who, name)) : all;
  }, [events, who, people]);
}

/** Shown when one person is picked: their own, the family's, and every Feiertag. */
export function forWho(e: CalEvent, who: string, name?: string): boolean {
  if (e.cal === 'feiertage' || e.who === 'both') return true;
  if (who === 'J' || who === 'T') return e.who === who;
  // A child's Termin is often only named ("U6, Tom bringt Ben"), not tagged.
  return !!e.people?.includes(who) || (!!name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'i').test(`${e.title} ${e.sub ?? ''}`));
}

/** One Termin by id, also a single date of a series (`<series>~<date>`). */
export function eventById(events: CalEvent[], id?: string): CalEvent | undefined {
  if (!id) return undefined;
  const base = events.find((e) => e.id === seriesId(id));
  if (!base || !isInstance(id)) return base;
  const date = id.split('~')[1];
  const len = base.endDate ? Math.round((Date.parse(base.endDate) - Date.parse(base.date)) / 86400000) : 0;
  const end = len ? new Date(Date.parse(date) + len * 86400000).toISOString().slice(0, 10) : undefined;
  return { ...base, id, date, endDate: end };
}
export const getEvent = (id?: string) => eventById(get().events, id);
