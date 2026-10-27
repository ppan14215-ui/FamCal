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
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Chip, TextLink } from './ui/kit';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { Avatar, Pair, Owner } from './ui/Person';
import PressScale from './ui/PressScale';
import TalkBar from './TalkBar';
import { setVeil } from './Veil';
import { tokens, persons } from '../theme';
import { useStore, actions } from '../state/store';
import { plan, Ctx, Result, SPOKEN, HINTS, PLACEHOLDER } from '../lib/act';
import { dayLabel, slotLine } from '../lib/talk';
import { locate, light } from '../lib/landing';
import { setDockSpace } from '../lib/dockSpace';
import { useKeyboardInset } from '../lib/keyboard';
import { hm } from '../lib/dates';
import { haptics } from '../lib/haptics';
import type { CalEvent, Who } from '../state/types';

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

function EventCard({ e, needsTime, onUndo }: { e: CalEvent; needsTime?: boolean; onUndo: () => void }) {
  const live = useStore((s) => s.events.find((x) => x.id === e.id));
  if (!live) return null;
  const pick = (w: Who) => { haptics.select(); actions.setEventWho(e.id, w); };
  const at = (t: string) => {
    haptics.select();
    const [h, m] = t.split(':').map(Number);
    actions.updateEvent(e.id, { start: t, end: `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`, allDay: false });
  };
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ gap: 10 }}>
      {needsTime ? (
        <View style={{ gap: 6 }}>
          <Txt size={15} weight={600}>Um wie viel Uhr?</Txt>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {TIMES.map((t) => <Chip key={t} bg={!live.allDay && live.start === t ? tokens.doneSoft : tokens.chipBg} onPress={() => at(t)}>{hm(t)}</Chip>)}
          </View>
        </View>
      ) : null}
      {!live.who ? (
        <View style={{ gap: 6 }}>
          <Txt size={15} weight={600}>Wer geht?</Txt>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Chip icon={<Avatar p="J" size={18} />} onPress={() => pick('J')}>{persons.J.name}</Chip>
            <Chip icon={<Avatar p="T" size={18} />} onPress={() => pick('T')}>{persons.T.name}</Chip>
            <Chip icon={<Pair size={16} ring={tokens.chipBg} />} onPress={() => pick('both')}>Beide</Chip>
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LineIcon name="check" size={15} color={tokens.done} stroke={2.4} />
        <Txt size={14} weight={600} color={tokens.done} style={{ flex: 1 }}>Eingetragen, ihr seht es beide</Txt>
        <TextLink label="Rückgängig" onPress={onUndo} />
        <TextLink label="Öffnen" color={tokens.ink} onPress={() => router.push(`/termin/${e.id}`)} />
      </View>
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
  const insets = useSafeAreaInsets();
  const kb = useKeyboardInset();
  const { width: W, height: H } = useWindowDimensions();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [h, setH] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  const path = usePathname();

  // A card belongs to the screen it was made on.
  useEffect(() => { setTurn(null); }, [path]);
  useEffect(() => { setDockSpace(where ? h + (where.tab ? 0 : 8) : 0); }, [h, !!where]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!where) return null;
  const navTop = Math.max(insets.bottom, 12) + 10 + 58 + 10;
  const bottom = kb > 0 ? kb + 8 : where.tab ? navTop : insets.bottom + 12 + where.lift;
  const origin = { x: W - 14 - 6 - 24, y: H - bottom - 6 - 24 };
  // On tabs the nav stays on top of the fade, it starts just above it.
  // Above a footer button (liste-neu) the fade starts at the field, so the button stays clear.
  const fadeFrom = kb ? 0 : where.tab ? navTop - 6 : where.lift ? bottom - 8 : 0;
  const kind = where.ctx.kind;
  const pending = turn?.result.kind === 'answer' && turn.result.reply.kind === 'ask' ? { title: turn.result.reply.title, who: turn.result.reply.who } : null;

  const hear = (said: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    light(null);
    setTurn(null);
    const p = plan(where.ctx, said, pending);
    setVeil({ phase: 'think', origin, target: null, lines: p.steps, shown: 0 });
    p.steps.forEach((_, i) => later(450 + STEP_MS * i, () => { setVeil({ shown: i + 1 }); haptics.select(); }));
    later(450 + STEP_MS * p.steps.length + 150, () => {
      const out = p.run();
      // A new Termin lands in the calendar; switch there first if we are elsewhere.
      const go = out.go ?? (out.result?.kind === 'event' ? '/kalender' : undefined);
      if (go && go !== path) router.navigate(go as any);
      const finish = () => {
        if (out.land) light(out.land);
        haptics.success();
        if (out.result && out.result.kind !== 'done') setTurn({ id: Date.now(), said, result: out.result });
      };
      const band = { top: insets.top + 70, floor: H * 0.55, height: H };
      later(go && go !== path ? 380 : 90, () => {
        if (!out.land) return setVeil({ phase: 'land', target: { x: W / 2, y: H - bottom - 110 }, onLanded: finish });
        locate(out.land, band, (target) => setVeil({ phase: 'land', target, onLanded: finish }));
      });
    });
  };

  const undo = () => {
    if (turn?.result.kind === 'event') actions.removeEvent(turn.result.event.id);
    setTurn(null);
    light(null);
  };

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
        <Animated.View key={turn.id} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={[{ maxHeight: 320, borderRadius: 26, backgroundColor: tokens.row }, shadow]}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Txt size={14} line={20} color={tokens.sub} style={{ flex: 1 }}>{`„${turn.said}“`}</Txt>
              <PressScale accessibilityLabel="Schließen" hitSlop={10} onPress={() => { setTurn(null); light(null); }}>
                <LineIcon name="x" size={18} color={tokens.mute} />
              </PressScale>
            </View>
            {turn.result.kind === 'event' ? (
              <EventCard e={turn.result.event} needsTime={turn.result.needsTime} onUndo={undo} />
            ) : turn.result.kind === 'answer' ? (
              <AnswerCard r={turn.result.reply} />
            ) : null}
          </ScrollView>
        </Animated.View>
      ) : null}
      <TalkBar
        key={kind}
        onSend={hear}
        onPlus={() => router.push('/neu')}
        suggestions={turn ? [] : HINTS[kind]}
        spoken={SPOKEN[kind]}
        placeholder={PLACEHOLDER[kind]}
      />
    </View>
    </>
  );
}
