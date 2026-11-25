/**
 * Kalender · Heute after the reference Julian chose (16.11.: "screen 8 should be reference for our today view"):
 * the week as a strip with the chosen day on a light tile, and under it that one day. The hours stand down the
 * left, and every Termin is a card: the person's bar, the title, one grey line, the faces of who is in it and the
 * time span. The current hour stands in a pill. Nothing else is on a card (no second action, no sources).
 *
 * The hours share the height of the page evenly, from 8 to 19 or as far as the day's Termine reach, so the day
 * fills the screen (Julian 16.11.: "Warum nutzen wir nicht den gesamten Screen, alles ist gestaucht"). A Termin
 * stands at its time and is as tall as it lasts. Only where a card needs more room than its time gives, the hours
 * beside it make room: a card is never cut to fit and never lies over another one. A full day scrolls.
 * A tap opens the Termin, a swipe to the left on its card deletes (then Rückgängig). A swipe to the side anywhere
 * else, or to the right on a card, brings the next or the last day (Julian 16.11.: "Slide right on the daily view
 * does not let me go to the next day").
 *
 * Work is not one of the day's cards (Julian 16.11.: "Striped work blockers should show differently"): it is a
 * striped block behind them, from its start to its end as in the week, and a Termin during work lies on it.
 *
 * The cards are the app's own: white with a hairline and the soft shadow, on the usual ground (Julian 16.11.: the grey
 * ground of the reference was tried and taken back, "davor war es besser", the same shadows and cards in the whole app).
 * Nothing on the day is paler than the rest, also not what is over: the only fade is the one into the nav, and it
 * shows only while the day runs on under the nav (Julian 16.11.: "The fade out is completely overdone and misplaced,
 * was meant to only be if the last appointment overlaps the input bar").
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
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
import Stripes from '../../components/Stripes';
import Fresh from '../../components/Fresh';
import Blink from '../../components/Blink';
import SwipeRow, { justSwiped, markSwiped } from '../../components/SwipeRow';
import { navTop } from '../../components/NavBar';
import { tokens, glass, springs, motion, easing, rise, rowLayout, cardOut } from '../../theme';
import { useStore, actions, get } from '../../state/store';
import { useScroller, useLitIds } from '../../lib/landing';
import { useCalEvents } from '../../lib/useEvents';
import { useNowMin } from '../../lib/useNow';
import { isInfoDay } from '../../lib/feiertage';
import { evInk } from '../../lib/evColor';
import { isShift, shiftSpan, shiftLook } from '../../lib/shift';
import { hourRange } from '../../lib/hours';
import { lanes } from '../../lib/lanes';
import { seriesId } from '../../lib/repeat';
import { haptics } from '../../lib/haptics';
import { TODAY, addDays, daysBetween, dayNum, weekday, monday, short, WD_SHORT, minutes, hm } from '../../lib/dates';
import { tx } from '../../i18n/lang';
import type { CalEvent } from '../../state/types';
import { dropEvent } from './DayView';

/** The card's corners, as round as in the reference. */
const R = 20;
/** Room inside a card. */
const PAD = 12;
/** The column of the hours, and the gap to the cards. */
const RAIL = 55;
const RAIL_GAP = 8;
/** Two Termine right after each other. */
const GAP = 15;
/** The hours follow the day's Termine (lib/hours); a day with little on it still shows this many. */
const DAY_LEAST = 8;
/**
 * The room of one hour: as much as fills the page (Julian 16.11.: "immer Vollbild"), never less than this (then the
 * day scrolls). The upper end only keeps a huge screen sane.
 */
const HOUR_MIN = 40;
const HOUR_MAX = 200;
/** Room above the first hour and under the last one, where the page fades into the ground of the nav. */
const TOP = 18;
const END = 64;
const TITLE = 22, LINE = 20, FACE = 24, ROW_GAP = 8;
/** Where on a card its start stands (beside the title) and its end (beside the faces and the time, from the bottom). */
const START_AT = PAD + TITLE / 2;
const END_AT = PAD + FACE / 2;

