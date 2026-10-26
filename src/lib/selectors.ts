/** Derived views over the store. Call inside useMemo with stable slices. */
import type { CalEvent, Task, Doc } from '../state/types';
import { TODAY, NOW, minutes, daysBetween } from './dates';

export const byTime = (a: CalEvent, b: CalEvent) => a.start.localeCompare(b.start);

export function eventsOn(events: CalEvent[], date: string, includeWork = true): CalEvent[] {
  return events.filter((e) => e.date === date && (includeWork || !e.work)).sort(byTime);
}

export function nextEvent(events: CalEvent[]): CalEvent | undefined {
  return eventsOn(events, TODAY, false).find((e) => minutes(e.end ?? e.start) > minutes(NOW));
}

export function tasksDueToday(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.done && t.due === TODAY && t.who);
}

/** Deadlines in the next ~3 months, for Heute ("Bald fällig") and Dokumente. */
export function upcomingFristen(docs: Doc[], days = 92): Doc[] {
  return docs.filter((d) => d.frist && daysBetween(TODAY, d.frist) >= 0 && daysBetween(TODAY, d.frist) <= days).sort((a, b) => a.frist!.localeCompare(b.frist!));
}
