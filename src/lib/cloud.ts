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

/**
 * Supabase hands out at most 1000 rows per request. A family that moved a
 * year of two phone calendars in has more, and a missing Termin would look
 * deleted to the phone sync, so everything is read page by page (05.11.).
 */
export async function allRows<T>(page: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<{ data: T[]; error: { message: string } | null }> {
  const out: T[] = [];
  for (let a = 0; a < 50000; a += 1000) {
    const { data, error } = await page(a, a + 999);
    if (error) return { data: out, error };
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: null };
}
