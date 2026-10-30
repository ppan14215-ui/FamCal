/**
 * Kalender · Tag (Julian 27.10.: the calendar is the key view, content nested
 * with hierarchy). The week strip stays on top while only the days scroll
 * underneath, endlessly, week after week. The strip follows along: its outline
 * glides to the day you are looking at and the week slides over when you
 * cross into the next one.
 * Each day is one card: who works when, the Termine with what to bring right
 * under them, then the day's tasks and deadlines. Everything a spoken change
 * touches can light up (Fresh).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springs } from '../../theme';
import { useScroller } from '../../lib/landing';
import { useDockSpace } from '../../lib/dockSpace';
import { router } from 'expo-router';
import { Meta, Check, Head } from '../../components/ui/kit';
import Txt from '../../components/ui/Txt';
import { Tile } from '../../components/ui/Clay';
import { Avatar, Owner } from '../../components/ui/Person';
import Stripes from '../../components/Stripes';
import { tokens, persons, PersonId } from '../../theme';
import { useStore, actions, get, toast } from '../../state/store';
import SwipeRow, { justSwiped } from '../../components/SwipeRow';
import Fresh from '../../components/Fresh';
import LineIcon from '../../components/ui/LineIcon';
import type { CalEvent, Task, Doc } from '../../state/types';
import { eventsOn } from '../../lib/selectors';
import { dropPhoneEvents } from '../../lib/phoneSync';
import { addDays, monday, dayNum, WD_SHORT, weekday, WD_LONG, hm, TODAY, short, until, MONTHS_SHORT, monthIdx, daysBetween, dmShort, wdDay } from '../../lib/dates';
import { upcomingFristen } from '../../lib/selectors';
import { dayLabel } from '../../lib/talk';
import PressScale from '../../components/ui/PressScale';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';
import { useCalEvents } from '../../lib/useEvents';

/** A multi-day Termin (Urlaub) shows on every day it covers, not only its first (Julian 28.10.). */
const covers = (e: CalEvent, d: string) => e.date === d || (!!e.endDate && e.date < d && d <= e.endDate);

const GAP = 5;

export function WeekStrip({ day, onSelect }: { day: string; onSelect: (d: string) => void }) {
  const events = useCalEvents();
  const start = monday(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [w, setW] = useState(0);
  const slot = w ? (w - GAP * 6) / 7 : 0;
  const idx = days.indexOf(day);
  // Today is coloured; the outline glides to the day in view (Julian 27.10.).
  const x = useSharedValue(idx);
  useEffect(() => { x.value = withSpring(idx, springs.smooth); }, [idx]);
  const ring = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (slot + GAP) }] }));
  // A new week slides in from the side it comes from.
  const prev = useRef(start);
  const slideX = useSharedValue(0);
  const op = useSharedValue(1);
  useEffect(() => {
    if (prev.current === start) return;
    const dir = start > prev.current ? 1 : -1;
    prev.current = start;
    slideX.value = dir * 36; op.value = 0.2;
    slideX.value = withTiming(0, { duration: 320, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    op.value = withTiming(1, { duration: 240 });
  }, [start]);
  const row = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: slideX.value }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ flexDirection: 'row', gap: GAP }, row]}>
        {days.map((d) => {
          const has = events.some((e) => covers(e, d) && !e.work);
          return (
            <PressScale
              key={d}
              onPress={() => onSelect(d)}
              accessibilityLabel={wdDay(d, true)}
              accessibilityState={{ selected: d === day }}
              style={{ flex: 1, height: 66, borderRadius: 18, backgroundColor: d === TODAY ? tokens.doneSoft : tokens.row, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <Txt size={12} weight={d === TODAY ? 600 : 400} color={d === TODAY ? tokens.done : tokens.sub}>{WD_SHORT[weekday(d)]}</Txt>
              <Txt size={19} line={22} weight={d === TODAY ? 700 : 600} color={d === TODAY ? tokens.done : tokens.ink}>{String(dayNum(d))}</Txt>
              <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: has ? tokens.done : 'transparent' }} />
            </PressScale>
          );
        })}
      </Animated.View>
      {slot && idx >= 0 ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: slot, height: 66, borderRadius: 18, borderWidth: 1.5, borderColor: tokens.ink }, ring]} /> : null}
    </View>
  );
}

