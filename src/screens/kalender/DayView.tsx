/** Kalender · Tag: week strip, then the day as a timeline. */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { H2, Meta } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { Tile } from '../../components/ui/Clay';
import { Avatar, Owner } from '../../components/ui/Person';
import Stripes from '../../components/Stripes';
import { tokens, persons, PersonId } from '../../theme';
import { useStore, actions } from '../../state/store';
import { eventsOn } from '../../lib/selectors';
import { addDays, monday, dayNum, WD_SHORT, weekday, WD_LONG, hm, TODAY } from '../../lib/dates';
import PressScale from '../../components/ui/PressScale';

export function WeekStrip({ day, onSelect }: { day: string; onSelect: (d: string) => void }) {
  const events = useStore((s) => s.events);
  const start = monday(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {days.map((d) => {
        const on = d === day;
        const has = events.some((e) => e.date === d && !e.work);
        return (
          <PressScale
            key={d}
            onPress={() => onSelect(d)}
            accessibilityLabel={`${WD_LONG[weekday(d)]} ${dayNum(d)}.`}
            style={{ flex: 1, height: 66, borderRadius: 18, backgroundColor: tokens.row, borderWidth: on ? 1.5 : 0, borderColor: tokens.ink, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            <Txt size={12} color={tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
            <Txt size={19} line={22} weight={d === TODAY ? 700 : 600}>{String(dayNum(d))}</Txt>
            <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: has ? tokens.done : 'transparent' }} />
          </PressScale>
        );
      })}
    </View>
  );
}

export default function DayView() {
  const day = useStore((s) => s.calDay);
  const events = useStore((s) => s.events);
  const list = useMemo(() => eventsOn(events, day), [events, day]);
  const real = list.filter((e) => !e.work);
  return (
    <>
      <WeekStrip day={day} onSelect={actions.setCalDay} />
      <H2 right={`${real.length} ${real.length === 1 ? 'Termin' : 'Termine'}`}>{`${WD_LONG[weekday(day)]}, ${dayNum(day)}.`}</H2>
      {list.length === 0 ? (
        <View style={{ paddingVertical: 28, alignItems: 'center' }}><Meta>Nichts eingetragen. Ein freier Tag.</Meta></View>
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((e, i) => {
            if (e.work) {
              const p = (e.who === 'J' ? 'J' : 'T') as PersonId;
              return (
                <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
                  <Txt size={13} color={tokens.sub} style={{ width: 52, paddingTop: 12 }}>{hm(e.start)}</Txt>
                  <Stripes p={p} style={{ flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
                    <Avatar p={p} size={20} />
                    <Txt size={13.5} weight={600} color={persons[p].ink}>{`Arbeit · bis ${hm(e.end ?? '')}`}</Txt>
                  </Stripes>
                </View>
              );
            }
            const last = i === list.length - 1;
            return (
              <View key={e.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Txt size={13} weight={600} style={{ width: 52, paddingTop: 6 }}>{hm(e.start)}</Txt>
                <PressScale onPress={() => router.push(`/termin/${e.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {!last ? <View style={{ position: 'absolute', left: 25, top: 54, bottom: -12, width: 2, backgroundColor: tokens.hair }} /> : null}
                  <Tile name={e.icon} size={52} radius={16} />
                  <View style={{ flex: 1 }}>
                    <Txt size={16} weight={600}>{e.title}</Txt>
                    {e.sub ? <Meta>{e.sub}</Meta> : null}
                  </View>
                  <Owner who={e.who} />
                </PressScale>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}
