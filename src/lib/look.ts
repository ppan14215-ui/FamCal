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
/**
 * The app is configurable (Julian 17.11.: "sodass wir hingehen zu einer App, die konfigurierbar ist"): where he liked
 * two ways, both stay and a setting picks one.
 * nav: 'mitte' = Memo in the middle of the bar, no Chat tab, a tap on him opens the chat with the input open (the new
 *      standard); 'pille' = the four tabs with Memo at the end, as before.
 * year: 'klein' = the twelve small months, as before; 'kacheln' = the coloured month tiles of Ton & Papier.
 * days: whether the 3 days view has its tab.
 */
export type NavLook = 'mitte' | 'pille';
export type YearLook = 'klein' | 'kacheln';

const readBubble = (): BubbleId => { const v = getPref('bubble'); return (BUBBLES.find((b) => b.id === v)?.id ?? 'teal') as BubbleId; };
const readMemo = (): MemoColor => (getPref('memoColor') === 'me' ? 'me' : 'ink');

const readNav = (): NavLook => (getPref('navLook') === 'pille' ? 'pille' : 'mitte');
const readYear = (): YearLook => (getPref('yearLook') === 'kacheln' ? 'kacheln' : 'klein');
const readDays = (): boolean => getPref('showDays') !== 'aus';

let state = { bubble: readBubble(), memo: readMemo(), nav: readNav(), year: readYear(), days: readDays() };
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());
// The saved choice arrives a moment after start.
onPrefsReady(() => { const n = { bubble: readBubble(), memo: readMemo(), nav: readNav(), year: readYear(), days: readDays() }; if ((Object.keys(n) as (keyof typeof n)[]).some((k) => n[k] !== state[k])) { state = n; emit(); } });

export function setBubble(id: BubbleId) { if (id === state.bubble) return; state = { ...state, bubble: id }; setPref('bubble', id); emit(); }
export function setMemoColor(v: MemoColor) { if (v === state.memo) return; state = { ...state, memo: v }; setPref('memoColor', v); emit(); }
export function setNavLook(v: NavLook) { if (v === state.nav) return; state = { ...state, nav: v }; setPref('navLook', v); emit(); }
export function setYearLook(v: YearLook) { if (v === state.year) return; state = { ...state, year: v }; setPref('yearLook', v); emit(); }
export function setShowDays(v: boolean) { if (v === state.days) return; state = { ...state, days: v }; setPref('showDays', v ? 'an' : 'aus'); emit(); }
export const useNavLook = (): NavLook => use().nav;
export const useYearLook = (): YearLook => use().year;
export const useShowDays = (): boolean => use().days;
export const showDays = () => state.days;

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
