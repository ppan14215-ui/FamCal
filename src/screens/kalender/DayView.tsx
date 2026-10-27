/**
 * Kalender · Tag (Julian 27.10.: the calendar is the key view, content nested
 * with hierarchy). Week strip on top, then day after day from the chosen one.
 * Each day is one card: who works when, the Termine with what to bring right
 * under them, then the day's tasks and deadlines. Everything a spoken change
 * touches can light up (Fresh).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Meta, Check } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { Tile } from '../../components/ui/Clay';
import { Avatar, Owner } from '../../components/ui/Person';
import Stripes from '../../components/Stripes';
import { tokens, persons, PersonId } from '../../theme';
import { useStore, actions } from '../../state/store';
import Fresh from '../../components/Fresh';
import LineIcon from '../../components/ui/LineIcon';
import type { CalEvent, Task, Doc } from '../../state/types';
import { eventsOn } from '../../lib/selectors';
import { addDays, monday, dayNum, WD_SHORT, weekday, WD_LONG, hm, TODAY, short, until, MONTHS_SHORT, monthIdx, daysBetween } from '../../lib/dates';
import { upcomingFristen } from '../../lib/selectors';
import { dayLabel } from '../../lib/talk';
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

const byStart = (a: CalEvent, b: CalEvent) => (a.allDay ? -1 : b.allDay ? 1 : a.start.localeCompare(b.start));

/** One Termin with what belongs to it underneath. */
function Item({ e, last }: { e: CalEvent; last: boolean }) {
  const bring = e.bring ?? [];
  const open = bring.filter((b) => !b.done);
  return (
    <Fresh id={e.id}>
      <PressScale scale={0.985} onPress={() => router.push(`/termin/${e.id}`)} style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.hair }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt size={13.5} weight={600} style={{ width: 42 }}>{e.allDay ? 'Tag' : hm(e.start)}</Txt>
          <Tile name={e.icon} size={46} radius={14} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={16} line={21} weight={600} numberOfLines={1}>{e.title}</Txt>
            {e.place || e.sub ? <Meta numberOfLines={1}>{e.place ?? e.sub}</Meta> : null}
          </View>
          <Owner who={e.who} />
        </View>
        {bring.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 42 + 12 + 46 + 12 }}>
            <LineIcon name={open.length ? 'list' : 'check'} size={14} color={open.length ? tokens.sub : tokens.done} />
            <Txt size={13} line={18} color={open.length ? tokens.sub : tokens.done} numberOfLines={1} style={{ flex: 1 }}>
              {open.length ? `Mitbringen: ${open.map((b) => b.t).join(', ')}` : 'Alles dabei'}
            </Txt>
          </View>
        ) : null}
      </PressScale>
    </Fresh>
  );
}

function Sub({ children }: { children: string }) {
  return <Txt size={12} weight={600} tracking={0.4} color={tokens.mute} style={{ paddingHorizontal: 14, paddingTop: 10 }}>{children.toUpperCase()}</Txt>;
}

/** Who is at work that day, as one quiet line with their stripes. */
function WorkLine({ work }: { work: CalEvent[] }) {
  if (!work.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {work.map((w) => {
        const p = (w.who === 'J' ? 'J' : 'T') as PersonId;
        return (
          <Stripes key={w.id} p={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 8, borderRadius: 999 }}>
            <Avatar p={p} size={16} />
            <Txt size={12.5} weight={600} color={persons[p].ink}>{`Arbeit ${hm(w.start)} bis ${hm(w.end ?? '')}`}</Txt>
          </Stripes>
        );
      })}
    </View>
  );
}

