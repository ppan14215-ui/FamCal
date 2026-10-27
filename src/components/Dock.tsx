/**
 * Der Dock (Julian 27.10.: "Voice input an jeder Stelle"). One talk field for
 * the whole app, drawn once at the root. It knows where you are: in the
 * calendar a sentence becomes a Termin or an answer, on a Termin it changes
 * that Termin, on a list it fills that list. Each time the orb thinks out
 * loud, the change happens behind the veil, and a drop flies to the spot
 * that changed. Questions and new Termine leave a small card above the field.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Chip } from './ui/kit';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { Avatar, Pair, Owner } from './ui/Person';
import PressScale from './ui/PressScale';
import TalkBar from './TalkBar';
import { setVeil } from './Veil';
import { tokens, persons } from '../theme';
import { useStore, actions, get } from '../state/store';
import { plan, claudeSays, correction, replyPlan, listFromClaude, thinksOnline, Ctx, Plan, Result, SPOKEN, HINTS, PLACEHOLDER } from '../lib/act';
import { dayLabel, slotLine } from '../lib/talk';
import { locate, light, lightOneByOne } from '../lib/landing';
import { setDockSpace } from '../lib/dockSpace';
import { useKeyboardInset, useTyping } from '../lib/keyboard';
import { hm } from '../lib/dates';
import { Tile } from './ui/Clay';
import { haptics } from '../lib/haptics';
import type { CalEvent, Who } from '../state/types';
import { tx, quote } from '../i18n/lang';
import { onToday } from '../screens/kalender/TodayView';

const STEP_MS = 850;
const TIMES = ['09:00', '10:30', '14:00', '16:00'];
const shadow = Platform.select({
  web: { boxShadow: `0 0 0 1px ${tokens.hair}, 0 12px 32px rgba(22,35,42,.12)` } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8, borderWidth: 1, borderColor: tokens.hair },
});

/** Where am I, and where does the dock sit there. */
function useWhere(): { ctx: Ctx; tab: boolean; lift: number } | null {
  const path = usePathname();
  const active = useStore((s) => s.activeList);
  if (path === '/kalender' || path === '/eingang') return { ctx: { kind: 'kalender' }, tab: true, lift: 0 };
  if (path === '/listen') return { ctx: { kind: 'liste', id: active }, tab: true, lift: 0 };
  const t = path.match(/^\/termin\/(.+)$/);
  if (t) return { ctx: { kind: 'termin', id: decodeURIComponent(t[1]) }, tab: false, lift: 0 };
  // Above the "Liste anlegen" button.
  if (path === '/liste-neu') return { ctx: { kind: 'liste-neu' }, tab: false, lift: 74 };
  return null;
}

/** The two answers to a receipt: take it back, or it is fine. */
function Decide({ onUndo, onOk }: { onUndo: () => void; onOk: () => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <PressScale onPress={onUndo} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={15} weight={600}>{tx('Rückgängig', 'Undo')}</Txt>
      </PressScale>
      <PressScale onPress={onOk} style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={15} weight={600} color="#FFFFFF">{tx('Passt', 'Done')}</Txt>
      </PressScale>
    </View>
  );
}

/** The tick that opens every receipt. */
function Tick() {
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }}>
      <LineIcon name="check" size={18} color="#FFFFFF" stroke={2.8} />
    </Animated.View>
  );
}

/**
 * Receipt for lists and tasks (Julian 27.10.: "es darf kein Zweifel bleiben,
 * was von der Maschine ausgeführt wird"): one sentence with exactly what was
 * done, who else sees it, and undo.
 */
function DoneCard({ text, sub, said, onUndo, onOk }: { text: string; sub?: string; said: string; onUndo?: () => void; onOk: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Tick />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={17} line={22} weight={600}>{text}</Txt>
          <Txt size={13} line={18} color={tokens.sub} numberOfLines={2}>{[sub, quote(said)].filter(Boolean).join(' ')}</Txt>
        </View>
      </View>
      <Decide onUndo={onUndo ?? onOk} onOk={onOk} />
    </View>
  );
}

