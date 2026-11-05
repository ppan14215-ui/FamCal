/**
 * Crashes and errors (Sentry, EU region, org "namore", project "famcal"; Julian 05.11.2026).
 * Namore lesson: Sentry was wired for months without a DSN, so crashes were invisible. The DSN is public by
 * design (it can only send events), so it sits here as the default; EXPO_PUBLIC_SENTRY_DSN can override it.
 * Off on the web test link and in development. No screenshots, no view hierarchy, no user text: only the stack,
 * the build and the Supabase user id.
 */
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { LIVE } from './live';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? 'https://05f87c89f9c1d00a6934d053d67b289a@o4512157600120832.ingest.de.sentry.io/4512380919677008';
const ON = LIVE && Platform.OS !== 'web' && !__DEV__ && !!DSN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let S: any = null;

export function initSentry() {
  if (!ON || S) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    S = require('@sentry/react-native');
    S.init({
      dsn: DSN,
      environment: Updates.channel || 'none',
      // The OTA update id tells two bundles on the same native build apart.
      dist: Updates.updateId ?? 'embedded',
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      tracesSampleRate: 0.1,
      enableNativeFramesTracking: false,
      beforeBreadcrumb: (b: { category?: string }) => (b.category === 'console' ? null : b),
    });
    S.setTag('runtime_version', Updates.runtimeVersion ?? 'unknown');
    S.setTag('channel', Updates.channel ?? 'none');
  } catch (e) {
    S = null;
    if (__DEV__) console.warn('[sentry] init failed', e);
  }
}

/** Wraps the root component so native and JS crashes carry the React tree. */
export function wrapRoot<T>(C: T): T {
  return S?.wrap ? S.wrap(C) : C;
}

export function setSentryUser(id: string | null) {
  try { S?.setUser(id ? { id } : null); } catch {}
}

/** For caught errors that still matter (sync failed, assistant broke). Never put user text in extra. */
export function reportError(e: unknown, where: string, extra?: Record<string, string | number | boolean>) {
  try { S?.captureException(e, { tags: { where }, extra }); } catch {}
}
