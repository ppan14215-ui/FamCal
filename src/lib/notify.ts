/**
 * Erinnerungen aufs Handy (Spec v2 §5, Julian 28.10.: "Alles umsetzen").
 * Two kinds, both local notifications scheduled on this phone:
 * - The Termin's own reminder from CalEvent.reminder ('0m', '10m', '30m',
 *   '1h', '1d', 'vorabend'; empty means none). Older German labels still map.
 * - Vorabend 19:00 for the person who goes or brings ("Morgen 9:30 Kinderarzt.
 *   Du bringst ihn."), only on that person's phone.
 * Nothing rings between 21 and 7 o'clock: such a time moves to 20:45 the
 * evening before or to 7:00, whichever still lies before the Termin.
 * The schedule follows the store: every change of the events re-plans the
 * next 30 days, so moved, changed or deleted Termine never ring wrongly.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { get, subscribe } from '../state/store';
import type { CalEvent } from '../state/types';
import { myRole } from './sync';
import { tx } from '../i18n/lang';

const CHANNEL = 'termine';
const PREFIX = 'ev:';
const AHEAD_DAYS = 30;
const QUIET_FROM = 21;
const QUIET_TO = 7;

const OFFSETS: Record<string, number | 'vorabend' | null> = {
  '0m': 0, '10m': 10, '30m': 30, '1h': 60, '1d': 24 * 60, vorabend: 'vorabend', '': null,
  // Older labels from before 28.10.
  'Keine': null, 'Zur Startzeit': 0, '10 Minuten vorher': 10, '30 Minuten vorher': 30, '1 Stunde vorher': 60, '1 Tag vorher': 24 * 60, 'Am Vorabend': 'vorabend',
  'None': null, 'At start': 0, '10 minutes before': 10, '30 minutes before': 30, '1 hour before': 60, '1 day before': 24 * 60,
};

/** Short stable key: the system keeps identifiers, so changed Termine get new ones. */
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const at = (date: string, hm: string) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = hm.split(':').map(Number); return new Date(y, m - 1, d, h, mi, 0, 0); };
const startOf = (e: CalEvent) => at(e.date, e.allDay ? '08:00' : e.start);
const evening = (e: CalEvent) => { const d = at(e.date, '19:00'); d.setDate(d.getDate() - 1); return d; };

/** Moves a time out of the quiet hours, but never past the Termin itself. */
function outsideQuiet(t: Date, limit: Date): Date | null {
  const h = t.getHours();
  if (h >= QUIET_TO && h < QUIET_FROM) return t;
  const morning = new Date(t); if (h >= QUIET_FROM) morning.setDate(morning.getDate() + 1); morning.setHours(QUIET_TO, 0, 0, 0);
  if (morning < limit) return morning;
  const night = new Date(t); if (h < QUIET_TO) night.setDate(night.getDate() - 1); night.setHours(20, 45, 0, 0);
  return night < limit ? night : null;
}

type Plan = { id: string; when: Date; title: string; body: string; event: string };

/** "In 10 Minuten", "In einer Stunde", "Morgen": how far ahead the reminder rings. */
function lead(off: number, e: CalEvent) {
  if (off === 0) return tx('Jetzt', 'Now');
  if (off >= 24 * 60) return tx('Morgen', 'Tomorrow');
  if (e.allDay) return tx('Heute', 'Today');
  if (off >= 60) return tx('In einer Stunde', 'In an hour');
  return tx(`In ${off} Minuten`, `In ${off} minutes`);
}

function whenText(e: CalEvent) { return e.allDay ? tx('ganztägig', 'all day') : `${tx('um', 'at')} ${e.start}`; }

/** Everything that should ring for the coming days, keyed so a changed Termin gets a new key. */
function plan(events: CalEvent[], now: Date): Plan[] {
  const until = new Date(now.getTime() + AHEAD_DAYS * 864e5);
  const me = myRole();
  const out: Plan[] = [];
  for (const e of events) {
    if (e.work) continue;
    const start = startOf(e);
    if (start <= now || start > until) continue;
    const key = `${e.id}:${hash(`${e.date}|${e.start}|${e.allDay ? 1 : 0}|${e.title}|${e.who}|${e.reminder ?? ''}|${(e.bring ?? []).map((b) => b.t + b.done).join(',')}`)}`;
    const off = OFFSETS[(e.reminder ?? '').trim()];
    if (typeof off === 'number') {
      const t = outsideQuiet(new Date(start.getTime() - off * 60e3), new Date(start.getTime() + 1));
      if (t && t > now) out.push({ id: `${PREFIX}r:${key}`, when: t, event: e.id, title: e.title, body: `${lead(off, e)} ${whenText(e)}${e.place ? ` · ${e.place}` : ''}` });
    }
    // The evening before goes to whoever takes it (Spec: "Am Vorabend wird genau diese Person erinnert").
    const mine = e.who === me || e.who === 'both';
    if (mine || off === 'vorabend') {
      const t = evening(e);
      if (t > now) {
        const who = e.who === 'both' ? tx('Ihr geht beide.', 'You both go.') : mine ? tx('Du gehst hin.', "You're going.") : '';
        const bring = e.bring?.filter((b) => !b.done).map((b) => b.t) ?? [];
        out.push({ id: `${PREFIX}v:${key}`, when: t, event: e.id, title: tx(`Morgen: ${e.title}`, `Tomorrow: ${e.title}`), body: [tx(`Morgen ${whenText(e)}.`, `Tomorrow ${whenText(e)}.`), who, bring.length ? tx(`Mitnehmen: ${bring.join(', ')}.`, `Bring: ${bring.join(', ')}.`) : ''].filter(Boolean).join(' ') });
      }
    }
  }
  return out;
}

let started = false;
let busy = false;
let again = false;
let lastEvents: unknown = null;

/** Brings the phone's schedule in line with the plan: cancels what is gone, adds what is new. */
async function reconcile() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    const want = plan(get().events, new Date());
    const have = (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier).filter((id) => id.startsWith(PREFIX));
    const wantIds = new Set(want.map((p) => p.id));
    for (const id of have) if (!wantIds.has(id)) await Notifications.cancelScheduledNotificationAsync(id);
    const haveIds = new Set(have);
    for (const p of want) {
      if (haveIds.has(p.id)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: { title: p.title, body: p.body, data: { event: p.event }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.when, channelId: CHANNEL },
      });
    }
  } catch (e) {
    console.warn('[notify]', e);
  } finally {
    busy = false;
    if (again) { again = false; reconcile(); }
  }
}

/**
 * Call once at app start. Asks for permission (Android 13+ shows a prompt),
 * plans the reminders and keeps them in step with the events. Tapping a
 * notice opens its Termin.
 */
export async function startNotifications() {
  if (started || Platform.OS === 'web') return;
  started = true;
  try {
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: tx('Termine', 'Events'), importance: Notifications.AndroidImportance.HIGH });
    }
    const perm = await Notifications.getPermissionsAsync();
    const ok = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!ok) return;
    Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.event;
      if (typeof id === 'string' && get().events.some((e) => e.id === id)) router.push(`/termin/${id}`);
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    subscribe(() => {
      const ev = get().events;
      if (ev === lastEvents) return;
      lastEvents = ev;
      clearTimeout(timer);
      timer = setTimeout(reconcile, 800);
    });
    lastEvents = get().events;
    reconcile();
  } catch (e) {
    console.warn('[notify] start', e);
  }
}

/** For the settings screen: how many reminders are planned right now. */
export async function plannedCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try { return (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(PREFIX)).length; } catch { return 0; }
}

export const __test = { plan, outsideQuiet, OFFSETS, at };