const byStart = (a: CalEvent, b: CalEvent) => (a.allDay ? -1 : b.allDay ? 1 : a.start.localeCompare(b.start));

/** One Termin with what belongs to it underneath. */
/** Swipe left deletes (Julian 28.10.); a day of a series goes alone, the toast brings it back. */
function dropEvent(e: CalEvent) {
  if (e.id.includes('~')) {
    const before = actions.skipOccurrence(e.id);
    if (before) toast(tx(`„${e.title}“ an diesem Tag gelöscht`, `“${e.title}” deleted on this day`), () => actions.restoreEvent(before));
    return;
  }
  const gone = get().events.find((x) => x.id === e.id);
  if (!gone) return;
  actions.removeEvent(gone.id);
  // A Termin from the phone calendar stays gone, or the next sync brings it back.
  void dropPhoneEvents([gone.id]);
  toast(tx(`„${gone.title}“ gelöscht`, `“${gone.title}” deleted`), () => { actions.addEvent(gone); void dropPhoneEvents([gone.id], true); });
}

function Item({ e, last, date }: { e: CalEvent; last: boolean; date: string }) {
  const later = date > e.date;
  const span = !!e.endDate && e.endDate > e.date;
  const bring = e.bring ?? [];
  const open = bring.filter((b) => !b.done);
  if (e.work) {
    // Work is a Termin, but it looks like a block of time, not an appointment (Julian 30.10.).
    const p = (e.who === 'J' ? 'J' : 'T') as PersonId;
    return (
      <Fresh id={e.id}>
        <SwipeRow onDelete={() => dropEvent(e)}>
          <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={tx('Arbeit ansehen', 'View work')} style={{ paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.hair }}>
            <Stripes p={p} radius={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 12 }}>
              <Avatar p={p} size={22} />
              <Txt size={14.5} weight={600} color={persons[p].ink} style={{ flex: 1 }} numberOfLines={1}>{e.title}</Txt>
              <Txt size={13.5} weight={600} color={persons[p].ink}>{e.allDay || !e.end ? tx('ganztägig', 'all day') : `${hm(e.start)} ${tx('bis', 'to')} ${hm(e.end)}`}</Txt>
            </Stripes>
          </PressScale>
        </SwipeRow>
      </Fresh>
    );
  }
  return (
    <Fresh id={e.id}>
      <SwipeRow onDelete={() => dropEvent(e)}>
      <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: tokens.hair }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt size={13.5} weight={600} style={{ width: 42 }}>{later || span ? tx(`Tag ${daysBetween(e.date, date) + 1}`, `Day ${daysBetween(e.date, date) + 1}`) : e.allDay ? tx('Tag', 'All day') : hm(e.start)}</Txt>
          <Tile name={e.icon} size={46} radius={14} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={16} line={21} weight={600} numberOfLines={1}>{e.title}</Txt>
            {/* The day count says how far along it is (Julian 30.10.: "until macht keinen Sinn"); the last day says so. */}
            {span && date === e.endDate ? <Meta numberOfLines={1}>{tx('letzter Tag', 'last day')}{e.place || e.sub ? ` · ${e.place ?? e.sub}` : ''}</Meta> : e.place || e.sub ? <Meta numberOfLines={1}>{e.place ?? e.sub}</Meta> : null}
          </View>
          <Owner who={e.who} />
        </View>
        {bring.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 42 + 12 + 46 + 12 }}>
            <LineIcon name={open.length ? 'list' : 'check'} size={14} color={open.length ? tokens.sub : tokens.done} />
            <Txt size={13} line={18} color={open.length ? tokens.sub : tokens.done} numberOfLines={1} style={{ flex: 1 }}>
              {open.length ? tx(`Mitbringen: ${open.map((b) => b.t).join(', ')}`, `Bring: ${open.map((b) => b.t).join(', ')}`) : tx('Alles dabei', 'All packed')}
            </Txt>
          </View>
        ) : null}
      </PressScale>
      </SwipeRow>
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
          <PressScale key={w.id} scale={0.97} onPress={() => router.push(`/termin/${w.id}`)} accessibilityLabel={tx('Arbeit ansehen', 'View work')}>
            <Stripes p={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 8, borderRadius: 999 }}>
              <Avatar p={p} size={16} />
              <Txt size={12.5} weight={600} color={persons[p].ink}>{w.allDay || !w.end ? tx('Arbeit', 'Work') : tx(`Arbeit ${hm(w.start)} bis ${hm(w.end)}`, `Work ${hm(w.start)} to ${hm(w.end)}`)}</Txt>
            </Stripes>
          </PressScale>
        );
      })}
    </View>
  );
}

