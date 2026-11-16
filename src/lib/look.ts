/**
 * Deine Farbe (Julian 13.11.2026, klar look): the app itself is neutral; colour comes from the people. Memo can wear
 * my colour too, black stays his default ("minimalistisch schwarz falls man das will").
 * Since 16.11. my chat bubble wears the colour I have in the calendar (see useBubble); the eight bubble tones of
 * before are only kept so a saved choice still reads.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';
import { tokens, persons, type PersonId } from '../theme';
import { useStore } from '../state/store';
import { usePalette } from '../theme/mode';
import { getFamily, myRole } from './sync';

export const BUBBLES = [
  { id: 'teal', de: 'Teal', en: 'Teal', c: '#13878C' },
  { id: 'salbei', de: 'Salbei', en: 'Sage', c: '#4C7A58' },
  { id: 'pfirsich', de: 'Pfirsich', en: 'Peach', c: '#C9603C' },
  { id: 'lavendel', de: 'Lavendel', en: 'Lavender', c: '#6A58CC' },
  { id: 'himmel', de: 'Himmel', en: 'Sky', c: '#2C6BD2' },
  { id: 'beere', de: 'Beere', en: 'Berry', c: '#AE3268' },
  { id: 'sand', de: 'Sand', en: 'Sand', c: '#9A7432' },
  { id: 'graphit', de: 'Graphit', en: 'Graphite', c: '#3A4045' },
] as const;
export type BubbleId = (typeof BUBBLES)[number]['id'];
export type MemoColor = 'ink' | 'me';

const readBubble = (): BubbleId => { const v = getPref('bubble'); return (BUBBLES.find((b) => b.id === v)?.id ?? 'teal') as BubbleId; };
const readMemo = (): MemoColor => (getPref('memoColor') === 'me' ? 'me' : 'ink');

let state = { bubble: readBubble(), memo: readMemo() };
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());
// The saved choice arrives a moment after start.
onPrefsReady(() => { const b = readBubble(), m = readMemo(); if (b !== state.bubble || m !== state.memo) { state = { bubble: b, memo: m }; emit(); } });

export function setBubble(id: BubbleId) { if (id === state.bubble) return; state = { ...state, bubble: id }; setPref('bubble', id); emit(); }
export function setMemoColor(v: MemoColor) { if (v === state.memo) return; state = { ...state, memo: v }; setPref('memoColor', v); emit(); }

const use = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => state, () => state);

/** Who I am in the family; before there is one, the first parent. */
const meId = (): PersonId => (getFamily() ? myRole() : 'J');
/**
 * Your colour: its deep tone, the soft fill behind your words, and the text colour on that fill.
 * Julian 16.11.: "Bubble color and color in the calendar etc should be the same and choose able per person". So my
 * bubble wears the colour I have in the calendar; there is no bubble colour of its own any more.
 */
export function useBubble() {
  use();
  useStore((st) => st.colors);
  usePalette();
  const p = persons[meId()];
  return { id: p.colorName, color: p.ink, soft: p.tint, ink: tokens.ink };
}
/** Memo's body colour: ink, or my colour. */
export function useMemoColor(): string {
  const s = use();
  useStore((st) => st.colors);
  usePalette();
  return s.memo === 'me' ? persons[meId()].ink : tokens.ink;
}
export const useMemoChoice = () => use().memo;
