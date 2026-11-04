/**
 * Hell, Dunkel oder wie das Handy (Julian 28.10.). The choice is kept per
 * device and starts as Hell; "system" follows the phone. Switching swaps the palette in place
 * and the root remounts once, so every screen draws with the new colours.
 */
import React, { useEffect, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { applyPalette, applyColorTheme, isDark, currentTheme, THEMES, type ThemeId } from './tokens';
import { getPref, setPref } from '../lib/prefs';
import { get, actions } from '../state/store';

export type ThemeChoice = 'system' | 'hell' | 'dunkel';
// Hell is the default (Julian 29.10.); dark only when chosen, or "wie das Handy" on a dark phone.
let choice: ThemeChoice = ((): ThemeChoice => { const v = getPref('theme'); return v === 'dunkel' || v === 'system' ? v : 'hell'; })();
const subs = new Set<() => void>();
let gen = 0;
const sub = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };

// Julian 04.11.: light design only for now, the appearance choice is hidden. Flip to bring dark back.
const LIGHT_ONLY = true;
const wantDark = () => (LIGHT_ONLY ? false : choice === 'system' ? Appearance.getColorScheme() === 'dark' : choice === 'dunkel');

// The family's colour theme for person colours (Julian 04.11.); the app's own colours never change.
const savedPal = getPref('palette') as ThemeId | undefined;
let palette: ThemeId = THEMES.some((t) => t.id === savedPal) ? savedPal! : 'klassisch';
function apply(force = false) {
  const d = wantDark();
  if (!force && d === isDark() && gen > 0) return false;
  applyPalette(d);
  applyColorTheme(palette);
  // Person colours are derived from the palette too.
  const c = get().colors;
  const n = THEMES.find((t) => t.id === palette)!.colors.length;
  actions.setColor('J', c.J % n);
  // A smaller theme can put both on the same colour: the partner moves one on.
  actions.setColor('T', c.T % n === c.J % n ? (c.J + 1) % n : c.T % n);
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

/** The family's colour theme (Julian 04.11.). Kept per device until the family table carries it. */
export function setPalette(id: ThemeId) {
  palette = id;
  setPref('palette', id);
  if (apply(true)) subs.forEach((l) => l());
}
/** Termine coloured by person (default) or by category (Julian 04.11.: "eine Einstellung, ob Kategorie oder Farbe"). */
export type ColorBy = 'person' | 'kategorie';
let by: ColorBy = getPref('colorBy') === 'kategorie' ? 'kategorie' : 'person';
export const colorBy = () => by;
export function setColorBy(v: ColorBy) {
  by = v;
  setPref('colorBy', v);
  gen++;
  subs.forEach((l) => l());
}
export const useColorBy = () => useSyncExternalStore(sub, colorBy, colorBy);
export const usePalette = () => useSyncExternalStore(sub, currentTheme, currentTheme);

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