// Memoised: scrolling changes the chosen day many times a second, and every day redrew with it.
const Day = React.memo(function Day({ date, events, tasks, docs, onY }: { date: string; events: CalEvent[]; tasks: Task[]; docs: Doc[]; onY: (date: string, y: number) => void }) {
  // Work is a Termin like any other (Julian 30.10.): it sits in the list, opens, changes and deletes the same way.
  const work: CalEvent[] = [];
  const real = [...events].sort(byStart);
  const empty = !real.length && !tasks.length && !docs.length;
  const past = date < TODAY;
  // A free day is one quiet line, so the busy ones carry the page.
  if (empty && date !== TODAY && !work.length) {
    return (
      <View onLayout={(e) => onY(date, e.nativeEvent.layout.y)} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', opacity: past ? 0.6 : 1 }}>
        <Txt size={16} line={22} weight={600} color={tokens.sub}>{dayLabel(date)}</Txt>
        <Txt size={13.5} color={tokens.mute}>{tx('frei', 'free')}</Txt>
      </View>
    );
  }
  return (
    <View onLayout={(e) => onY(date, e.nativeEvent.layout.y)} style={{ gap: 8, opacity: past ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt size={21} line={26} weight={700} tracking={-0.4}>{dayLabel(date)}</Txt>
        <Txt size={13.5} color={tokens.sub}>{date === TODAY || date === addDays(TODAY, 1) ? `${WD_LONG[weekday(date)]}, ${dmShort(date)}` : past ? 'vorbei' : until(date)}</Txt>
      </View>
      <WorkLine work={work} />
      {empty ? (
        <Meta>{date === TODAY ? tx('Heute steht nichts an. Sag unten einfach, was ansteht.', 'Nothing today. Just say below what\'s coming up.') : tx('Sonst frei.', 'Otherwise free.')}</Meta>
      ) : (
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: tokens.row }}>
          {real.map((e, i) => <Item key={e.id} e={e} date={date} last={i === real.length - 1 && !tasks.length && !docs.length} />)}
          {tasks.length ? (
            <View style={{ borderTopWidth: real.length ? 1 : 0, borderTopColor: tokens.hair }}>
              <Sub>{tx('Aufgaben', 'Tasks')}</Sub>
              {tasks.map((t) => (
                <Fresh key={t.id} id={t.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
                    <Check done={t.done} onPress={() => actions.toggleTask(t.id)} />
                    <Txt size={15.5} weight={600} strike={t.done} color={t.done ? tokens.mute : tokens.ink} style={{ flex: 1 }} numberOfLines={1}>{t.title}</Txt>
                    {t.due && t.due < date ? <Txt size={12.5} color={tokens.frist}>{tx(`seit ${short(t.due)}`, `since ${short(t.due)}`)}</Txt> : null}
                    <Owner who={t.who} />
                  </View>
                </Fresh>
              ))}
            </View>
          ) : null}
          {docs.length ? (
            <View style={{ borderTopWidth: real.length || tasks.length ? 1 : 0, borderTopColor: tokens.hair }}>
              <Sub>{tx('Frist', 'Due')}</Sub>
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
});

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
          <Txt size={13} color={tokens.frist}>{`${tx('Frist', 'Due')} ${dmShort(d.frist!)} · ${until(d.frist!)}`}</Txt>
        </PressScale>
      ))}
    </View>
  );
}

/** A quiet line where a new week starts. */
function WeekLine({ start }: { start: string }) {
  const end = addDays(start, 6);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <Txt size={12} weight={600} tracking={0.4} color={tokens.mute}>{`${dmShort(start)} ${tx('bis', 'to')} ${dmShort(end)}`.toUpperCase()}</Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: tokens.hair }} />
    </View>
  );
}

