/**
 * Kalender · Woche: hour grid 8 to 19 (wider for earlier or later Termine),
 * work as stripes, events as tinted blocks.
 * Swipe sideways for the week before or after; pinch, or plus and minus, to
 * zoom the hours (Julian 27.10.). Zoomed in, blocks show their time; all the
 * way in, three days fill the width with whole titles. Hold a Termin and drag
 * it to another time or day, like in the Apple calendar (Julian 30.10.).
 */
import React, { useMemo, useState, useRef } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import LineIcon from '../../components/ui/LineIcon';
import { haptics } from '../../lib/haptics';
import { springs } from '../../theme';
import { evTint } from '../../lib/evColor';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import Stripes from '../../components/Stripes';
import { tokens, tint, PersonId, persons } from '../../theme';
import { useStore, actions, toast } from '../../state/store';
import { keepPhoneEdit } from '../../lib/phoneSync';
import type { CalEvent } from '../../state/types';
import { addDays, monday, dayNum, WD_SHORT, weekday, minutes, TODAY, NOW, MONTHS_SHORT, monthIdx, hm, dmShort, short } from '../../lib/dates';
import PressScale from '../../components/ui/PressScale';
import { tx } from '../../i18n/lang';
import { useCalEvents } from '../../lib/useEvents';
import { isInfoDay } from '../../lib/feiertage';

// The usual day; it grows to the earliest and latest Termin of the shown days
// (Julian 30.10.: "Wieso geht der Tag nur bis 18 Uhr?").
const DAY_FROM = 8;
const DAY_TO = 19;
const HP_MIN = 30;
const HP_MAX = 96;
const ZOOMS = [30, 40, 60, 96];

const SHORT: Record<string, string> = { 'U6 bei Dr. Weber': 'U6', 'Bürgeramt: Pass': 'Pass', 'Oma Renate kommt': 'Oma', 'Rückbildung': 'Kurs', 'Hebamme Sarah': 'Hebi', 'Wochenmarkt': 'Markt', 'Zoo mit Lena': 'Zoo' };

