/**
 * Kalender · Heute (Julian 14.11.: "we keep the wochen ansicht but move it to today but make it endless scroll").
 * One dense list by day that starts today and never ends: the day on the left, its Termine as flat rows with the
 * person's bar, time and icon. What is over today turns grey and an orange line marks now. Free days are left out.
 * Everything that belongs to today sits in today's block: what is open, deadlines coming close and what the app
 * thought of. Rows open on a tap, a swipe to the left deletes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import { ClayIcon } from '../../components/ui/Clay';
import { Check } from '../../components/ui/kit';
import LineIcon from '../../components/ui/LineIcon';
import PressScale from '../../components/ui/PressScale';
import Origin from '../../components/ui/Origin';
import Fresh from '../../components/Fresh';
import SwipeRow, { justSwiped } from '../../components/SwipeRow';
import DueOffer from '../../components/DueOffer';
import { daysTo } from '../../components/TerminDetails';
import { tokens, persons, allColors, shade } from '../../theme';
import { useStore, actions } from '../../state/store';
import { useScroller } from '../../lib/landing';
import { useDockSpace } from '../../lib/dockSpace';
import { upcomingFristen } from '../../lib/selectors';
import { useCalEvents } from '../../lib/useEvents';
import { useNowMin } from '../../lib/useNow';
import { isInfoDay } from '../../lib/feiertage';
import { evInk } from '../../lib/evColor';
import { dueItems, kidsOf, useHandled } from '../../lib/mitdenken';
import { haptics } from '../../lib/haptics';
import { TODAY, addDays, daysBetween, dayNum, weekday, WD_SHORT, MONTHS, monthIdx, minutes, hm, until } from '../../lib/dates';
import { tx, EN } from '../../i18n/lang';
import type { CalEvent, Task, Doc, Person } from '../../state/types';
import { dropEvent } from './DayView';

/** The family's to-do list, whatever it was called ("Zu erledigen", "Aufgaben", "Task"). */
const TODO_NAME = /^(zu erledigen|erledigen|aufgaben|to-?dos?|tasks?)$/i;

/** How far the list reaches when it opens; a new Termin inside lands here, a later one in the grid. */
export const FIRST_DAYS = 28;
/** Whether a Termin on this day shows on the Heute page right away, so a spoken one can land there. */
export const onToday = (date: string) => date >= TODAY && daysBetween(TODAY, date) < FIRST_DAYS;

const byStart = (a: CalEvent, b: CalEvent) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1);
/** Over for today: it has ended, or started and has no end. */
const isOver = (e: CalEvent, now: number) => !e.allDay && !(e.endDate && e.endDate > e.date) && minutes(e.end && e.end > e.start ? e.end : e.start) <= now;

// Bar, gap and time: the column every row starts with. English times are longer ("10:30am"), so they get more room
// instead of shrinking or being cut (Julian's phone is set to English).
const LEAD = EN ? 68 : 54;
/** One line of the list. Dense like the klar draft (22 of 284 there), Julian 14.11.: the app must look like the concept. */
const ROW = 32;
const GUTTER = 42;

/** Who a Termin belongs to, as small dots in the person's colour. */
function Dots({ e, people }: { e: CalEvent; people: Person[] }) {
  const out: string[] = [];
  if (e.who === 'both') out.push(persons.J.ink, persons.T.ink);
  else if (e.who) out.push(persons[e.who].ink);
  for (const id of e.people ?? []) {
    const p = people.find((x) => x.id === id);
    const c = p && allColors.find((x) => x.name === p.color);
    if (c) out.push(shade(c).fg);
  }
  if (!out.length) out.push(tokens.circleLine);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {out.slice(0, 3).map((c, i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />)}
    </View>
  );
}

