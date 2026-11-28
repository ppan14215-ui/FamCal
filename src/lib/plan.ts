/**
 * Which plan the family has right now, read from the server (Julian 22.11.2026, MVP gates). The server decides
 * (my_plan in migration 20261122083000, the same rule as the KI caps); the phone only asks so it does not try
 * what the server would refuse anyway. Free families hear with the phone's own speech recognition, so the
 * cloud ears are not even tried and no first sentence is lost to a refused live connection.
 * Unknown (offline, not signed in yet) counts as allowed: the server still refuses and the app falls back.
 */
import { AppState } from 'react-native';
import { supabase } from './cloud';

export type Tier = 'plus' | 'test' | 'gratis';
let plan: { tier: Tier; tester: boolean; plusUntil: string | null } | null = null;
let asked = false;

export const getPlan = () => plan;
/** Cloud speech (Scribe) is for Plus and the trial days only. */
export const cloudEarsAllowed = () => !plan || plan.tier !== 'gratis' || plan.tester;

export async function refreshPlan() {
  if (!supabase) return;
  asked = true;
  try {
    const { data, error } = await supabase.rpc('my_plan');
    if (!error && data?.tier) plan = { tier: data.tier as Tier, tester: !!data.tester, plusUntil: data.plus_until ?? null };
  } catch {}
}

export function clearPlan() { plan = null; asked = false; }

// A purchase or the end of the trial shows after the next return to the app.
AppState.addEventListener('change', (st) => { if (st === 'active' && asked) void refreshPlan(); });
