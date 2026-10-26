/**
 * Heute (Pivot 26.10.): a shared calendar you talk to. Where a chat app shows
 * its history, this screen shows the calendar itself. Input sits at the
 * bottom with photo, text and mic. A sentence first shows what it understood
 * and what it already knew, then the Termin slides into its day above.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, H1, H2, Group, Row, Meta, Chip, TextLink } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Avatar, Pair, Owner } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import TalkBar from '../../src/components/TalkBar';
import { setVeil } from '../../src/components/Veil';
import { tokens, persons } from '../../src/theme';
import { useStore, actions, get } from '../../src/state/store';
import { upcomingFristen } from '../../src/lib/selectors';
import { understand, dayLabel, slotLine, Reply } from '../../src/lib/talk';
import { TODAY, long, hm, until, dayNum, short, addDays, MONTHS_SHORT, monthIdx } from '../../src/lib/dates';
import { useKeyboardInset } from '../../src/lib/keyboard';
import { newId } from '../../src/data/sample';
import { haptics } from '../../src/lib/haptics';
import type { CalEvent, Who } from '../../src/state/types';

const STEP_MS = 900;
const TIMES = ['09:00', '10:30', '14:00', '16:00'];
const dockShadow = Platform.select({
  web: { boxShadow: `0 0 0 1px ${tokens.hair}, 0 12px 32px rgba(22,35,42,.12)` } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8, borderWidth: 1, borderColor: tokens.hair },
});

/** A soft green wash over a row that just landed, fading out. */
const Fresh = React.forwardRef<View, { children: React.ReactNode; on: boolean }>(function Fresh({ children, on }, ref) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => { if (on) { o.value = 1; o.value = withDelay(1600, withTiming(0, { duration: 900 })); } }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: o.value * 0.55 }));
  return (
    <View ref={ref} collapsable={false}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: tokens.doneSoft }, st]} />
    </View>
  );
});

