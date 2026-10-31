/**
 * The chat's cards (moved from app/(tabs)/chat.tsx 31.10.): one sentence, what the
 * assistant said, and what it made. The chat log draws them, and so does the
 * card that lays over Kalender and Listen (Julian 31.10.: "Wie im Chat nur außerhalb").
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { H1, Check, Head } from './ui/kit';
import Txt from './ui/Txt';
import { Avatar, Pair } from './ui/Person';
import { Tile } from './ui/Clay';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { tokens, persons } from '../theme';
import { swapIn, rowLayout } from '../theme/motion';
import { useStore, actions } from '../state/store';
import { useDockSpace } from '../lib/dockSpace';
import { useKeyboardInset } from '../lib/keyboard';
import { useFeed, canUndo, undoEntry, answerAsk, type FeedEntry, type EventSnap } from '../lib/feed';
import { getFamily, myRole } from '../lib/sync';
import { hm, short, TODAY } from '../lib/dates';
import HeaderRight from './ui/HeaderRight';
import { tx } from '../i18n/lang';
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


export const at = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const dayOf = (s: string) => { const d = new Date(s); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function Termine({ ids, snap, changed, ask, timeQ, fresh, placeQ }: { ids: string[]; snap?: EventSnap[]; changed?: boolean; ask?: 'J' | 'T'; timeQ?: string; fresh?: boolean; placeQ?: boolean }) {
  const events = useStore((s) => s.events);
  // A card that just appeared plays its icon once (Julian 31.10.: "das icon kurz animieren").
  const [play, setPlay] = useState(false);
  useEffect(() => { if (!fresh) return; const t = setTimeout(() => setPlay(true), 220); return () => clearTimeout(t); }, []);
  // Live from the calendar; the snapshot only if the Termin never reached this phone.
  const live = ids.map((id) => events.find((e) => e.id === id) ?? (events.length ? undefined : snap?.find((x) => x.id === id))).filter(Boolean) as (EventSnap & { who?: typeof events[number]['who'] })[];
  if (!live.length) return <Txt size={13.5} color={tokens.mute} style={{ padding: 14 }}>{changed ? tx('Mit der nächsten Nachricht geändert, siehe unten.', 'Changed by the next message, see below.') : tx('Nicht mehr im Kalender.', 'No longer in the calendar.')}</Txt>;
  return (
    <>
      {live.map((e) => (
        <PressScale key={e.id} scale={0.99} onPress={() => router.push(`/termin/${e.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 12 }}>
          <Tile name={e.icon} size={48} radius={14} celebrate={play} />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Txt size={16} line={21} weight={600} numberOfLines={2}>{e.title}</Txt>
            <Txt size={13.5} color={tokens.sub} numberOfLines={1}>{[(e as CalEvent).endDate && (e as CalEvent).endDate! > e.date ? tx(`${short(e.date)} bis ${short((e as CalEvent).endDate!)}`, `${short(e.date)} to ${short((e as CalEvent).endDate!)}`) : short(e.date), e.allDay ? tx('ganztägig', 'all day') : e.end ? tx(`${hm(e.start)} bis ${hm(e.end)}`, `${hm(e.start)} to ${hm(e.end)}`) : hm(e.start), e.place].filter(Boolean).join(' · ')}</Txt>
          </View>
          {e.place ? <PinChip place={e.place} /> : null}
          {e.who === 'J' || e.who === 'T' ? <Avatar p={e.who} size={26} /> : e.who === 'both' ? <Pair size={22} ring={tokens.row} /> : null}
        </PressScale>
      ))}
      {timeQ && live.length === 1 ? <TimeAsk e={live[0]} q={timeQ} /> : null}
      {/* Julian 31.10.: "Welcher Kinderarzt ist das?", then remembered for next time. */}
      {placeQ && live.length === 1 ? <PlaceAsk e={live[0]} /> : null}
      {/* Once someone is picked the question is answered and goes away (Julian 31.10.). */}
      {ask && live.length === 1 && !live[0].who ? <WhoGoes e={live[0]} me={ask} /> : null}
    </>
  );
}

/** Time questions answered with "Ganztägig": the Termin stays all day, the question is done. */
const settled = new Set<string>();
const settledSubs = new Set<() => void>();
const settle = (id: string) => { settled.add(id); settledSubs.forEach((l) => l()); };
export const useSettled = () => { const [, bump] = useState(0); useEffect(() => { const l = () => bump((n) => n + 1); settledSubs.add(l); return () => { settledSubs.delete(l); }; }, []); return settled; };

