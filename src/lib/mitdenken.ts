/**
 * Mitdenken nach Alter (Julian 31.10. 21:11). From each child's birthday the app knows what is due: the
 * U-Untersuchungen of the German U-Heft, the STIKO vaccinations and the school registration. Computed on this
 * phone only, nothing about health goes to the server. Always an offer (Julian 29.10.: "nie von selber"): one tap
 * puts it on "Zu erledigen", one tap says it is done already. Germany only for now; other countries get nothing
 * rather than wrong advice.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMonths } from '../data/firstYear';
import { TODAY, addDays, daysBetween } from './dates';
import type { Person } from '../state/types';
import type { ClayName } from './clayIcons';
import { tx } from '../i18n/lang';
import { get, set, actions } from '../state/store';

export type Due = { key: string; kid: string; kidName: string; title: string; window: string; from: string; to: string; icon: ClayName; todo: string };

type Rule = { id: string; title: string; window: string; from: [number, 'd' | 'm' | 'y']; to: [number, 'd' | 'm' | 'y']; icon: ClayName; todo: (n: string) => string };

const U = (id: string, window: string, from: Rule['from'], to: Rule['to']): Rule =>
  ({ id: id.toLowerCase(), title: id, window, from, to, icon: 'u-heft', todo: (n) => tx(`${id} für ${n} beim Kinderarzt ausmachen`, `Book ${id} check-up for ${n}`) });
const V = (id: string, title: string, window: string, from: Rule['from'], to: Rule['to']): Rule =>
  ({ id, title, window, from, to, icon: 'impfung', todo: (n) => tx(`${title} für ${n} beim Kinderarzt`, `${title} for ${n} at the pediatrician`) });

// U-Heft (Kinder-Richtlinie) and STIKO calendar; the window is when it is due, the app never claims it was done.
const RULES: Rule[] = [
  U('U2', tx('3. bis 10. Lebenstag', 'day 3 to 10'), [3, 'd'], [10, 'd']),
  U('U3', tx('4. bis 5. Woche', 'week 4 to 5'), [28, 'd'], [35, 'd']),
  U('U4', tx('3. bis 4. Monat', 'month 3 to 4'), [3, 'm'], [4, 'm']),
  U('U5', tx('6. bis 7. Monat', 'month 6 to 7'), [6, 'm'], [7, 'm']),
  U('U6', tx('10. bis 12. Monat', 'month 10 to 12'), [10, 'm'], [12, 'm']),
  U('U7', tx('21. bis 24. Monat', 'month 21 to 24'), [21, 'm'], [24, 'm']),
  U('U7a', tx('34. bis 36. Monat', 'month 34 to 36'), [34, 'm'], [36, 'm']),
  U('U8', tx('46. bis 48. Monat', 'month 46 to 48'), [46, 'm'], [48, 'm']),
  U('U9', tx('60. bis 64. Monat', 'month 60 to 64'), [60, 'm'], [64, 'm']),
  U('J1', tx('12 bis 14 Jahre', 'age 12 to 14'), [12, 'y'], [14, 'y']),
  V('impf-2m', tx('Erste Impfungen', 'First vaccinations'), tx('mit 2 Monaten', 'at 2 months'), [2, 'm'], [3, 'm']),
  V('impf-4m', tx('Zweite Impfungen', 'Second vaccinations'), tx('mit 4 Monaten', 'at 4 months'), [4, 'm'], [5, 'm']),
  V('impf-11m', tx('Impfungen mit 11 Monaten, dazu Masern und Windpocken', 'Vaccinations at 11 months, plus measles and chickenpox'), tx('mit 11 Monaten', 'at 11 months'), [11, 'm'], [12, 'm']),
  V('impf-12m', tx('Meningokokken-Impfung', 'Meningococcal vaccination'), tx('mit 12 Monaten', 'at 12 months'), [12, 'm'], [13, 'm']),
  V('impf-15m', tx('Zweite Masern- und Windpocken-Impfung', 'Second measles and chickenpox shot'), tx('mit 15 Monaten', 'at 15 months'), [15, 'm'], [16, 'm']),
  V('impf-5y', tx('Auffrischung Tetanus, Diphtherie, Keuchhusten', 'Tetanus, diphtheria, whooping cough booster'), tx('mit 5 bis 6 Jahren', 'at age 5 to 6'), [5, 'y'], [6, 'y']),
  V('impf-9y', tx('HPV-Impfung und Auffrischung mit Polio', 'HPV vaccination and booster with polio'), tx('ab 9 Jahren', 'from age 9'), [9, 'y'], [14, 'y']),
];

const shift = (born: string, [n, u]: [number, 'd' | 'm' | 'y']) => (u === 'd' ? addDays(born, n) : addMonths(born, u === 'm' ? n : n * 12));

/** What is due for the family's children: windows that start within `ahead` days or are still open. */
export function dueItems(people: Person[], country: string, ahead = 30, today = TODAY): Due[] {
  if (country && country !== 'DE') return [];
  const out: Due[] = [];
  for (const p of people) {
    if (p.kind !== 'kind' || !p.birthday || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthday)) continue;
    const name = p.name.split(' ')[0];
    for (const r of RULES) {
      const from = shift(p.birthday, r.from);
      const to = shift(p.birthday, r.to);
      // Still worth saying: starts soon, or the window is open now (a day late is fine, a year late is not ours to nag).
      if (to < today || daysBetween(today, from) > ahead) continue;
      out.push({ key: `${p.id}:${r.id}`, kid: p.id, kidName: name, title: r.title, window: r.window, from, to, icon: r.icon, todo: r.todo(name) });
    }
    // School registration: in Germany usually in the autumn or spring before school starts at about six.
    const six = addMonths(p.birthday, 72);
    const reg = addMonths(six, -10);
    if (reg >= addDays(today, -60) && daysBetween(today, reg) <= ahead) {
      out.push({ key: `${p.id}:schule`, kid: p.id, kidName: name, title: tx(`Schulanmeldung für ${name}`, `School registration for ${name}`), window: tx('Termin der Stadt prüfen, meist im Herbst oder Frühjahr davor', 'check the city date, usually the autumn or spring before'), from: reg, to: addMonths(reg, 6), icon: 'schule', todo: tx(`Schulanmeldung für ${name} klären`, `Sort out school registration for ${name}`) });
    }
  }
  return out.filter((d) => !handled.has(d.key)).sort((a, b) => a.from.localeCompare(b.from));
}

