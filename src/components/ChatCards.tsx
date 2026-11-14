/**
 * The chat's cards (moved from app/(tabs)/chat.tsx 31.10.): one sentence, what the
 * assistant said, and what it made. The chat log draws them, and so does the
 * card that lays over Kalender and Listen (Julian 31.10.: "Wie im Chat nur außerhalb").
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { H1, Check, Head } from './ui/kit';
import Txt from './ui/Txt';
import { Avatar, Pair, usePersons } from './ui/Person';
import { Tile, ClayIcon } from './ui/Clay';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { tokens, glass, persons as basePersons } from '../theme';
import { useBubble } from '../lib/look';
import { swapIn, rowLayout } from '../theme/motion';
import { useStore, actions } from '../state/store';
import { useDockSpace } from '../lib/dockSpace';
import { useKeyboardInset } from '../lib/keyboard';
import { useFeed, canUndo, undoEntry, answerAsk, type FeedEntry, type EventSnap } from '../lib/feed';
import { getFamily, myRole, useEventsLoaded } from '../lib/sync';
import { useAuth } from '../lib/auth';
import { LIVE } from '../lib/live';
import { hm, short, TODAY } from '../lib/dates';
import HeaderRight from './ui/HeaderRight';
import { tx } from '../i18n/lang';
import Pin from './buddy/Pin';
import { useMascot } from '../lib/mascot';
import { useVeil, Step, Dots } from './Veil';
import { isTrip, makePackList, kidsOn, ageText } from '../lib/pack';
import { isVacation, leftLine } from '../lib/urlaub';
import { useSimple } from '../lib/simple';
import ExampleCards from './Examples';
import { HIDDEN } from '../lib/core';
import WhenField from './WhenField';
import type { When } from '../lib/when';
import type { CalEvent } from '../state/types';
import { haptics } from '../lib/haptics';
import PlaceAsk, { PinChip } from './PlaceAsk';
import { isPoints, total, listIcon } from '../lib/points';
import type { ClayName } from '../lib/clayIcons';


export const at = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const dayOf = (s: string) => { const d = new Date(s); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * True inside the onboarding showcase: cards look exactly the same but do nothing. No follow-up
 * questions mount (WhoGoes, TimeAsk, PlaceAsk write to the real store), every tap is a no-op,
 * no navigation, no undo. Set through `Entry showcase` or a provider around the stage.
 */
export const StillContext = createContext(false);

/** The calendar this card points into is there: synced in this run, or a phone without family sync. */
function useCalendarReady() {
  const synced = useEventsLoaded();
  const { session, ready } = useAuth();
  return synced || !LIVE || (ready && !session);
}
const useStill = () => useContext(StillContext);
const noop = () => {};

/**
 * A date or a time span stays in one piece. Beside Memo the cards are narrower, and "9:30am to 10:15a…" was cut off
 * when a place stood next to it: the grey line may now take a second line, and it only breaks after a "·".
 */
const keep = (t: string) => t.replace(/ /g, '\u00A0');

/** Who goes, as dots in the persons' colours (klar draft: no faces in the cards). */
function WhoDots({ who }: { who?: CalEvent['who'] }) {
  const persons = usePersons();
  const cs = who === 'both' ? [persons.J.ink, persons.T.ink] : who === 'J' || who === 'T' ? [persons[who].ink] : [];
  if (!cs.length) return null;
  return <View style={{ flexDirection: 'row', gap: 3 }}>{cs.map((c, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />)}</View>;
}

/**
 * What was made, as one object like Wabi's cards (Julian 14.11.: "cards and shadow like wabi"): its picture on the
 * left, its name in bold, one grey line below, and a small arrow when a tap opens it.
 */
/** The inner edge of a card in the chat. */
const EDGE = 14;

function Made({ icon, title, sub, onPress, right, celebrate }: { icon: ClayName; title: string; sub?: string; onPress?: () => void; right?: React.ReactNode; celebrate?: boolean }) {
  const row = (
    <>
      <Tile name={icon} size={48} radius={12} ratio={0.66} bg={tokens.chipBg} celebrate={celebrate} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={17} line={22} weight={600} numberOfLines={2}>{title}</Txt>
        {sub ? <Txt size={14.5} line={20} color={tokens.sub} numberOfLines={2}>{sub}</Txt> : null}
      </View>
      {right}
      {onPress ? <LineIcon name="arrow" size={18} color={tokens.mute} /> : null}
    </>
  );
  // One inner edge for everything in a card (Julian 14.11.: "padding in chat need to be improved"): 14 at the sides, 12 between the parts.
  const box = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: EDGE, paddingTop: EDGE, paddingBottom: 12 };
  return onPress
    ? <PressScale scale={0.99} accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title} onPress={onPress} style={box}>{row}</PressScale>
    : <View style={box}>{row}</View>;
}

