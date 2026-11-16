/**
 * Kalender · Heute after the reference Julian chose (16.11.: "screen 8 should be reference for our today view"):
 * the week as a strip with the chosen day on a light tile, and under it that one day. The hours stand down the
 * left, and every Termin is a card: the person's bar, the title, one grey line, the faces of who is in it and the
 * time span. The current hour stands in a pill. Nothing else is on a card (no second action, no sources).
 *
 * The hours follow the cards instead of a fixed grid: the hours a Termin covers spread over its card, free time
 * between two Termine is a gap that grows with it. So a card is never cut to fit and never lies over another one.
 * What is over today turns grey. A tap opens the Termin, a swipe to the left deletes (then Rückgängig).
 *
 * The page lies on the reference's grey ground with cards a shade lighter (Julian 16.11.: "the bg is grey"), and it
 * fades out under the head and before the nav ("We are missing the fade out").
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Txt from '../../components/ui/Txt';
import { ClayIcon } from '../../components/ui/Clay';
import LineIcon from '../../components/ui/LineIcon';
import PressScale from '../../components/ui/PressScale';
import { Faces } from '../../components/ui/Person';
import Fresh from '../../components/Fresh';
import SwipeRow, { justSwiped } from '../../components/SwipeRow';
import { navTop } from '../../components/NavBar';
import { tokens, springs, motion, easing, rowOut, rowLayout } from '../../theme';
import { useStore, actions } from '../../state/store';
import { useScroller, useLitIds } from '../../lib/landing';
import { useDockSpace } from '../../lib/dockSpace';
import { useCalEvents } from '../../lib/useEvents';
import { useNowMin } from '../../lib/useNow';
import { isInfoDay } from '../../lib/feiertage';
import { evInk } from '../../lib/evColor';
import { seriesId } from '../../lib/repeat';
import { haptics } from '../../lib/haptics';
import { TODAY, addDays, daysBetween, dayNum, weekday, monday, short, WD_SHORT, minutes, hm } from '../../lib/dates';
import { tx } from '../../i18n/lang';
import type { CalEvent } from '../../state/types';
import { dropEvent } from './DayView';

/** The card's corners, as round as in the reference. */
const R = 24;
/** Room inside a card. */
const PAD = 12;
/** The column of the hours, and the gap to the cards. */
const RAIL = 55;
const RAIL_GAP = 8;
/** Two Termine right after each other. */
const GAP = 15;
/** One free hour between two Termine. */
const FREE = 30;
/** The least room one hour gets inside a card, so the hours beside a long Termin never touch. */
const HOUR_MIN = 22;
const TITLE = 22, LINE = 20, FACE = 24, ROW_GAP = 8;
/** Where on a card its start stands (beside the title) and its end (beside the faces and the time, from the bottom). */
const START_AT = PAD + TITLE / 2;
const END_AT = PAD + FACE / 2;

const byStart = (a: CalEvent, b: CalEvent) => a.start.localeCompare(b.start);
const spans = (e: CalEvent) => !!e.endDate && e.endDate > e.date;
const onDay = (e: CalEvent, day: string) => e.date === day || (spans(e) && e.date < day && day <= e.endDate!);
/** Where a Termin ends on the hours; one without an end is only its start. */
const endMin = (e: CalEvent) => (e.end && e.end > e.start ? minutes(e.end) : minutes(e.start));
/** Over for today: it has ended, or started and has no end. */
const isOver = (e: CalEvent, now: number) => minutes(e.end && e.end > e.start ? e.end : e.start) <= now;
/** How tall a card is before it has been measured. */
const guess = (e: CalEvent) => PAD * 2 + TITLE + (e.place ?? e.sub ? LINE : 0) + ROW_GAP + FACE + (e.note ? ROW_GAP + 66 : 0);

/**
 * The week of the chosen day (the reference's strip): the weekday above its number, the chosen day on a light tile.
 * Today stands a little bolder. A swipe to the side brings the next or the last week.
 */
