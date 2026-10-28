/**
 * The real app (Julian 27.10.): Supabase for sign-in, the shared calendar and
 * the "verstehen" function. Without EXPO_PUBLIC_SUPABASE_URL (the phone test
 * link, EXPO_PUBLIC_DEMO=1) everything stays local and `supabase` is null, so
 * every caller checks LIVE first.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LIVE } from './live';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export { LIVE };
/** Base for edge functions that are opened as links (Kalender Abo). */
export const FUNCTIONS_URL = url ? `${url.replace(/\/$/, '')}/functions/v1` : '';

// Android's network stack waits forever on a stalled connection (learned in
// Namore, 09.08.), so every request gives up after 15 seconds.
const timeoutFetch: typeof fetch = (input, init) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15_000);
  init?.signal?.addEventListener('abort', () => c.abort());
  return fetch(input, { ...init, signal: c.signal }).finally(() => clearTimeout(t));
};

export const supabase: SupabaseClient | null = LIVE
  ? createClient(url, key, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
      global: { fetch: timeoutFetch },
    })
  : null;
