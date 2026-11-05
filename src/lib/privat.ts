/**
 * Datenschutz (Julian 05.11. 22:21: "Wir schicken ja jeden Termin einer Familie
 * an Claude und ElevenLabs Server. Brauchen wir nicht auch privacy features?").
 *
 * - Ohne KI (Julian 22:34: "es braucht ein opt out, wo einfach der Input wegfällt
 *   und nur noch manuell geht"): for the whole family. The talk field goes away,
 *   only manual entry stays, and nothing goes to Claude or ElevenLabs. The
 *   server refuses too (families.ohne_ki), so a partner's phone can't send the
 *   family's data either. Anyone can switch it on; switching it off asks first.
 * - Sprache nur auf dem Handy: the phone's own speech recognition, no recording
 *   leaves the phone. Less accurate, so cloud stays the default.
 * - Zustimmung: before the first sentence goes to the assistant, once per phone.
 */
import { useSyncExternalStore } from 'react';
import { getPref, setPref, onPrefsReady } from './prefs';

const subs = new Set<() => void>();
const ping = () => subs.forEach((l) => l());
const sub = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };
onPrefsReady(ping);

/** Family-wide, mirrored here so it also holds offline and before sync. */
export const ohneKi = () => getPref('ohneKi') === '1';
/** Sync calls this with the family's value; the server's is the truth. */
export function applyFamilyKi(v: boolean | null | undefined) {
  if (typeof v !== 'boolean' || v === ohneKi()) return;
  setPref('ohneKi', v ? '1' : '0');
  ping();
}
let save: ((v: boolean) => Promise<boolean>) | null = null;
/** sync.ts registers how the family row is written. */
export function onSaveOhneKi(f: (v: boolean) => Promise<boolean>) { save = f; }
export async function setOhneKi(v: boolean): Promise<boolean> {
  setPref('ohneKi', v ? '1' : '0');
  ping();
  return save ? save(v) : true;
}

export const spracheLokal = () => getPref('sprache') === 'lokal';
export function setSpracheLokal(v: boolean) { setPref('sprache', v ? 'lokal' : 'cloud'); ping(); }

/** Version of the text the person agreed to; a new version asks again. */
export const CONSENT_V = '1';
export const zugestimmt = () => getPref('kiZustimmung') === CONSENT_V;
export function stimmeZu() { setPref('kiZustimmung', CONSENT_V); ping(); }

/** May anything go to an AI service from this phone right now? */
export const kiErlaubt = () => !ohneKi() && zugestimmt();
/** May the recording go to the cloud for speech recognition? */
export const spracheCloud = () => kiErlaubt() && !spracheLokal();

export const usePrivat = () => {
  const snap = () => `${ohneKi() ? 1 : 0}${spracheLokal() ? 1 : 0}${zugestimmt() ? 1 : 0}`;
  const v = useSyncExternalStore(sub, snap, snap);
  return { ohneKi: v[0] === '1', spracheLokal: v[1] === '1', zugestimmt: v[2] === '1' };
};
