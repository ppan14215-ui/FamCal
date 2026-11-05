/**
 * Plus (RevenueCat; Julian 05.11.2026 "Revenue Cat properly placed"). Pricing proposal: 49 € a year per family,
 * 14 days trial (see project memory famcal-business).
 *
 * How it is built, from what Namore learned:
 * - The app user id in RevenueCat is the Supabase user id, set at sign-in, so purchases follow the account,
 *   not the phone, and both partners can be linked to one family on the server.
 * - The phone never decides who has Plus. The RevenueCat webhook (supabase/functions/revenuecat-webhook) writes
 *   families.plus_until with the service key; the app only reads it. In Namore a client RPC let anyone grant
 *   themselves premium.
 * - One entitlement "plus" for the family. Purchase completed, renewal, refund are tracked from the webhook,
 *   so they are exact even when the phone dies right after paying.
 *
 * Without EXPO_PUBLIC_REVENUECAT_ANDROID_KEY / _IOS_KEY this is a no-op: the app runs as before.
 */
import { Platform } from 'react-native';
import { LIVE } from './live';
import { track } from './analytics';

export const ENTITLEMENT = 'plus';
const KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;
const ON = LIVE && !!KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let P: any = null;
let configured = false;

function lib() {
  if (!ON) return null;
  if (P) return P;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    P = require('react-native-purchases').default;
  } catch { P = null; }
  return P;
}

/** After sign-in, with the Supabase user id. */
export async function startPurchases(userId: string, familyId?: string) {
  const R = lib();
  if (!R || !userId) return;
  try {
    if (!configured) { R.configure({ apiKey: KEY, appUserID: userId }); configured = true; }
    else await R.logIn(userId);
    if (familyId) await R.setAttributes({ family_id: familyId });
  } catch {}
}

export async function stopPurchases() {
  const R = lib();
  if (!R || !configured) return;
  try { await R.logOut(); } catch {}
}

/** The offering the paywall shows (null when the store is not set up yet). */
export async function getOffering() {
  const R = lib();
  if (!R || !configured) return null;
  try { return (await R.getOfferings()).current ?? null; } catch { return null; }
}

/** Buy a package from the offering. The server webhook grants Plus; the result here only updates the screen. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buy(pkg: any, trigger: string): Promise<'ok' | 'cancelled' | 'failed'> {
  const R = lib();
  if (!R || !configured) return 'failed';
  const product = pkg?.product?.identifier ?? 'unknown';
  track('purchase_started', { product, trigger });
  try {
    const { customerInfo } = await R.purchasePackage(pkg);
    return customerInfo?.entitlements?.active?.[ENTITLEMENT] ? 'ok' : 'failed';
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    const cancelled = !!err?.userCancelled;
    track('purchase_failed', { product, reason: String(err?.code ?? 'unknown'), cancelled });
    return cancelled ? 'cancelled' : 'failed';
  }
}

export async function restore(): Promise<boolean> {
  const R = lib();
  if (!R || !configured) return false;
  track('restore_tapped');
  try { return !!(await R.restorePurchases())?.entitlements?.active?.[ENTITLEMENT]; } catch { return false; }
}
