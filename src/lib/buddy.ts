/**
 * Memo, the blob (Julian 07.11.2026: "this is the kind of mascot and animation I
 * was looking for", a soft glossy blob with two pill eyes that sits above the
 * field and lives with the conversation). This file is its little brain: what
 * the app is doing right now, so every Memo on screen can react the same way.
 *
 * Moods, strongest first:
 *   listen  the mic is on: Memo grows, wobbles with the voice, looks up
 *   think   the assistant works: squashes flat and wide, eyes wander
 *   happy   something landed: a hop, eyes turn into ^^
 *   type    the keyboard is open: Memo looks down at the field
 *   sleep   late at night and nothing going on
 *   idle    breathes, blinks, glances around now and then
 */
import { useSyncExternalStore } from 'react';
import { makeMutable } from 'react-native-reanimated';

export type Mood = 'idle' | 'type' | 'listen' | 'think' | 'happy' | 'sleep';

/** How loud the voice is right now, 0 to 1. TalkBar writes it, Memo wobbles with it. */
export const voiceLevel = makeMutable(0);

type State = {
  listening: boolean;
  /** Bumps each time something lands (an entry, an answer): Memo hops once with happy eyes. */
  joy: number;
  /** Bumps on a tap or a new message from the family: a quick glance and hop. */
  poke: number;
  /** Where Memo flies in from on start (the end of the intro), in screen points; null when it simply appears. */
  from: { x: number; y: number } | null;
  /** The intro is still covering the screen. */
  intro: boolean;
};

// intro starts true: BuddyIntro says when the screen is free (it always mounts with the root).
let state: State = { listening: false, joy: 0, poke: 0, from: null, intro: true };
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());

export function setBuddy(patch: Partial<State>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof State)[]) if (state[k] !== patch[k]) changed = true;
  if (!changed) return;
  state = { ...state, ...patch };
  emit();
}
export const buddyJoy = () => setBuddy({ joy: state.joy + 1 });
export const buddyPoke = () => setBuddy({ poke: state.poke + 1 });

export function useBuddy() {
  return useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => state, () => state);
}

/** Night: from 23 to 6 o'clock an idle Memo dozes (concept 01.11. said 21, later so evening use still sees its eyes). */
export const isNight = () => { const h = new Date().getHours(); return h >= 23 || h < 6; };
