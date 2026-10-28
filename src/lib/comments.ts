/**
 * Kommentare am Termin (Julian 28.10., Lücke zu TimeTree): "Ich hol ihn ab",
 * "Wer bringt Kuchen?". Signed in they live in Supabase and arrive live for
 * the partner; in the test link they stay on the phone.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './cloud';
import { get, actions, toast } from '../state/store';
import { tx } from '../i18n/lang';
import { getFamily, myRole } from './sync';
import type { Comment } from '../state/types';
import { seriesId } from './repeat';

type Row = { id: string; event_id: string; role: 'J' | 'T'; body: string; created_at: string };
const toComment = (r: Row): Comment => ({ id: r.id, role: r.role, body: r.body, at: r.created_at });

let channel: RealtimeChannel | null = null;

const put = (eid: string, list: Comment[]) => actions.setComments(eid, [...list].sort((a, b) => a.at.localeCompare(b.at)));

/** Loads the comments of one Termin (when it opens). */
export async function loadComments(eventId: string) {
  const eid = seriesId(eventId);
  const fam = getFamily();
  if (!supabase || !fam) return;
  const { data, error } = await supabase.from('event_comments').select('id, event_id, role, body, created_at').eq('event_id', eid).order('created_at').limit(200);
  if (!error && data) put(eid, (data as Row[]).map(toComment));
}

export async function addComment(eventId: string, body: string) {
  const eid = seriesId(eventId);
  const text = body.trim().slice(0, 1000);
  if (!text) return;
  const fam = getFamily();
  const mine: Comment = { id: `local-${Date.now()}`, role: fam ? myRole() : 'J', body: text, at: new Date().toISOString() };
  put(eid, [...(get().comments[eid] ?? []), mine]);
  if (!supabase || !fam) return;
  const { data, error } = await supabase.from('event_comments').insert({ family_id: fam.id, event_id: eid, body: text }).select('id, event_id, role, body, created_at').single();
  const rest = (get().comments[eid] ?? []).filter((c) => c.id !== mine.id);
  if (error || !data) { put(eid, rest); toast(tx('Kommentar nicht gesendet', 'Comment not sent')); return; }
  put(eid, [...rest.filter((c) => c.id !== (data as Row).id), toComment(data as Row)]);
}

export async function deleteComment(eventId: string, id: string) {
  const eid = seriesId(eventId);
  put(eid, (get().comments[eid] ?? []).filter((c) => c.id !== id));
  if (supabase && getFamily() && !id.startsWith('local-')) await supabase.from('event_comments').delete().eq('id', id);
}

/** Live comments from the partner; started with the sync. */
export function watchComments(familyId: string) {
  stopComments();
  if (!supabase) return;
  channel = supabase
    .channel(`comments:${familyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'event_comments', filter: `family_id=eq.${familyId}` }, (p) => {
      if (p.eventType === 'DELETE') {
        const id = (p.old as { id: string }).id;
        for (const [eid, list] of Object.entries(get().comments)) if (list.some((c) => c.id === id)) put(eid, list.filter((c) => c.id !== id));
        return;
      }
      const r = p.new as Row;
      const list = get().comments[r.event_id] ?? [];
      if (!list.some((c) => c.id === r.id)) put(r.event_id, [...list, toComment(r)]);
    })
    .subscribe();
}
export function stopComments() {
  if (channel) supabase?.removeChannel(channel);
  channel = null;
}