/** By start; Termine at the same time keep one order (the shorter first, then by name), also after an undo. */
const byStart = (a: CalEvent, b: CalEvent) => a.start.localeCompare(b.start) || (a.end ?? '').localeCompare(b.end ?? '') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
const spans = (e: CalEvent) => !!e.endDate && e.endDate > e.date;
const onDay = (e: CalEvent, day: string) => e.date === day || (spans(e) && e.date < day && day <= e.endDate!);
/** Where a Termin ends on the hours; one without an end is only its start. */
const endMin = (e: CalEvent) => (e.end && e.end > e.start ? minutes(e.end) : minutes(e.start));
/** How tall a card's content is before it has been measured. */
const guess = (e: CalEvent) => PAD * 2 + TITLE + (e.place ?? e.sub ? LINE : 0) + ROW_GAP + FACE + (e.note ? ROW_GAP + 66 : 0);
/** The height a Termin's time gives its card: every hour it covers gets the hour's room. */
const lasts = (e: CalEvent, hour: number) => (e.allDay || spans(e) ? 0 : Math.round(((endMin(e) - minutes(e.start)) / 60) * hour + START_AT + END_AT));

type Plan = { gaps: number[]; spots: [number, number][]; hours: { h: number; y: number }[]; total: number; at: (t: number) => number };
/**
 * The day laid out for one hour's room: the gap above every card, where each card stands (`spots`), the hours beside
 * them and the height of it all.
 * Time runs through fixed points: a Termin's start beside its title, its end beside its last row. Free time runs
 * evenly at the hour's room; an hour between two points lies between them, so an hour is never named twice.
 * `open` lays the hours out without a card too (a day with only work on it).
 */
