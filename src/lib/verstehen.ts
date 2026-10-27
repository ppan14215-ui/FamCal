/**
 * Asks the "verstehen" function what a sentence means (Julian 27.10.:
 * "Handy hört, Claude versteht"). Only in the real app and only when signed
 * in; null means "ask the rules instead" (offline, slow, not understood).
 */
import { supabase } from './cloud';
import { getAuth } from './auth';
import { TODAY, NOW } from './dates';
import { persons } from '../theme/tokens';
import type { Understood } from './talk';

/** The family waits with the orb spinning; past this the rules answer. */
const WAIT_MS = 8000;

export const canUnderstand = () => !!supabase && !!getAuth().session;

export async function understandOnline(text: string): Promise<Understood | null> {
  if (!supabase || !getAuth().session) return null;
  const call = supabase.functions
    .invoke<Understood>('verstehen', { body: { text, today: TODAY, now: NOW, names: { J: persons.J.name, T: persons.T.name } } })
    .then(({ data, error }) => (error || !data ? null : data))
    .catch(() => null);
  const late = new Promise<null>((r) => setTimeout(() => r(null), WAIT_MS));
  return Promise.race([call, late]);
}
