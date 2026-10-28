/** Termine for the calendar views, with every series spelled out (see repeat.ts). */
import { useMemo } from 'react';
import { useStore, get } from '../state/store';
import type { CalEvent } from '../state/types';
import { expand, WINDOW, seriesId, isInstance } from './repeat';

export function useCalEvents(): CalEvent[] {
  const events = useStore((s) => s.events);
  return useMemo(() => expand(events, WINDOW.from, WINDOW.to), [events]);
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
