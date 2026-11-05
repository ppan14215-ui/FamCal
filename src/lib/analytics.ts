/**
 * Product analytics (PostHog EU) for FamCal (Julian 05.11.2026: "track all the funnels properly, like Namore,
 * and fix what went wrong there"). Errors and crashes go to Sentry (src/lib/sentry.ts), never here, so a crash
 * is counted once.
 *
 * Lessons from six months of Namore, built in from day one:
 * - Every event name and its properties live in the EVENTS map below. A name that is not in the map does not
 *   compile, so there are no doubles like invite_copied next to partner_invite_sent, and no ghost events.
 * - The funnel steps exist before launch (Namore launched without onboarding step events: 9 % activation and
 *   no way to see where people left).
 * - Every event carries the exact build: app version, native build, runtime, OTA update id, channel, schema.
 *   Namore could not tell OTA bundles apart for months.
 * - Internal installs (preview channel, test account, Julian's own devices) are marked is_internal, so the
 *   dashboards filter them out with one click.
 * - No autocapture of taps, no rage clicks, no session replay at launch (GDPR: names, dates and family life
 *   are typed here). Lifecycle events (Application Installed / Opened / Backgrounded) come from the SDK and
 *   are the only "app opened" signal: there is no own app_opened next to them.
 * - Events that a screen could fire again and again use once(), once per app launch.
 * - Only ids, never names, mails or what was said. identify() gets the Supabase user id, the family is a
 *   PostHog group so couple funnels ("both partners active") work.
 * - Money events that count (purchase completed, renewal, refund) come from the RevenueCat webhook on the
 *   server, not from the phone. The phone only reports what the person saw and tapped.
 *
 * Off on the web test link, in the demo export and in development. Without EXPO_PUBLIC_POSTHOG_KEY it is a
 * no-op, so the app works the same before the PostHog project exists.
 */
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { LIVE } from './live';
import { getPref, setPref, onPrefsReady } from './prefs';

/** Raise when an event's name or the meaning of a property changes. */
export const SCHEMA = 1;

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const ON = LIVE && !!KEY && Platform.OS !== 'web' && !__DEV__;

export type Source = 'onboarding' | 'settings' | 'picker';
export type Input = 'voice' | 'text' | 'plus' | 'photo' | 'share' | 'widget';
export type EntryKind = 'event' | 'events' | 'list_item' | 'list' | 'recipe' | 'task' | 'change' | 'answer' | 'other';

/**
 * The whole catalog. Add an event here first, with what each property means, then call track().
 * Funnels (dashboard "FamCal Launch"):
 * 1 Activation  Application Installed > onboarding_step_viewed(hallo) > signin_completed > family_created|family_joined
 *               > onboarding_completed > entry_created(is_first)
 * 2 Couple      partner_invite_sent > family_joined (partner side, same family group) > entry_created by the partner
 * 3 Voice       voice_started > voice_transcribed(ok) > message_sent(input voice) > assistant_answered(ok) > entry_created
 * 4 Retention   Application Opened / entry_created, weekly, by family group
 * 5 Paywall     paywall_viewed > purchase_started > purchase_completed (server) | purchase_failed
 */
export type Events = {
  /** A step of the first-run flow became visible. step: hallo, signin, familie, eltern, kalender, navigation, partner, fertig, or a flow.tsx step. flow: which onboarding build. */
  onboarding_step_viewed: { step: string; index?: number; flow: 'v3' | 'flow' };
  /** Skipped or left the first-run flow before the end. */
  onboarding_skipped: { step: string; flow: 'v3' | 'flow' };
  /** Reached the app at the end of the first-run flow. */
  onboarding_completed: { flow: 'v3' | 'flow'; nav_style: string; time_picker: 'calendar' | 'keyboard'; ms_total?: number };

  signin_started: { provider: 'apple' | 'google' | 'test' };
  signin_completed: { provider: 'apple' | 'google' | 'test' };
  signin_failed: { provider: 'apple' | 'google' | 'test'; reason: string };
  /** Signed in and a new family was made for this account. */
  family_created: Record<string, never>;
  family_join_started: Record<string, never>;
  /** Joined the partner's family with the code. */
  family_joined: Record<string, never>;
  family_join_failed: { reason: 'unknown_code' | 'family_full' | 'other' };
  /** The invite left the phone. method: share sheet or copied code. */
  partner_invite_sent: { method: 'share' | 'copy'; source: 'onboarding' | 'settings' };

  /** Bottom navigation chosen. style: strip (tabs under the field) or bar (one bar). */
  nav_style_chosen: { style: string; source: Source; previous?: string };
  /** Event time picker way chosen: calendar (open calendar with Start/Dauer pills) or keyboard. */
  time_picker_mode_chosen: { mode: 'calendar' | 'keyboard'; source: Source };
  /** A phone or account calendar was connected. */
  calendar_connected: { provider: string; calendars: number; source: Source };

  voice_started: { screen: string };
  /** The recording became text. ok=false: nothing usable heard. engine: cloud (Scribe) or phone. */
  voice_transcribed: { ok: boolean; engine: 'cloud' | 'phone'; ms?: number; chars_bucket?: string };
  /** A sentence was sent to FamCal. */
  message_sent: { input: Input; screen: string; follow_up: boolean };
  /** The assistant answered. ok=false: failed or timed out, offline rules took over. */
  assistant_answered: { ok: boolean; ms: number; asked_back: boolean; actions: number };
  /** Something landed: an event, list items, a change. is_first: first entry on this device. */
  entry_created: { kind: EntryKind; input: Input; count: number; is_first: boolean };
  /** Rückgängig on what just landed (a "wrong understanding" signal). */
  entry_undone: { kind: EntryKind };

  paywall_viewed: { trigger: string };
  purchase_started: { product: string; trigger: string };
  purchase_failed: { product: string; reason: string; cancelled: boolean };
  restore_tapped: Record<string, never>;

  analytics_opt_out: { off: boolean };
};

