/**
 * Kalender · Monat: day cells tinted by their first event, list for the selected
 * day. The grid fills the screen height (Julian 27.10.), the icon sits in the
 * middle of its cell and further Termine show as a small count under it.
 * Today is green like in the day strip, the chosen day has the outline.
 */
import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { H2, Group, Row, RoundButton } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { ClayIcon } from '../../components/ui/Clay';
import { Owner } from '../../components/ui/Person';
import { tokens, tint } from '../../theme';
import { evTint } from '../../lib/evColor';
import { useStore, actions } from '../../state/store';
import { eventsOn } from '../../lib/selectors';
import { addDays, monday, dayNum, monthIdx, year, parse, iso, WD_SHORT, weekday, MONTHS_SHORT, hm, TODAY, MONTHS, short } from '../../lib/dates';
import PressScale from '../../components/ui/PressScale';
import { tx } from '../../i18n/lang';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, FadeIn } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '../../lib/haptics';
import { springs } from '../../theme';
import type { CalEvent } from '../../state/types';
import { useCalEvents } from '../../lib/useEvents';
import Stripes from '../../components/Stripes';

const HEAD = tx('Mo Di Mi Do Fr Sa So', 'Mo Tu We Th Fr Sa Su').split(' ');

export function monthTitle(day: string) {
  return { month: MONTHS[monthIdx(day)], year: year(day) };
}

export function shiftMonth(day: string, n: number): string {
  const d = parse(day);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

export default function MonthView() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const m = monthIdx(day);
  const first = iso(new Date(Date.UTC(year(day), m, 1)));
  const start = monday(first);
  const cells = useMemo(() => {
    const out: string[] = [];
    let d = start;
    while (out.length < 42) { out.push(d); d = addDays(d, 1); }
    // Drop the last row if it's entirely next month.
    while (out.length > 28 && monthIdx(out[out.length - 7]) !== m) out.splice(out.length - 7, 7);
    return out;
  }, [start, m]);
  const list = useMemo(() => eventsOn(events, day, true), [events, day]);
  // Title, switch and weekday row take about 290, the talk field and tabs about 200.
  const { height: H } = useWindowDimensions();
  const rows = cells.length / 7;
  const cellH = Math.round(Math.max(60, Math.min(104, (H - 490) / rows)));
  const icon = Math.round(Math.min(40, cellH * 0.4));

  // Swipe left or right for the next or previous month (Julian 30.10.), like in the week.
  const W = useSharedValue(360);
  const x = useSharedValue(0);
  const op = useSharedValue(1);
  const go = (dir: number) => { haptics.select(); actions.setCalDay(shiftMonth(day, dir)); };
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => { x.value = e.translationX; op.value = 1 - Math.min(0.5, Math.abs(e.translationX) / W.value); })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > W.value * 0.22 || Math.abs(e.velocityX) > 700) {
        const dir = e.translationX < 0 ? 1 : -1;
        x.value = withTiming(-dir * W.value * 0.6, { duration: 140 }, (f) => {
          if (!f) return;
          scheduleOnRN(go, dir);
          x.value = dir * W.value * 0.4;
          op.value = 0.3;
          x.value = withSpring(0, springs.smooth);
          op.value = withTiming(1, { duration: 220 });
        });
      } else {
        x.value = withSpring(0, springs.snapBack);
        op.value = withTiming(1, { duration: 160 });
      }
    });
  const slide = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: x.value }] }));

  return (
    <>
      <GestureDetector gesture={pan} touchAction="pan-y">
      <Animated.View onLayout={(e) => { W.value = e.nativeEvent.layout.width; }} style={[{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 5 }, slide]}>
        {HEAD.map((h) => (
          <View key={h} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 2 }}>
            <Txt size={12} weight={600} color={tokens.sub}>{h}</Txt>
          </View>
        ))}
        {cells.map((d, ci) => {
          const inMonth = monthIdx(d) === m;
          // Multi-day ones (Urlaub bis Sonntag) show on every day they cover.
          const evs = inMonth ? events.filter((e) => !e.work && (e.date === d || (!!e.endDate && e.date < d && d <= e.endDate))) : [];
          // Julian 30.10.: work must show in the month too, as the person's stripe along the cell's foot.
          const shifts = inMonth ? [...new Set(events.filter((e) => e.work && e.date === d).map((e): 'J' | 'T' => (e.who === 'J' ? 'J' : 'T')))] : [];
          const sel = d === day;
          const isToday = d === TODAY;
          return (
            <View key={d} style={{ width: `${100 / 7}%`, paddingHorizontal: 2 }}>
              <PressScale
                onPress={() => inMonth && actions.setCalDay(d)}
                style={{
                  height: cellH, borderRadius: 14, alignItems: 'center', paddingTop: 6,
                  backgroundColor: isToday ? tokens.doneSoft : evs.length ? evTint(evs[0]) : inMonth ? tokens.row : 'transparent',
                  borderWidth: 1.5, borderColor: sel ? tokens.ink : 'transparent',
                }}
              >
                <Txt size={14} line={18} weight={isToday ? 700 : 500} color={isToday ? tokens.done : inMonth ? tokens.ink : tokens.circleLine}>{String(dayNum(d))}</Txt>
                <DayIcons evs={evs} size={evs.length > 1 ? Math.round(icon * 0.85) : icon} delay={Math.min(ci * 14, 420)} />
                {shifts.length ? (
                  <View style={{ position: 'absolute', left: 4, right: 4, bottom: 4, gap: 2 }}>
                    {shifts.map((p) => <Stripes key={p} p={p} radius={3} style={{ height: 5 }} />)}
                  </View>
                ) : null}
              </PressScale>
            </View>
          );
        })}
      </Animated.View>
      </GestureDetector>
      <H2 right={`${list.length} ${list.length === 1 ? tx('Termin', 'event') : tx('Termine', 'events')}`}>{short(day)}</H2>
      {list.length ? (
        <Group>
          {list.map((e) => (
            <Row key={e.id} icon={e.icon} title={e.title} sub={e.sub} time={hm(e.start)} right={<Owner who={e.who} />} onPress={() => router.push(`/termin/${e.id}`)} />
          ))}
        </Group>
      ) : (
        <Txt size={14} color={tokens.sub}>{tx('Nichts eingetragen.', 'Nothing planned.')}</Txt>
      )}
    </>
  );
}

