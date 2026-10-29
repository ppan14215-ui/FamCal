/**
 * Listen und Aufgaben für die ganze Familie (Julian 29.10.: "Einmal sagen.
 * Beide wissen's."). Like the Termine: the screens keep working on the local
 * store, this only watches it. Each list, each item and each task is its own
 * row in family_docs, so two people on the same list only collide when they
 * change the very same item. Incoming rows are patched into the store one by
 * one, which keeps whatever this phone has not sent yet.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './cloud';
import { get, set, subscribe } from '../state/store';
import type { List, Item, Task } from '../state/types';

type Type = 'list' | 'item' | 'task';
type Doc = { type: Type; id: string; parent: string | null; section: string | null; pos: number; data: any };
type ListMeta = Omit<List, 'sections'> & { sections: { id: string; title: string }[] };

const k = (d: { type: Type; id: string }) => `${d.type}:${d.id}`;
const sig = (d: Doc) => JSON.stringify([d.parent, d.section, d.pos, d.data]);

function flatten(lists: List[], tasks: Task[]): Doc[] {
  const out: Doc[] = [];
  lists.forEach((l, i) => {
    const meta: ListMeta = { ...l, sections: l.sections.map((s) => ({ id: s.id, title: s.title })) };
    out.push({ type: 'list', id: l.id, parent: null, section: null, pos: i, data: meta });
    l.sections.forEach((s) => s.items.forEach((it, j) => out.push({ type: 'item', id: it.id, parent: l.id, section: s.id, pos: j, data: it })));
  });
  tasks.forEach((t, i) => out.push({ type: 'task', id: t.id, parent: null, section: null, pos: i, data: t }));
  return out;
}

function assemble(docs: Doc[]): { lists: List[]; tasks: Task[] } {
  const byPos = (a: Doc, b: Doc) => a.pos - b.pos;
  const items = docs.filter((d) => d.type === 'item').sort(byPos);
  const lists = docs.filter((d) => d.type === 'list').sort(byPos).map((d) => {
    const m = d.data as ListMeta;
    const secs = m.sections.length ? m.sections : [{ id: 'main', title: '' }];
    return { ...m, sections: secs.map((s, i) => ({ ...s, items: items.filter((it) => it.parent === m.id && (it.section === s.id || (i === 0 && !secs.some((x) => x.id === it.section)))).map((it) => it.data as Item) })) } as List;
  });
  const tasks = docs.filter((d) => d.type === 'task').sort(byPos).map((d) => d.data as Task);
  return { lists, tasks };
}

let fam: string | null = null;
let known = new Map<string, string>();
let last: { lists: List[]; tasks: Task[] } | null = null;
let stopStore: (() => void) | null = null;
let channel: RealtimeChannel | null = null;
let pushing = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;

function push() {
  pushing = pushing.then(async () => {
    if (!supabase || !fam) return;
    const now = flatten(get().lists, get().tasks);
    const ids = new Set(now.map(k));
    const changed = now.filter((d) => known.get(k(d)) !== sig(d));
    const gone = [...known.keys()].filter((x) => !ids.has(x));
    if (changed.length) {
      const { error } = await supabase.from('family_docs').upsert(changed.map((d) => ({ family_id: fam, ...d })));
      if (!error) changed.forEach((d) => known.set(k(d), sig(d)));
      else console.warn('[listen] upsert', error.message);
    }
    for (const type of ['list', 'item', 'task'] as Type[]) {
      const these = gone.filter((x) => x.startsWith(`${type}:`)).map((x) => x.slice(type.length + 1));
      if (!these.length) continue;
      const { error } = await supabase.from('family_docs').delete().eq('family_id', fam).eq('type', type).in('id', these);
      if (!error) these.forEach((id) => known.delete(`${type}:${id}`));
      else console.warn('[listen] delete', error.message);
    }
  }).catch((e) => console.warn('[listen]', e));
}

/** One row from the partner, patched into the store. */
function apply(d: Doc, gone: boolean) {
  const s = get();
  if (d.type === 'task') {
    const rest = s.tasks.filter((t) => t.id !== d.id);
    if (gone) return set(() => ({ tasks: rest }));
    const at = Math.min(d.pos, rest.length);
    return set(() => ({ tasks: [...rest.slice(0, at), d.data as Task, ...rest.slice(at)] }));
  }
  if (d.type === 'list') {
    if (gone) return set((x) => ({ lists: x.lists.filter((l) => l.id !== d.id), activeList: x.activeList === d.id ? 'aufgaben' : x.activeList }));
    const m = d.data as ListMeta;
    const was = s.lists.find((l) => l.id === d.id);
    // Items stay where they are; those of a section that went away move to the first one.
    const orphans = was?.sections.filter((x) => !m.sections.some((y) => y.id === x.id)).flatMap((x) => x.items) ?? [];
    const secs = m.sections.length ? m.sections : [{ id: 'main', title: '' }];
    const merged: List = { ...m, sections: secs.map((sec, i) => ({ ...sec, items: [...(was?.sections.find((x) => x.id === sec.id)?.items ?? []), ...(i === 0 ? orphans : [])] })) };
    const rest = s.lists.filter((l) => l.id !== d.id);
    const at = Math.min(d.pos, rest.length);
    return set(() => ({ lists: [...rest.slice(0, at), merged, ...rest.slice(at)] }));
  }
  // An item: out of every list first, then into its list and section.
  const lists = s.lists.map((l) => ({ ...l, sections: l.sections.map((sec) => ({ ...sec, items: sec.items.filter((it) => it.id !== d.id) })) }));
  if (!gone) {
    const l = lists.find((x) => x.id === d.parent);
    if (l) {
      const sec = l.sections.find((x) => x.id === d.section) ?? l.sections[0];
      if (sec) { const at = Math.min(d.pos, sec.items.length); sec.items = [...sec.items.slice(0, at), d.data as Item, ...sec.items.slice(at)]; }
    }
  }
  set(() => ({ lists }));
}