/** One Termin as a flat row: the person's bar, time, icon, title with its place behind it, who as dots. Also used under the month. */
export const AgendaRow = React.memo(function AgendaRow({ e, date, over, people, next }: { e: CalEvent; date: string; over: boolean; people: Person[]; /** The next one today: its time stands out. */ next?: boolean }) {
  const span = !!e.endDate && e.endDate > e.date;
  const ink = evInk(e);
  const open = (e.bring ?? []).filter((b) => !b.done);
  const lead = span ? tx(`Tag ${daysBetween(e.date, date) + 1}`, `Day ${daysBetween(e.date, date) + 1}`) : e.allDay ? tx('Tag', 'Day') : hm(e.start);
  const sub = e.work
    ? (e.allDay || !e.end ? '' : tx(`bis ${hm(e.end)}`, `to ${hm(e.end)}`))
    : span && date === e.endDate ? tx('letzter Tag', 'last day')
    : e.place ?? e.sub ?? '';
  return (
    <Fresh id={e.id} radius={10}>
      <SwipeRow bg={tokens.bg} onDelete={() => dropEvent(e)}>
        <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={`${e.title}, ${lead}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW, paddingVertical: open.length ? 4 : 0, opacity: over ? 0.45 : 1 }}>
          <View style={{ width: 3, alignSelf: 'stretch', marginVertical: open.length ? 2 : 6, borderRadius: 2, backgroundColor: ink }} />
          <Txt size={14} line={18} weight={next ? 600 : 400} color={next ? tokens.accent : ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ width: LEAD - 11, fontVariant: ['tabular-nums'] }}>{lead}</Txt>
          {e.work ? null : <ClayIcon name={e.icon} size={22} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={16.5} line={21} weight={400} color={e.work ? tokens.sub : tokens.ink} numberOfLines={1}>
              {e.title}
              {sub ? <Txt size={13.5} line={21} color={tokens.mute}>{`  ${sub}`}</Txt> : null}
            </Txt>
            {/* What to bring belongs to the Termin, right under it (Julian 27.10.). */}
            {open.length ? <Txt size={13} line={17} color={tokens.sub} numberOfLines={1}>{tx(`Mitbringen: ${open.map((b) => b.t).join(', ')}`, `Bring: ${open.map((b) => b.t).join(', ')}`)}</Txt> : null}
          </View>
          <Origin e={e} />
          <Dots e={e} people={people} />
        </PressScale>
      </SwipeRow>
    </Fresh>
  );
});

/** A row you tick: its circle sits where the time of a Termin would. */
function TickRow({ id, title, done, onTick, right }: { id: string; title: string; done: boolean; onTick: () => void; right?: React.ReactNode }) {
  return (
    <Fresh id={id} radius={10}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW }}>
        <View style={{ width: LEAD, alignItems: 'flex-start' }}><Check done={done} size={20} onPress={onTick} /></View>
        <Txt size={16.5} line={21} weight={400} strike={done} color={done ? tokens.mute : tokens.ink} numberOfLines={1} style={{ flex: 1 }}>{title}</Txt>
        {right}
      </View>
    </Fresh>
  );
}

function Label({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 2 }}>
      <Txt size={11.5} weight={600} tracking={0.6} color={tokens.mute}>{children.toUpperCase()}</Txt>
      {right}
    </View>
  );
}

/** The orange line for now, with its dot reaching into the day's gutter. */
function NowLine() {
  return (
    <View style={{ height: 1, marginVertical: 2 }}>
      <View style={{ position: 'absolute', left: -GUTTER + 30, right: 0, top: 0, height: 1.5, borderRadius: 1, backgroundColor: tokens.accent }} />
      <View style={{ position: 'absolute', left: -GUTTER + 26, top: -2.75, width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.accent }} />
    </View>
  );
}

type DayData = { date: string; events: CalEvent[]; info: string; tasks: Task[]; docs: Doc[] };

const Day = React.memo(function Day({ d, first, now, people, extra }: { d: DayData; first: boolean; now: number; people: Person[]; extra?: React.ReactNode }) {
  const today = d.date === TODAY;
  const away = daysBetween(TODAY, d.date);
  const colour = today ? tokens.accent : tokens.ink;
  // Now sits above the first Termin that has not started yet.
  const timed = d.events.some((e) => !e.allDay);
  const nowAt = today && timed ? d.events.findIndex((e) => !e.allDay && !(e.endDate && e.endDate > e.date) && minutes(e.start) > now) : -2;
  const empty = !d.events.length && !d.tasks.length && !d.docs.length;
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingTop: first ? 2 : 8, paddingBottom: 8, borderTopWidth: first ? 0 : 1, borderTopColor: tokens.hair }}>
      <View style={{ width: GUTTER, paddingTop: 2 }} accessibilityLabel={today ? tx('Heute', 'Today') : undefined}>
        <Txt size={13} line={16} weight={400} color={tokens.sub}>{WD_SHORT[weekday(d.date)]}</Txt>
        <Txt size={21} line={24} weight={600} tracking={-0.4} color={colour}>{String(dayNum(d.date))}</Txt>
        {today || away === 1 ? <Txt size={11} line={14} weight={600} color={today ? tokens.accent : tokens.mute} numberOfLines={1}>{today ? tx('Heute', 'Today') : tx('Morgen', 'Tmrw')}</Txt> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {d.info ? <Txt size={13} line={18} color={tokens.mute} numberOfLines={1} style={{ paddingTop: 6, paddingBottom: 2 }}>{d.info}</Txt> : null}
        {d.events.map((e, i) => (
          <React.Fragment key={e.id}>
            {i === nowAt ? <NowLine /> : null}
            <AgendaRow e={e} date={d.date} over={today && isOver(e, now)} people={people} next={i === nowAt} />
          </React.Fragment>
        ))}
        {nowAt === -1 ? <NowLine /> : null}
        {d.tasks.map((t) => (
          <TickRow key={t.id} id={t.id} title={t.title} done={t.done} onTick={() => actions.toggleTask(t.id)} right={t.due && t.due < d.date ? <Txt size={12.5} color={tokens.frist}>{tx('überfällig', 'overdue')}</Txt> : undefined} />
        ))}
        {d.docs.map((doc) => (
          <PressScale key={doc.id} onPress={doc.route ? () => router.push(doc.route as any) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW }}>
            <View style={{ width: LEAD }}><LineIcon name="clock" size={17} color={tokens.frist} /></View>
            <Txt size={16.5} line={21} weight={400} numberOfLines={1} style={{ flex: 1 }}>{doc.title}</Txt>
            <Txt size={12.5} color={tokens.frist}>{tx('Frist', 'Due')}</Txt>
          </PressScale>
        ))}
        {today && empty ? <Txt size={14.5} line={20} color={tokens.sub} style={{ paddingVertical: 10 }}>{tx('Heute steht nichts an. Sag unten einfach, was ansteht.', 'Nothing today. Just say below what\'s coming up.')}</Txt> : null}
        {extra}
      </View>
    </View>
  );
});

/** What belongs to today besides its Termine: what is open, deadlines coming close, countdowns and what the app thought of. */
function TodayExtras({ events }: { events: CalEvent[] }) {
  const docs = useStore((s) => s.docs);
  const people = useStore((s) => s.people);
  const kid = useStore((s) => s.kid);
  const country = useStore((s) => s.country);
  const todoList = useStore((s) => s.lists.find((l) => l.id === 'aufgaben') ?? s.lists.find((l) => TODO_NAME.test(l.name)));
  const handled = useHandled();
  const open = (todoList?.sections ?? []).flatMap((x) => x.items).filter((i) => !i.done);
  const due = useMemo(() => dueItems(kidsOf(people, kid), country, 30), [people, kid, country, handled]);
  const fristen = useMemo(() => upcomingFristen(docs, 14).filter((d) => d.frist !== TODAY), [docs]);
  // Countdown (Julian 28.10.): the next three Termine that asked for "Tage bis"; a series counts once.
  const soon = useMemo(() => events
    .filter((e) => e.countdown && !e.work && e.date > TODAY && daysBetween(TODAY, e.date) <= 365)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((e, i, l) => l.findIndex((x) => x.id.split('~')[0] === e.id.split('~')[0]) === i)
    .slice(0, 3), [events]);
  if (!open.length && !due.length && !fristen.length && !soon.length) return null;
  return (
    <>
      {todoList && open.length ? (
        <>
          <Label right={
            <PressScale onPress={() => { haptics.select(); actions.setActiveList(todoList.id); router.navigate('/listen'); }} hitSlop={10} scale={0.94} accessibilityLabel={tx('Ganze Liste zeigen', 'Show the whole list')}>
              <Txt size={13} weight={600} color={tokens.sub}>{open.length > 5 ? tx(`Alle ${open.length}`, `All ${open.length}`) : tx('Liste', 'List')}</Txt>
            </PressScale>
          }>{tx('Offen', 'Open')}</Label>
          {open.slice(0, 5).map((i) => (
            <TickRow key={i.id} id={i.id} title={i.name} done={i.done} onTick={() => { haptics.commit(); actions.toggleItem(todoList.id, i.id); }} />
          ))}
        </>
      ) : null}
      {fristen.map((d) => (
        <PressScale key={d.id} onPress={d.route ? () => router.push(d.route as any) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW }}>
          <View style={{ width: LEAD }}><LineIcon name="clock" size={17} color={tokens.frist} /></View>
          <Txt size={16.5} line={21} weight={400} numberOfLines={1} style={{ flex: 1 }}>{d.title}</Txt>
          <Txt size={12.5} color={tokens.frist}>{`${tx('Frist', 'Due')} ${until(d.frist!)}`}</Txt>
        </PressScale>
      ))}
      {soon.map((e) => (
        <PressScale key={e.id} onPress={() => { haptics.select(); router.push(`/termin/${e.id}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW }}>
          <View style={{ width: LEAD }}><ClayIcon name={e.icon} size={24} /></View>
          <Txt size={16.5} line={21} weight={400} numberOfLines={1} style={{ flex: 1 }}>{e.title}</Txt>
          <Txt size={12.5} weight={600} color={tokens.sub}>{daysTo(e.date)}</Txt>
        </PressScale>
      ))}
      {due.length ? (
        <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 2, borderRadius: 16, backgroundColor: tokens.doneSoft }}>
          {due.slice(0, 3).map((d) => <DueOffer key={d.key} d={d} />)}
        </View>
      ) : null}
    </>
  );
}

