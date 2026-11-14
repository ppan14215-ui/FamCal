/**
 * What happens when the app comes back to the front (Audit 09.11., Julian: "make the app work").
 * Android keeps FamCal alive for days in the background. Two things went wrong because of that:
 * - The live channels sleep in the background, so the partner's changes of the meantime were missing
 *   until the app was killed. Now Termine, lists and the chat are fetched again on every return.
 * - "Heute" and every relative day were frozen on the day the app was opened ("morgen" spoken the
 *   next morning landed a day too early). A new day reloads the app once, which resets every clock.
 * - An update only arrived after the app was killed twice (14.11.: Julian's phone ran the old version
 *   for hours after a fix went out). Now every return looks for an update, loads it quietly, and the
 *   next return starts it.
 */
import { AppState, Platform } from 'react-native';
import { LIVE } from './live';
import { today } from './dates';

const startedOn = today();
let awaySince = 0;
let started = false;

async function reload() {
  if (Platform.OS === 'web') { (globalThis as any).location?.reload?.(); return; }
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch {
    // A dev build without expo-updates: the next real start picks up the day.
  }
}

let updateReady = false;
let looking = false;

/** Looks for a newer version and loads it in the background. Never reloads by itself. */
async function fetchUpdate() {
  if (Platform.OS === 'web' || __DEV__ || updateReady || looking) return;
  looking = true;
  try {
    const Updates = await import('expo-updates');
    if (!Updates.isEnabled) return;
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const got = await Updates.fetchUpdateAsync();
    updateReady = !!got.isNew;
  } catch {
    // No network or no update server: the next return tries again.
  } finally {
    looking = false;
  }
}

async function catchUpAll() {
  try {
    const [sync, lists, feed] = await Promise.all([import('./sync'), import('./listSync'), import('./feed')]);
    if (!sync.getFamily()) return;
    // Opened without network: the real start is still due.
    if (!sync.isSyncLive()) { void sync.syncUntilLive(); return; }
    sync.catchUpSoon(0);
    void lists.catchUpLists();
    void feed.catchUpFeed();
  } catch {}
}

export function startLifecycle() {
  if (started || !LIVE) return;
  started = true;
  void fetchUpdate();
  AppState.addEventListener('change', (st) => {
    if (st !== 'active') { if (!awaySince) awaySince = Date.now(); return; }
    const away = awaySince ? Date.now() - awaySince : 0;
    awaySince = 0;
    // A short hop to another app keeps a half written message; a real break starts the new version.
    if (today() !== startedOn || (updateReady && away > 10000)) { void reload(); return; }
    if (away > 3000) { void catchUpAll(); void fetchUpdate(); }
  });
}
