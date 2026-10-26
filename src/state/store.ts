/**
 * App state for the prototype: one in-memory store, no backend, no login.
 * Components subscribe with `useStore(selector)`; actions mutate through
 * `set()` with plain immutable updates. Resets on reload by design.
 */
import { useSyncExternalStore } from 'react';
import * as S from '../data/sample';
import type { CalEvent, Task, List, InboxItem, Doc, Milestone, Toast, Item, Who } from './types';
import type { ClayName } from '../lib/clayIcons';
import type { PersonId } from '../theme';
import { TODAY, BEN_BORN } from '../lib/dates';
import { persons, personPalette } from '../theme';
import { firstYear, Kid } from '../data/firstYear';
import { findCity } from '../data/cities';

export type CalView = 'tag' | 'woche' | 'monat' | 'jahr';

type State = {
  names: { J: string; T: string };
  /** The child from onboarding; null until then. */
  kid: Kid | null;
  /** Where the family lives (first onboarding step). */
  city: string;
  /** Connected calendars (onboarding "Eure Kalender"). */
  calendars: { provider: string; account: string; ids: string[] }[];
  /** Sample family loaded ("Ich wurde eingeladen", Einstellungen). */
  demo: boolean;
  /** Palette index per person (Partner screen). */
  colors: Record<PersonId, number>;
  events: CalEvent[];
  tasks: Task[];
  lists: List[];
  inbox: InboxItem[];
  docs: Doc[];
  milestones: Milestone[];
  onboardingCards: Task[];
  toast: Toast | null;
  calView: CalView;
  calDay: string;
  activeList: string;
  /** Symbols picked in "Alle" move to the front of the categories. */
  recentSymbols: ClayName[];
  draftSymbol: ClayName | null;
  hints: { abo: boolean; urlaub: boolean };
  photoTaken: boolean;
  plan: 'gruender' | 'jahr' | 'monat';
};

/**
 * A first launch is empty (Julian 26.10.): everything on screen comes from
 * what the family enters in onboarding. The sample family is one tap away.
 */
const initial = (): State => ({
  names: { J: '', T: '' },
  kid: null,
  city: '',
  calendars: [],
  demo: false,
  colors: { J: 0, T: 1 },
  events: [],
  tasks: [],
  lists: [{ ...S.shopping, sections: S.shopping.sections.map((sec) => ({ ...sec, items: [] })) }],
  inbox: [],
  docs: [],
  milestones: [],
  onboardingCards: [],
  toast: null,
  calView: 'tag',
  calDay: TODAY,
  activeList: 'aufgaben',
  recentSymbols: [],
  draftSymbol: null,
  hints: { abo: false, urlaub: false },
  photoTaken: false,
  plan: 'gruender',
});

/** Julia, Tom and Ben as in the canvas. */
const demo = (): Partial<State> => ({
  names: { J: 'Julia', T: 'Tom' },
  kid: { name: 'Ben', born: BEN_BORN, land: 'Bayern' },
  calendars: [{ provider: 'google', account: 'tom.huber@gmail.com', ids: ['familie', 'arbeit'] }],
  demo: true,
  events: S.events,
  tasks: S.tasks,
  lists: [S.shopping, S.kliniktasche(), S.geschenke()],
  inbox: S.inbox,
  docs: S.docs,
  milestones: S.milestones,
  onboardingCards: S.onboardingCards,
  hints: { abo: true, urlaub: true },
});

/** Names show everywhere through `persons`, so they are kept in step. */
function applyNames(n: { J: string; T: string }) {
  persons.J.name = n.J || 'Ich';
  persons.T.name = n.T || 'Partner';
}

let state = initial();
applyNames(state.names);
const subs = new Set<() => void>();

export function get() { return state; }
export function set(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  subs.forEach((l) => l());
}
function subscribe(l: () => void) { subs.add(l); return () => { subs.delete(l); }; }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

// ─── Toast ──────────────────────────────────────────────────────────────────

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(text: string, undo?: () => void) {
  const t = { id: ++toastSeq, text, undo };
  set(() => ({ toast: t }));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (state.toast?.id === t.id) set(() => ({ toast: null })); }, undo ? 4500 : 2200);
}
export function dismissToast() { set(() => ({ toast: null })); }

// ─── Helpers ───────────────────────────────────────────────────────────────

