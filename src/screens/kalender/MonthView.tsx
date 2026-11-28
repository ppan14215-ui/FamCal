/**
 * Kalender · Monat: the month of Ton & Papier (Julian 17.11.: "wir übernehmen nur die Monatsansicht"). Every day is
 * a tall field with its number and one dot per Termin in the colour of who goes (Julian 04.11.: the simple month
 * with dots). Today is an ink field, the chosen day lies on a soft field. Feiertage stand in their own colour and
 * Urlaub lies as a soft band at the foot of its days (Julian 14.11.); both are named under the grid. Nothing else stands in a
 * day: work shifts belong to the hour grids. The chosen day's Termine follow as rows with fine lines between.
 * Swipe sideways for the month before or after.
 */
import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { H2 } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { tokens, persons, springs } from '../../theme';
import { evFill } from '../../lib/evColor';
import { DaySection } from './DayList';
import { useStore, actions } from '../../state/store';
import { addDays, monday, dayNum, monthIdx, year, parse, iso, TODAY, MONTHS, short, weekday, WD_LONG } from '../../lib/dates';
import PressScale from '../../components/ui/PressScale';
import { tx } from '../../i18n/lang';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '../../lib/haptics';
import type { CalEvent } from '../../state/types';
import { useCalEvents } from '../../lib/useEvents';
import { isInfoDay } from '../../lib/feiertage';
import { isVacation } from '../../lib/urlaub';
import { AgendaRow } from './AgendaView';
import { vivid } from '../../theme';

// One letter per weekday, as in the draft.
const HEAD = tx('Mo Di Mi Do Fr Sa So', 'Mo Tu We Th Fr Sa Su').split(' ');
/** Urlaub: the soft green of the brand. */
const VAC = '#E7F4E6';

export function monthTitle(day: string) {
  return { month: MONTHS[monthIdx(day)], year: year(day) };
}

export function shiftMonth(day: string, n: number): string {
  const d = parse(day);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

/** The soft colour of an Urlaub band: the person's tint, the family's quiet grey for everyone. */
const bandOf = (e: CalEvent) => (e.who === 'J' || e.who === 'T' ? persons[e.who].tint : tokens.doneSoft);
const byStart = (a: CalEvent, b: CalEvent) => (!a.allDay === !b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1);

type Cell = { evs: CalEvent[]; hol?: CalEvent; vac?: CalEvent };

export default function MonthView() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const people = useStore((s) => s.people);
  // Ton & Papier (Julian 17.11.: "wir übernehmen nur die Monatsansicht"): tall cells, today as an ink field, the
  // Urlaub as a band at the foot of its days. Everything else of the month is as it was.
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

  // One pass over the Termine: what each day of this month carries. Multi-day ones (Urlaub bis Sonntag) count on every day they cover.
  const { at, holidays, vacations } = useMemo(() => {
    const from = first, to = iso(new Date(Date.UTC(year(day), m + 1, 0)));
    const at = new Map<string, Cell>();
    const cell = (d: string) => { let c = at.get(d); if (!c) { c = { evs: [] }; at.set(d, c); } return c; };
    const holidays: CalEvent[] = [], vacations: CalEvent[] = [];
    for (const e of events) {
      const last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      if (last < from || e.date > to) continue;
      // Work shifts stand in the hour grids (Tage, Woche), not in the month.
      if (e.work) continue;
      if (isInfoDay(e)) { if (e.date >= from) { cell(e.date).hol = e; holidays.push(e); } continue; }
      const vac = isVacation(e);
      if (vac) vacations.push(e);
      for (let d = e.date < from ? from : e.date; d <= last && d <= to; d = addDays(d, 1)) { const c = cell(d); if (vac) c.vac = c.vac ?? e; else c.evs.push(e); }
    }
    holidays.sort((a, b) => a.date.localeCompare(b.date));
    return { at, holidays, vacations };
  }, [events, first, m]);

  const list = useMemo(() => events.filter((e) => e.date === day || (!!e.endDate && e.date < day && day <= e.endDate)).sort(byStart), [events, day]);
  const real = list.filter((e) => !isInfoDay(e) && !e.work);
  const info = list.filter(isInfoDay).map((e) => e.title).join(' · ');
  // Title, switch and weekday row take about 290, the talk field and tabs about 200.
  const { height: H } = useWindowDimensions();
  const rows = cells.length / 7;
  const cellH = 62;

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
      <Animated.View onLayout={(e) => { W.value = e.nativeEvent.layout.width; }} style={[{ flexDirection: 'row', flexWrap: 'wrap' }, slide]}>
        {HEAD.map((h, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 8 }}>
            <Txt size={13} line={17} weight={500} color={tokens.mute}>{h}</Txt>
          </View>
        ))}
        {cells.map((d, ci) => {
          const inMonth = monthIdx(d) === m;
          const c = inMonth ? at.get(d) : undefined;
          const sel = d === day && inMonth;
          const isToday = d === TODAY && inMonth;
          const evs = c?.evs ?? [];
          const dots: string[] = [];
          for (const e of evs) { const f = evFill(e); if (!dots.includes(f)) dots.push(f); if (dots.length === 3) break; }
          // Urlaub: a soft green field behind its days, joined inside the week's row.
          const on = (o: number) => !!c?.vac && monthIdx(addDays(d, o)) === m && at.get(addDays(d, o))?.vac === c.vac;
          const joinL = ci % 7 !== 0 && on(-1), joinR = ci % 7 !== 6 && on(1);
          return (
            <View key={d} style={{ width: `${100 / 7}%`, height: cellH, alignItems: 'center' }}>
              {c?.vac ? <View style={{ position: 'absolute', left: joinL ? 0 : 4, right: joinR ? 0 : 4, top: 0, height: 44, backgroundColor: VAC, borderTopLeftRadius: joinL ? 0 : 22, borderBottomLeftRadius: joinL ? 0 : 22, borderTopRightRadius: joinR ? 0 : 22, borderBottomRightRadius: joinR ? 0 : 22 }} /> : null}
              <PressScale
                scale={0.92}
                onPress={() => { if (inMonth && !sel) { haptics.select(); actions.setCalDay(d); } }}
                accessibilityLabel={short(d)}
                accessibilityState={{ selected: sel }}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? tokens.ink : 'transparent' }}
              >
                <Txt size={17} line={22} weight={sel || isToday ? 600 : 500} color={sel ? '#FFFFFF' : !inMonth ? '#C9D2D0' : isToday || c?.hol ? '#E5484D' : tokens.ink} style={{ fontVariant: ['tabular-nums'] }}>{String(dayNum(d))}</Txt>
                {dots.length ? (
                  <View style={{ position: 'absolute', bottom: sel ? 6 : -2, flexDirection: 'row', gap: 3 }}>
                    {dots.map((f, i) => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: f }} />)}
                  </View>
                ) : null}
              </PressScale>
            </View>
          );
        })}
      </Animated.View>
      </GestureDetector>
      {holidays.length || vacations.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, paddingHorizontal: 2, paddingTop: 4 }}>
          {holidays.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Txt size={12.5} weight={600} color="#E5484D">{String(dayNum(e.date))}</Txt>
              <Txt size={12.5} color={tokens.sub}>{e.title}</Txt>
            </View>
          ))}
          {vacations.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 16, height: 9, borderRadius: 5, backgroundColor: VAC }} />
              <Txt size={12.5} color={tokens.sub}>{e.title}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ paddingTop: 22 }}><DaySection key={day} day={day} /></View>
    </>
  );
}
