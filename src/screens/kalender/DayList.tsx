/**
 * Kalender in the lines of the brand (27.11., "Der Dritte im Bunde"): a day is a list, not an hour grid. Every
 * Termin is one row on the grey group: its time, the person's bar, the title with one grey line, the faces of who is
 * in it. What is over turns pale, a red line says where now is. Under today's Termine stand today's Aufgaben.
 *
 * The week is the same list for seven days under a strip of the week. A tap on a day in the strip glides the list to
 * that day (320 ms, the app's ease-out); a swipe on the strip brings the next or the last week.
 *
 * A tap on a row opens the Termin, a swipe to the left deletes it (then Rückgängig). A Termin that just landed
 * punches once (Fresh). Rows rise in one after another when the view opens. Transform and opacity only.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Txt from '../../components/ui/Txt';
import PressScale from '../../components/ui/PressScale';
import { Check } from '../../components/ui/kit';
import { SectionLabel, Initials } from '../../components/ui/Group';
import Fresh from '../../components/Fresh';
import SwipeRow, { justSwiped, markSwiped } from '../../components/SwipeRow';
import { navTop } from '../../components/NavBar';
import { tokens, easing, rise, cardOut, rowLayout } from '../../theme';
import { useStore, actions, get } from '../../state/store';
import { useCalEvents } from '../../lib/useEvents';
import { useNowMin } from '../../lib/useNow';
import { isInfoDay } from '../../lib/feiertage';
import { evFill } from '../../lib/evColor';
import { isShift, shiftSpan } from '../../lib/shift';
import { haptics } from '../../lib/haptics';
import { TODAY, addDays, daysBetween, dayNum, weekday, monday, WD_SHORT, WD_LONG, minutes, hm } from '../../lib/dates';
import { tx, EN } from '../../i18n/lang';
import type { CalEvent, Task } from '../../state/types';
import { dropEvent } from './DayView';

const RED = '#E5484D';
const byStart = (a: CalEvent, b: CalEvent) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
const spans = (e: CalEvent) => !!e.endDate && e.endDate > e.date;
const onDay = (e: CalEvent, day: string) => e.date === day || (spans(e) && e.date < day && day <= e.endDate!);
const endMin = (e: CalEvent) => (e.end && e.end > e.start ? minutes(e.end) : minutes(e.start) + 30);
// Reanimated's layout transition can pin a row out of place in mobile Safari.
const slide = Platform.OS === 'web' ? undefined : rowLayout;

/** The day's Termine: all day first, then by time. Work is a Termin here too, with its hours. */
function dayItems(events: CalEvent[], day: string) {
  const whole: CalEvent[] = [], timed: CalEvent[] = [];
  let info = '';
  for (const e of events) {
    if (!onDay(e, day)) continue;
    if (isInfoDay(e)) { info = info ? `${info} · ${e.title}` : e.title; continue; }
    (e.allDay || spans(e) ? whole : timed).push(e);
  }
  timed.sort(byStart);
  return { items: [...whole, ...timed], info };
}

/** "09:30" in German (the time column stays straight), "9:30am" in English. */
const clock = (t: string) => (EN ? hm(t) : t);
const TIME_W = EN ? 54 : 46;

function timeOf(e: CalEvent, day: string): string {
  if (spans(e)) return tx(`Tag ${daysBetween(e.date, day) + 1}`, `Day ${daysBetween(e.date, day) + 1}`);
  if (e.allDay) return tx('ganzt.', 'all day');
  if (isShift(e)) return clock(shiftSpan(e)[0]);
  return clock(e.start);
}

function metaOf(e: CalEvent): string {
  if (isShift(e)) { const [a, b] = shiftSpan(e); return `${hm(a)} ${tx('bis', 'to')} ${hm(b)}`; }
  return e.place ?? e.sub ?? '';
}

