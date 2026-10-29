/**
 * Looks up cover and facts for one entry of a list that adapts (Julian
 * 27.10.: a film list pulls the covers by itself). Runs on the server, so no
 * key ever sits in the app. In the phone test link there is no server; the
 * row then keeps its drawn placeholder cover.
 */
import { supabase } from './cloud';
import { getAuth } from './auth';
import { LANG } from '../i18n/lang';
import type { Blueprint, ItemData } from '../state/types';

type Found = Pick<ItemData, 'cover' | 'year' | 'by' | 'link'>;
/** Raised when the server finds more (29.10.: posters from iTunes), so old rows look once more. */
const LOOKUP = 3;

async function lookUp(source: NonNullable<Blueprint['source']>, q: string): Promise<Found | null> {
  if (!supabase || !getAuth().session) return null;
  const { data, error } = await supabase.functions.invoke<{ found: Found | null }>('liste', { body: { action: 'anreichern', source, q, lang: LANG } });
  return error || !data ? null : data.found;
}

export function enrichItem(listId: string, itemId: string, name: string, source: NonNullable<Blueprint['source']>) {
  // Imported late: the store calls this module, and this module writes back into the store.
  const done = (f: Found | null) => import('../state/store').then(({ actions }) => actions.setItemData(listId, itemId, { ...(f ?? {}), looking: false, looked: LOOKUP }));
  lookUp(source, name).then(done, () => done(null));
}

/** Entries without a cover that an older server could not find get one more try. */
export function refreshCovers() {
  import('../state/store').then(({ get }) => {
    for (const l of get().lists) {
      const source = l.blueprint?.source;
      if (!source) continue;
      for (const i of l.sections.flatMap((s) => s.items)) if (!i.data?.cover && (i.data?.looked ?? 0) < LOOKUP) enrichItem(l.id, i.id, i.name, source);
    }
  }).catch(() => {});
}
