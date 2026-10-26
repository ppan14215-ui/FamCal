/** Kalender · Monat: day cells tinted by their first event, list for the selected day. */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { H2, Group, Row, RoundButton } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { ClayIcon } from '../../components/ui/Clay';
import { Owner } from '../../components/ui/Person';
import { tokens, tint } from '../../theme';
import { useStore, actions } from '../../state/store';
import { eventsOn } from '../../lib/selectors';
import { addDays, monday, dayNum, monthIdx, year, parse, iso, WD_SHORT, weekday, MONTHS_SHORT, hm, TODAY } from '../../lib/dates';
import PressScale from '../../components/ui/PressScale';

const HEAD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function monthTitle(day: string) {
  return { month: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][monthIdx(day)], year: year(day) };
}

export function shiftMonth(day: string, n: number): string {
  const d = parse(day);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

export default function MonthView() {
  const day = useStore((s) => s.calDay);
  const events = useStore((s) => s.events);
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
  const list = useMemo(() => eventsOn(events, day, false), [events, day]);

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 }}>
        {HEAD.map((h) => (
          <View key={h} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 2 }}>
            <Txt size={12} weight={600} color={tokens.sub}>{h}</Txt>
          </View>
        ))}
        {cells.map((d) => {
          const inMonth = monthIdx(d) === m;
          const evs = inMonth ? events.filter((e) => e.date === d && !e.work) : [];
          const sel = d === day;
          const isToday = d === TODAY;
          return (
            <View key={d} style={{ width: `${100 / 7}%`, paddingHorizontal: 2 }}>
              <PressScale
                onPress={() => inMonth && actions.setCalDay(d)}
                style={{
                  height: 52, borderRadius: 14, alignItems: 'center', paddingTop: 4, gap: 1,
                  backgroundColor: evs.length && !sel ? tint(evs[0].icon) : inMonth ? tokens.row : 'transparent',
                  borderWidth: sel ? 1.5 : 0, borderColor: tokens.ink,
                }}
              >
                <View style={{ width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? tokens.ink : 'transparent' }}>
                  <Txt size={14} weight={isToday ? 700 : 500} color={isToday ? '#FFFFFF' : inMonth ? tokens.ink : '#C4C9CB'}>{String(dayNum(d))}</Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {evs[0] ? <ClayIcon name={evs[0].icon} size={24} /> : null}
                  {evs.length > 1 ? <Txt size={10.5} weight={700} color={tokens.sub}>{`+${evs.length - 1}`}</Txt> : null}
                </View>
              </PressScale>
            </View>
          );
        })}
      </View>
      <H2 right={`${list.length} ${list.length === 1 ? 'Termin' : 'Termine'}`}>{`${WD_SHORT[weekday(day)]} ${dayNum(day)}. ${MONTHS_SHORT[m]}`}</H2>
      {list.length ? (
        <Group>
          {list.map((e) => (
            <Row key={e.id} icon={e.icon} title={e.title} sub={e.sub} time={hm(e.start)} right={<Owner who={e.who} />} onPress={() => router.push(`/termin/${e.id}`)} />
          ))}
        </Group>
      ) : (
        <Txt size={14} color={tokens.sub}>Nichts eingetragen.</Txt>
      )}
    </>
  );
}

export function MonthArrows() {
  const day = useStore((s) => s.calDay);
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <RoundButton icon="back" label="Voriger Monat" size={34} onPress={() => actions.setCalDay(shiftMonth(day, -1))} />
      <View style={{ transform: [{ scaleX: -1 }] }}>
        <RoundButton icon="back" label="Nächster Monat" size={34} onPress={() => actions.setCalDay(shiftMonth(day, 1))} />
      </View>
    </View>
  );
}
