/**
 * Kalender: everything with a time. Heute is one day under the strip of its week, after the reference Julian
 * chose (16.11.: "screen 8 should be reference for our today view"). Tage, Woche, Monat and Jahr are zoom
 * steps of one calendar (Julian 14.11.: "zoom in and out should auto move between days and weeks view,
 * snap to next view"): a pinch moves one step closer or further and snaps there, the chips do the same by tap.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens, easing, springs, persons, personPalette, allColors, shade, swapIn, PersonId } from '../../src/theme';
import { usePersons } from '../../src/components/ui/Person';
import { Tabs, Head } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import HeaderRight from '../../src/components/ui/HeaderRight';
import { useStore, actions, get, CalView } from '../../src/state/store';
import { TodayList, WeekList, WeekStripBar } from '../../src/screens/kalender/DayList';
import WeekView from '../../src/screens/kalender/WeekView';
import MonthView, { monthTitle } from '../../src/screens/kalender/MonthView';
import YearView from '../../src/screens/kalender/YearView';
import PressScale from '../../src/components/ui/PressScale';
import { navTop } from '../../src/components/NavBar';
import { TODAY, WD_LONG, weekday, dayNum, MONTHS, MONTHS_SHORT, monthIdx, addDays, monday, dmShort } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx, EN } from '../../src/i18n/lang';
import { useSimple } from '../../src/lib/simple';
import { useShowDays, showDays } from '../../src/lib/look';

const VIEWS: { key: CalView; label: string }[] = [
  { key: 'heute', label: tx('Heute', 'Today') },
  { key: 'tag', label: tx('Tage', 'Days') },
  { key: 'woche', label: tx('Woche', 'Week') },
  { key: 'monat', label: tx('Monat', 'Month') },
  { key: 'jahr', label: tx('Jahr', 'Year') },
];
/** The zoom steps, closest first. Heute is a list and stands beside them. */
const ZOOM: CalView[] = ['tag', 'woche', 'monat', 'jahr'];

/**
 * Nur eine Person (Julian 30.10.), in the lines of the brand (27.11.): "Alle" as an ink pill, then one dot per person
 * in their colour. A tap on a dot shows only their Termine (plus the family's and the Feiertage), a second tap or
 * "Alle" shows everyone again. The chosen dot grows a ring.
 */
function WhoFilter() {
  const who = useStore((s) => s.calWho);
  const people = useStore((s) => s.people);
  const pp = usePersons();
  const all = [
    ...(['J', 'T'] as PersonId[]).map((p) => ({ id: p as string, name: pp[p]?.name ?? persons[p].name, bg: pp[p]?.tint ?? persons[p].tint })),
    ...people.map((p) => ({ id: p.id, name: p.name.split(' ')[0], bg: shade(allColors.find((x) => x.name === p.color) ?? personPalette[2]).bg })),
  ];
  const pick = (id: string | null) => { haptics.select(); actions.setCalWho(id); };
  const onAll = who == null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <PressScale onPress={() => pick(null)} accessibilityState={{ selected: onAll }} accessibilityLabel={tx('Alle', 'Everyone')}
        style={{ height: 32, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: onAll ? tokens.ink : tokens.group }}>
        <Txt size={14} line={18} weight={600} color={onAll ? '#FFFFFF' : tokens.sub}>{tx('Alle', 'All')}</Txt>
      </PressScale>
      {all.map((p) => {
        const on = who === p.id;
        return (
          <PressScale key={p.id} scale={0.88} onPress={() => pick(on ? null : p.id)} accessibilityState={{ selected: on }} accessibilityLabel={tx(`Nur ${p.name}`, `Only ${p.name}`)} hitSlop={6}
            style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? p.bg : 'transparent' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.bg, opacity: onAll || on ? 1 : 0.4 }} />
          </PressScale>
        );
      })}
    </View>
  );
}

/** The page title of the brand: a short grey line above (the date, the span, the year), the name big under it. */
function Title({ text, sub, right }: { text: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {sub ? <Txt size={15} line={20} weight={500} color={tokens.sub} numberOfLines={1}>{sub}</Txt> : null}
        <Txt size={34} line={40} weight={700} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{text}</Txt>
      </View>
      {right}
    </View>
  );
}

/** "Freitag, 27. November" */
function dayLong(d: string): string {
  return EN ? `${WD_LONG[weekday(d)]}, ${MONTHS[monthIdx(d)]} ${dayNum(d)}` : `${WD_LONG[weekday(d)]}, ${dayNum(d)}. ${MONTHS[monthIdx(d)]}`;
}
/** "27. November" */
function dayMonthLong(d: string): string {
  return EN ? `${MONTHS[monthIdx(d)]} ${dayNum(d)}` : `${dayNum(d)}. ${MONTHS[monthIdx(d)]}`;
}
/** "23. bis 29. November", "30. November bis 6. Dezember" */
function spanLong(a: string, b: string): string {
  if (monthIdx(a) !== monthIdx(b)) return `${dayMonthLong(a)} ${tx('bis', 'to')} ${dayMonthLong(b)}`;
  return EN ? `${MONTHS[monthIdx(a)]} ${dayNum(a)} to ${dayNum(b)}` : `${dayNum(a)}. bis ${dayMonthLong(b)}`;
}

