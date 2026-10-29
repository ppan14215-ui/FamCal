/**
 * Der Familienchat (Julian 29.10.): everything said, typed or photographed
 * becomes a card, and the chat is the log of it. Each entry points at what it
 * made (Termine, items, tasks), so the cards stay live: ticked in the list is
 * ticked in the chat. It also keeps a small snapshot of the card, so the
 * partner sees it even for things that only live on the other phone (lists).
 * Signed in, the log lives in Supabase (family_feed) and arrives live; in the
 * test link it stays on the phone.
 */
import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './cloud';
import { get, toast } from '../state/store';
import { getFamily, myRole } from './sync';
import { tx } from '../i18n/lang';
import type { PersonId } from '../theme';
import type { ClayName } from './clayIcons';

export type EventSnap = { id: string; title: string; date: string; start: string; end?: string; allDay?: boolean; icon: ClayName; place?: string };
export type Card = {
  events?: string[];
  tasks?: string[];
  items?: { list: string; ids: string[] };
  /** The receipt line, e.g. "Mehl und Milch stehen auf Einkauf." */
  text?: string;
  /** What the card showed when it was made. */
  snap?: { events?: EventSnap[]; list?: string; items?: string[]; tasks?: string[] };
};
export type FeedEntry = Card & {
  id: string;
  /** ISO time. */
  at: string;
  by: PersonId;
  /** What was said or typed, word for word. */
  said: string;
  kind: 'made' | 'msg';
  undone?: boolean;
};

type Row = { id: string; role: PersonId; kind: 'made' | 'msg'; said: string; card: Card | null; undone: boolean; created_at: string };
const fromRow = (r: Row): FeedEntry => ({ ...(r.card ?? {}), id: r.id, at: r.created_at, by: r.role, said: r.said, kind: r.kind, undone: r.undone || undefined });
const cardOf = ({ events, tasks, items, text, snap }: FeedEntry): Card => ({ events, tasks, items, text, snap });

const KEY = 'famcal.feed';
let feed: FeedEntry[] = [];
/** Undo stays on this phone and only for this run of the app. */
const undos = new Map<string, () => void>();
const subs = new Set<() => void>();
const sorted = (xs: FeedEntry[]) => [...xs].sort((a, b) => a.at.localeCompare(b.at));
const emit = () => { subs.forEach((l) => l()); AsyncStorage.setItem(KEY, JSON.stringify(feed.slice(-300))).catch(() => {}); };
const put = (f: FeedEntry) => { feed = sorted([...feed.filter((x) => x.id !== f.id), f]); emit(); };

AsyncStorage.getItem(KEY).then((v) => {
  if (!v) return;
  try { const old: FeedEntry[] = JSON.parse(v); feed = sorted([...old.filter((o) => !feed.some((f) => f.id === o.id)), ...feed]); subs.forEach((l) => l()); } catch {}
}).catch(() => {});

export const useFeed = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => feed, () => feed);
const me = (): PersonId => (getFamily() ? myRole() : 'J');
const newId = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function upload(f: FeedEntry) {
  const fam = getFamily();
  if (!supabase || !fam) return;
  const { error } = await supabase.from('family_feed').insert({ id: f.id, family_id: fam.id, kind: f.kind, said: f.said.slice(0, 2000), card: cardOf(f), created_at: f.at });
  if (error && !/duplicate/i.test(error.message)) toast(tx('Nicht an die Familie gesendet', 'Not sent to the family'));
}

export function addMessage(said: string) {
  const f: FeedEntry = { id: newId(), at: new Date().toISOString(), by: me(), said, kind: 'msg' };
  put(f);
  void upload(f);
}

/** Sorts what a sentence changed into Termine, tasks and list items. */
export function addMade(said: string, ids: string[], text?: string, undo?: () => void, events?: string[]) {
  const s = get();
  const ev = new Set(events ?? []);
  const tasks: string[] = [];
  let items: FeedEntry['items'];
  for (const id of ids) {
    if (s.events.some((e) => e.id === id)) ev.add(id);
    else if (s.tasks.some((t) => t.id === id)) tasks.push(id);
    else {
      const l = s.lists.find((x) => x.sections.some((sec) => sec.items.some((i) => i.id === id)));
      if (l && (!items || items.list === l.id)) items = { list: l.id, ids: [...(items?.ids ?? []), id] };
    }
  }
  if (!ev.size && !tasks.length && !items) return;
  const list = items && s.lists.find((l) => l.id === items!.list);
  const all = list?.sections.flatMap((sec) => sec.items) ?? [];
  const snap: Card['snap'] = {
    events: ev.size ? s.events.filter((e) => ev.has(e.id)).map((e) => ({ id: e.id, title: e.title, date: e.date, start: e.start, end: e.end, allDay: e.allDay, icon: e.icon, place: e.place })) : undefined,
    list: list?.name,
    items: items ? items.ids.map((id) => all.find((i) => i.id === id)?.name).filter(Boolean) as string[] : undefined,
    tasks: tasks.length ? tasks.map((id) => s.tasks.find((t) => t.id === id)?.title ?? '') : undefined,
  };
  const f: FeedEntry = { id: newId(), at: new Date().toISOString(), by: me(), said, kind: 'made', events: ev.size ? [...ev] : undefined, tasks: tasks.length ? tasks : undefined, items, text, snap };
  if (undo) undos.set(f.id, undo);
  put(f);
  void upload(f);
}

export const canUndo = (id: string) => undos.has(id);
export function undoEntry(id: string) {
  undos.get(id)?.();
  undos.delete(id);
  const f = feed.find((x) => x.id === id);
  if (!f) return;
  put({ ...f, undone: true });
  if (supabase && getFamily()) void supabase.from('family_feed').update({ undone: true }).eq('id', id);
}

let channel: RealtimeChannel | null = null;

/** Loads the family's log and listens for the partner; started with the sync. */
export async function startFeed(familyId: string) {
  stopFeed();
  if (!supabase) return;
  channel = supabase
    .channel(`feed:${familyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'family_feed', filter: `family_id=eq.${familyId}` }, (p) => {
      if (p.eventType === 'DELETE') { const id = (p.old as { id: string }).id; feed = feed.filter((f) => f.id !== id); emit(); return; }
      put(fromRow(p.new as Row));
    })
    .subscribe();
  const { data, error } = await supabase.from('family_feed').select('id, role, kind, said, card, undone, created_at').eq('family_id', familyId).order('created_at', { ascending: false }).limit(300);
  if (error || !data) return;
  const remote = (data as Row[]).map(fromRow);
  const ids = new Set(remote.map((f) => f.id));
  // Written on this phone before signing in: goes up with the rest.
  const mine = myRole();
  const local = feed.filter((f) => !ids.has(f.id) && f.by === mine);
  feed = sorted([...remote, ...local]);
  emit();
  local.forEach((f) => void upload(f));
}

export function stopFeed() {
  if (channel) supabase?.removeChannel(channel);
  channel = null;
}
