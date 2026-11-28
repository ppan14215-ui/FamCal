/**
 * Startansicht des Kalenders (Julian 19.11.: "if I prefer to have the weekly view be my default when I look at the
 * calendar, then I should be able to tell that memo"). Personal, like colours and the bar: kept on this phone, the
 * partner keeps theirs. Empty = Heute, as before. Memo sets it with the tool `einstellung`; Einstellungen shows it too.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';
import { actions, get, type CalView } from '../state/store';
import { TODAY } from './dates';

export const VIEWS: CalView[] = ['heute', 'tag', 'woche', 'monat', 'jahr'];
const subs = new Set<() => void>();
const read = (): CalView => { const v = getPref('startView') as CalView; return VIEWS.includes(v) ? v : 'heute'; };
let cur = read();

/** The calendar opens here when the app starts. */
function apply() { if (cur !== 'heute' && get().calView === 'heute') actions.setCalView(cur); }
onPrefsReady(() => { cur = read(); apply(); subs.forEach((f) => f()); });

export const startView = () => cur;
export function setStartView(v: CalView) {
  cur = VIEWS.includes(v) ? v : 'heute';
  setPref('startView', cur);
  // Said or chosen now: the calendar shows it right away, not only after the next start.
  actions.setCalView(cur);
  if (cur === 'heute') actions.setCalDay(TODAY);
  subs.forEach((f) => f());
}
export const useStartView = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => cur, () => cur);
/** "Woche", "Week" … */
export const viewLabel = (v: CalView, de: boolean) => ({ heute: de ? 'Heute' : 'Today', tag: de ? 'Tage' : 'Days', woche: de ? 'Woche' : 'Week', monat: de ? 'Monat' : 'Month', jahr: de ? 'Jahr' : 'Year' })[v];
