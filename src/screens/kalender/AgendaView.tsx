/**
 * Kalender · Heute (Julian 14.11.: "we keep the wochen ansicht but move it to today but make it endless scroll").
 * One dense list by day that starts today and never ends, exactly as in the klar draft Julian approved: the day on
 * the left, and per Termin one line with the person's bar, the time, the small icon, the title and who as dots.
 * Nothing else stands here (Julian 14.11. 10:05: "noch zu überladen im Vergleich zu der vereinbarten Vorlage"):
 * no second lines, no sources, no tasks, no hint cards, no work shifts. What is over today turns grey and a fine
 * line marks now. Free days are left out. Rows open on a tap, a swipe to the left deletes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import { ClayIcon } from '../../components/ui/Clay';
import PressScale from '../../components/ui/PressScale';
import Fresh from '../../components/Fresh';
import SwipeRow, { justSwiped } from '../../components/SwipeRow';
import { tokens, persons, allColors, shade } from '../../theme';
import { useStore } from '../../state/store';
import { useScroller } from '../../lib/landing';
import { useDockSpace } from '../../lib/dockSpace';
import { useCalEvents } from '../../lib/useEvents';
import { useNowMin } from '../../lib/useNow';
import { isInfoDay } from '../../lib/feiertage';
import { evInk } from '../../lib/evColor';
import { TODAY, addDays, daysBetween, dayNum, weekday, WD_SHORT, MONTHS_SHORT, monthIdx, minutes, hm } from '../../lib/dates';
import { tx, EN } from '../../i18n/lang';
import type { CalEvent, Person } from '../../state/types';
import { dropEvent } from './DayView';

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

/** A note stands behind the title only when it is a word or two ("Halle"); a whole address belongs to the Termin's page. */
const NOTE_MAX = 14;

/** One Termin as one flat line: the person's bar, time, icon, title, who as dots. Also used under the month. */
export const AgendaRow = React.memo(function AgendaRow({ e, date, over, people, next }: { e: CalEvent; date: string; over: boolean; people: Person[]; /** The next one today: its time stands out. */ next?: boolean }) {
  const span = !!e.endDate && e.endDate > e.date;
  const ink = evInk(e);
  const lead = span ? tx(`Tag ${daysBetween(e.date, date) + 1}`, `Day ${daysBetween(e.date, date) + 1}`) : e.allDay ? tx('Tag', 'Day') : hm(e.start);
  const note = e.work ? '' : e.place ?? e.sub ?? '';
  return (
    <Fresh id={e.id} radius={10}>
      <SwipeRow bg={tokens.bg} onDelete={() => dropEvent(e)}>
        <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={`${e.title}, ${lead}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: ROW, opacity: over ? 0.45 : 1 }}>
          <View style={{ width: 3, alignSelf: 'stretch', marginVertical: 6, borderRadius: 2, backgroundColor: ink }} />
          <Txt size={14} line={18} weight={next ? 600 : 400} color={next ? tokens.accent : ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ width: LEAD - 11, fontVariant: ['tabular-nums'] }}>{lead}</Txt>
          <View style={{ width: 22, height: 22 }}>{e.work ? null : <ClayIcon name={e.icon} size={22} />}</View>
          <Txt size={16.5} line={21} weight={400} color={e.work ? tokens.sub : tokens.ink} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
            {e.title}
            {note && note.length <= NOTE_MAX ? <Txt size={13.5} line={21} color={tokens.mute}>{`  ${note}`}</Txt> : null}
          </Txt>
          <Dots e={e} people={people} />
        </PressScale>
      </SwipeRow>
    </Fresh>
  );
});

/** The fine line for now, with its dot reaching into the day's gutter. */
function NowLine() {
  return (
    <View style={{ height: 1, marginVertical: 2 }}>
      <View style={{ position: 'absolute', left: -GUTTER + 30, right: 0, top: 0, height: 1.5, borderRadius: 1, backgroundColor: tokens.accent }} />
      <View style={{ position: 'absolute', left: -GUTTER + 26, top: -2.75, width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.accent }} />
    </View>
  );
}

type DayData = { date: string; events: CalEvent[]; info: string };

const Day = React.memo(function Day({ d, first, now, people, month }: { d: DayData; first: boolean; now: number; people: Person[]; /** First day shown of a new month: its short name stands under the number, where today says "Heute". */ month?: string }) {
  const today = d.date === TODAY;
  const colour = today ? tokens.accent : tokens.ink;
  // Now sits above the first Termin that has not started yet.
  const timed = d.events.some((e) => !e.allDay);
  const nowAt = today && timed ? d.events.findIndex((e) => !e.allDay && !(e.endDate && e.endDate > e.date) && minutes(e.start) > now) : -2;
  const under = today ? tx('Heute', 'Today') : month;
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingTop: first ? 2 : 8, paddingBottom: 8, borderTopWidth: first ? 0 : 1, borderTopColor: tokens.hair }}>
      <View style={{ width: GUTTER, paddingTop: 2 }} accessibilityLabel={today ? tx('Heute', 'Today') : undefined}>
        <Txt size={13} line={16} weight={400} color={tokens.sub}>{WD_SHORT[weekday(d.date)]}</Txt>
        <Txt size={21} line={24} weight={600} tracking={-0.4} color={colour}>{String(dayNum(d.date))}</Txt>
        {under ? <Txt size={11} line={14} weight={600} color={today ? tokens.accent : tokens.mute} numberOfLines={1}>{under}</Txt> : null}
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
        {today && !d.events.length ? <Txt size={14.5} line={20} color={tokens.sub} style={{ paddingVertical: 10 }}>{tx('Heute steht nichts an. Sag unten einfach, was ansteht.', 'Nothing today. Just say below what\'s coming up.')}</Txt> : null}
      </View>
    </View>
  );
});

/** `reach`: the list covers at least this many days from today (the onboarding shows a day that may lie further out). */
export default function AgendaView({ reach }: { reach?: number } = {}) {
  const events = useCalEvents();
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
      if (!d) { d = { date, events: [], info: '' }; at.set(date, d); }
      return d;
    };
    day(TODAY);
    for (const e of events) {
      const last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      // Work shifts stand in the hour grids (Tage, Woche); this list is for what the family has on.
      if (last < TODAY || e.date >= end || e.work) continue;
      if (isInfoDay(e)) { const d = day(e.date); d.info = d.info ? `${d.info} · ${e.title}` : e.title; continue; }
      for (let date = e.date < TODAY ? TODAY : e.date; date <= last && date < end; date = addDays(date, 1)) day(date).events.push(e);
    }
    const out = [...at.values()].sort((a, b) => a.date.localeCompare(b.date));
    for (const d of out) d.events.sort(byStart);
    return out;
  }, [events, count]);

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
      {days.map((d, i) => (
        <Day key={d.date} d={d} first={i === 0} now={d.date === TODAY ? now : 0} people={people} month={i > 0 && monthIdx(d.date) !== monthIdx(days[i - 1].date) ? MONTHS_SHORT[monthIdx(d.date)] : undefined} />
      ))}
    </ScrollView>
  );
}
