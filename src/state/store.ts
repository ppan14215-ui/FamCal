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
import { TODAY } from '../lib/dates';

export type CalView = 'tag' | 'woche' | 'monat' | 'jahr';

type State = {
  names: { J: string; T: string };
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

const initial = (): State => ({
  names: { J: 'Julia', T: 'Tom' },
  events: S.events,
  tasks: S.tasks,
  lists: [S.shopping, S.kliniktasche(), S.geschenke()],
  inbox: S.inbox,
  docs: S.docs,
  milestones: S.milestones,
  onboardingCards: S.onboardingCards,
  toast: null,
  calView: 'tag',
  calDay: TODAY,
  activeList: 'aufgaben',
  recentSymbols: [],
  draftSymbol: null,
  hints: { abo: true, urlaub: true },
  photoTaken: false,
  plan: 'gruender',
});

let state = initial();
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

const nextWho = (w: PersonId | null): PersonId | null => (w === 'T' ? 'J' : w === 'J' ? null : 'T');
const mapList = (lists: List[], listId: string, f: (l: List) => List) => lists.map((l) => (l.id === listId ? f(l) : l));
const mapItems = (l: List, f: (i: Item) => Item | null): List => ({
  ...l,
  sections: l.sections.map((s) => ({ ...s, items: s.items.map(f).filter(Boolean) as Item[] })),
});

// ─── Actions ───────────────────────────────────────────────────────────────

export const actions = {
  reset() { state = initial(); subs.forEach((l) => l()); },
  setNames(names: { J: string; T: string }) { set(() => ({ names })); },

  // Calendar
  setCalView(v: CalView) { set(() => ({ calView: v })); },
  setCalDay(d: string) { set(() => ({ calDay: d })); },
  addEvent(e: CalEvent) { set((s) => ({ events: [...s.events.filter((x) => x.id !== e.id), e] })); },
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
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, who: nextWho(t.who === 'both' ? null : t.who) } : t)) }));
  },
  renameTask(id: string, title: string) { set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, title } : t)) })); },
  addTask(title: string) {
    set((s) => ({ tasks: [...s.tasks, { id: S.newId('t'), title, icon: 'erledigt', who: null, done: false, text: 'Neu angelegt. Wer übernimmt?' }] }));
  },
  deleteTask(id: string) {
    const before = state.tasks;
    const t = before.find((x) => x.id === id);
    set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
    toast(`${t?.title ?? 'Aufgabe'} gelöscht`, () => set(() => ({ tasks: before })));
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
    const before = state.lists;
    let name = '';
    set((s) => ({ lists: mapList(s.lists, listId, (l) => mapItems(l, (i) => { if (i.id === itemId) { name = S.itemText(i).replace(/^\d+ /, ''); return null; } return i; })) }));
    toast(`${name} gelöscht`, () => set(() => ({ lists: before })));
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
      set((s) => ({ lists: mapList(s.lists, 'einkauf', (ll) => mapItems(ll, (i) => (i.id === existing.id ? null : i))) }));
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
      const before = state.inbox;
      set((s) => ({ inbox: s.inbox.filter((x) => x.id !== id) }));
      toast('Verworfen', () => set(() => ({ inbox: before })));
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
    set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, who: d.who === 'J' ? 'T' : d.who === 'T' ? null : 'J' } : d)) }));
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
