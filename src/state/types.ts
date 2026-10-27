import type { ClayName } from '../lib/clayIcons';
import type { PersonId } from '../theme';

export type Who = PersonId | 'both' | null;

export type Bring = {
  id: string; t: string; done: boolean;
  /** Who brings it along; empty means whoever goes. */
  who?: 'J' | 'T' | null;
  /** Added by the assistent, with the page it came from. */
  by?: 'assistent'; src?: string; url?: string;
};

export type CalEvent = {
  id: string;
  title: string;
  sub?: string;
  icon: ClayName;
  date: string; // ISO
  /** Last day of a multi-day entry. */
  endDate?: string;
  start: string; // HH:MM
  allDay?: boolean;
  end?: string;
  who: Who;
  place?: string;
  bring?: Bring[];
  source?: string;
  /** Connected calendar it came from (google, icloud, outlook). */
  cal?: string;
  repeat?: string;
  /** Work blocks come from synced calendars and only show as a striped block. */
  work?: boolean;
  reminder?: string;
};

export type Task = {
  id: string;
  title: string;
  sub?: string;
  /** Detail text on the swipe card */
  text?: string;
  icon: ClayName;
  due?: string; // ISO
  dueLabel?: string;
  frist?: boolean;
  who: Who;
  done: boolean;
  doneBy?: PersonId;
  /** Where to do it (the city's Kita portal and the like). */
  url?: string;
};

export type Item = { id: string; name: string; qty?: number; note?: string; who: PersonId | null; done: boolean };

export type Section = { id: string; title: string; items: Item[] };

export type List = {
  id: string;
  name: string;
  icon: ClayName;
  sub?: string;
  /** collection: plain rows without a check, e.g. films to watch (Julian 27.10.). */
  kind: 'shopping' | 'packing' | 'collection';
  sections: Section[];
};

export type InboxItem = {
  id: string;
  icon: ClayName;
  src: string;
  title: string;
  made: string;
  state: 'ask' | 'ok';
  /** What "Ja" adds. */
  adds?: { event?: CalEvent; task?: Task };
};

export type Doc = {
  id: string;
  icon: ClayName;
  title: string;
  sub: string;
  group: 'frist' | 'ben';
  frist?: string; // ISO
  missing?: boolean;
  who?: Who;
  route?: string;
};

export type Milestone = {
  id: string;
  icon: ClayName;
  title: string;
  sub: string;
  date: string;
  frist?: boolean;
  done: boolean;
  who?: Who;
  text?: string;
};

export type Toast = { id: number; text: string; undo?: () => void };