export function Termine({ ids, snap, changed, ask, timeQ, fresh, placeQ }: { ids: string[]; snap?: EventSnap[]; changed?: boolean; ask?: 'J' | 'T'; timeQ?: string; fresh?: boolean; placeQ?: boolean }) {
  const events = useStore((s) => s.events);
  const still = useStill();
  const ready = useCalendarReady();
  // A card that just appeared plays its icon once (Julian 31.10.: "das icon kurz animieren").
  const [play, setPlay] = useState(false);
  useEffect(() => { if (!fresh) return; const t = setTimeout(() => setPlay(true), 220); return () => clearTimeout(t); }, []);
  // Live from the calendar; the snapshot only if the Termin never reached this phone.
  const live = ids.map((id) => events.find((e) => e.id === id) ?? (ready ? undefined : snap?.find((x) => x.id === id))).filter(Boolean) as (EventSnap & { who?: typeof events[number]['who'] })[];
  // Still loading and nothing remembered: say nothing rather than "gone".
  if (!live.length && !ready) return null;
  if (!live.length) return <Txt size={13.5} color={tokens.mute} style={{ padding: 14 }}>{changed ? tx('Mit der nächsten Nachricht geändert, siehe unten.', 'Changed by the next message, see below.') : tx('Nicht mehr im Kalender.', 'No longer in the calendar.')}</Txt>;
  return (
    <>
      {live.map((e) => (
        <Made key={e.id} icon={e.icon} celebrate={play} title={e.title}
          sub={[keep((e as CalEvent).endDate && (e as CalEvent).endDate! > e.date ? tx(`${short(e.date)} bis ${short((e as CalEvent).endDate!)}`, `${short(e.date)} to ${short((e as CalEvent).endDate!)}`) : short(e.date)), keep(e.allDay ? tx('ganztägig', 'all day') : e.end ? tx(`${hm(e.start)} bis ${hm(e.end)}`, `${hm(e.start)} to ${hm(e.end)}`) : hm(e.start)), e.place].filter(Boolean).join('\u00A0· ')}
          onPress={still ? noop : () => router.push(`/termin/${e.id}`)}
          right={<>{e.place ? <PinChip place={e.place} still={still} /> : null}<WhoDots who={e.who} /></>} />
      ))}
      {!still && timeQ && live.length === 1 ? <TimeAsk e={live[0]} q={timeQ} /> : null}
      {/* Julian 31.10.: "Welcher Kinderarzt ist das?", then remembered for next time. */}
      {!still && placeQ && live.length === 1 ? <PlaceAsk e={live[0]} /> : null}
      {/* Once someone is picked the question is answered and goes away (Julian 31.10.). */}
      {!still && ask && live.length === 1 && !live[0].who ? <WhoGoes e={live[0]} me={ask} /> : null}
    </>
  );
}

/** Time questions answered with "Ganztägig": the Termin stays all day, the question is done. */
const settled = new Set<string>();
const settledSubs = new Set<() => void>();
export const settle = (id: string) => { settled.add(id); settledSubs.forEach((l) => l()); };
export const useSettled = () => { const [, bump] = useState(0); useEffect(() => { const l = () => bump((n) => n + 1); settledSubs.add(l); return () => { settledSubs.delete(l); }; }, []); return settled; };

const pad2 = (n: number) => String(n).padStart(2, '0');
const plusMin = (t: string, min: number) => { const m = Math.min(23 * 60 + 59, Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + min); return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; };

/**
 * The time question as options in the card, like Claude's own cards (Julian 30.10.: "bieten immer Optionen zum
 * Klicken an, das funktioniert super"). It stays until a time is picked or "Ganztägig"; then "Bis wann?" once.
 */