const nextWho = (w: Who): Who => (w === 'J' ? 'T' : w === 'T' ? 'both' : 'J');

/** Receipt for a new Termin: what landed, every part tappable to fix it right here. */
function EventCard({ e, needsTime, onUndo, onOk }: { e: CalEvent; needsTime?: boolean; onUndo: () => void; onOk: () => void }) {
  const live = useStore((s) => s.events.find((x) => x.id === e.id));
  if (!live) return null;
  const pick = (w: Who) => { haptics.select(); actions.setEventWho(e.id, w); };
  const at = (t: string) => {
    haptics.select();
    const [h, m] = t.split(':').map(Number);
    actions.updateEvent(e.id, { start: t, end: `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`, allDay: false });
  };
  const open = () => router.push(`/termin/${e.id}`);
  const time = live.allDay ? tx('ganztägig', 'all day') : live.end ? tx(`${hm(live.start)} bis ${hm(live.end)}`, `${hm(live.start)} to ${hm(live.end)}`) : hm(live.start);
  const who = live.who === 'both' ? tx('Beide', 'Both') : live.who ? persons[live.who].name : null;
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Animated.View entering={ZoomIn.springify().damping(12)}><Tile name={live.icon} size={52} radius={16} /></Animated.View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LineIcon name="check" size={13} color={tokens.done} stroke={2.8} />
            <Txt size={12} weight={600} tracking={0.6} color={tokens.done}>{tx('IM KALENDER EINGETRAGEN', 'ADDED TO THE CALENDAR')}</Txt>
          </View>
          <Txt size={19} line={24} weight={600} numberOfLines={2}>{live.title}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Chip height={36} onPress={open}>{dayLabel(live.date)}</Chip>
        {needsTime ? null : <Chip height={36} onPress={open}>{time}</Chip>}
        {who ? (
          <Chip height={36} bg={live.who === 'both' ? tokens.doneSoft : persons[live.who as 'J' | 'T'].tint} color={live.who === 'both' ? tokens.done : persons[live.who as 'J' | 'T'].ink} onPress={() => pick(nextWho(live.who))}>{who}</Chip>
        ) : null}
        {live.place ? <Chip height={36} onPress={open}>{live.place}</Chip> : null}
      </View>
      {needsTime ? (
        <View style={{ gap: 6 }}>
          <Txt size={15} weight={600}>{tx('Um wie viel Uhr?', 'What time?')}</Txt>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {TIMES.map((t) => <Chip key={t} bg={!live.allDay && live.start === t ? tokens.doneSoft : tokens.chipBg} onPress={() => at(t)}>{hm(t)}</Chip>)}
          </View>
        </View>
      ) : null}
      {!live.who ? (
        <View style={{ gap: 6 }}>
          <Txt size={15} weight={600}>{tx('Wer geht?', 'Who\'s going?')}</Txt>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Chip icon={<Avatar p="J" size={18} />} onPress={() => pick('J')}>{persons.J.name}</Chip>
            <Chip icon={<Avatar p="T" size={18} />} onPress={() => pick('T')}>{persons.T.name}</Chip>
            <Chip icon={<Pair size={16} ring={tokens.chipBg} />} onPress={() => pick('both')}>{tx('Beide', 'Both')}</Chip>
          </View>
        </View>
      ) : null}
      <Decide onUndo={onUndo} onOk={onOk} />
    </Animated.View>
  );
}