/** One Termin as a row of the group. */
export const EvRow = React.memo(function EvRow({ e, day, past, label, note }: { e: CalEvent; day: string; past?: boolean; /** Instead of the time (the year's list: "2. Jan"). */ label?: string; note?: string }) {
  const when = label ?? timeOf(e, day);
  const meta = note ?? metaOf(e);
  return (
    <Fresh id={e.id} bleed={14}>
      <SwipeRow bg={tokens.group} onDelete={() => dropEvent(e)}>
        <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={`${e.title}, ${when}`}
          style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, backgroundColor: tokens.group }}>
          <Txt size={14} line={18} weight={500} color={past ? tokens.mute : tokens.ink} numberOfLines={1} style={{ width: label ? 60 : TIME_W, fontVariant: ['tabular-nums'] }}>{when}</Txt>
          <View style={{ width: 3, height: 30, borderRadius: 2, backgroundColor: evFill(e), opacity: past ? 0.35 : 1 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15.5} line={20} weight={500} tracking={-0.19} color={past ? tokens.mute : tokens.ink} numberOfLines={2}>{e.title}</Txt>
            {meta ? <Txt size={13} line={17} color={past ? tokens.mute : tokens.sub} numberOfLines={1}>{meta}</Txt> : null}
          </View>
          <View style={{ opacity: past ? 0.45 : 1 }}><Initials who={e.who} people={e.people} /></View>
        </PressScale>
      </SwipeRow>
    </Fresh>
  );
});

/** The red line of now, across the group, with its pill sticking out on the left edge. */
function NowLine() {
  return (
    <View pointerEvents="none" accessibilityLabel={tx('Jetzt', 'Now')} style={{ height: 0, zIndex: 2 }}>
      <View style={{ position: 'absolute', left: -14, right: -14, top: -1, height: 2, backgroundColor: RED }} />
      <View style={{ position: 'absolute', left: -14, top: -10, height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: RED, justifyContent: 'center' }}>
        <Txt size={11.5} line={14} weight={600} color="#FFFFFF">{tx('Jetzt', 'Now')}</Txt>
      </View>
    </View>
  );
}

/** A grey group whose rows can each come and go (rise in, sink away), with the lines between them. */
export function Rows({ children }: { children: React.ReactNode[] }) {
  return (
    <View style={{ backgroundColor: tokens.group, borderRadius: 16, paddingHorizontal: 14 }}>
      {children}
    </View>
  );
}

export function Line() {
  return <View style={{ height: 1, backgroundColor: tokens.groupLine }} />;
}

/** One day's Termine as a group. `now` draws the line of now (today only); `arrive` lets the rows rise in. */
function DayGroup({ items, day, now, arrive }: { items: CalEvent[]; day: string; now?: number; arrive?: (i: number) => any }) {
  const nowAt = now == null ? -1 : (() => { const i = items.findIndex((e) => !(e.allDay || spans(e)) && endMin(e) > now); return i < 0 ? items.length : i; })();
  const isPast = (e: CalEvent) => now != null && !(e.allDay || spans(e)) && endMin(e) <= now;
  const rows: React.ReactNode[] = [];
  items.forEach((e, i) => {
    rows.push(
      <Animated.View key={e.id} entering={arrive?.(i)} exiting={cardOut} layout={slide}>
        {i && !(i === nowAt) ? <Line /> : null}
        {i === nowAt && i > 0 ? <NowLine /> : null}
        <EvRow e={e} day={day} past={isPast(e)} />
      </Animated.View>,
    );
  });
  if (nowAt === items.length && items.length) rows.push(<View key="now" style={{ height: 0 }}><NowLine /></View>);
  return <Rows>{rows}</Rows>;
}

/** Today's open Aufgaben, and what was ticked today (pale, so the tick can be seen landing). */
function useDayTasks(day: string): Task[] {
  const tasks = useStore((s) => s.tasks);
  return useMemo(() => tasks.filter((t) => {
    if (t.done) return !!t.doneAt && t.doneAt.slice(0, 10) === day;
    if (!t.due) return false;
    return day === TODAY ? t.due <= day : t.due === day;
  }), [tasks, day]);
}