function TimeAsk({ e, q }: { e: EventSnap; q: string }) {
  const [step, setStep] = useState<'start' | 'end' | 'done'>(e.allDay && !settled.has(e.id) ? 'start' : 'done');
  // Answered in the Sprechkarte (Julian 08.11.): the question here is done too.
  const done = useSettled();
  if (step === 'done' || (step === 'start' && done.has(e.id))) return null;
  const chip = (label: string, on: () => void, key = label) => (
    <PressScale key={key} onPress={() => { haptics.select(); on(); }} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
      <Txt size={13.5}>{label}</Txt>
    </PressScale>
  );
  return (
    <View style={{ gap: 8, paddingHorizontal: EDGE, paddingBottom: 12 }}>
      <Txt size={14} line={19} weight={600}>{step === 'start' ? q : tx(`Ab ${hm(e.start)}. Bis wann?`, `From ${hm(e.start)}. Until when?`)}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {step === 'start' ? <>
          {['09:00', '12:00', '15:00', '18:00', '19:30'].map((t) => chip(hm(t), () => { actions.updateEvent(e.id, { start: t, end: plusMin(t, 60), allDay: false }); setStep('end'); }, t))}
          {chip(tx('Ganztägig', 'All day'), () => { settle(e.id); setStep('done'); })}
          {chip(tx('Anders …', 'Other …'), () => router.push(`/termin/${e.id}`))}
        </> : <>
          {[60, 120, 180].map((m) => chip(hm(plusMin(e.start, m)), () => { actions.updateEvent(e.id, { end: plusMin(e.start, m) }); setStep('done'); }, String(m)))}
          {chip(tx('Offen', 'Open end'), () => { actions.updateEvent(e.id, { end: undefined }); setStep('done'); })}
        </>}
      </View>
    </View>
  );
}

/** Julian 30.10. 22:18: the follow-up comes right away, in the card. The Termin already stands; a tap only sets who goes. */
function WhoGoes({ e, me }: { e: EventSnap & { who?: string }; me: 'J' | 'T' }) {
  const other = me === 'J' ? 'T' : 'J';
  const persons = usePersons();
  const opts: [string, 'J' | 'T' | 'both'][] = [[tx('Ich', 'Me'), me], [persons[other].name || tx('Partner', 'Partner'), other], [tx('Beide', 'Both'), 'both']];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: EDGE, paddingBottom: 12 }}>
      <Txt size={13.5} color={tokens.sub} style={{ marginRight: 2 }}>{tx('Wer geht?', 'Who goes?')}</Txt>
      {opts.map(([label, w]) => {
        const on = e.who === w;
        return (
          <PressScale key={w} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { actions.updateEvent(e.id, { who: w }); }} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? tokens.doneSoft : tokens.chipBg }}>
            <Txt size={13.5} weight={on ? 600 : 400} color={on ? tokens.done : tokens.ink}>{label}</Txt>
          </PressScale>
        );
      })}
    </View>
  );
}

/**
 * Julian 30.10. 22:49: "Details sind nicht wirklich Details. Stattdessen sollte man da die Details ändern können,
 * wer geht, Uhrzeit." Opened from the card: who goes, day and time, right there; everything else on the Termin page.
 */
function EditTermine({ ids, me }: { ids: string[]; me: 'J' | 'T' }) {
  const events = useStore((s) => s.events);
  const live = ids.map((id) => events.find((e) => e.id === id)).filter(Boolean) as CalEvent[];
  const [draft, setDraft] = useState<Record<string, When>>({});
  if (!live.length) return null;
  return (
    <View style={{ gap: 10, paddingHorizontal: EDGE, paddingBottom: 12 }}>
      {live.map((e) => {
        const now: When = { date: e.date, endDate: e.endDate, start: e.allDay ? undefined : e.start, end: e.allDay ? undefined : e.end };
        const done = () => {
          const w = draft[e.id];
          if (w) { actions.moveEvent(e.id, w); haptics.commit(); }
          setDraft((d) => { const n = { ...d }; delete n[e.id]; return n; });
        };
        return (
          <View key={e.id} style={{ gap: 8 }}>
            {live.length > 1 ? <Txt size={13} weight={600} color={tokens.sub}>{e.title}</Txt> : null}
            {e.work ? null : <View style={{ marginHorizontal: -EDGE }}><WhoGoes e={e} me={me} /></View>}
            <WhenField card value={draft[e.id] ?? now} onChange={(w) => setDraft((d) => ({ ...d, [e.id]: w }))} onDone={done} />
          </View>
        );
      })}
      <PressScale hitSlop={8} onPress={() => router.push(`/termin/${live[0].id}`)} style={{ alignSelf: 'flex-start' }}>
        <Txt size={13.5} weight={600} color={tokens.done}>{tx('Alles bearbeiten', 'Edit everything')}</Txt>
      </PressScale>
    </View>
  );
}

