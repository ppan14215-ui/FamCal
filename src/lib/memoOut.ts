/**
 * Klar: Memo leaves the nav pill for the Sprechkarte and while the assistant thinks (Julian 14.11.2026: "the eyes
 * turn into the loading bubble", then "Memo turns back into its old place, the nav slides back in"). The Sprechkarte
 * (SpeakCard) owns this; the nav and the pill's own Memo only read it.
 *
 *   away  the dark card or the thinking bubble shows, so the nav pill steps back
 *   out   the travelling Memo is on screen, so the pill's own Memo hides (there is only ever one)
 *   dx    where Memo sits in the nav pill, from the pill's middle to his middle
 */
import { useSyncExternalStore } from 'react';

type State = { away: boolean; out: boolean; dx: number };

let state: State = { away: false, out: false, dx: 112 };
const subs = new Set<() => void>();

export function setMemoOut(patch: Partial<State>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof State)[]) if (state[k] !== patch[k]) changed = true;
  if (!changed) return;
  state = { ...state, ...patch };
  subs.forEach((l) => l());
}

export function useMemoOut() {
  return useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => state, () => state);
}
