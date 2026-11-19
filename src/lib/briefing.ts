/**
 * Wochenbriefing (Julian 31.10. 21:11). Sunday evening for both: what the coming week holds, who does what, where it
 * clashes, what nobody has taken, what is still open and what is due for the children. Worked out on the phone from
 * the shared calendar and lists, so it costs nothing and is the same on both phones.
 */
import type { CalEvent, List, Person } from '../state/types';
import { TODAY, addDays, weekday, minutes } from './dates';
import { isInfoDay } from './feiertage';
import { dueItems, Due } from './mitdenken';

export type Clash = { a: CalEvent; b: CalEvent; who: 'J' | 'T' };
export type Briefing = {
  from: string;
  to: string;
  days: { date: string; events: CalEvent[] }[];
  count: number;
  clashes: Clash[];
  unassigned: CalEvent[];
  noTime: CalEvent[];
  birthdays: CalEvent[];
  todos: { id: string; name: string }[];
  todoList?: string;
  due: Due[];
};

const TODO_NAME = /^(zu erledigen|erledigen|aufgaben|to-?dos?|tasks?)$/i;
const REAL_ALL_DAY = /urlaub|ferien|reise|krank|geburtstag|birthday|vacation|holiday|trip|sick/i;
const byStart = (a: CalEvent, b: CalEvent) => (a.allDay ? -1 : b.allDay ? 1 : a.start.localeCompare(b.start));
const has = (e: CalEvent, p: 'J' | 'T') => e.who === p || e.who === 'both';

/** The week the briefing is about: from Sunday on it is the coming Monday to Sunday, otherwise the next seven days. */
export function briefingRange(today = TODAY): { from: string; to: string } {
  const wd = weekday(today);
  if (wd === 0) return { from: addDays(today, 1), to: addDays(today, 7) };
  return { from: today, to: addDays(today, 6) };
}

export function weekBriefing(events: CalEvent[], lists: List[], people: Person[], country: string, today = TODAY): Briefing {
  const { from, to } = briefingRange(today);
  const inWeek = events.filter((e) => e.date <= to && (e.endDate ?? e.date) >= from && !isInfoDay(e));
  const real = inWeek.filter((e) => !e.work);
  const days: Briefing['days'] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push({ date: d, events: real.filter((e) => e.date === d || (e.endDate && e.date < d && d <= e.endDate)).sort(byStart) });
  // A parent in two places at once, work included (that is where it really pinches).
  const clashes: Clash[] = [];
  for (const p of ['J', 'T'] as const) {
    const timed = inWeek.filter((e) => !e.allDay && has(e, p)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (a.date !== b.date) break;
      const aEnd = minutes(a.end ?? a.start) || minutes(a.start) + 60;
      if (minutes(b.start) < aEnd && !(a.work && b.work)) clashes.push({ a, b, who: p });
    }
  }
  const todoList = lists.find((l) => l.id === 'aufgaben') ?? lists.find((l) => TODO_NAME.test(l.name));
  const todos = (todoList?.sections ?? []).flatMap((s) => s.items).filter((i) => !i.done).map((i) => ({ id: i.id, name: i.name }));
  return {
    from, to, days,
    count: real.length,
    clashes,
    unassigned: real.filter((e) => !e.who && !e.cal),
    noTime: real.filter((e) => e.allDay && !e.endDate && !REAL_ALL_DAY.test(e.title) && !e.cal),
    birthdays: real.filter((e) => /geburtstag|birthday/i.test(e.title)),
    todos, todoList: todoList?.id,
    due: dueItems(people, country, 21, today),
  };
}