/** Back to today, shown only while you are somewhere else (Julian 27.10.). */
function TodayChip({ away, above, onPress }: { away: boolean; above: boolean; onPress: () => void }) {
  const v = useSharedValue(away ? 1 : 0);
  useEffect(() => { v.value = withSpring(away ? 1 : 0, springs.smooth); }, [away]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.85 + 0.15 * v.value }] }));
  return (
    <Animated.View pointerEvents={away ? 'auto' : 'none'} style={st}>
      <PressScale accessibilityLabel={tx('Zu heute springen', 'Jump to today')} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingLeft: 12, paddingRight: 10, borderRadius: 999, backgroundColor: tokens.ink }}>
        <Txt size={14} weight={600} color={tokens.onInk}>{tx('Heute', 'Today')}</Txt>
        <View style={{ transform: [{ rotate: above ? '-90deg' : '90deg' }] }}><LineIcon name="chev" size={14} color={tokens.onInk} stroke={2.2} /></View>
      </PressScale>
    </Animated.View>
  );
}

const FIRST = addDays(monday(TODAY), -14);
const MORE = 28;

/** The week strip and the endless list of days under it, as one piece. */
export default function DayView({ header }: { header: (today: React.ReactNode) => React.ReactNode }) {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const tasks = useStore((s) => s.tasks);
  const docs = useStore((s) => s.docs);
  const insets = useSafeAreaInsets();
  const dock = useDockSpace();
  const ref = useRef<ScrollView>(null);
  const track = useScroller(ref);
  const ys = useRef<Record<string, number>>({});
  const view = useRef(0);
  // Up to the chosen day plus four weeks, then four more each time the end comes near.
  // Not up to the last Termin any more: with work days until Christmas that drew
  // half a year of days at once, and switching to Tage took ages (Julian 30.10. 22:19).
  const [count, setCount] = useState(() => Math.max(daysBetween(FIRST, day) + MORE, 35));
  const total = Math.max(count, daysBetween(FIRST, day) + MORE);
  const days = useMemo(() => Array.from({ length: total }, (_, i) => {
    const date = addDays(FIRST, i);
    return {
      date,
      events: events.filter((e) => covers(e, date)),
      tasks: tasks.filter((t) => t.who !== undefined && t.due && (t.due === date || (date === TODAY && t.due < TODAY && !t.done))),
      docs: docs.filter((d) => d.frist === date),
    };
  }), [total, events, tasks, docs]);

  // Opens at the chosen day, once.
  const opened = useRef(false);
  const first = useRef(day);
  const onYRef = useRef<(date: string, y: number) => void>(() => {});
  const onYStable = React.useCallback((date: string, y: number) => onYRef.current(date, y), []);
  const onY = (date: string, y: number) => {
    ys.current[date] = y;
    if (!opened.current && date === first.current) {
      opened.current = true;
      requestAnimationFrame(() => ref.current?.scrollTo({ y: Math.max(0, y - 2), animated: false }));
    }
  };
  onYRef.current = onY;

  // The day at the top of the list is the day the strip shows.
  const seen = useRef(day);
  const spy = (y: number) => {
    let top = days[0].date;
    for (const d of days) { const dy = ys.current[d.date]; if (dy !== undefined && dy <= y + 24) top = d.date; else if (dy !== undefined) break; }
    if (top !== seen.current) { seen.current = top; actions.setCalDay(top); }
  };

  const pick = (d: string) => {
    haptics.select();
    seen.current = d;
    actions.setCalDay(d);
    const y = ys.current[d];
    if (y !== undefined) ref.current?.scrollTo({ y: Math.max(0, y - 2), animated: true });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Same head as every tab (Julian 30.10.: "Calendar header zu chat header springt"). */}
      <Head>
        {header(<TodayChip away={day !== TODAY} above={day > TODAY} onPress={() => pick(TODAY)} />)}
        <WeekStrip day={day} onSelect={pick} />
      </Head>
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
          spy(contentOffset.y);
          if (contentSize.height - contentOffset.y - view.current < 900) setCount((c) => (c < total + 1 ? total + MORE : c));
        }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 110 + insets.bottom + dock, gap: 18 }}
      >
        {days.map((d) => (
          <React.Fragment key={d.date}>
            {weekday(d.date) === 1 && d.date !== FIRST ? <WeekLine start={d.date} /> : null}
            {d.date === TODAY ? <Fristen /> : null}
            <Day {...d} onY={onYStable} />
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}