function AnswerCard({ r }: { r: Extract<Result, { kind: 'answer' }>['reply'] }) {
  return (
    <View style={{ gap: 10 }}>
      <Txt size={16} line={22}>{r.text}</Txt>
      {r.kind === 'answer' && r.slots?.length ? (
        <View style={{ gap: 6 }}>
          {r.slots.map((s) => (
            <View key={s.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pair size={18} ring={tokens.row} />
              <Txt size={15} weight={600} style={{ width: 92 }}>{dayLabel(s.date)}</Txt>
              <Txt size={15} color={tokens.sub}>{slotLine(s)}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {r.kind === 'answer' && r.events?.length ? (
        <View style={{ gap: 6 }}>
          {r.events.map((e) => (
            <PressScale key={e.id} onPress={() => router.push(`/termin/${e.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Owner who={e.who} size={20} />
              <Txt size={15} weight={600} style={{ width: 92 }}>{`${dayLabel(e.date)}${e.allDay ? '' : ' ' + hm(e.start)}`}</Txt>
              <Txt size={15} color={tokens.sub} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
            </PressScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type Turn = { id: number; said: string; result: Result };

export default function Dock() {
  const where = useWhere();
  const hasEvents = useStore((s) => s.events.some((e) => !e.work));
  const insets = useSafeAreaInsets();
  const kb = useKeyboardInset();
  const typing = useTyping();
  const { width: W, height: H } = useWindowDimensions();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [h, setH] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Counts sentences, so a slow answer for an older one never lands. */
  const heard = useRef(0);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  const path = usePathname();

  // A card belongs to the screen it was made on.
  useEffect(() => { setTurn(null); }, [path]);
  useEffect(() => { setDockSpace(where ? h + (where.tab ? 0 : 8) : 0); }, [h, !!where]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!where) return null;
  // Examples only while the calendar is still empty; after that they are clutter (Julian 27.10.).
  const navTop = Math.max(insets.bottom, 12) + 10 + 58 + 10;
  // Typing hides the tabs, so the field drops into their place right above the keyboard.
  const bottom = kb > 0 ? kb + 8 : where.tab && !typing ? navTop : insets.bottom + 12 + (where.tab ? 0 : where.lift);
  const origin = { x: W - 14 - 6 - 24, y: H - bottom - 6 - 24 };
  // On tabs the nav stays on top of the fade, it starts just above it.
  // Above a footer button (liste-neu) the fade starts at the field, so the button stays clear.
  const fadeFrom = kb || (where.tab && typing) ? 0 : where.tab ? navTop - 6 : where.lift ? bottom - 8 : 0;
  const kind = where.ctx.kind;
  const pending = turn?.result.kind === 'answer' && turn.result.reply.kind === 'ask' ? { title: turn.result.reply.title, who: turn.result.reply.who } : null;

  const hear = (said: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    light(null);
    setTurn(null);
    const ctx = where.ctx;
    const n = ++heard.current;
    if (thinksOnline(ctx, said, pending)) {
      // The rules show it at once; Claude's reading arrives a few seconds later and corrects it.
      const second = claudeSays(said);
      play(plan(ctx, said, pending), said, true, (out) => second.then((r) => { if (heard.current === n) correct(out.result, r, said); }));
      return;
    }
    play(plan(ctx, said, pending), said, true);
  };

  const correct = (local: Result | undefined, r: Awaited<ReturnType<typeof claudeSays>>, said: string) => {
    if (!r) return;
    if (r.kind === 'liste') {
      // "Nudeln auf die Einkaufsliste" said in the calendar: no Termin, the list gets it.
      if (local?.kind === 'event') { actions.removeEvent(local.event.id); setTurn(null); light(null); }
      return play(listFromClaude(r), said, true);
    }
    if (r.kind !== 'added') return;
    if (local?.kind !== 'event') return play(replyPlan(r), said, true);
    const made = local.event;
    const patch = correction(made, r);
    if (!patch) return;
    actions.updateEvent(made.id, patch);
    const event = { ...made, ...patch };
    setTurn((t) => (t && t.result.kind === 'event' && t.result.event.id === made.id ? { ...t, result: { kind: 'event', event, needsTime: r.needsTime } } : t));
    light(made.id);
    haptics.select();
  };

  const play = (p: Plan, said: string, fresh: boolean, after?: (out: ReturnType<Plan['run']>) => void) => {
    const n = heard.current;
    // "Halt, anders": nothing has happened yet, so stopping leaves everything as it was.
    const stop = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (heard.current === n) heard.current++;
      setVeil({ phase: 'off', onCancel: undefined });
      haptics.select();
    };
    setVeil(fresh ? { phase: 'think', origin, target: null, lines: p.steps, shown: 0, said, head: p.head, onCancel: p.head ? stop : undefined } : { lines: p.steps, shown: 0, head: p.head, onCancel: p.head ? stop : undefined });
    p.steps.forEach((_, i) => later(450 + STEP_MS * i, () => { setVeil({ shown: i + 1 }); haptics.select(); }));
    later(450 + STEP_MS * p.steps.length + 150, () => {
      setVeil({ onCancel: undefined });
      const out = p.run();
      // A new Termin lands in the calendar; switch there first if we are elsewhere.
      const go = out.go ?? (out.result?.kind === 'event' ? '/kalender' : undefined);
      // Heute shows one week; a Termin further out lands in the list of days.
      if (out.result?.kind === 'event' && !onToday(out.result.event.date) && get().calView === 'heute') actions.setCalView('tag');
      if (go && go !== path) router.navigate(go as any);
      const finish = () => {
        // Each new row arrives on its own with a tick, then the receipt says what happened.
        const rows = out.lit?.length ? out.lit : out.land ? [out.land] : [];
        if (rows.length > 1) lightOneByOne(rows, (i) => (i === rows.length - 1 ? haptics.success() : haptics.select()));
        else { light(rows.length ? rows : null); haptics.success(); }
        if (out.result) later(rows.length > 1 ? 260 * rows.length : 120, () => setTurn({ id: Date.now(), said, result: out.result! }));
        after?.(out);
      };
      // The receipt covers the lower half, so whatever landed must sit above it.
      const band = { top: insets.top + 70, floor: H * 0.45, height: H };
      later(go && go !== path ? 380 : 90, () => {
        if (!out.land) return setVeil({ phase: 'land', target: { x: W / 2, y: H - bottom - 110 }, onLanded: finish });
        locate(out.land, band, (target) => setVeil({ phase: 'land', target, onLanded: finish }));
      });
    });
  };

  const undo = () => {
    if (turn?.result.kind === 'event') actions.removeEvent(turn.result.event.id);
    if (turn?.result.kind === 'done') turn.result.undo?.();
    haptics.select();
    setTurn(null);
    light(null);
  };
  const ok = () => { haptics.select(); setTurn(null); light(null); };

  return (
    <>
    {/* The screen fades out under the field, so prompts never sit on text. */}
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: fadeFrom, height: bottom - fadeFrom + h + 28 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="dockfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tokens.bg} stopOpacity={0} />
            <Stop offset={String(Math.min(0.5, 40 / (bottom - fadeFrom + h + 28)))} stopColor={tokens.bg} stopOpacity={0.94} />
            <Stop offset="1" stopColor={tokens.bg} stopOpacity={0.98} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dockfade)" />
      </Svg>
    </View>
    <View pointerEvents="box-none" onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 14, right: 14, bottom, gap: 10 }}>
      {turn ? (
        <Animated.View key={turn.id} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={[{ maxHeight: 360, borderRadius: 26, backgroundColor: tokens.row }, shadow]}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }} showsVerticalScrollIndicator={false}>
            {turn.result.kind === 'answer' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Txt size={14} line={20} color={tokens.sub} style={{ flex: 1 }}>{quote(turn.said)}</Txt>
                  <PressScale accessibilityLabel={tx('Schließen', 'Close')} hitSlop={10} onPress={ok}>
                    <LineIcon name="x" size={18} color={tokens.mute} />
                  </PressScale>
                </View>
                <AnswerCard r={turn.result.reply} />
              </>
            ) : turn.result.kind === 'event' ? (
              <EventCard e={turn.result.event} needsTime={turn.result.needsTime} onUndo={undo} onOk={ok} />
            ) : (
              <DoneCard text={turn.result.text} sub={turn.result.sub} said={turn.said} onUndo={turn.result.undo ? undo : undefined} onOk={ok} />
            )}
          </ScrollView>
        </Animated.View>
      ) : null}
      <TalkBar
        key={kind}
        onSend={hear}
        onPlus={() => router.push('/neu')}
        suggestions={turn || (kind === 'kalender' && hasEvents) ? [] : HINTS[kind]}
        spoken={SPOKEN[kind]}
        placeholder={PLACEHOLDER[kind]}
      />
    </View>
    </>
  );
}