function lay(whole: CalEvent[], timed: CalEvent[], h: (e: CalEvent) => number, hour: number, from: number, to: number, open = false): Plan {
  let y = whole.reduce((sum, e) => sum + h(e) + GAP, 0);
  if (!timed.length && !open) return { gaps: [], spots: [], hours: [], total: y, at: () => y };
  const points: [number, number][] = [[from, y + 13]];
  const gaps: number[] = [];
  const spots: [number, number][] = [];
  let covered = from;
  timed.forEach((e, i) => {
    const s = minutes(e.start), en = endMin(e);
    // The last point is where the covered time stands. Two cards never touch.
    const here = points[points.length - 1][1];
    const top = Math.round(s < covered ? y + GAP : Math.max(y + (i ? GAP : 0), here + ((s - covered) / 60) * hour - START_AT));
    gaps.push(top - y);
    y = top + h(e);
    spots.push([top, y]);
    if (s >= covered) { points.push([s, top + START_AT]); covered = s; }
    if (en > covered) { covered = en; points.push([en, y - END_AT]); }
    // A Termin inside another one's time: the hours wait until it is past.
    else if (s < covered) points.push([covered, y]);
  });
  if (to > covered) points.push([to, points[points.length - 1][1] + ((to - covered) / 60) * hour]);
  const at = (t: number) => {
    let a = points[0];
    for (let i = 1; i < points.length; i++) {
      const b = points[i];
      if (b[0] <= t) { a = b; continue; }
      return a[1] + ((t - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
    }
    return a[1];
  };
  const hours: { h: number; y: number }[] = [];
  for (let t = from; t <= to; t += 60) hours.push({ h: t / 60, y: Math.round(at(t)) });
  return { gaps, spots, hours, total: Math.max(y, Math.round(at(to)) + 13), at };
}
/** The hour's room with which the day fills `room`; the day's height only grows with it. */
function fill(room: number, total: (hour: number) => number) {
  if (total(HOUR_MIN) >= room) return HOUR_MIN;
  if (total(HOUR_MAX) <= room) return HOUR_MAX;
  let lo = HOUR_MIN, hi = HOUR_MAX;
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (total(mid) > room) hi = mid; else lo = mid; }
  return lo;
}

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
              style={[{ flex: 1, height: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 5 }, sel ? glass.sm : null]}>
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
const TodayCard = React.memo(function TodayCard({ e, date, hour, onContent }: { e: CalEvent; date: string; hour: number; onContent: (id: string, h: number) => void }) {
  const ink = evInk(e);
  const when = spans(e) ? tx(`Tag ${daysBetween(e.date, date) + 1}`, `Day ${daysBetween(e.date, date) + 1}`)
    : e.allDay ? tx('Ganztags', 'All day')
    : e.end && e.end > e.start ? `${hm(e.start)} ${tx('bis', 'to')} ${hm(e.end)}` : hm(e.start);
  const line = e.place ?? e.sub ?? '';
  // A Termin is as tall as it lasts, so every hour it covers has its room beside it.
  const tall = lasts(e, hour);
  return (
    <Fresh id={e.id} radius={R} markAt={{ left: PAD, inset: PAD }}>
      {/* The app's one card: a hairline and the soft shadow (Julian 16.11.: the same shadows and cards in the whole app). */}
      <View style={[{ borderRadius: R }, glass.lift]}>
      <SwipeRow pager bg={tokens.row} radius={R} onDelete={() => dropEvent(e)}>
        <PressScale scale={0.985} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={`${e.title}, ${when}`}
          style={{ flexDirection: 'row', gap: 12, padding: PAD, minHeight: tall, borderRadius: R, backgroundColor: tokens.row }}>
          <View style={{ width: 4, borderRadius: 2, backgroundColor: ink }} />
          {/* The content says how tall it is on its own, apart from the time's height: the page needs it to share out the hours. */}
          <View onLayout={(ev) => onContent(e.id, Math.round(ev.nativeEvent.layout.height) + PAD * 2)} style={{ flex: 1, minWidth: 0, gap: ROW_GAP, alignSelf: 'flex-start' }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={17} line={TITLE} weight={500} numberOfLines={1}>{e.title}</Txt>
                {line ? <Txt size={14.5} line={LINE} color={tokens.sub} numberOfLines={1}>{line}</Txt> : null}
              </View>
              <ClayIcon name={e.icon} size={28} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: FACE }}>
              <Faces who={e.who} people={e.people} size={FACE} ring={tokens.row} />
              <Blink k={when} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                <LineIcon name="clock" size={15} color={tokens.sub} />
                <Txt size={14.5} line={LINE} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1, fontVariant: ['tabular-nums'] }}>{when}</Txt>
              </Blink>
            </View>
            {e.note ? (
              <View style={{ borderRadius: 14, padding: 12, backgroundColor: tokens.chipBg }}>
                <Txt size={15} line={21} numberOfLines={4}>{e.note}</Txt>
              </View>
            ) : null}
          </View>
        </PressScale>
      </SwipeRow>
      </View>
    </Fresh>
  );
});

/**
 * Work on the day: a striped block in its person's colour behind the cards, as tall as it lasts (a card of the same
 * hours would cover it exactly). Its name and hours stand where a card's title stands, or `label` further down when
 * a Termin lies on that spot. A tap opens it like a Termin.
 */
function Shift({ e, top, height, lane, of, label }: { e: CalEvent; top: number; height: number; lane: number; of: number; label: number }) {
  const look = shiftLook(e);
  const [a, b] = shiftSpan(e);
  const when = !e.allDay && e.end && e.end > e.start ? `${hm(a)} ${tx('bis', 'to')} ${hm(b)}` : '';
  return (
    <PressScale scale={0.99} onPress={() => { if (!justSwiped()) router.push(`/termin/${e.id}`); }} accessibilityLabel={[look.name, e.title, when].filter(Boolean).join(', ')}
      style={{ position: 'absolute', top, height, left: `${(lane / of) * 100}%`, width: `${100 / of}%`, paddingLeft: lane ? 3 : 0, paddingRight: lane < of - 1 ? 3 : 0 }}>
      <Stripes look={look} radius={R} style={{ flex: 1, opacity: 0.9, paddingHorizontal: of > 2 ? 8 : PAD + 4, paddingTop: label }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: of > 2 ? 6 : 8, minHeight: TITLE }}>
          <Txt size={15} line={TITLE} weight={600} color={look.ink} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{e.title}</Txt>
          {/* Alone it says its hours; side by side each block shows whose it is (a big family has more colours than two). */}
          {of > 1 ? <Faces who={e.who} people={e.people} size={20} ring={look.tint} />
            : when ? <Txt size={14.5} line={LINE} color={look.ink} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{when}</Txt> : null}
        </View>
      </Stripes>
    </PressScale>
  );
}

