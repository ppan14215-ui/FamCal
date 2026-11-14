/**
 * Kalender · Woche and Tage: one hour grid, 8 to 19 (wider for earlier or later Termine), flat on the ground
 * with hairlines. Work shows as stripes, Termine as tinted blocks with the person's bar.
 * Woche shows seven days; Tage is the same grid one zoom step closer: three days from the chosen one, taller
 * hours, whole titles and times (Julian 14.11.: zooming moves between the views, the pinch lives on the screen).
 * Swipe sideways for the days before or after. Hold a Termin and drag it to another time or day, like in the
 * Apple calendar (Julian 30.10.).
 */
import Origin from '../../components/ui/Origin';
import React, { useMemo, useState } from 'react';
import { View, Pressable, LayoutChangeEvent, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '../../lib/haptics';
import { springs } from '../../theme';
import { evTint, evShared, sharedBorder, evInk } from '../../lib/evColor';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import { ClayIcon } from '../../components/ui/Clay';
import Stripes from '../../components/Stripes';
import { tokens, tint, PersonId, persons } from '../../theme';
import { useStore, actions, toast } from '../../state/store';
import { keepPhoneEdit } from '../../lib/phoneSync';
import type { CalEvent } from '../../state/types';
import { addDays, monday, dayNum, WD_SHORT, weekday, minutes, TODAY, hm, short } from '../../lib/dates';
import { useNowMin } from '../../lib/useNow';
import PressScale from '../../components/ui/PressScale';
import { tx } from '../../i18n/lang';
import { useCalEvents } from '../../lib/useEvents';
import { isInfoDay } from '../../lib/feiertage';
import { lanes } from '../../lib/lanes';

// The usual day; it grows to the earliest and latest Termin of the shown days
// (Julian 30.10.: "Wieso geht der Tag nur bis 18 Uhr?").
const DAY_FROM = 8;
const DAY_TO = 19;
/** Height of an hour: a week fits the screen, three days get room for titles and times. */
const HOUR = { 7: 40, 3: 60 } as const;
/** The rail with the hours on the left. */
const RAIL = 22;

const SHORT: Record<string, string> = { 'U6 bei Dr. Weber': 'U6', 'Bürgeramt: Pass': 'Pass', 'Oma Renate kommt': 'Oma', 'Rückbildung': 'Kurs', 'Hebamme Sarah': 'Hebi', 'Wochenmarkt': 'Markt', 'Zoo mit Lena': 'Zoo' };

export default function WeekView({ n }: { n: 3 | 7 }) {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const HP = HOUR[n];
  const nowMin = useNowMin();
  const start = n === 7 ? monday(day) : day;
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
  // Times outside the grid sit at its edge instead of disappearing.
  const top = (t: string) => ((Math.max(FROM * 60, Math.min(TO * 60 - 30, minutes(t))) - FROM * 60) / 60) * HP;

  // Julian 05.11.: tapping an empty spot adds a Termin there, on the half hour under the finger.
  const slotAt = (d: string, y: number) => {
    if (!Number.isFinite(y)) y = 0;
    const m = Math.max(FROM * 60, Math.min(TO * 60 - 30, FROM * 60 + Math.floor((y / HP) * 2) * 30));
    const start = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    haptics.select();
    router.push({ pathname: '/termin-neu', params: { date: d, start } });
  };
  const hasWork = useMemo(() => events.some((e) => e.work && e.date >= start && e.date <= end), [events, start, end]);
  const nowTop = ((Math.max(FROM * 60, Math.min(TO * 60, nowMin)) - FROM * 60) / 60) * HP;
  return (
    <>
      <GestureDetector gesture={pan} touchAction="pan-y">
      <View onLayout={(e: LayoutChangeEvent) => { w.value = e.nativeEvent.layout.width; }} style={{ overflow: 'hidden' }}>
      <Animated.View style={[{ gap: 10 }, slide]}>
        <View style={{ flexDirection: 'row', paddingLeft: RAIL, gap: 3 }}>
          {days.map((d) => {
            // Today is orange (Julian 14.11.: the one interaction colour); a tap on a day opens the three days from it.
            const c = d === TODAY ? tokens.accent : tokens.ink;
            return (
              <PressScale key={d} onPress={() => { haptics.select(); actions.setCalDay(d); actions.setCalView('tag'); }} accessibilityLabel={short(d)} style={wide ? { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 5, paddingLeft: 4 } : { flex: 1, alignItems: 'center' }}>
                <Txt size={11.5} line={15} weight={d === TODAY ? 600 : 400} color={d === TODAY ? tokens.accent : tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
                <Txt size={wide ? 19 : 16} line={wide ? 24 : 21} weight={700} tracking={-0.3} color={c}>{String(dayNum(d))}</Txt>
              </PressScale>
            );
          })}
        </View>
        {laneRows ? (
          <View style={{ marginLeft: RAIL, height: laneRows * 24 - 2 }}>
            {spans.map(({ e, from, to, row, cutL, cutR }) => (
              <PressScale
                key={e.id}
                onPress={isInfoDay(e) ? undefined : () => router.push(`/termin/${e.id}`)}
                style={{
                  position: 'absolute', top: row * 24, height: 22, left: `${(from / n) * 100}%`, width: `${((to - from + 1) / n) * 100}%`,
                  paddingHorizontal: 2,
                }}
              >
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 6, backgroundColor: isInfoDay(e) ? 'transparent' : evTint(e), ...(!isInfoDay(e) && evShared(e) ? sharedBorder() : null), borderTopLeftRadius: cutL ? 0 : 7, borderBottomLeftRadius: cutL ? 0 : 7, borderTopRightRadius: cutR ? 0 : 7, borderBottomRightRadius: cutR ? 0 : 7 }}>
                  <Txt size={11} line={14} weight={isInfoDay(e) ? 500 : 700} color={isInfoDay(e) ? tokens.mute : undefined} numberOfLines={1}>{e.title}</Txt>
                </View>
              </PressScale>
            ))}
          </View>
        ) : null}
        <View style={{ paddingLeft: RAIL, height: hours.length * HP }}>
          {hours.map((h, i) => (
            <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: i * HP }}>
              <View style={{ position: 'absolute', left: RAIL, right: 0, height: 1, backgroundColor: tokens.hair }} />
              <Txt size={10.5} line={14} color={tokens.mute} style={{ position: 'absolute', left: 0, top: -7 }}>{String(h)}</Txt>
            </View>
          ))}
          <View onLayout={(e: LayoutChangeEvent) => setColsW(e.nativeEvent.layout.width)} style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
            {days.map((d) => {
              const list = events.filter((e) => e.date === d && !isSpan(e));
              // Two people at the same time (Julian 08.11.): side by side, each in their own colour, never one over the other.
              const colW = Math.max(20, (colsW - 3 * (n - 1)) / n);
              const workSpan = (e: CalEvent): [number, number] => {
                const [from, to] = e.allDay || !e.end || e.end <= e.start ? ['08:00', '17:00'] : [e.start, e.end];
                return [top(from), top(from) + Math.max(HP * 0.6, top(to) - top(from))];
              };
              const evH = (e: CalEvent) => Math.max(28, (e.end && top(e.end) > top(e.start) ? top(e.end) - top(e.start) : HP * 0.8) - 4);
              const workLane = lanes(list.filter((e) => e.work), workSpan, () => 0, (e) => e.who ?? '');
              const evLane = lanes(list.filter((e) => !e.work), (e) => [top(e.start) + 2, top(e.start) + 2 + evH(e)], (e) => (e.who === 'J' ? 0 : e.who === 'T' ? 1 : 2));
              const place = (l: { lane: number; lanes: number } | undefined, pad: number) => {
                const k = l?.lanes ?? 1, i = l?.lane ?? 0;
                const inner = colW - 2 * pad, gap = k > 1 ? 2 : 0, w = (inner - gap * (k - 1)) / k;
                return { left: pad + i * (w + gap), width: w };
              };
              return (
                <View key={d} style={{ flex: 1, position: 'relative', zIndex: liftCol === days.indexOf(d) ? 5 : 0 }}>
                  {/* A hairline between the days, like the lines between the hours. */}
                  <View pointerEvents="none" style={{ position: 'absolute', left: -2, top: 0, bottom: 0, width: 1, backgroundColor: tokens.hair }} />
                  <Pressable accessibilityLabel={tx('Termin hier eintragen', 'Add an event here')} onPress={(ev: any) => slotAt(d, ev.nativeEvent.locationY ?? ev.nativeEvent.offsetY)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
                  {list.filter((e) => e.work).map((e) => {
                    // Work without hours ("Arbeit bis Weihnachten") fills a usual working day, so it never vanishes (Julian 30.10.).
                    const [y0, y1] = workSpan(e);
                    return (
                      // Work blocks open like any Termin (Julian 29.10.: they could not be seen or deleted).
                      <PressScale key={e.id} scale={0.99} onPress={(ev: any) => { const y = ev?.nativeEvent?.locationY ?? ev?.nativeEvent?.offsetY ?? 0; if (y < 20) router.push(`/termin/${e.id}`); else slotAt(d, y0 + y); }} accessibilityLabel={`${e.title}, ${tx('ansehen oder Termin darin eintragen', 'view or add an event inside')}`} style={{ position: 'absolute', ...place(workLane.get(e), 1), top: y0, height: y1 - y0 }}>
                        <Stripes p={(e.who === 'J' ? 'J' : 'T') as PersonId} radius={8} style={{ flex: 1, opacity: 0.9, padding: 3 }}>
                          {wide || e.title !== tx('Arbeit', 'Work') ? <Txt size={10} line={12} weight={700} numberOfLines={1} ellipsizeMode="clip" color={persons[e.who === 'J' ? 'J' : 'T'].ink}>{wide ? e.title : SHORT[e.title] ?? e.title.split(' ')[0]}</Txt> : null}
                        </Stripes>
                      </PressScale>
                    );
                  })}
                  {list.filter((e) => !e.work).map((e) => {
                    const h = evH(e);
                    const l = evLane.get(e);
                    const slim = !!l && l.lanes > 1;
                    return (
                      <Drag key={e.id} e={e} days={days} col={days.indexOf(d)} step={(colsW + 3) / n} HP={HP} dragging={dragging} onLift={setLiftCol} style={{ ...place(l, 2), top: top(e.start) + 2, height: h, backgroundColor: evTint(e), ...(slim ? { paddingHorizontal: 2 } : null), ...(evShared(e) ? sharedBorder() : { borderLeftWidth: 3, borderLeftColor: evInk(e) }) }}>
                        {/* Narrow columns clip one line like Apple and Google; a word is never broken into single letters (Julian 30.10.). */}
                        {wide ? (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                            {!slim && h >= 24 ? <ClayIcon name={e.icon} size={16} /> : null}
                            <Txt size={12.5} line={16} weight={600} numberOfLines={slim ? 1 : Math.max(1, Math.floor(h / 17) - 1)} ellipsizeMode="tail" textBreakStrategy="simple" android_hyphenationFrequency="none" style={{ flex: 1 }}>{e.title}</Txt>
                          </View>
                        ) : (
                          <>
                            {/* A week's columns are narrow: the icon says what it is, one short word under it when there is room. */}
                            {!slim && h >= 36 ? <ClayIcon name={e.icon} size={15} /> : null}
                            <Txt size={10.5} line={13} weight={700} numberOfLines={1} ellipsizeMode="clip" textBreakStrategy="simple" android_hyphenationFrequency="none">{SHORT[e.title] ?? e.title.split(' ')[0]}</Txt>
                          </>
                        )}
                        {!slim || wide ? <View pointerEvents="none" style={{ position: 'absolute', top: 2, right: 2 }}><Origin e={e} size={wide ? 12 : 10} /></View> : null}
                        {big && h >= 44 && !e.allDay ? <Txt size={wide ? 12 : 10} line={wide ? 15 : 12} color={tokens.sub} numberOfLines={1}>{wide && e.end ? `${hm(e.start)} ${tx('bis', 'to')} ${hm(e.end)}` : hm(e.start)}</Txt> : null}
                      </Drag>
                    );
                  })}
                </View>
              );
            })}
          </View>
          {/* Now: one orange line across the days with its dot on the rail (Julian 14.11.). */}
          {days.includes(TODAY) && nowMin >= FROM * 60 && nowMin <= TO * 60 ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: RAIL - 4, right: 0, top: nowTop }}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: -0.75, height: 1.5, borderRadius: 1, backgroundColor: tokens.accent }} />
              <View style={{ position: 'absolute', left: -3, top: -3.5, width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.accent }} />
            </View>
          ) : null}
        </View>
      </Animated.View>
      </View>
      </GestureDetector>
      {hasWork ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {(['T', 'J'] as PersonId[]).map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Stripes p={p} radius={4} style={{ width: 18, height: 12 }} />
              <Txt size={13} color={tokens.sub}>{tx(`${persons[p].name} arbeitet`, `${persons[p].name} at work`)}</Txt>
            </View>
          ))}
        </View>
      ) : null}
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
  dragging: { value: number }; onLift: (col: number) => void; style: ViewStyle & { top: number; height: number }; children: React.ReactNode;
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
        style={[{ position: 'absolute', borderRadius: 7, paddingVertical: 3, paddingHorizontal: 4, overflow: 'visible', shadowColor: '#000', shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, style, anim]}
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