const mix = (a: string, b: string, k: number) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [A, B] = [h(a), h(b)];
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
};
const nextWho = (w: PersonId | null): PersonId | null => (w === 'T' ? 'J' : w === 'J' ? null : 'T');
const mapList = (lists: List[], listId: string, f: (l: List) => List) => lists.map((l) => (l.id === listId ? f(l) : l));
const mapItems = (l: List, f: (i: Item) => Item | null): List => ({
  ...l,
  sections: l.sections.map((s) => ({ ...s, items: s.items.map(f).filter(Boolean) as Item[] })),
});

// ─── Actions ───────────────────────────────────────────────────────────────

export const actions = {
  reset() { state = initial(); applyNames(state.names); actions.setColor('J', 0); actions.setColor('T', 1); },
  loadDemo() { const d = demo(); applyNames(d.names!); set(() => d); actions.setColor('J', 0); actions.setColor('T', 1); },
  setNames(names: { J: string; T: string }) { applyNames(names); set(() => ({ names })); },
  setCity(city: string) { set(() => ({ city })); },
  /** A person's colour shows everywhere they appear, so `persons` changes with it. */
  setColor(p: PersonId, i: number) {
    const c = personPalette[i];
    Object.assign(persons[p], { tint: c.bg, ink: c.fg, stripe: mix(c.bg, c.fg, 0.14), colorName: c.name });
    set((s) => ({ colors: { ...s.colors, [p]: i } }));
  },
  /** From "Eure Kinder": the first year is planned from the date alone. */
  setKid(kid: Kid) {
    const { milestones, cards } = firstYear(kid, findCity(state.city));
    set(() => ({ kid, milestones, onboardingCards: cards }));
  },
  connectCalendar(provider: string, account: string, ids: string[], events: CalEvent[]) {
    set((s) => ({
      calendars: [...s.calendars.filter((c) => c.provider !== provider), ...(ids.length ? [{ provider, account, ids }] : [])],
      events: [...s.events.filter((e) => e.cal !== provider), ...events.map((e) => ({ ...e, cal: provider }))],
    }));
  },
  /** Cards decided in onboarding become tasks; open ones stay without owner. */
  cardsToTasks() {
    set((s) => ({
      tasks: [...s.tasks.filter((t) => !s.onboardingCards.some((c) => `t-${c.id}` === t.id)), ...s.onboardingCards.map((c) => ({ ...c, id: `t-${c.id}` }))],
    }));
  },

  // Calendar
  setCalView(v: CalView) { set(() => ({ calView: v })); },
  setCalDay(d: string) { set(() => ({ calDay: d })); },
  /** Saving the same title on the same day and time again replaces it. */
  addEvent(e: CalEvent) {
    set((s) => ({ events: [...s.events.filter((x) => x.id !== e.id && !(x.title === e.title && x.date === e.date && x.start === e.start)), e] }));
  },
  /** Verschieben: new day and time, Rückgängig puts it back. */
  moveEvent(id: string, w: { date: string; start?: string; end?: string; endDate?: string }) {
    const before = state.events.find((e) => e.id === id);
    if (!before) return;
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, date: w.date, endDate: w.endDate, start: w.start ?? '00:00', end: w.end, allDay: !w.start } : e)) }));
    return before;
  },
  restoreEvent(e: CalEvent) { set((s) => ({ events: s.events.map((x) => (x.id === e.id ? e : x)) })); },
  /** Everything on a Termin stays editable (Julian 26.10.). */
  updateEvent(id: string, patch: Partial<CalEvent>) { set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })); },
  /** Empty text removes the line. */
  editBring(eid: string, bid: string, t: string) {
    set((s) => ({ events: s.events.map((e) => (e.id === eid ? { ...e, bring: t.trim() ? e.bring?.map((b) => (b.id === bid ? { ...b, t: t.trim() } : b)) : e.bring?.filter((b) => b.id !== bid) } : e)) }));
  },
  deleteBring(eid: string, bid: string) {
    const e = state.events.find((x) => x.id === eid);
    const i = e?.bring?.findIndex((b) => b.id === bid) ?? -1;
    if (!e || i < 0) return;
    const gone = e.bring![i];
    set((s) => ({ events: s.events.map((x) => (x.id === eid ? { ...x, bring: x.bring?.filter((b) => b.id !== bid) } : x)) }));
    toast(`„${gone.t}“ gelöscht`, () => set((s) => ({ events: s.events.map((x) => (x.id === eid ? { ...x, bring: [...(x.bring ?? []).slice(0, i), gone, ...(x.bring ?? []).slice(i)] } : x)) })));
  },
  cycleBringWho(eid: string, bid: string) {
    const next = (w?: 'J' | 'T' | null) => (w === 'J' ? 'T' : w === 'T' ? null : 'J');
    set((s) => ({ events: s.events.map((e) => (e.id === eid ? { ...e, bring: e.bring?.map((b) => (b.id === bid ? { ...b, who: next(b.who) } : b)) } : e)) }));
  },
  setEventWho(id: string, who: Who) { set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, who } : e)) })); },
  toggleBring(eid: string, bid: string) {
    set((s) => ({ events: s.events.map((e) => (e.id === eid ? { ...e, bring: e.bring?.map((b) => (b.id === bid ? { ...b, done: !b.done } : b)) } : e)) }));
  },
  addBring(eid: string, t: string) {
    set((s) => ({ events: s.events.map((e) => (e.id === eid ? { ...e, bring: [...(e.bring ?? []), { id: S.newId('b'), t, done: false }] } : e)) }));
  },

  // Tasks
  toggleTask(id: string) {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneBy: !t.done ? (t.who === 'J' || t.who === 'T' ? t.who : 'J') : undefined } : t)) }));
  },
  assignTask(id: string, who: Who) { set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, who } : t)) })); },
  cycleTaskWho(id: string) {
    // A done task keeps an owner (it shows who did it), so it cycles Tom <-> Julia only.
    set((s) => ({ tasks: s.tasks.map((t) => {
      if (t.id !== id) return t;
      const next = nextWho(t.who === 'both' ? null : t.who);
      return { ...t, who: t.done && !next ? 'T' : next };
    }) }));
  },
  renameTask(id: string, title: string) {
    const t = title.trim();
    if (!t) return actions.deleteTask(id);
    set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, title: t } : x)) }));
  },
  addTask(title: string) {
    set((s) => ({ tasks: [...s.tasks, { id: S.newId('t'), title, icon: 'erledigt', who: null, done: false, text: 'Neu angelegt. Wer übernimmt?' }] }));
  },
  deleteTask(id: string) {
    const idx = state.tasks.findIndex((x) => x.id === id);
    const t = state.tasks[idx];
    if (!t) return;
    set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
    // Undo puts back only this task, so changes made meanwhile survive.
    toast(`${t.title} gelöscht`, () => set((s) => (s.tasks.some((x) => x.id === id) ? {} : { tasks: [...s.tasks.slice(0, idx), t, ...s.tasks.slice(idx)] })));
  },
  /** Move a card to the back of the unassigned stack ("Später"). */
  laterTask(id: string) {
    set((s) => {
      const t = s.tasks.find((x) => x.id === id);
      return t ? { tasks: [...s.tasks.filter((x) => x.id !== id), t] } : {};
    });
  },

  // Onboarding cards
  assignCard(id: string, who: Who) { set((s) => ({ onboardingCards: s.onboardingCards.map((c) => (c.id === id ? { ...c, who } : c)) })); },
  laterCard(id: string) {
    set((s) => {
      const c = s.onboardingCards.find((x) => x.id === id);
      return c ? { onboardingCards: [...s.onboardingCards.filter((x) => x.id !== id), c] } : {};
    });
  },

  // Lists
  setActiveList(id: string) { set(() => ({ activeList: id })); },
  toggleItem(listId: string, itemId: string) {
    set((s) => ({ lists: mapList(s.lists, listId, (l) => mapItems(l, (i) => (i.id === itemId ? { ...i, done: !i.done } : i))) }));
  },
  cycleItemWho(listId: string, itemId: string) {
    set((s) => ({ lists: mapList(s.lists, listId, (l) => mapItems(l, (i) => (i.id === itemId ? { ...i, who: nextWho(i.who) } : i))) }));
  },
  /** Inline edit: parse quantity and note; shopping items re-sort themselves. */
  editItem(listId: string, itemId: string, text: string) {
    const p = S.parseItem(text);
    if (!p.name) return actions.deleteItem(listId, itemId);
    set((s) => ({
      lists: mapList(s.lists, listId, (l) => {
        let moved: Item | null = null;
        const updated = mapItems(l, (i) => {
          if (i.id !== itemId) return i;
          const n = { ...i, name: p.name, qty: p.qty, note: p.note };
          if (l.kind === 'shopping') { moved = n; return null; }
          return n;
        });
        if (!moved) return updated;
        const target = S.sectionFor(p.name);
        return { ...updated, sections: updated.sections.map((sec) => (sec.id === target ? { ...sec, items: [...sec.items, moved!] } : sec)) };
      }),
    }));
  },
  deleteItem(listId: string, itemId: string) {
    const list = state.lists.find((l) => l.id === listId);
    let at: { sid: string; idx: number; item: Item } | null = null;
    list?.sections.forEach((sec) => sec.items.forEach((i, idx) => { if (i.id === itemId) at = { sid: sec.id, idx, item: i }; }));
    if (!at) return;
    const { sid, idx, item } = at as { sid: string; idx: number; item: Item };
    set((s) => ({ lists: mapList(s.lists, listId, (l) => mapItems(l, (i) => (i.id === itemId ? null : i))) }));
    toast(`${S.itemText(item).replace(/^\d+ /, '')} gelöscht`, () => set((s) => ({
      lists: mapList(s.lists, listId, (l) => (l.sections.some((sec) => sec.items.some((i) => i.id === itemId)) ? l : {
        ...l, sections: l.sections.map((sec) => (sec.id === sid ? { ...sec, items: [...sec.items.slice(0, idx), item, ...sec.items.slice(idx)] } : sec)),
      })),
    })));
  },
  addItem(listId: string, text: string, sectionId?: string) {
    const p = S.parseItem(text);
    if (!p.name) return;
    set((s) => ({
      lists: mapList(s.lists, listId, (l) => {
        const sid = l.kind === 'shopping' ? S.sectionFor(p.name) : sectionId ?? l.sections[l.sections.length - 1]?.id;
        const item: Item = { id: S.newId('i'), name: p.name, qty: p.qty, note: p.note, who: null, done: false };
        return { ...l, sections: l.sections.map((sec) => (sec.id === sid ? { ...sec, items: [...sec.items, item] } : sec)) };
      }),
    }));
  },
  /** Add field: tapping again removes it (Canvas "Einkauf · Hinzufügen"). */
  toggleShopping(name: string) {
    const l = state.lists.find((x) => x.id === 'einkauf')!;
    const existing = l.sections.flatMap((s) => s.items).find((i) => i.name.toLowerCase() === name.toLowerCase() && !i.done);
    if (existing) {
      actions.deleteItem('einkauf', existing.id);
    } else {
      actions.addItem('einkauf', name);
    }
  },
  createList(list: List) { set((s) => ({ lists: [...s.lists, list], activeList: list.id })); },

  // Hints
  dismissHint(k: 'abo' | 'urlaub') { set((s) => ({ hints: { ...s.hints, [k]: false } })); },

  // Inbox
  confirmInbox(id: string, yes: boolean) {
    const item = state.inbox.find((x) => x.id === id);
    if (!item) return;
    if (!yes) {
      const idx = state.inbox.indexOf(item);
      set((s) => ({ inbox: s.inbox.filter((x) => x.id !== id) }));
      toast('Verworfen', () => set((s) => (s.inbox.some((x) => x.id === id) ? {} : { inbox: [...s.inbox.slice(0, idx), item, ...s.inbox.slice(idx)] })));
      return;
    }
    set((s) => ({
      inbox: s.inbox.map((x) => (x.id === id ? { ...x, state: 'ok' } : x)),
      events: item.adds?.event ? [...s.events, item.adds.event] : s.events,
      tasks: item.adds?.task ? [...s.tasks, item.adds.task] : s.tasks,
    }));
    toast('Eingetragen');
  },
  assignDoc(id: string) {
    set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, who: nextWho(d.who === 'both' ? null : d.who ?? null) } : d)) }));
  },

  // Symbols
  pickSymbol(n: ClayName) {
    set((s) => ({ draftSymbol: n, recentSymbols: [n, ...s.recentSymbols.filter((x) => x !== n)].slice(0, 4) }));
  },
  clearDraftSymbol() { set(() => ({ draftSymbol: null })); },

  toggleMilestone(id: string) { set((s) => ({ milestones: s.milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m)) })); },

  setPlan(p: State['plan']) { set(() => ({ plan: p })); },
  setPhotoTaken(v: boolean) { set(() => ({ photoTaken: v })); },
};
