/**
 * What happens when the app comes back to the front (Audit 09.11., Julian: "make the app work").
 * Android keeps FamCal alive for days in the background. Two things went wrong because of that:
 * - The live channels sleep in the background, so the partner's changes of the meantime were missing
 *   until the app was killed. Now Termine, lists and the chat are fetched again on every return.
 * - "Heute" and every relative day were frozen on the day the app was opened ("morgen" spoken the
 *   next morning landed a day too early). A new day reloads the app once, which resets every clock.
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
  AppState.addEventListener('change', (st) => {
    if (st !== 'active') { if (!awaySince) awaySince = Date.now(); return; }
    const away = awaySince ? Date.now() - awaySince : 0;
    awaySince = 0;
    if (today() !== startedOn) { void reload(); return; }
    if (away > 3000) void catchUpAll();
  });
}
