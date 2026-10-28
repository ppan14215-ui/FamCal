/**
 * Asks the "verstehen" function what a sentence means (Julian 27.10.:
 * "Handy hört, Claude versteht"). Only in the real app and only when signed
 * in; null means "ask the rules instead" (offline, slow, not understood).
 */
import { supabase } from './cloud';
import { getAuth } from './auth';
import { TODAY, NOW } from './dates';
import { persons } from '../theme/tokens';
import { TERMIN_ICON_NAMES, type Understood } from './talk';
import { LANG, tx } from '../i18n/lang';
import { toast } from '../state/store';

/** The family waits with the orb spinning; past this the rules answer. */
const WAIT_MS = 8000;

export const canUnderstand = () => !!supabase && !!getAuth().session;

/** The free month is used up (Julian 27.10.: 14 Tage Plus, dann 30 Sätze im Monat). Said once, then the rules answer quietly. */
let toldLimit = false;

/** Claude did not answer (server error, no key): said once, so nobody wonders why the rules guessed. */
let toldDown = false;

async function limitHint(error: unknown) {
  const res = (error as { context?: Response } | null)?.context;
  if (res && res.status >= 500 && !toldDown) {
    toldDown = true;
    toast(tx('Claude ist gerade nicht erreichbar', "Claude can't be reached right now"), undefined, { kind: 'warn', sub: tx('Ich nehme solange einfache Regeln. Bitte prüf die Einträge.', "I'll use simple rules meanwhile. Please check what I add.") });
    return;
  }
  if (!res || res.status !== 429 || toldLimit) return;
  const body = await res.json().catch(() => null);
  if (body?.reason !== 'month') return;
  toldLimit = true;
  toast(tx('Die 30 Sätze für diesen Monat sind verbraucht', 'Your 30 sentences for this month are used up'), undefined, { kind: 'warn', sub: tx('Ich verstehe dich weiter mit einfachen Regeln, mit Plus wieder unbegrenzt.', 'I keep understanding you with simple rules; Plus makes it unlimited again.') });
}

export async function understandOnline(text: string): Promise<Understood | null> {
  if (!supabase || !getAuth().session) return null;
  const call = supabase.functions
    .invoke<Understood & { left: number | null }>('verstehen', { body: { text, today: TODAY, now: NOW, names: { J: persons.J.name, T: persons.T.name }, lang: LANG, icons: TERMIN_ICON_NAMES } })
    .then(async ({ data, error }) => {
      if (error || !data) { await limitHint(error); return null; }
      if (data.left === 5) toast(tx('Noch 5 Sätze gratis in diesem Monat', '5 free sentences left this month'), undefined, { kind: 'info' });
      return data;
    })
    .catch(() => null);
  const late = new Promise<null>((r) => setTimeout(() => r(null), WAIT_MS));
  return Promise.race([call, late]);
}