export async function startListSync(familyId: string) {
  stopListSync();
  if (!supabase) return;
  fam = familyId;
  const { data, error } = await supabase.from('family_docs').select('type, id, parent, section, pos, data').eq('family_id', familyId);
  if (error || !data) { console.warn('[listen] load', error?.message); return; }
  const remote = data as Doc[];
  known = new Map(remote.map((d) => [k(d), sig(d)]));
  if (remote.length) {
    // Everything entered on this phone before signing in goes up with the rest.
    const have = new Set(remote.map(k));
    const local = flatten(get().lists, get().tasks).filter((d) => !have.has(k(d)));
    const both = assemble([...remote, ...local.map((d, i) => ({ ...d, pos: d.pos + 1000 + i }))]);
    set(() => ({ lists: both.lists.length ? both.lists : get().lists, tasks: both.tasks }));
  }
  last = { lists: get().lists, tasks: get().tasks };
  push();
  void import('./enrich').then((m) => m.refreshCovers());
  stopStore = subscribe(() => {
    const s = get();
    if (last && s.lists === last.lists && s.tasks === last.tasks) return;
    last = { lists: s.lists, tasks: s.tasks };
    // Typing into a row changes it with every letter; send once the hand rests.
    clearTimeout(timer);
    timer = setTimeout(push, 400);
  });
  channel = supabase
    .channel(`docs:${familyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'family_docs', filter: `family_id=eq.${familyId}` }, (p) => {
      const gone = p.eventType === 'DELETE';
      const d = (gone ? p.old : p.new) as Doc & { family_id?: string };
      // Deletes are not filtered by the server, so check the family here.
      if (!d?.type || !d.id || (d.family_id && d.family_id !== familyId)) return;
      if (gone) { if (!known.has(k(d))) return; known.delete(k(d)); }
      else { if (known.get(k(d)) === sig(d)) return; known.set(k(d), sig(d)); }
      apply(d, gone);
      last = { lists: get().lists, tasks: get().tasks };
    })
    .subscribe();
}

export function stopListSync() {
  stopStore?.(); stopStore = null;
  clearTimeout(timer);
  if (channel) supabase?.removeChannel(channel);
  channel = null;
  fam = null;
  known = new Map();
}