export default function WeekView() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const [HP, setHP] = useState(40);
  // Zoomed all the way in, three days fill the width so whole titles fit.
  const n = HP >= 80 ? 3 : 7;
  const start = n === 7 ? monday(day) : addDays(day, -1);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => addDays(start, i)), [start, n]);
  const [FROM, TO] = useMemo(() => {
    let a = DAY_FROM, b = DAY_TO;
    for (const e of events) {
      if (e.allDay || e.date < days[0] || e.date > days[days.length - 1] || (!!e.endDate && e.endDate > e.date)) continue;
      a = Math.min(a, Math.floor(minutes(e.start) / 60));
      const last = e.end && e.end > e.start ? minutes(e.end) : minutes(e.start) + 60;
      b = Math.max(b, Math.min(24, Math.ceil(last / 60)));
    }
    return [a, b];
  }, [events, days]);
  const hours = Array.from({ length: TO - FROM }, (_, i) => FROM + i);
  const big = HP >= 60;
  const wide = n === 3;

  // Zoom: pinch with two fingers, or the plus and minus buttons.
  const base = useRef(HP);
  const zoomTo = (v: number) => setHP(Math.round(Math.max(HP_MIN, Math.min(HP_MAX, v))));
  const pinchStart = () => { base.current = HP; };
  const pinchMove = (scale: number) => zoomTo(base.current * scale);
  const step = (dir: 1 | -1) => {
    haptics.select();
    const next = dir > 0 ? ZOOMS.find((z) => z > HP) : [...ZOOMS].reverse().find((z) => z < HP);
    if (next) setHP(next);
  };

  // Swipe: the grid follows the finger, then the next week slides in from the side.
  const w = useSharedValue(360);
  const x = useSharedValue(0);
  const op = useSharedValue(1);
  // While a Termin is being dragged the week stays where it is.
  const dragging = useSharedValue(0);
  const [colsW, setColsW] = useState(300);
  // The column of a lifted Termin sits above its neighbours, so it stays visible over them.
  const [liftCol, setLiftCol] = useState(-1);
  const go = (dir: number) => {
    haptics.select();
    actions.setCalDay(addDays(day, dir * n));
  };
  // Out to one side, swap the week, in from the other.
  const slideTo = (dir: number, ms: number) => {
    'worklet';
    x.value = withTiming(-dir * w.value * 0.6, { duration: ms }, (f) => {
      if (!f) return;
      scheduleOnRN(go, dir);
      x.value = dir * w.value * 0.4;
      op.value = 0.3;
      x.value = withSpring(0, springs.smooth);
      op.value = withTiming(1, { duration: 220 });
    });
  };
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => { if (dragging.value) return; x.value = e.translationX; op.value = 1 - Math.min(0.5, Math.abs(e.translationX) / w.value); })
    .onEnd((e) => {
      if (dragging.value) { x.value = 0; op.value = 1; return; }
      const far = Math.abs(e.translationX) > w.value * 0.22 || Math.abs(e.velocityX) > 700;
      if (far) {
        slideTo(e.translationX < 0 ? 1 : -1, 140);
      } else {
        x.value = withSpring(0, springs.snapBack);
        op.value = withTiming(1, { duration: 160 });
      }
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { scheduleOnRN(pinchStart); })
    .onUpdate((e) => { scheduleOnRN(pinchMove, e.scale); });
  const gestures = Gesture.Simultaneous(pan, pinch);
  const slide = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: x.value }] }));
  const end = addDays(start, n - 1);
  // All-day and multi-day Termine run as one bar across their days, like
  // Outlook (Julian 28.10.), clipped to the shown days and stacked in rows.
  const isSpan = (e: (typeof events)[number]) => !e.work && (e.allDay || (!!e.endDate && e.endDate > e.date));
  const spans = useMemo(() => {
    const rows: string[][] = [];
    return events
      .filter((e) => isSpan(e) && e.date <= end && (e.endDate ?? e.date) >= start)
      .sort((a, b) => a.date.localeCompare(b.date) || (b.endDate ?? b.date).localeCompare(a.endDate ?? a.date))
      .map((e) => {
        const from = days.indexOf(e.date < start ? start : e.date);
        const to = days.indexOf((e.endDate ?? e.date) > end ? end : (e.endDate ?? e.date));
        let row = rows.findIndex((r) => !r.slice(from, to + 1).some(Boolean));
        if (row < 0) { row = rows.length; rows.push(Array(n).fill('')); }
        for (let i = from; i <= to; i++) rows[row][i] = e.id;
        return { e, from, to, row, cutL: e.date < start, cutR: (e.endDate ?? e.date) > end };
      });
  }, [events, start, end, n]);
  const laneRows = spans.reduce((m, x) => Math.max(m, x.row + 1), 0);
  const label = `${dmShort(start)} ${tx('bis', 'to')} ${dmShort(end)}`;
  // Times outside the grid sit at its edge instead of disappearing.
  const top = (t: string) => ((Math.max(FROM * 60, Math.min(TO * 60 - 30, minutes(t))) - FROM * 60) / 60) * HP;

  const round = { width: 36, height: 36, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PressScale accessibilityLabel={tx('Vorige Woche', 'Previous week')} onPress={() => slideTo(-1, 160)} style={round}>
          <View style={{ transform: [{ rotate: '180deg' }] }}><LineIcon name="chev" size={16} color={tokens.ink} /></View>
        </PressScale>
        <Txt size={15} weight={600} style={{ flex: 1, textAlign: 'center' }}>{label}</Txt>
        <PressScale accessibilityLabel={tx('Nächste Woche', 'Next week')} onPress={() => slideTo(1, 160)} style={round}>
          <LineIcon name="chev" size={16} color={tokens.ink} />
        </PressScale>
      </View>
      <GestureDetector gesture={gestures} touchAction="pan-y">
      <View onLayout={(e: LayoutChangeEvent) => { w.value = e.nativeEvent.layout.width; }} style={{ borderRadius: 24, backgroundColor: tokens.row, overflow: 'hidden' }}>
      <Animated.View style={[{ paddingTop: 12, paddingHorizontal: 10, paddingBottom: 10, gap: 10 }, slide]}>
        <View style={{ flexDirection: 'row', paddingLeft: 22 }}>
          {days.map((d) => {
            const sel = d === day;
            return (
              <PressScale key={d} onPress={() => { actions.setCalDay(d); actions.setCalView('tag'); }} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Txt size={11.5} color={tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
                {/* Only today is the dark bubble (Julian 28.10.); a picked other day gets a ring. */}
                <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: d === TODAY ? tokens.ink : 'transparent', borderWidth: sel && d !== TODAY ? 1.5 : 0, borderColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={15} weight={600} color={d === TODAY ? tokens.onInk : tokens.ink}>{String(dayNum(d))}</Txt>
                </View>
              </PressScale>
            );
          })}
        </View>
        {laneRows ? (
          <View style={{ marginLeft: 22, height: laneRows * 24 - 2 }}>
            {spans.map(({ e, from, to, row, cutL, cutR }) => (
              <PressScale
                key={e.id}
                onPress={isInfoDay(e) ? undefined : () => router.push(`/termin/${e.id}`)}
                style={{
                  position: 'absolute', top: row * 24, height: 22, left: `${(from / n) * 100}%`, width: `${((to - from + 1) / n) * 100}%`,
                  paddingHorizontal: 2,
                }}
              >
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 6, backgroundColor: isInfoDay(e) ? 'transparent' : evTint(e), borderTopLeftRadius: cutL ? 0 : 7, borderBottomLeftRadius: cutL ? 0 : 7, borderTopRightRadius: cutR ? 0 : 7, borderBottomRightRadius: cutR ? 0 : 7 }}>
                  <Txt size={11} line={14} weight={isInfoDay(e) ? 500 : 700} color={isInfoDay(e) ? tokens.mute : undefined} numberOfLines={1}>{e.title}</Txt>
                </View>
              </PressScale>
            ))}
          </View>
        ) : null}
        <View style={{ paddingLeft: 22, height: hours.length * HP }}>
          {hours.map((h, i) => (
            <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: i * HP }}>
              <View style={{ position: 'absolute', left: 22, right: 0, height: 1, backgroundColor: tokens.hair }} />
              <Txt size={10.5} line={14} color={tokens.mute} style={{ position: 'absolute', left: 0, top: -7 }}>{String(h)}</Txt>
            </View>
          ))}
          <View onLayout={(e: LayoutChangeEvent) => setColsW(e.nativeEvent.layout.width)} style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
            {days.map((d) => {
              const list = events.filter((e) => e.date === d && !isSpan(e));
              return (
                <View key={d} style={{ flex: 1, position: 'relative', zIndex: liftCol === days.indexOf(d) ? 5 : 0 }}>
                  {list.filter((e) => e.work).map((e) => {
                    // Work without hours ("Arbeit bis Weihnachten") fills a usual working day, so it never vanishes (Julian 30.10.).
                    const [from, to] = e.allDay || !e.end || e.end <= e.start ? ['08:00', '17:00'] : [e.start, e.end];
                    return (
                      // Work blocks open like any Termin (Julian 29.10.: they could not be seen or deleted).
                      <PressScale key={e.id} scale={0.98} onPress={() => router.push(`/termin/${e.id}`)} accessibilityLabel={`${e.title}, ${tx('ansehen', 'view')}`} style={{ position: 'absolute', left: 1, right: 1, top: top(from), height: Math.max(HP * 0.6, top(to) - top(from)) }}>
                        <Stripes p={(e.who === 'J' ? 'J' : 'T') as PersonId} radius={8} style={{ flex: 1, opacity: 0.9, padding: 3 }}>
                          {wide || e.title !== tx('Arbeit', 'Work') ? <Txt size={10} line={12} weight={700} numberOfLines={1} ellipsizeMode="clip" color={persons[e.who === 'J' ? 'J' : 'T'].ink}>{wide ? e.title : SHORT[e.title] ?? e.title.split(' ')[0]}</Txt> : null}
                        </Stripes>
                      </PressScale>
                    );
                  })}
                  {list.filter((e) => !e.work).map((e) => {
                    const h = Math.max(28, (e.end && top(e.end) > top(e.start) ? top(e.end) - top(e.start) : HP * 0.8) - 4);
                    return (
                      <Drag key={e.id} e={e} days={days} col={days.indexOf(d)} step={(colsW + 3) / n} HP={HP} dragging={dragging} onLift={setLiftCol} style={{ top: top(e.start) + 2, height: h, backgroundColor: evTint(e) }}>
                        {/* Narrow columns clip one line like Apple and Google; a word is never broken into single letters (Julian 30.10.). */}
                        <Txt size={wide ? 12.5 : 10.5} line={wide ? 16 : 13} weight={700} numberOfLines={wide ? Math.max(1, Math.floor(h / 17) - 1) : 1} ellipsizeMode="clip" textBreakStrategy="simple" android_hyphenationFrequency="none">{wide ? e.title : SHORT[e.title] ?? e.title.split(' ')[0]}</Txt>
                        {big && h >= 44 && !e.allDay ? <Txt size={wide ? 12 : 10} line={wide ? 15 : 12} color={tokens.sub} numberOfLines={1}>{wide && e.end ? `${hm(e.start)} ${tx('bis', 'to')} ${hm(e.end)}` : hm(e.start)}</Txt> : null}
                      </Drag>
                    );
                  })}
                  {d === TODAY ? <View style={{ position: 'absolute', left: -2, right: -2, top: top(NOW), height: 2, backgroundColor: tokens.done }} /> : null}
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
      </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {(['T', 'J'] as PersonId[]).map((p) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Stripes p={p} radius={4} style={{ width: 18, height: 12 }} />
            <Txt size={13} color={tokens.sub}>{tx(`${persons[p].name} arbeitet`, `${persons[p].name} at work`)}</Txt>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <PressScale accessibilityLabel={tx('Kleiner', 'Smaller')} onPress={() => step(-1)} style={[round, { opacity: HP <= HP_MIN ? 0.4 : 1 }]}>
          <View style={{ width: 12, height: 2, borderRadius: 2, backgroundColor: tokens.ink }} />
        </PressScale>
        <PressScale accessibilityLabel={tx('Größer', 'Larger')} onPress={() => step(1)} style={[round, { opacity: HP >= HP_MAX ? 0.4 : 1 }]}>
          <LineIcon name="plus" size={16} color={tokens.ink} stroke={2} />
        </PressScale>
      </View>
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/**
 * A Termin you can hold and drag (Julian 30.10.: "wie Apple"). Hold for a
 * moment, it lifts with a tick; up and down moves it in quarter hours, sideways
 * to another day, a small label shows the new time. Letting go saves it with
 * Rückgängig. A tap still opens it. Days of a series open instead, so a drag
 * never moves the whole series by accident.
 */
function Drag({ e, days, col, step, HP, dragging, onLift, style, children }: {
  e: CalEvent; days: string[]; col: number; step: number; HP: number;
  dragging: { value: number }; onLift: (col: number) => void; style: { top: number; height: number; backgroundColor: string }; children: React.ReactNode;
}) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const lift = useSharedValue(0);
  const [label, setLabel] = useState<string | null>(null);
  const series = e.id.includes('~') || !!e.repeat;
  const startM = minutes(e.start);
  const len = e.end ? Math.max(15, minutes(e.end) - startM) : 60;
  const where = (tx_: number, ty: number) => {
    const c = Math.max(0, Math.min(days.length - 1, col + Math.round(tx_ / step)));
    const m = Math.max(0, Math.min(24 * 60 - len, startM + Math.round((ty / HP) * 4) * 15));
    return { c, m };
  };
  const show = (tx_: number, ty: number) => {
    const { c, m } = where(tx_, ty);
    const next = `${c !== col ? `${WD_SHORT[weekday(days[c])]} ` : ''}${hhmm(m)}`;
    setLabel((l) => { if (l !== null && l !== next) haptics.select(); return next; });
  };
  const drop = (tx_: number, ty: number) => {
    setLabel(null);
    const { c, m } = where(tx_, ty);
    const date = days[c];
    if (date === e.date && m === startM) return;
    const shift = date === e.date ? 0 : Math.round((Date.parse(date) - Date.parse(e.date)) / 864e5);
    const b = actions.moveEvent(e.id, { date, start: hhmm(m), end: e.end ? hhmm(m + len) : undefined, endDate: e.endDate ? addDays(e.endDate, shift) : undefined });
    void keepPhoneEdit(e.id);
    haptics.commit();
    if (b) toast(`${e.title}: ${date === e.date ? '' : `${short(date)} `}${hm(hhmm(m))}`, () => actions.restoreEvent(b), { kind: 'done' });
  };
  const open = () => router.push(`/termin/${e.id}`);
  const start = () => { haptics.tap(); onLift(col); };
  const settle = () => onLift(-1);
  const pan = Gesture.Pan()
    .enabled(!series)
    .activateAfterLongPress(280)
    .onStart(() => { dragging.value = 1; lift.value = withSpring(1, springs.snapBack); scheduleOnRN(start); })
    .onUpdate((ev) => {
      dx.value = Math.round(ev.translationX / step) * step;
      dy.value = (Math.round((ev.translationY / HP) * 4) * HP) / 4;
      scheduleOnRN(show, ev.translationX, ev.translationY);
    })
    .onEnd((ev) => { scheduleOnRN(drop, ev.translationX, ev.translationY); })
    .onFinalize(() => {
      if (dragging.value) scheduleOnRN(settle);
      dragging.value = 0;
      lift.value = withSpring(0, springs.snapBack);
      dx.value = 0;
      dy.value = 0;
    });
  const tap = Gesture.Tap().maxDuration(260).onEnd((_ev, ok) => { if (ok) scheduleOnRN(open); });
  const anim = useAnimatedStyle(() => ({
    zIndex: lift.value > 0.01 ? 10 : 1,
    shadowOpacity: lift.value * 0.18,
    elevation: lift.value * 8,
    transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: 1 + lift.value * 0.04 }] as const,
  }));
  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={`${e.title}, ${hm(e.start)}`}
        accessibilityHint={series ? undefined : tx('Halten und ziehen zum Verschieben', 'Hold and drag to move')}
        style={[{ position: 'absolute', left: 3, right: 3, borderRadius: 8, borderWidth: 1.5, borderColor: tokens.onInk, paddingVertical: 3, paddingHorizontal: 4, overflow: 'visible', shadowColor: '#000', shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, style, anim]}
      >
        <View style={{ flex: 1, overflow: 'hidden' }}>{children}</View>
        {label ? (
          <View style={{ position: 'absolute', top: -22, left: -4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: tokens.ink }}>
            <Txt size={11} line={14} weight={700} color={tokens.onInk} numberOfLines={1}>{label}</Txt>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