// Done or put on the list: kept on this phone so the offer does not come back.
const KEY = 'famcal.mitdenken';
let handled = new Set<string>();
let version = 0;
const subs = new Set<() => void>();
AsyncStorage.getItem(KEY).then((v) => { if (v) { try { handled = new Set(JSON.parse(v)); version++; subs.forEach((l) => l()); } catch {} } }).catch(() => {});
export function markHandled(key: string, on = true) {
  if (on) handled.add(key); else handled.delete(key);
  version++;
  subs.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify([...handled])).catch(() => {});
}
const sub = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };
/** Re-renders when an offer was handled. */
export const useHandled = () => useSyncExternalStore(sub, () => version, () => version);

/** The children the app knows: family people marked as kids, plus the first-year child from onboarding. */
export function kidsOf(people: Person[], kid: { name: string; born?: string } | null): Person[] {
  const kids = people.filter((p) => p.kind === 'kind');
  if (kid?.born && !kids.some((p) => p.name.split(' ')[0].toLowerCase() === kid.name.split(' ')[0].toLowerCase())) {
    kids.push({ id: 'kid', name: kid.name, kind: 'kind', color: '', birthday: kid.born });
  }
  return kids;
}

/** One tap: the offer goes on "Zu erledigen" (made if missing) and does not come back. Returns undo. */
export function toTodo(d: Due): () => void {
  const TODO = /^(zu erledigen|erledigen|aufgaben|to-?dos?|tasks?)$/i;
  let l = get().lists.find((x) => x.id === 'aufgaben') ?? get().lists.find((x) => TODO.test(x.name));
  const before = get().lists;
  if (!l) {
    actions.createList({ id: 'aufgaben', name: tx('Zu erledigen', 'To do'), icon: 'erledigt' as ClayName, kind: 'packing', sections: [{ id: 'main', title: '', items: [] }] });
    l = get().lists.find((x) => x.id === 'aufgaben');
  }
  if (l) actions.addItem(l.id, d.todo);
  markHandled(d.key);
  return () => { set(() => ({ lists: before })); markHandled(d.key, false); };
}
