/**
 * Julians Familie, nachgebaut aus seinem Kalender vom 30.10.2026: Urlaub auf
 * Mallorca, Arbeit an jedem Werktag bis Weihnachten (einzelne Einträge pro
 * Tag, im November mit Ort Büro), Fußball dienstags, Squash mittwochs,
 * Besuch von Fry und Marco, Feiertage, Geburtstage. Namen von Freunden und
 * private Details sind ersetzt oder weggelassen. Die App läuft im Test auf
 * Donnerstag, 29.10.2026, 08:50 (src/lib/dates.ts ohne .env).
 */
import type { CalEvent, List, Task } from '../../src/state/types';

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const days = (from: string, to: string) => {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += DAY) out.push(iso(t));
  return out;
};
export const weekday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

const ev = (id: string, title: string, date: string, more: Partial<CalEvent> = {}): CalEvent =>
  ({ id, title, date, start: '00:00', allDay: true, icon: 'kalender', who: 'J', ...more } as CalEvent);

/** Werktage 2.11. bis 24.12., wie Julian sie gesagt hat; am 11.11. hat er frei (Marco kommt). */
export function arbeit(): CalEvent[] {
  return days('2026-11-02', '2026-12-24')
    .filter((d) => weekday(d) >= 1 && weekday(d) <= 5 && d !== '2026-11-11')
    .map((d) => ev(`arb-${d}`, d === '2026-11-04' ? 'Büro' : 'Arbeit', d, {
      icon: 'aktenkoffer', work: true, repeat: 'Montag bis Freitag',
      place: d >= '2026-11-03' && d <= '2026-11-30' ? 'Büro' : undefined,
      source: 'Gesagt: „ich muss ab Montag wieder arbeiten bis Weihnachten“',
    }));
}

export function termine(): CalEvent[] {
  return [
    ev('urlaub', 'Urlaub Mallorca', '2026-10-27', { endDate: '2026-11-01', place: 'Mallorca', icon: 'reise', who: 'both' }),
    ev('impfung', 'Impfung Karlo', '2026-10-29', { allDay: false, start: '10:30', end: '11:30', icon: 'impfung' }),
    ev('arb-2026-10-30', 'Arbeit', '2026-10-30', { allDay: false, start: '09:00', end: '17:00', icon: 'aktenkoffer', work: true }),
    ev('halloween', 'Halloween', '2026-10-31'),
    ev('rueckflug', 'Rückflug', '2026-11-01', { allDay: false, start: '23:00', end: '23:59', icon: 'flugzeug', who: 'both' }),
    ev('fussball', 'Fußball', '2026-11-03', { allDay: false, start: '19:00', end: '20:30', icon: 'fussball', repeat: 'Jeden Dienstag' }),
    ev('fry', 'Fry kommt', '2026-11-04', { allDay: false, start: '16:00', end: '17:00', who: 'both' }),
    ev('squash', 'Squash', '2026-11-04', { allDay: false, start: '17:00', end: '18:00', icon: 'squash', repeat: 'Jeden Mittwoch' }),
    ev('jerome', 'Geburtstag Jerome', '2026-11-06', { icon: 'geburtstag', who: 'T', repeat: 'Jedes Jahr', countdown: true }),
    ev('zug', 'Zug nach Leipzig', '2026-11-06', { allDay: false, start: '15:50', end: '18:04', icon: 'zug', place: 'Fürth Hbf' }),
    ev('martin', 'St. Martin', '2026-11-11'),
    ev('marco', 'Marco kommt', '2026-11-11', { sub: 'nach der Arbeit', icon: 'einladung' }),
    ev('advent1', '1. Advent', '2026-11-29'),
    ev('heiligabend', 'Heiligabend', '2026-12-24'),
    ev('weihnachten', 'Weihnachten', '2026-12-25'),
    ev('kardio', 'Kardiologie', '2027-01-11', { allDay: false, start: '08:15', end: '09:15', icon: 'stethoskop' }),
    ...arbeit(),
  ];
}

let n = 0;
const item = (name: string, who: 'J' | 'T' | null = null, done = false) => ({ id: `i${++n}`, name, who, done });

export function listen(): List[] {
  n = 0;
  return [
    { id: 'einkauf', name: 'Einkauf', icon: 'einkauf', kind: 'shopping', sections: [
      { id: 'drogerie', title: 'Drogerie', items: [item('Windeln Gr. 2'), item('Wundcreme')] },
      { id: 'supermarkt', title: 'Supermarkt', items: [{ ...item('Hafermilch'), qty: 2 }, item('Brot'), item('Kaffee'), item('Bananen', null, true)] },
    ] },
    { id: 'watchlist', name: 'Watchlist', icon: 'kalender', kind: 'collection', sections: [{ id: 'w', title: '', items: [item('Dune')] }] },
  ] as List[];
}

export function aufgaben(): Task[] {
  return [
    { id: 't-pass', title: 'Passfotos machen', icon: 'reisepass', due: '2026-10-29', who: 'J', done: false },
    { id: 't-kita', title: 'Kita-Platz anfragen', icon: 'kita', who: null, done: false },
  ] as Task[];
}