function TaskRow({ t }: { t: Task }) {
  return (
    <Fresh id={t.id} bleed={14}>
      <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
        <Check done={t.done} onPress={() => { haptics.select(); actions.toggleTask(t.id); }} />
        <PressScale scale={0.985} onPress={() => router.navigate('/listen')} style={{ flex: 1, minWidth: 0 }} accessibilityLabel={t.title}>
          <Txt size={15.5} line={20} weight={500} tracking={-0.19} color={t.done ? tokens.mute : tokens.ink} numberOfLines={2}>{t.title}</Txt>
          {t.sub || t.dueLabel ? <Txt size={13} line={17} color={t.done ? tokens.mute : tokens.sub} numberOfLines={1}>{t.sub ?? t.dueLabel}</Txt> : null}
        </PressScale>
        <View style={{ opacity: t.done ? 0.45 : 1 }}><Initials who={t.who} /></View>
      </View>
    </Fresh>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Rows>
      {[<View key="e" style={{ minHeight: 56, justifyContent: 'center', paddingVertical: 11 }}><Txt size={15} line={20} color={tokens.sub}>{text}</Txt></View>]}
    </Rows>
  );
}

/** Kalender · Heute: the chosen day (today unless the week picked another), its Termine and its Aufgaben. */
export function TodayList() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const insets = useSafeAreaInsets();
  const now = useNowMin();
  const { items, info } = useMemo(() => dayItems(events, day), [events, day]);
  const tasks = useDayTasks(day);
  const born = useRef(Date.now());
  const arrive = (i: number) => (Date.now() - born.current < 1200 ? rise(i) : undefined);
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: navTop(insets.bottom) + 40 }}>
      {info ? <Txt size={13} line={17} color={tokens.sub} numberOfLines={1} style={{ paddingBottom: 10 }}>{info}</Txt> : null}
      {items.length ? <DayGroup items={items} day={day} now={day === TODAY ? now : undefined} arrive={arrive} />
        : <Empty text={day === TODAY ? tx('Heute steht nichts an. Sag Memo einfach, was ansteht.', 'Nothing today. Just tell Memo what\'s coming up.') : tx('Nichts eingetragen.', 'Nothing planned.')} />}
      {tasks.length ? (
        <>
          <SectionLabel>{tx('Aufgaben', 'To-dos')}</SectionLabel>
          <Rows>
            {tasks.map((t, i) => (
              <Animated.View key={t.id} entering={arrive(items.length + i)} exiting={cardOut} layout={slide}>
                {i ? <Line /> : null}
                <TaskRow t={t} />
              </Animated.View>
            ))}
          </Rows>
        </>
      ) : null}
    </ScrollView>
  );
}

/** One day of the strip: short weekday, number, up to three dots in the colours of who has something. */
function StripDay({ day, sel, dots, onPress }: { day: string; sel: boolean; dots: string[]; onPress: () => void }) {
  const today = day === TODAY;
  const v = useSharedValue(sel ? 1 : 0);
  useEffect(() => { v.value = withTiming(sel ? 1 : 0, { duration: 250, easing: easing.out }); }, [sel]);
  const pill = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.92 + 0.08 * v.value }] }));
  return (
    <PressScale scale={0.94} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={`${WD_LONG[weekday(day)]}, ${dayNum(day)}.`} style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 2, right: 2, borderRadius: 14, backgroundColor: tokens.ink }, pill]} />
      <View style={{ alignItems: 'center', gap: 2, paddingTop: 7, paddingBottom: 8 }}>
        <Txt size={12} line={16} weight={500} color={sel ? '#C9D6D4' : tokens.sub}>{WD_SHORT[weekday(day)]}</Txt>
        <Txt size={17} line={22} weight={600} tracking={-0.34} color={sel ? '#FFFFFF' : today ? RED : tokens.ink} style={{ fontVariant: ['tabular-nums'] }}>{dayNum(day)}</Txt>
        <View style={{ height: 6, marginTop: 3, flexDirection: 'row', gap: 3 }}>
          {dots.map((c, i) => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c }} />)}
        </View>
      </View>
    </PressScale>
  );
}

