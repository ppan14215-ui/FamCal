/**
 * Kalender · Monat: the flat month. Every day is its number with one dot per Termin in the colour of who goes
 * (Julian 04.11.: the simple month with dots). Today is the orange circle, the chosen day has the ring.
 * Feiertage colour their number and Urlaub lies as a soft band behind its days, so you can tell where they were
 * (Julian 14.11.); both are named under the grid. Work shows as the person's stripe along the day's foot.
 * The chosen day's Termine follow as the same rows as on Heute. Swipe sideways for the month before or after.
 */
import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { H2 } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { tokens, persons, springs } from '../../theme';
import { evInk } from '../../lib/evColor';
import { useStore, actions } from '../../state/store';
import { addDays, monday, dayNum, monthIdx, year, parse, iso, TODAY, MONTHS, short } from '../../lib/dates';
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
import Stripes from '../../components/Stripes';
import { AgendaRow } from './AgendaView';

const HEAD = tx('Mo Di Mi Do Fr Sa So', 'Mo Tu We Th Fr Sa Su').split(' ');
/** The number's circle and the band behind it. */
const NUM = 30;

export function monthTitle(day: string) {
  return { month: MONTHS[monthIdx(day)], year: year(day) };
}

export function shiftMonth(day: string, n: number): string {
  const d = parse(day);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

/** The soft colour of an Urlaub band: the person's tint, the family's quiet grey for everyone. */
const bandOf = (e: CalEvent) => (e.who === 'J' || e.who === 'T' ? persons[e.who].tint : tokens.doneSoft);
const byStart = (a: CalEvent, b: CalEvent) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1);

type Cell = { evs: CalEvent[]; shifts: ('J' | 'T')[]; hol?: CalEvent; vac?: CalEvent };

export default function MonthView() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const people = useStore((s) => s.people);
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
    const cell = (d: string) => { let c = at.get(d); if (!c) { c = { evs: [], shifts: [] }; at.set(d, c); } return c; };
    const holidays: CalEvent[] = [], vacations: CalEvent[] = [];
    for (const e of events) {
      const last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      if (last < from || e.date > to) continue;
      if (e.work) { const c = cell(e.date), p = e.who === 'J' ? 'J' : 'T'; if (e.date >= from && !c.shifts.includes(p)) c.shifts.push(p); continue; }
      if (isInfoDay(e)) { if (e.date >= from) { cell(e.date).hol = e; holidays.push(e); } continue; }
      const vac = isVacation(e);
      if (vac) vacations.push(e);
      for (let d = e.date < from ? from : e.date; d <= last && d <= to; d = addDays(d, 1)) { const c = cell(d); if (vac) c.vac = c.vac ?? e; else c.evs.push(e); }
    }
    holidays.sort((a, b) => a.date.localeCompare(b.date));
    return { at, holidays, vacations };
  }, [events, first, m]);

  const list = useMemo(() => events.filter((e) => e.date === day || (!!e.endDate && e.date < day && day <= e.endDate)).sort(byStart), [events, day]);
  const real = list.filter((e) => !isInfoDay(e));
  const info = list.filter(isInfoDay).map((e) => e.title).join(' · ');
  // Title, switch and weekday row take about 290, the talk field and tabs about 200.
  const { height: H } = useWindowDimensions();
  const rows = cells.length / 7;
  const cellH = Math.round(Math.max(52, Math.min(62, (H - 500) / rows)));

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
        {HEAD.map((h) => (
          <View key={h} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 6 }}>
            <Txt size={12} weight={600} color={tokens.sub}>{h}</Txt>
          </View>
        ))}
        {cells.map((d, ci) => {
          const inMonth = monthIdx(d) === m;
          const c = inMonth ? at.get(d) : undefined;
          const sel = d === day;
          const isToday = d === TODAY;
          const evs = c?.evs ?? [];
          // The band runs on to the next day inside the week's row and ends round where the Urlaub or the row ends.
          const on = (o: number) => !!c?.vac && monthIdx(addDays(d, o)) === m && at.get(addDays(d, o))?.vac === c.vac;
          const joinL = ci % 7 !== 0 && on(-1), joinR = ci % 7 !== 6 && on(1);
          return (
            <View key={d} style={{ width: `${100 / 7}%` }}>
              <PressScale
                scale={0.94}
                onPress={() => { if (inMonth && !sel) { haptics.select(); actions.setCalDay(d); } }}
                accessibilityLabel={short(d)}
                accessibilityState={{ selected: sel }}
                style={{ height: cellH, alignItems: 'center', paddingTop: 6 }}
              >
                {c?.vac ? <View style={{ position: 'absolute', top: 6, height: NUM, left: joinL ? 0 : 5, right: joinR ? 0 : 5, backgroundColor: bandOf(c.vac), borderTopLeftRadius: joinL ? 0 : NUM / 2, borderBottomLeftRadius: joinL ? 0 : NUM / 2, borderTopRightRadius: joinR ? 0 : NUM / 2, borderBottomRightRadius: joinR ? 0 : NUM / 2 }} /> : null}
                <View style={{ width: NUM, height: NUM, borderRadius: NUM / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? tokens.accent : 'transparent', borderWidth: sel && !isToday ? 1.5 : 0, borderColor: tokens.ink }}>
                  <Txt size={15} line={19} weight={isToday || c?.hol ? 700 : 500} color={isToday ? '#FFFFFF' : c?.hol ? tokens.frist : inMonth ? tokens.ink : tokens.circleLine}>{String(dayNum(d))}</Txt>
                </View>
                {evs.length ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 7, marginTop: 4 }}>
                    {evs.slice(0, 3).map((e, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: evInk(e) }} />)}
                    {evs.length > 3 ? <Txt size={9} line={9} weight={700} color={tokens.sub}>+</Txt> : null}
                  </View>
                ) : null}
                {c?.shifts.length ? (
                  <View style={{ position: 'absolute', left: 7, right: 7, bottom: 3, gap: 1.5 }}>
                    {c.shifts.map((p) => <Stripes key={p} p={p} radius={2} style={{ height: 4 }} />)}
                  </View>
                ) : null}
              </PressScale>
            </View>
          );
        })}
      </Animated.View>
      </GestureDetector>
      {holidays.length || vacations.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, paddingHorizontal: 2 }}>
          {holidays.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Txt size={12.5} weight={700} color={tokens.frist}>{String(dayNum(e.date))}</Txt>
              <Txt size={12.5} color={tokens.sub}>{e.title}</Txt>
            </View>
          ))}
          {vacations.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 16, height: 9, borderRadius: 5, backgroundColor: bandOf(e) }} />
              <Txt size={12.5} color={tokens.sub}>{e.title}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      <View>
        <H2 right={`${real.length} ${real.length === 1 ? tx('Termin', 'event') : tx('Termine', 'events')}`}>{short(day)}</H2>
        {info ? <Txt size={13} line={18} color={tokens.mute} numberOfLines={1} style={{ paddingTop: 6 }}>{info}</Txt> : null}
        {real.length ? (
          // The same rows as on Heute: a tap opens, a swipe to the left deletes (Julian 31.10. 18:21).
          <View style={{ paddingTop: 4 }}>{real.map((e) => <AgendaRow key={e.id} e={e} date={day} over={false} people={people} />)}</View>
        ) : (
          <Txt size={14} color={tokens.sub} style={{ paddingTop: 8 }}>{tx('Nichts eingetragen.', 'Nothing planned.')}</Txt>
        )}
      </View>
    </>
  );
}
