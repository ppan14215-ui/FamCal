/**
 * Sign-in with Apple and Google (Julian 27.10.), the same way Namore does it:
 * the phone's own account sheet hands over an ID token and Supabase checks it
 * (signInWithIdToken). No browser bounce, no password. On the web the
 * provider's page opens instead (signInWithOAuth).
 */
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './cloud';
import { tx } from '../i18n/lang';

type Auth = { session: Session | null; ready: boolean };
let auth: Auth = { session: null, ready: !supabase };
const subs = new Set<() => void>();
const put = (next: Partial<Auth>) => { auth = { ...auth, ...next }; subs.forEach((f) => f()); };

if (supabase) {
  supabase.auth.getSession()
    .then(({ data }) => put({ session: data.session, ready: true }))
    .catch(() => put({ ready: true }));
  supabase.auth.onAuthStateChange((_e, session) => put({ session, ready: true }));
}

export const getAuth = () => auth;
export function useAuth(): Auth {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => auth, () => auth);
}

export type SignIn = { error: string | null; name?: string };

/**
 * Test builds only (Julian 27.10., on holiday without Google set up): one shared
 * test account whose email and password come from the EAS preview environment.
 * Store builds never get these variables, so the button does not exist there.
 */
const TEST_EMAIL = process.env.EXPO_PUBLIC_TEST_EMAIL;
const TEST_PASSWORD = process.env.EXPO_PUBLIC_TEST_PASSWORD;
export const canTestSignIn = !!(supabase && TEST_EMAIL && TEST_PASSWORD);

export async function signInForTest(): Promise<SignIn> {
  if (!supabase || !TEST_EMAIL || !TEST_PASSWORD) return { error: 'no_test_account' };
  const { error } = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  return { error: error?.message ?? null };
}

export async function signInWithApple(): Promise<SignIn> {
  if (!supabase) return { error: 'offline' };
  if (Platform.OS !== 'ios') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: webReturn() } });
    return { error: error?.message ?? null };
  }
  try {
    // Loaded on tap so a build without the native module still starts.
    const Apple = await import('expo-apple-authentication');
    const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL] });
    if (!cred.identityToken) return { error: tx('Apple hat kein Token geschickt.', 'Apple sent no token.') };
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
    // Apple shares the name only on the very first sign-in, so it is passed on right away.
    return { error: error?.message ?? null, name: cred.fullName?.givenName ?? undefined };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') return { error: null };
    return { error: String(e?.message ?? e) };
  }
}

let googleReady = false;
export async function signInWithGoogle(): Promise<SignIn> {
  if (!supabase) return { error: 'offline' };
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: webReturn() } });
    return { error: error?.message ?? null };
  }
  try {
    const { GoogleSignin, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin');
    if (!googleReady) {
      // The token's audience is the web client id, the one entered in Supabase under Google.
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
      });
      googleReady = true;
    }
    try {
      await GoogleSignin.hasPlayServices();
      // Show the account picker every time instead of silently reusing the last account.
      await GoogleSignin.signOut().catch(() => {});
      const res = await GoogleSignin.signIn();
      if (res.type === 'cancelled') return { error: null };
      const token = res.data.idToken;
      if (!token) return { error: tx('Google hat kein Token geschickt.', 'Google sent no token.') };
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
      return { error: error?.message ?? null, name: res.data.user.givenName ?? undefined };
    } catch (e) {
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return { error: null };
      throw e;
    }
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

export async function signOut() {
  await supabase?.auth.signOut();
}

const webReturn = () => (typeof window !== 'undefined' ? window.location.origin : undefined);