/** `reach`: the list covers at least this many days from today (the onboarding shows a day that may lie further out). */
export default function AgendaView({ reach }: { reach?: number } = {}) {
  const events = useCalEvents();
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);
  const people = useStore((s) => s.people);
  const insets = useSafeAreaInsets();
  const dock = useDockSpace();
  const ref = useRef<ScrollView>(null);
  const track = useScroller(ref);
  const view = useRef(0);
  const now = useNowMin();
  const [count, setCount] = useState(Math.max(FIRST_DAYS, reach ?? 0));
  useEffect(() => { if (reach) setCount((c) => Math.max(c, Math.min(730, reach))); }, [reach]);

  const days = useMemo(() => {
    const end = addDays(TODAY, count);
    const at = new Map<string, DayData>();
    const day = (date: string) => {
      let d = at.get(date);
      if (!d) { d = { date, events: [], info: '', tasks: [], docs: [] }; at.set(date, d); }
      return d;
    };
    day(TODAY);
    for (const e of events) {
      const last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      if (last < TODAY || e.date >= end) continue;
      if (isInfoDay(e)) { const d = day(e.date); d.info = d.info ? `${d.info} · ${e.title}` : e.title; continue; }
      for (let date = e.date < TODAY ? TODAY : e.date; date <= last && date < end; date = addDays(date, 1)) day(date).events.push(e);
    }
    for (const t of tasks) {
      if (t.who === undefined || !t.due || t.due >= end) continue;
      if (t.due >= TODAY) day(t.due).tasks.push(t);
      else if (!t.done) day(TODAY).tasks.push(t);
    }
    for (const d of docs) if (d.frist && d.frist >= TODAY && d.frist < end) day(d.frist).docs.push(d);
    const out = [...at.values()].sort((a, b) => a.date.localeCompare(b.date));
    for (const d of out) d.events.sort(byStart);
    return out;
  }, [events, tasks, docs, count]);

  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onLayout={(e) => { view.current = e.nativeEvent.layout.height; }}
      onScroll={(e) => {
        const { contentOffset, contentSize } = e.nativeEvent;
        track(contentOffset.y);
        if (contentSize.height - contentOffset.y - view.current < 900) setCount((c) => (c < 730 ? c + FIRST_DAYS : c));
      }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 110 + insets.bottom + dock }}
    >
      {days.map((d, i) => {
        const month = i > 0 && monthIdx(d.date) !== monthIdx(days[i - 1].date);
        return (
          <React.Fragment key={d.date}>
            {month ? <Txt size={11.5} weight={600} tracking={0.8} color={tokens.mute} style={{ paddingTop: 18, paddingBottom: 8 }}>{`${MONTHS[monthIdx(d.date)]}${d.date.slice(0, 4) !== TODAY.slice(0, 4) ? ` ${d.date.slice(0, 4)}` : ''}`.toUpperCase()}</Txt> : null}
            <Day d={d} first={i === 0} now={d.date === TODAY ? now : 0} people={people} extra={d.date === TODAY ? <TodayExtras events={events} /> : undefined} />
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}
