/**
 * The briefing on top of Kalender · Heute (the klar draft's "Start": "Neu und offen"; Julian 14.11.: "Chat is just the
 * log for what happened the calendar is the basis of what we work on", so it stands on the one Heute page and not in
 * the chat). One line per thing somebody else did in the last week, and what waits for my answer, newest first. What
 * I did myself is no news: it arrives in the list of days right below. Nothing is stored for it: the lines are read
 * from the family's log and from the live calendar and lists, so a moved Termin or a ticked item shows as it is now.
 */
import type { FeedEntry } from './feed';
import type { State } from '../state/store';
import type { CalEvent } from '../state/types';
import type { ClayName } from './clayIcons';
import { persons, type PersonId } from '../theme';
import { listIcon } from './points';
import { getPref, setPref } from './prefs';
import { TODAY, addDays, daysBetween, weekday, WD_SHORT, short, hm } from './dates';
import { tx } from '../i18n/lang';

export type StartRow = {
  key: string;
  icon: ClayName;
  title: string;
  sub: string;
  /** When it last moved, ISO. */
  at: string;
  /** Somebody else did it since I last looked, or it waits for my answer. */
  fresh: boolean;
  /** Where a tap leads. */
  to: { event: string } | { list: string } | { entry: string } | { tasks: true };
};

/** How many lines the list shows at most; the days follow right below. */
export const START_MAX = 7;
const WEEK = 7 * 24 * 3600 * 1000;

const SEEN = 'startSeen';
/** Up to when I have looked at Heute. */
export const startSeen = () => getPref(SEEN) ?? '';
export const markStartSeen = () => setPref(SEEN, new Date().toISOString());

const local = (isoTime: string) => { const d = new Date(isoTime); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** "5 Min", "3 Std", "gestern", "Mo": how long ago, as short as in the draft. */
export function ago(isoTime: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(isoTime)) / 60000));
  if (min < 1) return tx('jetzt', 'now');
  if (min < 60) return tx(`${min} Min`, `${min} min`);
  const day = local(isoTime);
  const days = daysBetween(day, local(new Date(now).toISOString()));
  if (days <= 0 || min < 6 * 60) return tx(`${Math.round(min / 60)} Std`, `${Math.round(min / 60)} h`);
  if (days === 1) return tx('gestern', 'yesterday');
  return days < 7 ? WD_SHORT[weekday(day)] : short(day);
}

const dayWord = (date: string) =>
  date === TODAY ? tx('Heute', 'Today') : date === addDays(TODAY, 1) ? tx('Morgen', 'Tomorrow') : date > TODAY && daysBetween(TODAY, date) < 7 ? WD_SHORT[weekday(date)] : short(date);

/** "Morgen 9:30, Tom geht hin": when it is and who has it. */
function eventLine(e: CalEvent, me: PersonId): string {
  const when = e.allDay ? dayWord(e.date) : `${dayWord(e.date)} ${hm(e.start)}`;
  const other = me === 'J' ? 'T' : 'J';
  const who = e.who === 'both' ? tx('ihr beide', 'both of you')
    : e.who === me ? tx('du gehst hin', "you're going")
      : e.who === other ? tx(`${persons[other].name} geht hin`, `${persons[other].name} is going`)
        : tx('wer geht, ist offen', "who's going is open");
  return `${when}, ${who}`;
}

/** The lines of "Neu und offen", newest first. */
export function startRows(feed: FeedEntry[], s: Pick<State, 'events' | 'lists' | 'tasks'>, me: PersonId, seen: string, now = Date.now()): StartRow[] {
  const out: StartRow[] = [];
  const has = new Set<string>();
  const add = (r: StartRow) => { if (!has.has(r.key) && out.length < START_MAX) { has.add(r.key); out.push(r); } };
  for (let i = feed.length - 1; i >= 0 && out.length < START_MAX; i--) {
    const f = feed[i];
    if (f.by === me || f.undone || f.answer || now - Date.parse(f.at) > WEEK) continue;
    const fresh = f.at > seen;
    const name = persons[f.by].name;
    if (f.ask) {
      // A question to me that nobody answered yet stays open; an answered one is done and leaves the list.
      if (f.ask.to === me && !feed.some((x) => x.answer?.ask === f.id)) add({ key: `ask-${f.id}`, icon: 'chat', title: tx(`${name} fragt`, `${name} asks`), sub: f.ask.q, at: f.at, fresh: true, to: { entry: f.id } });
      continue;
    }
    for (const id of f.events ?? []) {
      const e = s.events.find((x) => x.id === id);
      if (e) add({ key: `e-${id}`, icon: e.icon, title: e.title, sub: eventLine(e, me), at: f.at, fresh, to: { event: id } });
    }
    if (f.items) {
      const l = s.lists.find((x) => x.id === f.items!.list);
      const names = (f.snap?.items ?? []).slice(0, 2).join(tx(' und ', ' and '));
      if (l) add({
        key: `l-${l.id}`, icon: listIcon(l), title: l.name, at: f.at, fresh, to: { list: l.id },
        sub: names ? tx(`${name} hat ${names} dazugeschrieben`, `${name} added ${names}`) : tx('Geändert', 'Changed'),
      });
    }
    for (const id of f.tasks ?? []) {
      const t = s.tasks.find((x) => x.id === id);
      if (t && !t.done) add({ key: `t-${id}`, icon: t.icon, title: t.title, sub: tx(`Aufgabe von ${name}`, `Task from ${name}`), at: f.at, fresh, to: { tasks: true } });
    }
  }
  return out;
}