const pad2 = (n: number) => String(n).padStart(2, '0');
const plusMin = (t: string, min: number) => { const m = Math.min(23 * 60 + 59, Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + min); return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; };

/**
 * The time question as options in the card, like Claude's own cards (Julian 30.10.: "bieten immer Optionen zum
 * Klicken an, das funktioniert super"). It stays until a time is picked or "Ganztägig"; then "Bis wann?" once.
 */
function TimeAsk({ e, q }: { e: EventSnap; q: string }) {
  const [step, setStep] = useState<'start' | 'end' | 'done'>(e.allDay && !settled.has(e.id) ? 'start' : 'done');
  if (step === 'done') return null;
  const chip = (label: string, on: () => void, key = label) => (
    <PressScale key={key} onPress={() => { haptics.select(); on(); }} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
      <Txt size={13.5}>{label}</Txt>
    </PressScale>
  );
  return (
    <View style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>
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
  const opts: [string, 'J' | 'T' | 'both'][] = [[tx('Ich', 'Me'), me], [persons[other].name || tx('Partner', 'Partner'), other], [tx('Beide', 'Both'), 'both']];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 10 }}>
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
    <View style={{ gap: 10, paddingHorizontal: 12, paddingBottom: 12 }}>
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
            {e.work ? null : <View style={{ marginHorizontal: -12 }}><WhoGoes e={e} me={me} /></View>}
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

function Items({ list, ids, name, names }: { list: string; ids: string[]; name?: string; names?: string[] }) {
  const l = useStore((s) => s.lists.find((x) => x.id === list));
  // Lists still live on each phone: on the partner's phone the card shows what was added.
  if (!l || !ids.some((id) => l.sections.some((sec) => sec.items.some((i) => i.id === id)))) return (
    <>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{name ?? l?.name ?? tx('Liste', 'List')}</Txt>
      {(names ?? []).map((n, k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={false} />
          <Txt size={15} style={{ flex: 1 }}>{n}</Txt>
        </View>
      ))}
      <View style={{ height: 6 }} />
    </>
  );
  const all = l.sections.flatMap((s) => s.items);
  const live = ids.map((id) => all.find((i) => i.id === id)).filter(Boolean) as typeof all;
  return (
    <>
      <PressScale scale={0.99} onPress={() => { actions.setActiveList(l.id); router.navigate('/listen'); }} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
        <Txt size={15} weight={600}>{l.name}</Txt>
      </PressScale>
      {live.map((i) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={i.done} onPress={() => actions.toggleItem(l.id, i.id)} />
          <Txt size={15} style={{ flex: 1 }} color={i.done ? tokens.mute : tokens.ink}>{i.qty ? `${i.qty} ` : ''}{i.name}</Txt>
        </View>
      ))}
      {live.length < ids.length ? <Txt size={13} color={tokens.mute} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>{tx('Ein Teil ist nicht mehr auf der Liste.', 'Some are no longer on the list.')}</Txt> : null}
      <View style={{ height: 6 }} />
    </>
  );
}