export function Items({ list, ids, name, names }: { list: string; ids: string[]; name?: string; names?: string[] }) {
  const l = useStore((s) => s.lists.find((x) => x.id === list));
  const still = useStill();
  const all = l ? l.sections.flatMap((s) => s.items) : [];
  const live = ids.map((id) => all.find((i) => i.id === id)).filter(Boolean) as typeof all;
  // Lists still live on each phone: on the partner's phone the card says what was added, and opens nothing.
  const said = live.length && l
    ? live.map((i) => (isPoints(l) ? tx(`${i.name} ${total(i)} Punkte`, `${i.name} ${total(i)} points`) : `${i.qty ? `${i.qty} ` : ''}${i.name}`))
    : names ?? [];
  const sub = said.slice(0, 3).join(', ') + (said.length > 3 ? ` +${said.length - 3}` : '');
  return (
    <Made icon={l ? listIcon(l) : 'checkliste'} title={l?.name ?? name ?? tx('Liste', 'List')} sub={sub || undefined}
      onPress={!l ? undefined : still ? noop : () => { actions.setActiveList(l.id); router.navigate('/listen'); }} />
  );
}

export function Tasks({ ids, titles }: { ids: string[]; titles?: string[] }) {
  const tasks = useStore((s) => s.tasks);
  const still = useStill();
  const found = ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks;
  const live = found.length ? found : (titles ?? []).map((title, k) => ({ id: `snap${k}`, title, done: false, who: null } as unknown as typeof tasks[number]));
  return (
    <>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{tx('Aufgaben', 'Tasks')}</Txt>
      {live.map((t) => (
        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={t.done} onPress={still || t.id.startsWith('snap') ? undefined : () => actions.toggleTask(t.id)} />
          <Txt size={15} style={{ flex: 1 }} color={t.done ? tokens.mute : tokens.ink}>{t.title}</Txt>
          {t.who === 'J' || t.who === 'T' ? <Avatar p={t.who} size={22} /> : null}
        </View>
      ))}
      <View style={{ height: 6 }} />
    </>
  );
}