export function WeekStrip() {
  const day = useStore((s) => s.calDay);
  const start = monday(day);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  const W = useSharedValue(360);
  const x = useSharedValue(0);
  const op = useSharedValue(1);
  const go = (dir: number) => { haptics.select(); actions.setCalDay(addDays(day, dir * 7)); };
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
    <GestureDetector gesture={pan} touchAction="pan-y">
      <Animated.View onLayout={(e) => { W.value = e.nativeEvent.layout.width; }} style={[{ flexDirection: 'row' }, slide]}>
        {days.map((d) => {
          const sel = d === day;
          const today = d === TODAY;
          return (
            <PressScale key={d} scale={0.94} onPress={() => { if (!sel) { haptics.select(); actions.setCalDay(d); } }} accessibilityLabel={short(d)} accessibilityState={{ selected: sel }}
              style={[{ flex: 1, height: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 5 }, sel ? { backgroundColor: tokens.dayCard } : null]}>
              <Txt size={15} line={19} weight={today ? 600 : 400} color={today ? tokens.ink : tokens.sub} numberOfLines={1}>{WD_SHORT[weekday(d)]}</Txt>
              <Txt size={16} line={20} weight={today ? 600 : 500} style={{ fontVariant: ['tabular-nums'] }}>{String(dayNum(d))}</Txt>
            </PressScale>
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
}

/** One Termin as a card of the reference: bar, title and one grey line, its icon, then the faces and the time span. */
const TodayCard = React.memo(function TodayCard({ e, date, over }: { e: CalEvent; date: string; over: boolean }) {
  const ink = evInk(e);
  const when = spans(e) ? tx(`Tag ${daysBetween(e.date, date) + 1}`, `Day ${daysBetween(e.date, date) + 1}`)
    : e.allDay ? tx('Ganztags', 'All day')
    : e.end && e.end > e.start ? `${hm(e.start)} ${tx('bis', 'to')} ${hm(e.end)}` : hm(e.start);
  const line = e.place ?? e.sub ?? '';
  // A long Termin is a tall card, so every hour it covers has room beside it.
  const tall = e.allDay || spans(e) ? 0 : Math.round(((endMin(e) - minutes(e.start)) / 60) * HOUR_MIN + START_AT + END_AT);
  return (
    <Fresh id={e.id} radius={R} markAt={{ left: PAD, inset: PAD }}>
      <SwipeRow bg={tokens.day} radius={R} onDelete={() => dropEvent(e)}>
        <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={`${e.title}, ${when}`}
          style={{ flexDirection: 'row', gap: 12, padding: PAD, minHeight: tall, borderRadius: R, backgroundColor: tokens.dayCard, opacity: over ? 0.45 : 1 }}>
          <View style={{ width: 4, borderRadius: 2, backgroundColor: ink }} />
          <View style={{ flex: 1, minWidth: 0, gap: ROW_GAP }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={17} line={TITLE} weight={500} numberOfLines={1}>{e.title}</Txt>
                {line ? <Txt size={14.5} line={LINE} color={tokens.sub} numberOfLines={1}>{line}</Txt> : null}
              </View>
              <ClayIcon name={e.icon} size={28} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: FACE }}>
              <Faces who={e.who} people={e.people} size={FACE} ring={tokens.dayCard} />
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                <LineIcon name="clock" size={15} color={tokens.sub} />
                <Txt size={14.5} line={LINE} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1, fontVariant: ['tabular-nums'] }}>{when}</Txt>
              </View>
            </View>
            {e.note ? (
              <View style={{ borderRadius: 14, padding: 12, backgroundColor: tokens.dayNote }}>
                <Txt size={15} line={21} numberOfLines={4}>{e.note}</Txt>
              </View>
            ) : null}
          </View>
        </PressScale>
      </SwipeRow>
    </Fresh>
  );
});

const FADE = 88;
/**
 * The page fades out into the ground before it reaches the nav, as in the reference (Julian 16.11.: "We are missing
 * the fade out"). Solid from the nav's top down, so nothing reads through beside the pill.
 */
function GroundFade({ solid }: { solid: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <View style={{ height: FADE }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="dayfade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tokens.day} stopOpacity={0} />
              <Stop offset="0.45" stopColor={tokens.day} stopOpacity={0.5} />
              <Stop offset="0.8" stopColor={tokens.day} stopOpacity={0.9} />
              <Stop offset="1" stopColor={tokens.day} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#dayfade)" />
        </Svg>
      </View>
      <View style={{ height: solid + 1, marginTop: -1, backgroundColor: tokens.day }} />
    </View>
  );
}

// A Termin that goes fades out and the cards below slide into the gap (docs/MOTION.md). The web link skips the slide:
// Reanimated's layout transition can pin a row out of place in mobile Safari.
const slide = Platform.OS === 'web' ? undefined : rowLayout;

/**
 * `bottom` stands under today's Termine and scrolls with them (the briefing "Neu und offen").
 * `band` is the height of the solid ground under the fade, where the nav floats; 0 inside a frame without a nav.
 */
export default function TodayView({ bottom, band }: { bottom?: React.ReactNode; band?: number }) {
  const day = useStore((s) => s.calDay);
  const events = useCalEvents();
  const insets = useSafeAreaInsets();
  const dock = useDockSpace();
  const ref = useRef<ScrollView>(null);
  const track = useScroller(ref);
  const now = useNowMin();
  const today = day === TODAY;

  const { whole, timed, info } = useMemo(() => {
    const whole: CalEvent[] = [], timed: CalEvent[] = [];
    let info = '';
    for (const e of events) {
      // Work shifts stand in the hour grids (Tage, Woche); this page is for what the family has on.
      if (e.work || !onDay(e, day)) continue;
      if (isInfoDay(e)) { info = info ? `${info} · ${e.title}` : e.title; continue; }
      (e.allDay || spans(e) ? whole : timed).push(e);
    }
    timed.sort(byStart);
    return { whole, timed, info };
  }, [events, day]);

  // Every card says how tall it is; where it stands follows from that, the same on the phone and on the web.
  const [tall, setTall] = useState<Record<string, number>>({});
  const measure = (id: string) => (ev: { nativeEvent: { layout: { height: number } } }) => {
    const h = Math.round(ev.nativeEvent.layout.height);
    setTall((m) => (m[id] === h ? m : { ...m, [id]: h }));
  };

  /**
   * The day laid out: the gap above every card, and the hours beside them. Time runs through fixed points: a
   * Termin's start beside its title, its end beside its last row. An hour between two points lies between them,
   * so free hours stand evenly in the gap and an hour is never named twice.
   */
  const plan = useMemo(() => {
    const h = (e: CalEvent) => tall[e.id] ?? guess(e);
    let y = whole.reduce((sum, e) => sum + h(e) + GAP, 0);
    if (!timed.length) return { gaps: [] as number[], hours: [] as { h: number; y: number }[] };
    const first = minutes(timed[0].start);
    const last = timed.reduce((m, e) => Math.max(m, endMin(e)), 0);
    // Today the hours start at the current one when it lies before the first Termin, so "now" is always on the page.
    const from = Math.floor(Math.min(first, today && now < last ? now : first) / 60) * 60;
    const points: [number, number][] = [[from, y + 13]];
    const gaps: number[] = [];
    let covered = from;
    timed.forEach((e, i) => {
      const s = minutes(e.start), en = endMin(e);
      const gap = Math.round(i === 0 ? ((s - from) / 60) * FREE : Math.max(GAP, (Math.max(0, s - covered) / 60) * FREE));
      gaps.push(gap);
      y += gap;
      const top = y;
      y += h(e);
      if (s >= covered) { points.push([s, top + START_AT]); covered = s; }
      if (en > covered) { covered = en; points.push([en, y - END_AT]); }
      // A Termin inside another one's time: the hours wait until it is past.
      else if (s < covered) points.push([covered, y]);
    });
    const at = (t: number) => {
      let a = points[0];
      for (let i = 1; i < points.length; i++) {
        const b = points[i];
        if (b[0] <= t) { a = b; continue; }
        return a[1] + ((t - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
      }
      return a[1];
    };
    // The hours end with the last Termin.
    const hours: { h: number; y: number }[] = [];
    for (let t = from; t <= covered; t += 60) hours.push({ h: t / 60, y: Math.round(at(t)) });
    return { gaps, hours };
  }, [whole, timed, tall, today, now]);

  // The change must be seen where I am (Julian 14.11.): what just landed on another day takes the page to its day.
  const lit = useLitIds();
  const front = useRef(false);
  useFocusEffect(useCallback(() => { front.current = true; return () => { front.current = false; }; }, []));
  useEffect(() => {
    if (!front.current || !lit.size) return;
    const hit = events.filter((e) => lit.has(e.id) || lit.has(seriesId(e.id)));
    if (!hit.length || hit.some((e) => onDay(e, day))) return;
    actions.setCalDay((hit.find((e) => e.date >= TODAY) ?? hit[0]).date);
  }, [lit]);

  // Another day swaps in place: back to the top, and the cards come in with a short fade (opacity only).
  const fade = useSharedValue(1);
  const seen = useRef(day);
  useEffect(() => {
    if (seen.current === day) return;
    seen.current = day;
    ref.current?.scrollTo({ y: 0, animated: false });
    fade.value = 0;
    fade.value = withTiming(1, { duration: motion.micro, easing: easing.out });
  }, [day]);
  const shown = useAnimatedStyle(() => ({ opacity: fade.value }));

  const nowHour = today ? Math.floor(now / 60) : -1;
  const solid = band ?? navTop(insets.bottom) + dock;
  const none = !whole.length && !timed.length;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(e) => track(e.nativeEvent.contentOffset.y)}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: solid + FADE }}
    >
      <Animated.View style={shown}>
        {info ? <Txt size={13} line={18} color={tokens.mute} numberOfLines={1} style={{ paddingBottom: 10 }}>{info}</Txt> : null}
        {none ? (
          <Txt size={14.5} line={20} color={tokens.sub} style={{ paddingVertical: 10 }}>
            {today ? tx('Heute steht nichts an. Sag unten einfach, was ansteht.', 'Nothing today. Just say below what\'s coming up.') : tx('Nichts eingetragen.', 'Nothing planned.')}
          </Txt>
        ) : (
          <View style={{ flexDirection: 'row', gap: RAIL_GAP }}>
            <View style={{ width: RAIL }}>
              {plan.hours.map(({ h, y }) => {
                const label = tx(`${h} Uhr`, hm(`${String(h).padStart(2, '0')}:00`));
                const isNow = h === nowHour;
                return (
                  <View key={h} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y - 13, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                    {isNow ? (
                      <View accessibilityLabel={tx('Jetzt', 'Now')} style={{ height: 26, paddingHorizontal: 7, borderRadius: 13, justifyContent: 'center', backgroundColor: tokens.dayCard, borderWidth: 1, borderColor: tokens.dayLine }}>
                        <Txt size={15} line={19} weight={500} numberOfLines={1}>{label}</Txt>
                      </View>
                    ) : <Txt size={15} line={19} color={tokens.sub} numberOfLines={1}>{label}</Txt>}
                  </View>
                );
              })}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {whole.map((e) => (
                <Animated.View key={e.id} exiting={rowOut} layout={slide} onLayout={measure(e.id)} style={{ marginBottom: GAP }}>
                  <TodayCard e={e} date={day} over={false} />
                </Animated.View>
              ))}
              {timed.map((e, i) => (
                <Animated.View key={e.id} exiting={rowOut} layout={slide} onLayout={measure(e.id)} style={{ marginTop: plan.gaps[i] ?? GAP }}>
                  <TodayCard e={e} date={day} over={today && isOver(e, now)} />
                </Animated.View>
              ))}
            </View>
          </View>
        )}
        {today && bottom ? <View style={{ paddingTop: 22 }}>{bottom}</View> : null}
      </Animated.View>
    </ScrollView>
    <GroundFade solid={solid} />
    </View>
  );
}