type Props<E extends keyof Events> = Events[E] extends Record<string, never> ? [props?: Events[E]] : [props: Events[E]];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ph: any = null;
let optedOut = getPref('analytics_off') === '1';
onPrefsReady(() => { optedOut = getPref('analytics_off') === '1'; try { if (optedOut) ph?.optOut(); } catch {} });
const fired = new Set<string>();
let internal = Updates.channel === 'preview' || Updates.channel === 'development' || !Updates.channel;

function common() {
  let app = 'unknown';
  let build = 'unknown';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const A = require('expo-application');
    app = A.nativeApplicationVersion ?? app;
    build = A.nativeBuildVersion ?? build;
  } catch {}
  return {
    schema: SCHEMA,
    app_version: app,
    native_build: build,
    runtime_version: Updates.runtimeVersion ?? 'unknown',
    update_id: Updates.updateId ?? 'embedded',
    channel: Updates.channel ?? 'none',
    is_internal: internal,
  };
}

/** Once, from app/_layout.tsx, after Sentry. */
export function initAnalytics() {
  if (!ON || ph) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostHog } = require('posthog-react-native');
    ph = new PostHog(KEY, {
      host: HOST,
      captureAppLifecycleEvents: true,
      // No tap autocapture, no replay, no exception capture (Sentry owns errors): see the header.
      enableSessionReplay: false,
      persistence: 'file',
      flushAt: 20,
      flushInterval: 10000,
    });
    ph.register(common());
    if (optedOut) ph.optOut();
  } catch (e) {
    ph = null;
    if (__DEV__) console.warn('[analytics] init failed', e);
  }
}

export function track<E extends keyof Events>(event: E, ...[props]: Props<E>) {
  if (!ph || optedOut) return;
  try { ph.capture(event, props ?? {}); } catch {}
}

/** Like track, but at most once per app launch for the same key (screens that render again and again). */
export function trackOnce<E extends keyof Events>(key: string, event: E, ...rest: Props<E>) {
  const k = `${event}:${key}`;
  if (fired.has(k)) return;
  fired.add(k);
  track(event, ...rest);
}

/** First time ever on this device (is_first on entry_created). */
export function firstTime(what: string): boolean {
  const k = `first_${what}`;
  if (getPref(k)) return false;
  setPref(k, '1');
  return true;
}

/** After sign-in: the Supabase user id only. test=true marks the test account as internal. */
export function identify(userId: string, opts: { test?: boolean; lang?: string } = {}) {
  if (!ph || optedOut || !userId) return;
  if (opts.test) { internal = true; ph.register({ is_internal: true }); }
  try {
    ph.identify(userId, { $set: { lang: opts.lang, is_internal: internal }, $set_once: { first_platform: Platform.OS } });
  } catch {}
}

/** The family as a PostHog group, so funnels and retention can count couples, not just people. */
export function setFamily(familyId: string, props: { members?: number; plus?: boolean } = {}) {
  if (!ph || optedOut || !familyId) return;
  try { ph.group('family', familyId, props); } catch {}
}

/** Stable facts about the person (nav style, language): they stick to every later event. */
export function setPerson(props: Record<string, string | number | boolean | undefined>) {
  if (!ph || optedOut) return;
  try { ph.capture('$set', { $set: props }); } catch {}
}

export function resetAnalytics() {
  if (!ph) return;
  try { ph.reset(); ph.register(common()); } catch {}
}

/** Settings switch. Off means nothing leaves the phone; the switch itself is the last event sent. */
export function setAnalyticsOff(off: boolean) {
  if (off) track('analytics_opt_out', { off: true });
  optedOut = off;
  setPref('analytics_off', off ? '1' : '0');
  try { off ? ph?.optOut() : ph?.optIn(); } catch {}
}
export const analyticsOff = () => optedOut;

/** Bucket text length so nothing of what was said leaves the phone. */
export function lenBucket(n: number) {
  return n === 0 ? '0' : n <= 20 ? '1-20' : n <= 60 ? '21-60' : n <= 150 ? '61-150' : '150+';
}
