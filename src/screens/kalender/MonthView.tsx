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
import type { CalEvent } from '../../state/types';
import { useCalEvents } from '../../lib/useEvents';

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

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 5 }}>
        {HEAD.map((h) => (
          <View key={h} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 2 }}>
            <Txt size={12} weight={600} color={tokens.sub}>{h}</Txt>
          </View>
        ))}
        {cells.map((d) => {
          const inMonth = monthIdx(d) === m;
          // Multi-day ones (Urlaub bis Sonntag) show on every day they cover.
          const evs = inMonth ? events.filter((e) => !e.work && (e.date === d || (!!e.endDate && e.date < d && d <= e.endDate))) : [];
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
                <DayIcons evs={evs} size={icon} />
              </PressScale>
            </View>
          );
        })}
      </View>
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
 * Several Termine share the cell (Julian 28.10.: "mehrere Icons in ein
 * Feld"): one big, two side by side, three or four in a square, beyond that
 * three and the count.
 */
function DayIcons({ evs, size }: { evs: CalEvent[]; size: number }) {
  if (!evs.length) return <View style={{ flex: 1 }} />;
  if (evs.length === 1) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 }}><ClayIcon name={evs[0].icon} size={size} /></View>;
  }
  const small = Math.round(size * 0.75);
  const shown = evs.length > 4 ? evs.slice(0, 3) : evs;
  return (
    <View style={{ flex: 1, width: '100%', paddingHorizontal: 3, paddingBottom: 4, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center' }}>
      {shown.map((e) => <View key={e.id} style={{ width: '50%', alignItems: 'center' }}><ClayIcon name={e.icon} size={small} /></View>)}
      {evs.length > 4 ? (
        <View style={{ width: '50%', height: small, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={10} line={12} weight={700} color={tokens.sub}>{`+${evs.length - 3}`}</Txt>
        </View>
      ) : null}
    </View>
  );
}