/** "29. bis 31. Okt", "26. Okt bis 1. Nov" */
function span(a: string, b: string): string {
  if (monthIdx(a) !== monthIdx(b)) return `${dmShort(a)} ${tx('bis', 'to')} ${dmShort(b)}`;
  return EN ? `${MONTHS_SHORT[monthIdx(a)]} ${dayNum(a)} to ${dayNum(b)}` : `${dayNum(a)}. bis ${dmShort(b)}`;
}

/**
 * A calendar view arriving after a zoom step: from slightly smaller when it came closer, slightly larger when it
 * went further, into place while it fades in. Its own shared value instead of an entering animation, which on the
 * web pins the view out of the layout once it ends (the page then has no height to scroll or to pinch on).
 */
function Arrive({ from, children }: { from: number; children: React.ReactNode }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(1, { duration: 220, easing: easing.out }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: from + (1 - from) * v.value }, { translateY: from === 1 ? 8 * (1 - v.value) : 0 }] as const }));
  return <Animated.View style={[{ flex: 1 }, st]}>{children}</Animated.View>;
}

/** One step closer (1) or further (-1); nothing at either end. */
function zoomBy(dir: 1 | -1) {
  // Without the 3 days tab (a setting, Julian 17.11.) the week is the closest step.
  const steps = showDays() ? ZOOM : ZOOM.filter((v) => v !== 'tag');
  const next = steps[steps.indexOf(get().calView) - dir];
  if (!next) return;
  haptics.select();
  actions.setCalView(next);
}

export default function Kalender() {
  const simple = useSimple();
  const days = useShowDays();
  // With the 3 days tab switched off, what would open there opens as the day.
  const view = useStore((s) => (s.calView === 'tag' && !days ? 'heute' : s.calView));
  const views = days ? VIEWS : VIEWS.filter((v) => v.key !== 'tag');
  const day = useStore((s) => s.calDay);
  const insets = useSafeAreaInsets();

  // A view arrives from the side it was reached: one zoom step closer grows in, one further settles down.
  const last = useRef(view);
  const from = useRef(1);
  if (last.current !== view) {
    const a = ZOOM.indexOf(last.current), b = ZOOM.indexOf(view);
    from.current = a < 0 || b < 0 ? 1 : b < a ? 0.93 : 1.07;
    last.current = view;
  }

  // The pinch: the page follows the fingers a little, then snaps to the next view with a tick.
  const z = useSharedValue(1);
  const snapped = useSharedValue(0);
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      if (snapped.value) return;
      z.value = Math.max(0.9, Math.min(1.12, 1 + (e.scale - 1) * 0.3));
      if (e.scale > 1.3 || e.scale < 0.76) {
        snapped.value = 1;
        z.value = withTiming(1, { duration: 140 });
        scheduleOnRN(zoomBy, e.scale > 1 ? 1 : -1);
      }
    })
    .onFinalize(() => { snapped.value = 0; z.value = withSpring(1, springs.snappy); });
  const zoomed = useAnimatedStyle(() => ({ transform: [{ scale: z.value }] }));

  const choose = (v: CalView) => { actions.setCalView(v); if (v === 'heute') actions.setCalDay(TODAY); };
  // Heute once more, while another day is chosen: back to today.
  const again = (v: CalView) => { if (v !== 'monat' && v !== 'jahr' && get().calDay !== TODAY) { haptics.select(); actions.setCalDay(TODAY); } };
  const seg = <Tabs items={views} value={view} onChange={choose} onAgain={again} />;

  const yr = Number(day.slice(0, 4));
  const [first, lastDay] = useMemo((): [string, string] => {
    if (view === 'tag') return [day, addDays(day, 2)];
    return [monday(day), addDays(monday(day), 6)];
  }, [view, day]);

  const head = (title: string, sub?: string, extra?: React.ReactNode) => (
    <Head gap={14} pad={20} end={12}>
      <Title text={title} sub={sub} right={<HeaderRight />} />
      <View style={{ gap: 10, marginTop: 2 }}>{seg}<WhoFilter /></View>
      {extra}
    </Head>
  );

  if (view === 'heute' || view === 'woche') {
    const today = day === TODAY;
    const title = view === 'woche' ? tx('Woche', 'Week') : today ? tx('Heute', 'Today') : WD_LONG[weekday(day)];
    const sub = view === 'woche' ? spanLong(first, lastDay) : today ? dayLong(day) : dayMonthLong(day);
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        {head(title, sub, view === 'woche' ? <WeekStripBar /> : null)}
        <Animated.View key={view} entering={swapIn} style={{ flex: 1 }}>{view === 'woche' ? <WeekList /> : <TodayList />}</Animated.View>
      </View>
    );
  }

  const title = view === 'tag' ? tx('Tage', 'Days') : view === 'monat' ? monthTitle(day).month : String(yr);
  const sub = view === 'tag' ? spanLong(first, lastDay) : view === 'monat' ? String(yr) : yr === Number(TODAY.slice(0, 4)) ? tx('Dieses Jahr', 'This year') : yr === Number(TODAY.slice(0, 4)) + 1 ? tx('Nächstes Jahr', 'Next year') : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      {head(title, sub)}
      <GestureDetector gesture={pinch} touchAction="pan-y">
        <Animated.View style={[{ flex: 1 }, zoomed]}>
          <Arrive key={view} from={from.current}>
            {view === 'tag' ? <View style={{ paddingHorizontal: 18, paddingBottom: navTop(insets.bottom) + 16, flex: 1 }}><WeekView n={3} /></View> : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: navTop(insets.bottom) + 40 }}>
                {view === 'monat' ? <MonthView /> : <YearView />}
              </ScrollView>
            )}
          </Arrive>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