/** The steps from the moment it was made, folded away until tapped. */
function Why({ why }: { why: NonNullable<FeedEntry['why']> }) {
  return (
    <View style={{ gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      {why.head ? <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{why.head.toUpperCase()}</Txt> : null}
      {why.steps.map((l, i) => <Step key={i} label={l} state="done" />)}
    </View>
  );
}

/** "U-Heft mitnehmen?": what should come along, one tap adds it to the Termin (Julian 29.10.: never by itself). */
function BringOffer({ suggest }: { suggest: Record<string, string[]> }) {
  const events = useStore((s) => s.events);
  const still = useStill();
  const rows = Object.entries(suggest).map(([id, items]) => {
    const e = events.find((x) => x.id === id);
    const have = new Set((e?.bring ?? []).map((b) => b.t.toLowerCase()));
    return { e, items: items.filter((t) => !have.has(t.toLowerCase())) };
  }).filter((r) => r.e && r.items.length);
  if (!rows.length) return null;
  return (
    <View style={{ gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      <Txt size={13} color={tokens.sub}>{tx('Mitnehmen?', 'Bring along?')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {rows.flatMap((r) => r.items.map((t) => (
          <PressScale key={`${r.e!.id}${t}`} onPress={still ? noop : () => actions.addBring(r.e!.id, t)} accessibilityLabel={tx(`${t} mitnehmen`, `Bring ${t}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.chipBg }}>
            <Txt size={14} weight={700} color={tokens.done}>+</Txt>
            <Txt size={14} weight={600}>{t}</Txt>
          </PressScale>
        )))}
      </View>
    </View>
  );
}

/**
 * Kalender and Listen always in sight at the top of the chat (Julian 30.10.: from the chat
 * a first user does not see how to get there). Each says what waits there.
 */
export function Jumps() {
  const today = useStore((s) => s.events.filter((e) => e.date === TODAY && !e.work && e.cal !== 'feiertage').length);
  const open = useStore((s) => s.lists.reduce((n, l) => n + l.sections.reduce((m, sec) => m + sec.items.filter((i) => !i.done).length, 0), 0));
  const go = (to: '/kalender' | '/listen') => { router.navigate(to); };
  const pill = (icon: 'cal' | 'list', label: string, sub: string, to: '/kalender' | '/listen') => (
    <PressScale key={to} scale={0.96} accessibilityRole="button" accessibilityLabel={label} onPress={() => go(to)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.row }}>
      <LineIcon name={icon} size={18} color={tokens.ink} />
      <Txt size={14} weight={600} numberOfLines={1}>{label}</Txt>
      <Txt size={12.5} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</Txt>
    </PressScale>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 }}>
      {pill('cal', tx('Kalender', 'Calendar'), today ? tx(`${today} heute`, `${today} today`) : tx('heute frei', 'free today'), '/kalender')}
      {pill('list', tx('Listen', 'Lists'), open ? tx(`${open} offen`, `${open} open`) : '', '/listen')}
    </View>
  );
}

/** Urlaub shows what is left of the budget, live (Julian 29.10.). Tapping opens Urlaub und Feiertage. */
function VacationLeft({ ids }: { ids: string[] }) {
  const trip = useStore((s) => s.events.find((e) => ids.includes(e.id) && isVacation(e)));
  const events = useStore((s) => s.events);
  const vacation = useStore((s) => s.vacation);
  const names = useStore((s) => s.names);
  const land = useStore((s) => s.land);
  const still = useStill();
  if (!trip) return null;
  const year = Number(trip.date.slice(0, 4));
  const who = trip.who === 'both' ? (['J', 'T'] as const) : trip.who === 'J' || trip.who === 'T' ? [trip.who] : [];
  const lines = who.map((p) => leftLine(events, p, vacation[p], year, land, trip.who === 'both' ? names[p] : '')).filter(Boolean);
  return (
    <PressScale scale={0.99} onPress={still ? noop : () => router.push('/urlaub')} style={{ paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      <Txt size={13.5} line={19} color={tokens.sub}>{lines.length ? lines.join('\n') : tx('Urlaubstage einstellen, dann rechne ich mit.', 'Set your vacation days and I keep count.')}</Txt>
    </PressScale>
  );
}

/** A trip offers its packing list, made for this family (Julian 29.10.: "mitdenken"). */
function PackOffer({ ids }: { ids: string[] }) {
  const trip = useStore((s) => s.events.find((e) => ids.includes(e.id) && isTrip(e)));
  const list = useStore((s) => (trip ? s.lists.find((l) => l.forEvent === trip.id) : undefined));
  const [busy, setBusy] = useState(false);
  const still = useStill();
  if (!trip) return null;
  if (list) {
    const n = list.sections.reduce((a, sec) => a + sec.items.length, 0);
    return (
      <PressScale scale={0.99} onPress={still ? noop : () => { actions.setActiveList(list.id); router.push('/listen'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderTopWidth: 1, borderTopColor: tokens.hair }}>
        <Tile bg="transparent" name="reise" size={40} radius={12} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={15} weight={600} numberOfLines={1}>{list.name}</Txt>
          <Txt size={13} color={tokens.sub}>{tx(`${n} Dinge, für euch gedacht`, `${n} things, made for you`)}</Txt>
        </View>
        <LineIcon name="chev" size={16} color={tokens.mute} />
      </PressScale>
    );
  }
  const kids = kidsOn(trip.date);
  const forWhom = kids.length ? kids.map((k) => `${k.name} (${ageText(k.months)})`).join(', ') : '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 12, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      <Tile bg="transparent" name="reise" size={40} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} weight={600}>{tx('Packliste dazu?', 'Packing list for it?')}</Txt>
        <Txt size={13} color={tokens.sub} numberOfLines={2}>{forWhom ? tx(`Passend für ${forWhom}`, `Made for ${forWhom}`) : tx('Passend zu Reise und Dauer', 'Made for the trip and its length')}</Txt>
      </View>
      <PressScale disabled={busy} onPress={still ? noop : () => { setBusy(true); makePackList(trip).finally(() => setBusy(false)); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink, opacity: busy ? 0.5 : 1 }}>
        <Txt size={14} weight={600} color={tokens.bg}>{busy ? tx('Denke …', 'Thinking …') : tx('Anlegen', 'Create')}</Txt>
      </PressScale>
    </View>
  );
}

/** The Ja/Nein under a question for the partner; the answer shows on the question itself. */
export function Ask({ f, me, answer }: { f: FeedEntry; me: 'J' | 'T'; answer?: FeedEntry }) {
  const ask = f.ask!;
  const persons = usePersons();
  const still = useStill();
  const to = persons[ask.to];
  if (answer?.answer) {
    const yes = answer.answer.yes;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: yes ? tokens.doneSoft : tokens.chipBg }}>
        <Avatar p={answer.by} size={22} />
        <Txt size={14.5} weight={600} color={yes ? tokens.done : tokens.ink}>{answer.by === me ? tx(`Du: ${yes ? 'Ja' : 'Nein'}`, `You: ${yes ? 'Yes' : 'No'}`) : `${persons[answer.by].name}: ${yes ? tx('Ja', 'Yes') : tx('Nein', 'No')}`}</Txt>
        <Txt size={12.5} color={tokens.sub}>{at(answer.at)}</Txt>
      </View>
    );
  }
  if (ask.to !== me) return <Txt size={13} color={tokens.sub}>{tx(`Wartet auf ${to.name}`, `Waiting for ${to.name}`)}</Txt>;
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[true, false].map((yes) => (
        <PressScale key={String(yes)} onPress={still ? noop : () => answerAsk(f.id, yes)} accessibilityLabel={yes ? tx('Ja', 'Yes') : tx('Nein', 'No')} style={{ height: 40, paddingHorizontal: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: yes ? tokens.ink : tokens.chipBg }}>
          <Txt size={15} weight={600} color={yes ? tokens.bg : tokens.ink}>{yes ? tx('Ja', 'Yes') : tx('Nein', 'No')}</Txt>
        </PressScale>
      ))}
    </View>
  );
}

/**
 * One card per sentence, there from the first moment (Julian 30.10. 22:17: "Die
 * Card sollte von Anfang da sein und innen drin die Denkarbeit geschehen").
 * The assistant's sentence sits on top (typing dots until it has spoken), what
 * it did grows in below. Thinking and the finished entry draw the same frame,
 * so nothing jumps when one becomes the other.
 */
export const cardFrame = [{ alignSelf: 'stretch' as const, borderRadius: 20, overflow: 'hidden' as const }, glass.lift];
/**
 * Memo is the assistant's face (Julian 01.11.): thinks with a "?" while working, happy eyes when it has answered,
 * just entered something. Older cards in the log stay still, so a long chat never twitches.
 */
/** One bubble in the log, mine or the assistant's: the same shape, only the side and the colour differ. */
const BUBBLE = { maxWidth: '84%' as const, flexShrink: 1, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 15 };
/** Memo beside his bubble, and how far his cards stand in so they line up with it. */
const MEMO = 26;
const MEMO_GAP = 8;
const memoInset = (minimal: boolean) => (minimal ? 0 : MEMO + MEMO_GAP);

export function Reply({ text, live, fresh, bare }: { text?: string; live?: boolean; fresh?: boolean; /** In the chat log: Memo and his words as one plain line on the ground, as in the klar draft. */ bare?: boolean }) {
  // The blob (Julian 07.11.): squashes while it thinks, ^^ when it has answered; older cards hold still.
  const mood = live ? (text ? 'happy' : 'think') : 'idle';
  const minimal = useMascot() === 'minimal';
  // Julian 14.11.: "the chat message from the Assistent need to have their own chat background just like any other
  // chat". A quiet grey bubble, flat like mine, its tail towards Memo, who stands at its foot as my own tail sits at the foot of mine.
  if (bare) return (
    <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', gap: MEMO_GAP }}>
      {minimal ? null : <View style={{ marginBottom: 9 }}><Pin mood={mood} size={MEMO} shadow={false} still={!live} /></View>}
      <View style={[BUBBLE, { borderBottomLeftRadius: 6, backgroundColor: tokens.chipBg }]}>
        {text ? <Animated.View entering={swapIn}><Txt size={17} line={24}>{text}</Txt></Animated.View> : <View style={{ paddingVertical: 8, paddingHorizontal: 2 }}><Dots /></View>}
      </View>
    </View>
  );
  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 4, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {minimal ? null : <Pin mood={mood} size={24} shadow={false} still={!live} />}
        <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>MEMO</Txt>
      </View>
      {text ? <Animated.View entering={swapIn}><Txt size={15} line={21}>{text}</Txt></Animated.View> : <View style={{ paddingVertical: 4 }}><Dots /></View>}
    </View>
  );
}

/** Text read from a photo is a whole letter; the bubble shows only its start (the assistant's card says what came of it). */
export function shortSaid(said: string) {
  const m = /^(Vom Foto|From a photo):\s*/.exec(said);
  if (!m) return said;
  const rest = said.slice(m[0].length);
  return `${tx('Foto', 'Photo')}: ${rest.length > 120 ? `${rest.slice(0, 120).replace(/\s+\S*$/, '')} …` : rest}`;
}

export const Entry = React.memo(EntryRow);

type EntryProps = {
  f: FeedEntry; mine: boolean; me: 'J' | 'T'; answer?: FeedEntry;
  /** Onboarding showcase: same look, no writes, no navigation, no follow-up questions, no undo. */
  showcase?: boolean;
  /** Forces the bubble side; by default `mine` puts it on the right. */
  side?: 'left' | 'right';
};

function EntryRow({ showcase, ...props }: EntryProps) {
  const outer = useStill();
  if (showcase && !outer) return <StillContext.Provider value><EntryBody {...props} /></StillContext.Provider>;
  return <EntryBody {...props} />;
}

/** A button in a result card: the ink pill for the main step, a white pill for the other (klar draft). */
function CardBtn({ label, icon, primary, onPress }: { label: string; icon?: 'edit' | 'chev'; primary?: boolean; onPress: () => void }) {
  return (
    <PressScale scale={0.97} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={[{ flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 }, primary ? { backgroundColor: tokens.ink } : glass.sm]}>
      {icon === 'edit' ? <LineIcon name="edit" size={16} color={primary ? tokens.onInk : tokens.ink} stroke={2} /> : null}
      <Txt size={15.5} weight={600} color={primary ? tokens.onInk : tokens.ink} numberOfLines={1}>{label}</Txt>
    </PressScale>
  );
}

function EntryBody({ f, mine: own, me, answer, side }: Omit<EntryProps, 'showcase'>) {
  const [open, setOpen] = useState(false);
  const still = useStill();
  const persons = usePersons();
  const mineSoft = useBubble().soft;
  // Side and the "Du" label follow `side` when given; the follow-up questions still need `own`.
  const mine = side ? side === 'right' : own;
  const asks = own && !still;
  const p = persons[f.by];
  // Deleted later (Julian 04.11.): the card says so once, the footer no longer claims "Im Kalender".
  const allEvents = useStore((st) => st.events);
  const ready = useCalendarReady();
  const gone = !!f.events?.length && ready && !f.events.some((id) => allEvents.some((e) => e.id === id));
  // My own words sit in my bubble colour (Deine Farbe); the others keep the colour they have in the calendar.
  // In the onboarding showcase the people are examples, so the bubble keeps the example person's colour there.
  const bubble = f.kind === 'msg'
    ? { backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }
    : { backgroundColor: mine && persons === basePersons ? mineSoft : p.tint };
  const fresh = Date.now() - Date.parse(f.at) < 60000;
  const recent = Date.now() - Date.parse(f.at) < 15 * 60000;
  const made = f.kind === 'made' && !!(f.events || f.items || f.tasks || f.undone);
  // What Memo says under the sentence: his own words, or else where it went.
  const where = f.changed ? tx('Geändert.', 'Changed.') : f.events ? tx('Steht im Kalender.', 'It is in the calendar.') : f.tasks ? tx('Steht bei den Aufgaben.', 'It is on your tasks.') : tx('Steht auf der Liste.', 'It is on the list.');
  const says = f.undone ? undefined : f.say ?? (made && !gone ? where : undefined);
  const canChange = f.events?.length === 1 && !f.undone && !gone;
  const hasWhy = !!f.why && !f.events && !f.items && !f.tasks;
  const undo = !still && !f.undone && canUndo(f.id);
  const inset = memoInset(useMascot() === 'minimal');
  return (
    <View>
      {/* One column: my words on the right; the partner's, Memo's and the cards all start at the same line on the left. */}
      <View style={{ gap: 8, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {/* Mine needs no name; the others say who and when. */}
        {mine && f.kind !== 'msg' ? null : <Txt size={12.5} color={tokens.sub} style={mine ? undefined : { marginLeft: MEMO + MEMO_GAP, marginBottom: -3 }}>{[mine ? tx('Du', 'You') : p.name || f.by, f.kind === 'msg' ? tx('Nachricht', 'Message') : null, at(f.at)].filter(Boolean).join(' · ')}</Txt>}
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', gap: MEMO_GAP, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
          {mine ? null : <View style={{ marginBottom: 9 }}><Avatar p={f.by} size={MEMO} /></View>}
          <View style={[BUBBLE, mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }, bubble]}>
            {f.ask ? <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{tx(`FRAGE AN ${persons[f.ask.to].name.toUpperCase()}`, `QUESTION FOR ${persons[f.ask.to].name.toUpperCase()}`)}</Txt> : null}
            <Txt size={17} line={24}>{f.ask ? f.ask.q : shortSaid(f.said)}</Txt>
          </View>
        </View>
        {f.ask ? <Ask f={f} me={me} answer={answer} /> : null}
        {says ? <Reply bare text={says} fresh={fresh} /> : null}
        {made ? (
          <Animated.View layout={rowLayout} style={[cardFrame, { marginLeft: inset, opacity: f.undone ? 0.55 : 1 }]}>
            {f.undone ? null : f.events ? <Termine ids={f.events} snap={f.snap?.events} changed={f.changed} fresh={fresh} ask={asks && !open && recent ? me : undefined} timeQ={asks && !open && recent ? f.timeQ : undefined} placeQ={asks && !open && recent} /> : null}
            {f.undone ? null : f.events ? <VacationLeft ids={f.events} /> : null}
            {f.undone || HIDDEN.suggestions ? null : f.events ? <PackOffer ids={f.events} /> : null}
            {f.undone || !f.suggest || HIDDEN.suggestions ? null : <BringOffer suggest={f.suggest} />}
            {f.undone ? null : f.items ? <Items list={f.items.list} ids={f.items.ids} name={f.snap?.list} names={f.snap?.items} /> : null}
            {f.undone ? null : f.tasks ? <Tasks ids={f.tasks} titles={f.snap?.tasks} /> : null}
            {f.undone ? <Txt size={14.5} weight={600} color={tokens.sub} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>{tx('Rückgängig gemacht', 'Undone')}</Txt> : null}
            {/* The two steps you may want next, as real buttons: change it, or take it back. */}
            {!f.undone && !still && (canChange || undo) ? (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: EDGE, paddingTop: 2, paddingBottom: EDGE }}>
                {canChange ? <CardBtn primary icon="edit" label={tx('Ändern', 'Change')} onPress={() => { haptics.select(); router.push({ pathname: '/termin-aendern', params: { id: f.events![0] } }); }} /> : null}
                {undo ? <CardBtn label={tx('Rückgängig', 'Undo')} onPress={() => undoEntry(f.id)} /> : null}
              </View>
            ) : !f.undone ? <View style={{ height: 4 }} /> : null}
          </Animated.View>
        ) : null}
        {/* An answer without a card can show how it came about. */}
        {hasWhy && !f.undone ? (
          <View style={{ alignSelf: 'stretch', gap: 6 }}>
            <PressScale hitSlop={8} accessibilityLabel={open ? tx('Zuklappen', 'Close') : tx('Schritte zeigen', 'Show steps')} onPress={still ? noop : () => setOpen((o) => !o)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 34 }}>
              <Txt size={13.5} color={tokens.sub}>{tx('Details', 'Details')}</Txt>
              <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><LineIcon name="chev" size={14} color={tokens.sub} /></View>
            </PressScale>
            {open ? <View style={[cardFrame, { marginLeft: inset }]}><Why why={f.why!} /></View> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** What the full screen shows elsewhere, as a card in the log (Julian 29.10.): the sentence, the plan, each step ticking off, and Halt. */
export function Thinking({ by }: { by: 'J' | 'T' }) {
  const v = useVeil();
  const persons = usePersons();
  const mineSoft = useBubble().soft;
  const inset = memoInset(useMascot() === 'minimal');
  if (!v.inline || v.phase === 'off') return null;
  return (
    <View style={{ gap: 8, alignItems: 'flex-end' }}>
      {v.said ? (
        <>
          <View style={[BUBBLE, { borderBottomRightRadius: 6, backgroundColor: persons === basePersons ? mineSoft : persons[by].tint }]}>
            <Txt size={17} line={24}>{shortSaid(v.said)}</Txt>
          </View>
        </>
      ) : null}
      <Reply bare text={v.reply} live />
      {/* Julian 31.10.: one thinking sign only. The typing dots in Reply say it; steps show only once there is a plan. */}
      {v.head || v.lines.length ? (
        <Animated.View layout={rowLayout} style={[cardFrame, { marginLeft: inset }]}>
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
            {v.head ? <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{v.head.toUpperCase()}</Txt> : null}
            {v.lines.map((l, i) => <Step key={i} label={l} state={i < v.shown ? 'done' : i === v.shown ? 'now' : 'next'} />)}
            {v.head && v.onCancel && v.phase === 'think' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt size={13} color={tokens.sub}>{tx('Passiert gleich von selbst', 'Happens in a moment')}</Txt>
                <PressScale onPress={v.onCancel} hitSlop={8} accessibilityLabel={tx('Halt, nicht ausführen', "Stop, don't do it")} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={14} weight={600}>{tx('Halt, anders', 'Stop')}</Txt>
                </PressScale>
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

