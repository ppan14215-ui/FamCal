/**
 * Deine Farbe (Julian 13.11.2026, klar look): the app itself is neutral. The one colour you choose is the colour
 * of your own chat bubbles, and Memo can wear it too. Black stays Memo's default ("minimalistisch schwarz falls
 * man das will"). Only deep tones, so a bubble colour is never mistaken for a person's calendar colour.
 * Kept per device.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';
import { blend, tokens } from '../theme';

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

const colorOf = (id: BubbleId) => BUBBLES.find((b) => b.id === id)!.c;
/** Your bubble: its deep colour, the soft fill behind your words, and the text colour on that fill. */
export function useBubble() {
  const s = use();
  const c = colorOf(s.bubble);
  return { id: s.bubble, color: c, soft: blend(c, '#FFFFFF', 0.86), ink: tokens.ink };
}
/** Memo's body colour: ink, or your bubble colour. */
export function useMemoColor(): string {
  const s = use();
  return s.memo === 'me' ? colorOf(s.bubble) : tokens.ink;
}
export const useMemoChoice = () => use().memo;
