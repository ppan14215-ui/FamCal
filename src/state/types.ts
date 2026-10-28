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
  /** '0m' | '10m' | '30m' | '1h' | '1d' | '1w' | 'vorabend'; empty means none. */
  reminder?: string;
  /** Who else is there besides the parents in `who`: ids of family people (children, grandparents). */
  people?: string[];
  note?: string;
  /** Shows "in 12 Tagen" on the Termin and in Heute. */
  countdown?: boolean;
  /** Last day of a series. */
  repeatUntil?: string;
  /** Days left out of a series ("nur dieser Termin" deleted or moved). */
  skipDates?: string[];
};

/** Someone in the family besides the two parents (Julian 28.10.: Kinder, Großeltern). */
export type Person = { id: string; name: string; kind: 'kind' | 'grosseltern' | 'andere'; color: string; birthday?: string };

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

export type Item = { id: string; name: string; qty?: number; note?: string; who: PersonId | null; done: boolean; data?: ItemData };

/**
 * Lists that adapt (Julian 27.10.: "generative UI"). Claude never writes code
 * for a list; it picks building blocks the app already draws, and the server
 * fills what it can find (cover, year, author) for each new entry.
 */
export type Block = 'cover' | 'stars' | 'seen' | 'year' | 'by' | 'link' | 'date' | 'price' | 'place' | 'note';
export type Blueprint = {
  blocks: Block[];
  /** Where covers and facts come from; null means nothing is looked up. */
  source: 'books' | 'movies' | null;
  /** Label for the seen block: "Gesehen", "Gelesen", "Gekocht". */
  seenLabel?: string;
};
export type ItemData = {
  cover?: string;
  stars?: number;
  seen?: boolean;
  year?: string;
  /** Author, director, shop. */
  by?: string;
  link?: string;
  date?: string;
  price?: string;
  place?: string;
  /** true while the server looks it up, so the row can show a placeholder. */
  looking?: boolean;
};

export type Section = { id: string; title: string; items: Item[] };

export type List = {
  id: string;
  name: string;
  icon: ClayName;
  sub?: string;
  /** collection: plain rows without a check, e.g. films to watch (Julian 27.10.). */
  kind: 'shopping' | 'packing' | 'collection';
  sections: Section[];
  /** Only for lists that adapt: which blocks each row shows. */
  blueprint?: Blueprint;
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

/** done: something happened; undo: something went away and can come back; warn: something needs a look; info: just so you know. */
export type ToastKind = 'done' | 'undo' | 'warn' | 'info';
export type Toast = { id: number; text: string; sub?: string; kind: ToastKind; undo?: () => void; ms: number };

/** A comment on a Termin ("Ich hol ihn ab"). */
export type Comment = { id: string; role: PersonId; body: string; at: string };
