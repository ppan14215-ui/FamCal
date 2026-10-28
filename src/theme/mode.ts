/**
 * Hell, Dunkel oder wie das Handy (Julian 28.10.). The choice is kept per
 * device; "system" follows the phone. Switching swaps the palette in place
 * and the root remounts once, so every screen draws with the new colours.
 */
import React, { useEffect, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { applyPalette, isDark } from './tokens';
import { getPref, setPref } from '../lib/prefs';
import { get, actions } from '../state/store';

export type ThemeChoice = 'system' | 'hell' | 'dunkel';
let choice: ThemeChoice = ((): ThemeChoice => { const v = getPref('theme'); return v === 'hell' || v === 'dunkel' ? v : 'system'; })();
const subs = new Set<() => void>();
let gen = 0;
const sub = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };

const wantDark = () => (choice === 'system' ? Appearance.getColorScheme() === 'dark' : choice === 'dunkel');

function apply() {
  const d = wantDark();
  if (d === isDark() && gen > 0) return false;
  applyPalette(d);
  // Person colours are derived from the palette too.
  const c = get().colors;
  actions.setColor('J', c.J);
  actions.setColor('T', c.T);
  gen++;
  return true;
}
apply();

export function setTheme(v: ThemeChoice) {
  choice = v;
  setPref('theme', v);
  if (apply()) subs.forEach((l) => l());
}
export const themeChoice = () => choice;

/** Root only: a number that changes whenever the palette did, used as the tree's key. */
export function useThemeGen(): number {
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => { if (choice === 'system' && apply()) subs.forEach((l) => l()); });
    return () => sub.remove();
  }, []);
  return useSyncExternalStore(sub, () => gen, () => gen);
}
export const useDark = () => useSyncExternalStore(sub, isDark, isDark);
export const useThemeChoice = () => useSyncExternalStore(sub, () => choice, () => choice);


/** Any part that should redraw with a new palette: remounts its children once per switch. */
export const usePaletteGen = () => useSyncExternalStore(sub, () => gen, () => gen);
export function Keyed({ children }: { children: React.ReactNode }) {
  const g = usePaletteGen();
  return React.createElement(React.Fragment, { key: g }, children);
}