function Day({ date, events, tasks, docs }: { date: string; events: CalEvent[]; tasks: Task[]; docs: Doc[] }) {
  const work = events.filter((e) => e.work);
  const real = events.filter((e) => !e.work).sort(byStart);
  const empty = !real.length && !tasks.length && !docs.length;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt size={21} line={26} weight={700} tracking={-0.4}>{dayLabel(date)}</Txt>
        <Txt size={13.5} color={tokens.sub}>{date === TODAY || date === addDays(TODAY, 1) ? `${WD_LONG[weekday(date)]}, ${dayNum(date)}. ${MONTHS_SHORT[monthIdx(date)]}` : until(date)}</Txt>
      </View>
      <WorkLine work={work} />
      {empty ? (
        <Meta>{date === TODAY ? 'Heute steht nichts an. Sag unten einfach, was ansteht.' : 'Nichts eingetragen. Ein freier Tag.'}</Meta>
      ) : (
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: tokens.row }}>
          {real.map((e, i) => <Item key={e.id} e={e} last={i === real.length - 1 && !tasks.length && !docs.length} />)}
          {tasks.length ? (
            <View style={{ borderTopWidth: real.length ? 1 : 0, borderTopColor: tokens.hair }}>
              <Sub>Aufgaben</Sub>
              {tasks.map((t) => (
                <Fresh key={t.id} id={t.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                    <Check done={t.done} onPress={() => actions.toggleTask(t.id)} />
                    <Txt size={15.5} weight={600} strike={t.done} color={t.done ? tokens.mute : tokens.ink} style={{ flex: 1 }} numberOfLines={1}>{t.title}</Txt>
                    {t.due && t.due < date ? <Txt size={12.5} color={tokens.frist}>{`seit ${short(t.due)}`}</Txt> : null}
                    <Owner who={t.who} />
                  </View>
                </Fresh>
              ))}
            </View>
          ) : null}
          {docs.length ? (
            <View style={{ borderTopWidth: real.length || tasks.length ? 1 : 0, borderTopColor: tokens.hair }}>
              <Sub>Frist</Sub>
              {docs.map((d) => (
                <PressScale key={d.id} onPress={d.route ? () => router.push(d.route as any) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Tile name={d.icon} size={36} radius={11} />
                  <Txt size={15.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>{d.title}</Txt>
                  <Owner who={d.who ?? null} />
                </PressScale>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

/** Deadlines coming closer, one quiet card above the days. */
function Fristen() {
  const docs = useStore((s) => s.docs);
  const list = useMemo(() => upcomingFristen(docs, 60), [docs]);
  if (!list.length) return null;
  return (
    <View style={{ borderRadius: 20, backgroundColor: tokens.row, paddingVertical: 4 }}>
      {list.map((d, i) => (
        <PressScale key={d.id} onPress={d.route ? () => router.push(d.route as any) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: tokens.hair }}>
          <LineIcon name="clock" size={16} color={tokens.frist} />
          <Txt size={14.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>{d.title}</Txt>
          <Txt size={13} color={tokens.frist}>{`Frist ${dayNum(d.frist!)}. ${MONTHS_SHORT[monthIdx(d.frist!)]} · ${until(d.frist!)}`}</Txt>
        </PressScale>
      ))}
    </View>
  );
}

export default function DayView() {
  const day = useStore((s) => s.calDay);
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);
  // Seven days from the chosen one, plus any later day something was just said for.
  const days = useMemo(() => {
    const ds = Array.from({ length: 7 }, (_, i) => addDays(day, i));
    for (const e of events) if (e.source?.startsWith('Gesagt') && e.date > ds[6] && daysBetween(day, e.date) < 120 && !ds.includes(e.date)) ds.push(e.date);
    return ds.sort().map((date) => ({
      date,
      events: events.filter((e) => e.date === date),
      tasks: tasks.filter((t) => t.who !== undefined && t.due && (t.due === date || (date === TODAY && t.due < TODAY && !t.done))),
      docs: docs.filter((d) => d.frist === date),
    })).filter((d, i) => i === 0 || d.events.some((e) => !e.work) || d.tasks.length || d.docs.length);
  }, [day, events, tasks, docs]);
  return (
    <>
      <WeekStrip day={day} onSelect={actions.setCalDay} />
      {day === TODAY ? <Fristen /> : null}
      {days.map((d) => <Day key={d.date} {...d} />)}
    </>
  );
}