/** The week's strip on its own: in the head of the page, above the list that scrolls. */
export function WeekStripBar() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const start = monday(day);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const dots = useMemo(() => days.map((d) => {
    const seen: string[] = [];
    for (const e of dayItems(events, d).items) { const c = evFill(e); if (!seen.includes(c)) seen.push(c); if (seen.length === 3) break; }
    return seen;
  }), [events, days]);
  const W = useSharedValue(360);
  const x = useSharedValue(0);
  const page = (dir: number) => { haptics.select(); actions.setCalDay(addDays(get().calDay, dir * 7)); };
  const pan = Gesture.Pan().activeOffsetX([-16, 16]).failOffsetY([-12, 12])
    .onStart(() => { scheduleOnRN(markSwiped); })
    .onUpdate((e) => { x.value = e.translationX * 0.4; })
    .onEnd((e) => {
      x.value = withTiming(0, { duration: 200 });
      if (Math.abs(e.translationX) > 50 || Math.abs(e.velocityX) > 600) scheduleOnRN(page, e.translationX < 0 ? 1 : -1);
    });
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <GestureDetector gesture={pan} touchAction="pan-y">
      <Animated.View onLayout={(e) => { W.value = e.nativeEvent.layout.width; }} style={[{ flexDirection: 'row', marginHorizontal: -2 }, st]}>
        {days.map((d, i) => (
          <StripDay key={d} day={d} sel={d === day} dots={dots[i]} onPress={() => { if (justSwiped()) return; haptics.select(); actions.setCalDay(d); }} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

/** One day as its header ("Freitag, 27." and a red "Heute") and its group: under the month and the week. */
export function DaySection({ day, arrive }: { day: string; arrive?: (i: number) => any }) {
  const events = useCalEvents();
  const now = useNowMin();
  const { items, info } = useMemo(() => dayItems(events, day), [events, day]);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
        <Txt size={17} line={22} weight={600} tracking={-0.25}>{tx(`${WD_LONG[weekday(day)]}, ${dayNum(day)}.`, `${WD_LONG[weekday(day)]} ${dayNum(day)}`)}</Txt>
        {day === TODAY ? <Txt size={12} line={16} weight={600} color={RED}>{tx('Heute', 'Today')}</Txt> : null}
        {info ? <Txt size={12} line={16} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1 }}>{info}</Txt> : null}
      </View>
      {items.length ? <DayGroup items={items} day={day} now={day === TODAY ? now : undefined} arrive={arrive} /> : <Empty text={tx('Nichts eingetragen.', 'Nothing planned.')} />}
    </View>
  );
}

/** Kalender · Woche: the seven days of the chosen day's week as groups; the list glides to the chosen day. */
export function WeekList() {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const insets = useSafeAreaInsets();
  const now = useNowMin();
  const start = monday(day);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const lists = useMemo(() => days.map((d) => dayItems(events, d)), [events, days]);
  const ref = useRef<ScrollView>(null);
  const tops = useRef<Record<string, number>>({});
  const [laid, setLaid] = useState(0);
  const first = useRef(true);
  // The glide: on the web the browser's smooth scroll, on the phone the native one (both ease out, about 300 ms).
  useEffect(() => {
    const y = tops.current[day];
    if (y == null) return;
    ref.current?.scrollTo({ y: Math.max(0, y - 4), animated: !first.current });
    first.current = false;
  }, [day, laid]);
  const born = useRef(Date.now());
  const arrive = (i: number) => (Date.now() - born.current < 1200 ? rise(i) : undefined);
  let n = 0;
  return (
    <ScrollView ref={ref} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: navTop(insets.bottom) + 320 }}>
      {days.map((d, i) => {
        const { items, info } = lists[i];
        const base = n;
        n += Math.max(1, items.length);
        return (
          <View key={d} onLayout={(e) => { tops.current[d] = e.nativeEvent.layout.y; if (i === 6) setLaid((k) => k + 1); }} style={{ paddingBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <Txt size={15} line={20} weight={600} tracking={-0.18}>{tx(`${WD_LONG[weekday(d)]}, ${dayNum(d)}.`, `${WD_LONG[weekday(d)]} ${dayNum(d)}`)}</Txt>
              {d === TODAY ? <Txt size={12} line={16} weight={600} color={RED}>{tx('Heute', 'Today')}</Txt> : null}
              {info ? <Txt size={12} line={16} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1 }}>{info}</Txt> : null}
            </View>
            {items.length ? <DayGroup items={items} day={d} now={d === TODAY ? now : undefined} arrive={(k) => arrive(base + k)} /> : <Empty text={tx('Frei', 'Free')} />}
          </View>
        );
      })}
    </ScrollView>
  );
}