export function MonthArrows() {
  const day = useStore((s) => s.calDay);
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <RoundButton icon="back" label={tx('Voriger Monat', 'Previous month')} size={34} onPress={() => actions.setCalDay(shiftMonth(day, -1))} />
      <View style={{ transform: [{ scaleX: -1 }] }}>
        <RoundButton icon="back" label={tx('Nächster Monat', 'Next month')} size={34} onPress={() => actions.setCalDay(shiftMonth(day, 1))} />
      </View>
    </View>
  );
}

/**
 * One clean icon per cell (Julian 30.10.: several small icons looked messy):
 * the first Termin as clay object, every further one as a small dot below,
 * like in the Apple calendar. The icon pops in when the month appears, so the
 * grid feels alive instead of rigid.
 */
function DayIcons({ evs, size, delay }: { evs: CalEvent[]; size: number; delay: number }) {
  if (!evs.length) return <View style={{ flex: 1 }} />;
  const more = Math.min(3, evs.length - 1);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingBottom: 4 }}>
      <Animated.View entering={FadeIn.duration(140).delay(Math.min(delay, 80))}>
        <ClayIcon name={evs[0].icon} size={size} />
      </Animated.View>
      {more ? (
        <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
          {Array.from({ length: more }, (_, i) => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.sub, opacity: 0.55 }} />)}
          {evs.length > 4 ? <Txt size={9} line={9} weight={700} color={tokens.sub}>+</Txt> : null}
        </View>
      ) : null}
    </View>
  );
}