function AddedActions({ e, needsTime, onUndo }: { e: CalEvent; needsTime?: boolean; onUndo: () => void }) {
  const live = useStore((s) => s.events.find((x) => x.id === e.id));
  if (!live) return null;
  const pick = (w: Who) => { haptics.select(); actions.setEventWho(e.id, w); };
  const at = (t: string) => {
    haptics.select();
    const [h, m] = t.split(':').map(Number);
    const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    actions.updateEvent(e.id, { start: t, end, allDay: false });
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

function Answer({ r }: { r: Extract<Reply, { kind: 'answer' | 'ask' }> }) {
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

type Turn = { id: number; said: string; reply: Reply };

export default function Heute() {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardInset();
  const events = useStore((s) => s.events);
  const docs = useStore((s) => s.docs);
  const { width: W, height: H } = useWindowDimensions();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);
  const [dockH, setDockH] = useState(80);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const freshRef = useRef<View>(null);
  useEffect(() => () => { timers.current.forEach(clearTimeout); setVeil({ phase: 'off' }); }, []);
  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));

  const pending = turn?.reply.kind === 'ask' ? { title: turn.reply.title, who: turn.reply.who } : null;

  // The next seven days, plus the day of anything that just landed further out.
  const days = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i));
    const f = fresh ? events.find((e) => e.id === fresh) : undefined;
    if (f && !dates.includes(f.date)) dates.push(f.date);
    return dates
      .map((date) => ({ date, events: events.filter((e) => e.date === date && !e.work).sort((a, b) => (a.allDay ? -1 : b.allDay ? 1 : a.start.localeCompare(b.start))) }))
      .filter((d, i) => i === 0 || d.events.length);
  }, [events, fresh]);
  const fristen = useMemo(() => upcomingFristen(docs, 60), [docs]);

  const navTop = Math.max(insets.bottom, 12) + 10 + 58 + 10;
  const bottom = kb > 0 ? kb + 8 : navTop;
  // The orb starts where the mic button is.
  const origin = { x: W - 14 - 6 - 24, y: H - bottom - 6 - 24 };

  /** Brings the new row into the free part of the screen, then says where it is. */
  const locate = (done: (p: { x: number; y: number } | null) => void, tries = 0) => {
    const node = freshRef.current as any;
    if (!node?.measureInWindow) { if (tries < 5) later(80, () => locate(done, tries + 1)); else done(null); return; }
    node.measureInWindow((x: number, y: number, w: number, h: number) => {
      const top = insets.top + 90;
      const floor = H - bottom - 90;
      // The answer card will sit at the bottom, so the row goes to the upper third.
      if (tries === 0 && (y < top || y + h > Math.min(floor, H * 0.45))) {
        scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + y - H * 0.32), animated: true });
        later(420, () => locate(done, 1));
        return;
      }
      done({ x: x + 14 + 44 + 12 + 23, y: y + h / 2 });
    });
  };

  const hear = (said: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const reply = understand(said, get().events, pending, () => newId('e'));
    setFresh(null);
    setLanded(false);
    if (reply.kind !== 'added') {
      // A question: a short look into the calendar, then the answer.
      setTurn(null);
      setVeil({ phase: 'think', origin, target: null, lines: ['Schaue in euren Kalender'], shown: 1 });
      later(1300, () => setVeil({ phase: 'land', target: { x: W / 2, y: H - bottom - 120 }, onLanded: () => setTurn({ id: Date.now(), said, reply }) }));
      return;
    }
    // Think out loud, let the Termin land behind the veil, then fly it in.
    setTurn(null);
    setVeil({ phase: 'think', origin, target: null, lines: reply.steps, shown: 0 });
    reply.steps.forEach((_, i) => later(450 + STEP_MS * i, () => { setVeil({ shown: i + 1 }); haptics.select(); }));
    later(450 + STEP_MS * reply.steps.length + 200, () => {
      actions.addEvent(reply.event);
      setFresh(reply.event.id);
      later(120, () => locate((target) => setVeil({
        phase: 'land',
        target,
        onLanded: () => { setLanded(true); haptics.success(); setTurn({ id: Date.now(), said, reply }); },
      })));
    });
  };
  const undo = () => {
    if (turn?.reply.kind === 'added') actions.removeEvent(turn.reply.event.id);
    setTurn(null);
    setFresh(null);
  };
  const close = () => { setTurn(null); setFresh(null); };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Screen tab gap={14} padBottom={Math.max(dockH, 360)} scrollRef={scroll} onScrollY={(y) => { scrollY.current = y; }}>
        <H1 sub={long(TODAY)} right={<PressScale accessibilityLabel="Familie und Einstellungen" onPress={() => router.push('/einstellungen')}><Pair /></PressScale>}>Heute</H1>

        {days.map(({ date, events: list }) => (
          <View key={date} style={{ gap: 8 }}>
            <H2 right={date === TODAY ? undefined : until(date)}>{dayLabel(date)}</H2>
            {list.length ? (
              <Group>
                {list.map((e) => (
                  <Fresh key={e.id} ref={e.id === fresh ? freshRef : undefined} on={e.id === fresh && landed}>
                    <Row icon={e.icon} title={e.title} sub={e.place && e.id === fresh ? e.place : e.sub} time={e.allDay ? '' : hm(e.start)} onPress={() => router.push(`/termin/${e.id}`)} right={<Owner who={e.who} />} />
                  </Fresh>
                ))}
              </Group>
            ) : (
              <Meta>Heute steht nichts an. Sag unten einfach, was ansteht.</Meta>
            )}
          </View>
        ))}

        {fristen.length ? (
          <>
            <H2>Bald fällig</H2>
            <Group>
              {fristen.map((d) => (
                <Row
                  key={d.id}
                  icon={d.icon}
                  title={d.title}
                  sub={`Frist ${dayNum(d.frist!)}. ${MONTHS_SHORT[monthIdx(d.frist!)]} · ${until(d.frist!)}`}
                  subColor={tokens.frist}
                  right={<Owner who={d.who ?? null} />}
                  onPress={d.route ? () => router.push(d.route as any) : undefined}
                />
              ))}
            </Group>
          </>
        ) : null}

        <TextLink label={`Ganzer Kalender ab ${short(TODAY)}`} onPress={() => router.push('/kalender')} />
      </Screen>

      <View pointerEvents="box-none" onLayout={(e) => setDockH(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 14, right: 14, bottom, gap: 10 }}>
        {turn ? (
          <Animated.View key={turn.id} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={[{ maxHeight: 340, borderRadius: 26, backgroundColor: tokens.row }, dockShadow]}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Txt size={14} line={20} color={tokens.sub} style={{ flex: 1 }}>{`„${turn.said}“`}</Txt>
                <PressScale accessibilityLabel="Schließen" hitSlop={10} onPress={close}>
                  <LineIcon name="x" size={18} color={tokens.mute} />
                </PressScale>
              </View>
              {turn.reply.kind === 'added' ? (
                <AddedActions e={turn.reply.event} needsTime={turn.reply.needsTime} onUndo={undo} />
              ) : (
                <Answer r={turn.reply} />
              )}
            </ScrollView>
          </Animated.View>
        ) : null}
        <TalkBar onSend={hear} onPhoto={() => router.push('/foto-kamera')} suggestions={turn ? [] : undefined} />
      </View>
    </View>
  );
}