const FADE = 56;
/**
 * Where the day runs on under the nav, it fades out into the ground before it reaches it, as in the reference; the
 * ground is solid from the nav's top down, so nothing reads through beside the pill. `show` is 0 while the day ends
 * above the nav: then there is no fade at all (Julian 16.11.: only "if the last appointment overlaps the input bar").
 */
function GroundFade({ solid, show }: { solid: number; show: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ opacity: show.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, st]}>
      <View style={{ height: FADE }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="dayfade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tokens.bg} stopOpacity={0} />
              <Stop offset="0.45" stopColor={tokens.bg} stopOpacity={0.5} />
              <Stop offset="0.8" stopColor={tokens.bg} stopOpacity={0.9} />
              <Stop offset="1" stopColor={tokens.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#dayfade)" />
        </Svg>
      </View>
      <View style={{ height: solid + 1, marginTop: -1, backgroundColor: tokens.bg }} />
    </Animated.View>
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
  const ref = useRef<ScrollView>(null);
  const track = useScroller(ref);
  const now = useNowMin();
  const today = day === TODAY;
  // Start (Allo motion map): the day's Termine rise in one by one, 50 ms apart. Only right after the view opens; later arrivals land with the punch instead.
  const born = useRef(Date.now());
  const arrive = (i: number) => (Date.now() - born.current < 1200 ? rise(i) : undefined);

  const { whole, timed, shifts, info } = useMemo(() => {
    const whole: CalEvent[] = [], timed: CalEvent[] = [], shifts: CalEvent[] = [];
    let info = '';
    for (const e of events) {
      // Work is no card: it stands behind the day as a striped block, on the day it starts (as in the week).
      if (isShift(e)) { if (e.date === day) shifts.push(e); continue; }
      if (!onDay(e, day)) continue;
      if (isInfoDay(e)) { info = info ? `${info} · ${e.title}` : e.title; continue; }
      (e.allDay || spans(e) ? whole : timed).push(e);
    }
    timed.sort(byStart);
    return { whole, timed, shifts, info };
  }, [events, day]);

  // Every card says how tall its content is; where it stands follows from that and from its time, the same on the
  // phone and on the web. The page says how tall it is itself, and so does what stands under the day.
  const [own, setOwn] = useState<Record<string, number>>({});
  const content = useCallback((id: string, h: number) => setOwn((m) => (m[id] === h ? m : { ...m, [id]: h })), []);
  const [pageH, setPageH] = useState(0);
  const [underH, setUnderH] = useState(0);

  // Solid only where the nav floats: the day runs down to it (the talk card lies over the page when it opens).
  const solid = band ?? navTop(insets.bottom);
  const under = today && bottom ? underH + (underH ? 22 : 0) : 0;

  // The day's hours: from its first Termin to its last one, work included (one without an end counts as an hour).
  const [from, to] = useMemo(() => hourRange([
    ...timed.map((e): [number, number] => [minutes(e.start), e.end && e.end > e.start ? minutes(e.end) : minutes(e.start) + 60]),
    ...shifts.map((e): [number, number] => [minutes(shiftSpan(e)[0]), minutes(shiftSpan(e)[1])]),
  ], DAY_LEAST), [timed, shifts]);

  // The hours share what the page has left: its height less the fades, the info line and what stands under the day.
  // A card is as tall as its content or as its time, whichever is more.
  const plan = useMemo(() => {
    const h = (u: number) => (e: CalEvent) => Math.max(own[e.id] ?? guess(e), lasts(e, u));
    const room = pageH - TOP - END - solid - (info ? 28 : 0) - under;
    const open = shifts.length > 0;
    const hour = timed.length || open ? fill(room - 1, (u) => lay(whole, timed, h(u), u, from, to, open).total) : HOUR_MIN;
    return { hour, ...lay(whole, timed, h(hour), hour, from, to, open) };
  }, [pageH, solid, info, under, whole, timed, shifts, own, from, to]);
  // Two who work at the same time stand side by side, each in their colour and always on the same side.
  const sides = useMemo(() => lanes(shifts, (e) => [minutes(shiftSpan(e)[0]), minutes(shiftSpan(e)[1])], () => 0, (e) => shiftLook(e).key), [shifts]);

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

  // A swipe to the side brings the next or the last day, as the strip above pages its weeks. The day follows the
  // finger and leaves to its side; the next one then comes in from the other side. Nothing shows at rest.
  const W = useSharedValue(360);
  const x = useSharedValue(0);
  const op = useSharedValue(1);
  /** The side the next day comes in from after a swipe (1 from the right, -1 from the left); 0 without one. */
  const side = useRef(0);
  const go = (dir: number) => { side.current = dir; haptics.select(); actions.setCalDay(addDays(get().calDay, dir)); };
  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    // On the web the press under the finger still fires after the drag: it must not open that Termin.
    .onStart(() => { scheduleOnRN(markSwiped); })
    .onUpdate((e) => { x.value = e.translationX; op.value = 1 - Math.min(0.5, Math.abs(e.translationX) / W.value); })
    .onEnd((e) => {
      scheduleOnRN(markSwiped);
      if (Math.abs(e.translationX) > W.value * 0.22 || Math.abs(e.velocityX) > 700) {
        const dir = e.translationX < 0 ? 1 : -1;
        x.value = withTiming(-dir * W.value * 0.6, { duration: 140 });
        op.value = withTiming(0, { duration: 140 }, (f) => { if (f) scheduleOnRN(go, dir); });
      } else {
        x.value = withSpring(0, springs.snapBack);
        op.value = withTiming(1, { duration: 160 });
      }
    });

  // Another day swaps in place and starts at its top. Reached by a swipe it slides in from its side, otherwise the
  // cards come in with a short fade (opacity only).
  const fade = useSharedValue(1);
  const seen = useRef(day);
  useEffect(() => {
    if (seen.current === day) return;
    seen.current = day;
    ref.current?.scrollTo({ y: 0, animated: false });
    scrollY.current = 0;
    const dir = side.current;
    side.current = 0;
    if (dir) {
      fade.value = 1;
      x.value = dir * W.value * 0.4;
      x.value = withSpring(0, springs.smooth);
      op.value = 0.3;
      op.value = withTiming(1, { duration: 220 });
    } else {
      x.value = 0;
      op.value = 1;
      fade.value = 0;
      fade.value = withTiming(1, { duration: motion.micro, easing: easing.out });
    }
  }, [day]);
  const shown = useAnimatedStyle(() => ({ opacity: fade.value * op.value, transform: [{ translateX: x.value }] }));

  // The fade into the nav shows only while the day runs on under it: from the last 40 points above the nav on.
  const contentH = useRef(0);
  const scrollY = useRef(0);
  const below = useSharedValue(0);
  const mark = () => {
    const rest = contentH.current - pageH - scrollY.current; // how far the day still runs on below the page
    below.value = pageH ? Math.max(0, Math.min(1, (rest - (END - 24)) / 24)) : 0;
  };
  useEffect(mark, [pageH]);

  const nowHour = today ? Math.floor(now / 60) : -1;
  const none = !whole.length && !timed.length && !shifts.length;

  return (
    <GestureDetector gesture={pan} touchAction="pan-y">
    <View onLayout={(e) => { W.value = e.nativeEvent.layout.width; setPageH(Math.round(e.nativeEvent.layout.height)); }} style={{ flex: 1 }}>
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(e) => { const y = e.nativeEvent.contentOffset.y; track(y); scrollY.current = y; mark(); }}
      onContentSizeChange={(_w, h) => { contentH.current = h; mark(); }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: TOP, paddingBottom: solid + END }}
    >
      <Animated.View style={shown}>
        {info ? <Txt size={13} line={18} color={tokens.mute} numberOfLines={1} style={{ paddingBottom: 10 }}>{info}</Txt> : null}
        {none ? (
          <Txt size={14.5} line={20} color={tokens.sub} style={{ paddingVertical: 10 }}>
            {today ? tx('Heute steht nichts an. Sag unten einfach, was ansteht.', 'Nothing today. Just say below what\'s coming up.') : tx('Nichts eingetragen.', 'Nothing planned.')}
          </Txt>
        ) : !pageH ? null : (
          // The day comes once the page knows its height, so the cards arrive where they stay.
          <View style={{ flexDirection: 'row', gap: RAIL_GAP, minHeight: plan.total }}>
            <View style={{ width: RAIL }}>
              {plan.hours.map(({ h, y }) => {
                const label = tx(`${h} Uhr`, hm(`${String(h).padStart(2, '0')}:00`));
                const isNow = h === nowHour;
                return (
                  <View key={h} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y - 13, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                    {isNow ? (
                      <View accessibilityLabel={tx('Jetzt', 'Now')} style={[{ height: 26, paddingHorizontal: 8, borderRadius: 13, justifyContent: 'center' }, glass.line]}>
                        <Txt size={15} line={19} weight={500} numberOfLines={1}>{label}</Txt>
                      </View>
                    ) : <Txt size={15} line={19} color={tokens.sub} numberOfLines={1}>{label}</Txt>}
                  </View>
                );
              })}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {shifts.map((e) => {
                const [a, b] = shiftSpan(e);
                const top = Math.round(plan.at(minutes(a))) - START_AT;
                const end = Math.round(plan.at(minutes(b))) + END_AT;
                const side = sides.get(e);
                // Its name must stay readable: under a card it moves down to the first free spot of the block.
                const need = TITLE + 8;
                const free = (y: number) => y + need <= end && !plan.spots.some(([t, b2]) => t < y + need && b2 > y);
                const spot = [top + PAD - 4, ...plan.spots.filter(([t, b2]) => b2 > top && t < end).map(([, b2]) => b2 + 2)].find(free);
                return <Shift key={e.id} e={e} top={top} height={end - top} lane={side?.lane ?? 0} of={side?.lanes ?? 1} label={(spot ?? top + PAD - 4) + 4 - top} />;
              })}
              {whole.map((e, i) => (
                <Animated.View key={e.id} entering={arrive(i)} exiting={cardOut} layout={slide} style={{ marginBottom: GAP }}>
                  <TodayCard e={e} date={day} hour={plan.hour} onContent={content} />
                </Animated.View>
              ))}
              {timed.map((e, i) => (
                <Animated.View key={e.id} entering={arrive(whole.length + i)} exiting={cardOut} layout={slide} style={{ marginTop: plan.gaps[i] ?? GAP }}>
                  <TodayCard e={e} date={day} hour={plan.hour} onContent={content} />
                </Animated.View>
              ))}
            </View>
          </View>
        )}
        {today && bottom ? (
          <View style={{ paddingTop: underH ? 22 : 0 }}>
            <View onLayout={(e) => setUnderH(Math.round(e.nativeEvent.layout.height))}>{bottom}</View>
          </View>
        ) : null}
      </Animated.View>
    </ScrollView>
    <GroundFade solid={solid} show={below} />
    </View>
    </GestureDetector>
  );
}