function Tasks({ ids, titles }: { ids: string[]; titles?: string[] }) {
  const tasks = useStore((s) => s.tasks);
  const found = ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks;
  const live = found.length ? found : (titles ?? []).map((title, k) => ({ id: `snap${k}`, title, done: false, who: null } as unknown as typeof tasks[number]));
  return (
    <>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{tx('Aufgaben', 'Tasks')}</Txt>
      {live.map((t) => (
        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
          <Check size={22} done={t.done} onPress={t.id.startsWith('snap') ? undefined : () => actions.toggleTask(t.id)} />
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
          <PressScale key={`${r.e!.id}${t}`} onPress={() => actions.addBring(r.e!.id, t)} accessibilityLabel={tx(`${t} mitnehmen`, `Bring ${t}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.chipBg }}>
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
  if (!trip) return null;
  const year = Number(trip.date.slice(0, 4));
  const who = trip.who === 'both' ? (['J', 'T'] as const) : trip.who === 'J' || trip.who === 'T' ? [trip.who] : [];
  const lines = who.map((p) => leftLine(events, p, vacation[p], year, land, trip.who === 'both' ? names[p] : '')).filter(Boolean);
  return (
    <PressScale scale={0.99} onPress={() => router.push('/urlaub')} style={{ paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      <Txt size={13.5} line={19} color={tokens.sub}>{lines.length ? lines.join('\n') : tx('Urlaubstage einstellen, dann rechne ich mit.', 'Set your vacation days and I keep count.')}</Txt>
    </PressScale>
  );
}

/** A trip offers its packing list, made for this family (Julian 29.10.: "mitdenken"). */
function PackOffer({ ids }: { ids: string[] }) {
  const trip = useStore((s) => s.events.find((e) => ids.includes(e.id) && isTrip(e)));
  const list = useStore((s) => (trip ? s.lists.find((l) => l.forEvent === trip.id) : undefined));
  const [busy, setBusy] = useState(false);
  if (!trip) return null;
  if (list) {
    const n = list.sections.reduce((a, sec) => a + sec.items.length, 0);
    return (
      <PressScale scale={0.99} onPress={() => { actions.setActiveList(list.id); router.push('/listen'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderTopWidth: 1, borderTopColor: tokens.hair }}>
        <Tile name="reise" size={40} radius={12} />
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
      <Tile name="reise" size={40} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} weight={600}>{tx('Packliste dazu?', 'Packing list for it?')}</Txt>
        <Txt size={13} color={tokens.sub} numberOfLines={2}>{forWhom ? tx(`Passend für ${forWhom}`, `Made for ${forWhom}`) : tx('Passend zu Reise und Dauer', 'Made for the trip and its length')}</Txt>
      </View>
      <PressScale disabled={busy} onPress={() => { setBusy(true); makePackList(trip).finally(() => setBusy(false)); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink, opacity: busy ? 0.5 : 1 }}>
        <Txt size={14} weight={600} color={tokens.bg}>{busy ? tx('Denke …', 'Thinking …') : tx('Anlegen', 'Create')}</Txt>
      </PressScale>
    </View>
  );
}

/** The Ja/Nein under a question for the partner; the answer shows on the question itself. */
function Ask({ f, me, answer }: { f: FeedEntry; me: 'J' | 'T'; answer?: FeedEntry }) {
  const ask = f.ask!;
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
        <PressScale key={String(yes)} onPress={() => answerAsk(f.id, yes)} accessibilityLabel={yes ? tx('Ja', 'Yes') : tx('Nein', 'No')} style={{ height: 40, paddingHorizontal: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: yes ? tokens.ink : tokens.chipBg }}>
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
const cardFrame = { alignSelf: 'stretch' as const, borderRadius: 18, overflow: 'hidden' as const, backgroundColor: tokens.row };
function Reply({ text }: { text?: string }) {
  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 4, gap: 4 }}>
      <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{tx('ASSISTENT', 'ASSISTANT')}</Txt>
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

function EntryRow({ f, mine, me, answer }: { f: FeedEntry; mine: boolean; me: 'J' | 'T'; answer?: FeedEntry }) {
  const [open, setOpen] = useState(false);
  const p = persons[f.by];
  const name = mine ? tx('Du', 'You') : p.name || f.by;
  const bubble = f.kind === 'msg'
    ? { backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }
    : { backgroundColor: p.tint };
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {mine ? null : <View style={{ marginTop: 20 }}><Avatar p={f.by} size={28} /></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 6, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <Txt size={12.5} color={tokens.sub}>{[name, f.kind === 'msg' ? tx('Nachricht', 'Message') : null, at(f.at)].filter(Boolean).join(' · ')}</Txt>
        <View style={[{ maxWidth: '86%', borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13 }, mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }, bubble]}>
          {f.ask ? <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{tx(`FRAGE AN ${persons[f.ask.to].name.toUpperCase()}`, `QUESTION FOR ${persons[f.ask.to].name.toUpperCase()}`)}</Txt> : null}
          <Txt size={15} line={21}>{f.ask ? f.ask.q : shortSaid(f.said)}</Txt>
        </View>
        {f.ask ? <Ask f={f} me={me} answer={answer} /> : null}
        {f.say && !f.undone && !(f.kind === 'made' && (f.events || f.items || f.tasks)) ? <View style={cardFrame}><Reply text={f.say} /><View style={{ height: 10 }} /></View> : null}
        {f.kind === 'made' && (f.events || f.items || f.tasks || f.undone) ? (
          <Animated.View layout={rowLayout} style={[cardFrame, { opacity: f.undone ? 0.55 : 1 }]}>
            {f.say && !f.undone ? <Reply text={f.say} /> : null}
            {f.undone ? null : f.events ? <Termine ids={f.events} snap={f.snap?.events} changed={f.changed} fresh={Date.now() - Date.parse(f.at) < 60000} ask={mine && !open && Date.now() - Date.parse(f.at) < 15 * 60000 ? me : undefined} timeQ={mine && !open && Date.now() - Date.parse(f.at) < 15 * 60000 ? f.timeQ : undefined} placeQ={mine && !open && Date.now() - Date.parse(f.at) < 15 * 60000} /> : null}
            {f.undone ? null : f.events ? <VacationLeft ids={f.events} /> : null}
            {f.undone || HIDDEN.suggestions ? null : f.events ? <PackOffer ids={f.events} /> : null}
            {f.undone || !f.suggest || HIDDEN.suggestions ? null : <BringOffer suggest={f.suggest} />}
            {f.undone ? null : f.items ? <Items list={f.items.list} ids={f.items.ids} name={f.snap?.list} names={f.snap?.items} /> : null}
            {f.undone ? null : f.tasks ? <Tasks ids={f.tasks} titles={f.snap?.tasks} /> : null}
            {open && !f.events && !f.items && !f.tasks && f.why ? <Why why={f.why} /> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: f.undone ? 0 : 1, borderTopColor: tokens.hair }}>
              <Txt size={13} weight={600} color={f.undone || f.changed ? tokens.sub : tokens.done}>{f.undone ? tx('Rückgängig gemacht', 'Undone') : f.changed ? tx('Geändert', 'Changed') : `✓ ${f.events ? tx('Im Kalender', 'In the calendar') : f.tasks ? tx('Bei den Aufgaben', 'On your tasks') : tx('Auf der Liste', 'On the list')}`}</Txt>
              <View style={{ flex: 1 }} />
              {(f.why && !f.events && !f.items && !f.tasks) || (f.events?.length === 1 && !f.undone) ? (
                <PressScale hitSlop={8} accessibilityLabel={open ? tx('Zuklappen', 'Close') : f.events ? tx('Ändern', 'Change') : tx('Schritte zeigen', 'Show steps')} onPress={() => { if (f.events && !f.undone) { haptics.select(); router.push(`/termin/${f.events[0]}`); } else setOpen((o) => !o); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: canUndo(f.id) && !f.undone ? 14 : 0 }}>
                  <Txt size={13} color={f.events ? tokens.ink : tokens.sub} weight={f.events ? 600 : 400}>{f.events ? tx('Ändern', 'Change') : tx('Details', 'Details')}</Txt>
                  <View style={{ transform: [{ rotate: f.events ? '0deg' : open ? '-90deg' : '90deg' }] }}><LineIcon name="chev" size={14} color={tokens.sub} /></View>
                </PressScale>
              ) : null}
              {!f.undone && canUndo(f.id) ? (
                <PressScale hitSlop={8} onPress={() => undoEntry(f.id)}><Txt size={13} color={tokens.sub}>{tx('Rückgängig', 'Undo')}</Txt></PressScale>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** What the full screen shows elsewhere, as a card in the log (Julian 29.10.): the sentence, the plan, each step ticking off, and Halt. */
export function Thinking({ by }: { by: 'J' | 'T' }) {
  const v = useVeil();
  if (!v.inline || v.phase === 'off') return null;
  return (
    <View style={{ gap: 6, alignItems: 'flex-end' }}>
      {v.said ? (
        <>
          <Txt size={12.5} color={tokens.sub}>{tx('Du', 'You')} · {at(new Date().toISOString())}</Txt>
          <View style={{ maxWidth: '86%', borderRadius: 18, borderBottomRightRadius: 6, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: persons[by].tint }}>
            <Txt size={15} line={21}>{shortSaid(v.said)}</Txt>
          </View>
        </>
      ) : null}
      <Animated.View layout={rowLayout} style={cardFrame}>
      <Reply text={v.reply} />
      {/* Julian 31.10.: one thinking sign only. The typing dots in Reply say it; steps show only once there is a plan. */}
      {v.head || v.lines.length ? <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14, gap: 10 }}>
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
      </View> : <View style={{ height: 10 }} />}
      </Animated.View>
    </View>
  );
}

