/**
 * What the homescreen widget shows, written by the app whenever Termine
 * change. The widget runs without the app's state, so it reads this small
 * snapshot from storage: today and tomorrow, at most four rows each, never
 * more than titles and times.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, subscribe } from '../state/store';
import { expand } from '../lib/repeat';
import { TODAY, addDays, hm, WD_LONG, weekday, dayNum, MONTHS } from '../lib/dates';
import { persons } from '../theme';
import { tx, EN } from '../i18n/lang';
import type { CalEvent } from '../state/types';

export const KEY = 'famcal.widget';
export type Snapshot = {
  head: string;
  empty: string;
  days: { label: string; free: string; more: string; items: { time: string; title: string; color: string }[] }[];
};

const byStart = (a: CalEvent, b: CalEvent) => (a.allDay ? -1 : b.allDay ? 1 : a.start.localeCompare(b.start));

export function buildSnapshot(events: CalEvent[]): Snapshot {
  const tomorrow = addDays(TODAY, 1);
  const all = expand(events, TODAY, tomorrow).filter((e) => !e.work);
  const on = (d: string) => all.filter((e) => e.date === d || (!!e.endDate && e.date < d && d <= e.endDate)).sort(byStart);
  const day = (d: string, label: string) => {
    const list = on(d);
    return {
      label,
      free: tx('Nichts geplant', 'Nothing planned'),
      more: list.length > 4 ? tx(`und ${list.length - 4} weitere`, `and ${list.length - 4} more`) : '',
      items: list.slice(0, 4).map((e) => ({
        time: e.allDay ? tx('Tag', 'Day') : hm(e.start),
        title: e.title,
        color: e.who === 'J' || e.who === 'T' ? persons[e.who].ink : '#075056',
      })),
    };
  };
  const date = EN ? `${MONTHS[Number(TODAY.slice(5, 7)) - 1]} ${dayNum(TODAY)}` : `${dayNum(TODAY)}. ${MONTHS[Number(TODAY.slice(5, 7)) - 1]}`;
  return {
    head: `${WD_LONG[weekday(TODAY)]}, ${date}`,
    empty: tx('Heute und morgen ist nichts geplant.', 'Nothing planned today or tomorrow.'),
    days: [day(TODAY, tx('Heute', 'Today')), day(tomorrow, tx('Morgen', 'Tomorrow'))],
  };
}

/** Keeps the widget current: on every change of the Termine, at most every two seconds. */
export function startWidgetSync() {
  if (Platform.OS !== 'android') return;
  let last = get().events;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const push = async () => {
    const snap = buildSnapshot(get().events);
    await AsyncStorage.setItem(KEY, JSON.stringify(snap)).catch(() => {});
    try {
      // Loaded lazily so the web build never touches the native module.
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const React = require('react');
      const { HeuteWidget } = require('./HeuteWidget');
      await requestWidgetUpdate({ widgetName: 'Heute', renderWidget: () => React.createElement(HeuteWidget, { snap }), widgetNotFound: () => {} });
    } catch {}
  };
  void push();
  subscribe(() => {
    const now = get().events;
    if (now === last) return;
    last = now;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void push(); }, 2000);
  });
}
