/**
 * Plus (RevenueCat; Julian 05.11.2026 "Revenue Cat properly placed"). Pricing (Julian 27.10.2026): 79 € a year or 8,99 € a month per family,
 * founder price 49 € in the first year for the first 1.000 families,
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

/**
 * What the paywall may honestly say about a package, read only from the store (UWG, Julian 22.11.2026: no fake
 * discounts, no countdown). `full` is the normal price; `first` is a paid first period that is lower (the founder
 * price, set up in the store as an introductory offer). Without such an offer in the store there is no
 * strike-through. `perDay` is the price paid now spread over its days, rounded up to the cent.
 */
export type Deal = { full: string; first?: string; perDay?: string; trialDays?: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dealOf(pkg: any, yearly: boolean, locale: string): Deal | null {
  const p = pkg?.product;
  if (!p) return null;
  const money = (n: number) => { try { return new Intl.NumberFormat(locale, { style: 'currency', currency: p.currencyCode || 'EUR' }).format(n); } catch { return `${n.toFixed(2)} ${p.currencyCode ?? ''}`.trim(); } };
  const deal: Deal = { full: p.priceString };
  // The price that is paid now: the normal one, or the cheaper first period when the store has one.
  let now = typeof p.price === 'number' ? p.price : 0;
  // iOS: one introductory offer. Android: the default offer's phases (free trial, then maybe a cheaper first year).
  const phases: { price?: { amountMicros?: number; formatted?: string }; billingPeriod?: { iso8601?: string } }[] = p.defaultOption?.pricingPhases ?? [];
  for (const ph of phases) {
    const micros = ph.price?.amountMicros ?? 0;
    const days = /^P(\d+)D$/.exec(ph.billingPeriod?.iso8601 ?? '')?.[1];
    const weeks = /^P(\d+)W$/.exec(ph.billingPeriod?.iso8601 ?? '')?.[1];
    if (micros === 0 && (days || weeks)) deal.trialDays = days ? +days : +weeks! * 7;
    else if (micros > 0 && micros / 1e6 < p.price && ph.price?.formatted) { deal.first = ph.price.formatted; now = micros / 1e6; }
  }
  const intro = p.introPrice;
  if (intro) {
    if (intro.price === 0 && intro.periodUnit === 'DAY') deal.trialDays = intro.periodNumberOfUnits;
    else if (intro.price === 0 && intro.periodUnit === 'WEEK') deal.trialDays = intro.periodNumberOfUnits * 7;
    else if (intro.price > 0 && intro.price < p.price) { deal.first = intro.priceString; now = intro.price; }
  }
  if (now > 0) deal.perDay = money(Math.ceil((now / (yearly ? 365 : 30)) * 100) / 100);
  return deal;
}
