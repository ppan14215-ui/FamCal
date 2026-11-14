/**
 * Kalender: everything with a time. Heute is the endless list by day. Tage, Woche, Monat and Jahr are zoom
 * steps of one calendar (Julian 14.11.: "zoom in and out should auto move between days and weeks view,
 * snap to next view"): a pinch moves one step closer or further and snaps there, the chips do the same by tap.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens, build, easing, springs, persons, personPalette, shade, PersonId } from '../../src/theme';
import { Screen, Tabs, Head } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import HeaderRight, { HeadArrows } from '../../src/components/ui/HeaderRight';
import { useStore, actions, get, CalView } from '../../src/state/store';
import AgendaView from '../../src/screens/kalender/AgendaView';
import WeekView from '../../src/screens/kalender/WeekView';
import MonthView, { monthTitle, shiftMonth } from '../../src/screens/kalender/MonthView';
import YearView, { shiftYear } from '../../src/screens/kalender/YearView';
import PressScale from '../../src/components/ui/PressScale';
import { TODAY, WD_LONG, weekday, dayNum, MONTHS_SHORT, monthIdx, addDays, monday, isoWeek, dmShort, iso } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx, EN } from '../../src/i18n/lang';
import { useSimple } from '../../src/lib/simple';

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
 * Nur eine Person (Julian 30.10.): a tap on a name shows only their Termine,
 * plus the family's and the Feiertage. With the switch folded away only the
 * chosen name stays, so you always see that a filter is on.
 */
function WhoFilter({ only }: { only?: boolean }) {
  const who = useStore((s) => s.calWho);
  const people = useStore((s) => s.people);
  const all = [
    ...(['J', 'T'] as PersonId[]).map((p) => ({ id: p as string, name: persons[p].name, bg: persons[p].tint, ink: persons[p].ink })),
    ...people.map((p) => { const c = personPalette.find((x) => x.name === p.color); const sh = c ? shade(c) : null; return { id: p.id, name: p.name.split(' ')[0], bg: sh?.bg ?? tokens.chipBg, ink: sh?.fg ?? tokens.ink }; }),
  ];
  const pick = (id: string | null) => { haptics.select(); actions.setCalWho(id); };
  if (only) {
    const p = all.find((x) => x.id === who);
    if (!p) return null;
    return (
      <Animated.View entering={FadeInDown.duration(180)} style={{ flexDirection: 'row' }}>
        <PressScale onPress={() => pick(null)} accessibilityLabel={tx('Filter aufheben', 'Clear filter')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: p.bg }}>
          <Txt size={13} weight={600} color={p.ink}>{tx(`Nur ${p.name}`, `Only ${p.name}`)}</Txt>
          <View style={{ transform: [{ rotate: '45deg' }] }}><LineIcon name="plus" size={13} color={p.ink} stroke={2.2} /></View>
        </PressScale>
      </Animated.View>
    );
  }
  const chip = (id: string | null, name: string, bg: string, ink: string) => {
    const on = who === id;
    return (
      <PressScale key={id ?? 'all'} onPress={() => pick(id)} accessibilityState={{ selected: on }} style={{ height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? bg : 'transparent', borderWidth: 1.5, borderColor: on ? ink : tokens.hair }}>
        <Txt size={13} weight={on ? 700 : 500} color={on ? ink : tokens.sub}>{name}</Txt>
      </PressScale>
    );
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {chip(null, tx('Alle', 'Everyone'), tokens.segOn, tokens.ink)}
      {all.map((p) => chip(p.id, p.name, p.bg, p.ink))}
    </View>
  );
}

/**
 * The page title as in the klar draft Julian approved (14.11. 09:33, the look before the Recordings style):
 * semibold, no period, and the short grey info stands behind it on the same line ("Donnerstag 29. Okt").
 */
function Title({ text, sub, open, onPress, right }: { text: string; sub?: string; open: boolean; onPress: () => void; right?: React.ReactNode }) {
  const simple = useSimple();
  const view = useStore((s) => s.calView);
  const toggles = simple && (view === 'monat' || view === 'jahr');
  const name = (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
      <Txt size={29} line={34} weight={600} tracking={-0.72} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{text}</Txt>
      {sub ? <Txt size={16} line={21} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 2 }}>{sub}</Txt> : null}
      {/* With the person filter the title opens the switch; the chevron shows which way. */}
      {simple ? null : <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><LineIcon name="chev" size={15} color={tokens.sub} stroke={2.2} /></View>}
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 }}>
      {simple && !toggles ? <View style={{ flex: 1, minWidth: 0 }}>{name}</View> : (
        // Simple: the name of the month opens the year, the year's number goes back to the month.
        <PressScale scale={0.97} onPress={onPress} accessibilityLabel={simple ? (view === 'monat' ? tx('Jahr zeigen', 'Show year') : tx('Monat zeigen', 'Show month')) : tx('Ansicht wechseln', 'Change view')} accessibilityState={simple ? undefined : { expanded: open }} style={{ flex: 1, minWidth: 0 }}>{name}</PressScale>
      )}
      {right}
    </View>
  );
}

/** "29. bis 31. Okt", "26. Okt bis 1. Nov" */
function span(a: string, b: string): string {
  if (monthIdx(a) !== monthIdx(b)) return `${dmShort(a)} ${tx('bis', 'to')} ${dmShort(b)}`;
  return EN ? `${MONTHS_SHORT[monthIdx(a)]} ${dayNum(a)} to ${dayNum(b)}` : `${dayNum(a)}. bis ${dmShort(b)}`;
}

/** Steps a paging view back or forward: three days, a week, a month, a year. */
function step(view: CalView, dir: 1 | -1) {
  const day = get().calDay;
  actions.setCalDay(view === 'tag' ? addDays(day, dir * 3) : view === 'woche' ? addDays(day, dir * 7) : view === 'monat' ? shiftMonth(day, dir) : shiftYear(day, dir));
}
const STEP_LABEL: Record<string, [string, string]> = {
  tag: [tx('Drei Tage zurück', 'Three days back'), tx('Drei Tage weiter', 'Three days on')],
  woche: [tx('Vorige Woche', 'Previous week'), tx('Nächste Woche', 'Next week')],
  monat: [tx('Voriger Monat', 'Previous month'), tx('Nächster Monat', 'Next month')],
  jahr: [tx('Voriges Jahr', 'Previous year'), tx('Nächstes Jahr', 'Next year')],
};

/**
 * A calendar view arriving after a zoom step: from slightly smaller when it came closer, slightly larger when it
 * went further, into place while it fades in. Its own shared value instead of an entering animation, which on the
 * web pins the view out of the layout once it ends (the page then has no height to scroll or to pinch on).
 */
function Arrive({ from, children }: { from: number; children: React.ReactNode }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(1, { duration: 220, easing: easing.out }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: from + (1 - from) * v.value }, { translateY: from === 1 ? 8 * (1 - v.value) : 0 }] as const }));
  return <Animated.View style={[{ gap: 14 }, st]}>{children}</Animated.View>;
}

/** One step closer (1) or further (-1); nothing at either end. */
function zoomBy(dir: 1 | -1) {
  const next = ZOOM[ZOOM.indexOf(get().calView) - dir];
  if (!next) return;
  haptics.select();
  actions.setCalView(next);
}

export default function Kalender() {
  const simple = useSimple();
  const view = useStore((s) => s.calView);
  const day = useStore((s) => s.calDay);
  // The view switch starts open and stays open after a pick (Julian 28.10.); the chevron folds it away.
  const [open, setOpen] = useState(true);
  // The switch fades in only when the chevron opens it; a view change that redraws the head keeps it still (Julian 01.11.).
  const toggled = useRef(false);
  const fadeIn = toggled.current ? FadeInDown.duration(200) : undefined;
  toggled.current = false;
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

  const toggle = () => {
    haptics.select();
    if (simple) { if (view === 'monat') actions.setCalView('jahr'); else if (view === 'jahr') actions.setCalView('monat'); return; }
    toggled.current = true;
    setOpen((o) => !o);
  };
  const choose = (v: CalView) => { actions.setCalView(v); if (v === 'heute') actions.setCalDay(TODAY); };
  const seg = simple ? (
    <Tabs items={VIEWS} value={view} onChange={choose} bleed={18} />
  ) : open ? (
    <Animated.View entering={fadeIn} exiting={FadeOut.duration(120)} style={{ gap: 10 }}>
      <Tabs items={VIEWS} value={view} onChange={choose} bleed={18} />
      <WhoFilter />
    </Animated.View>
  ) : <WhoFilter only />;

  // What the view shows, for the short info behind the title.
  const yr = Number(day.slice(0, 4));
  const [first, lastDay] = useMemo((): [string, string] => {
    if (view === 'heute') return [TODAY, TODAY];
    if (view === 'tag') return [day, addDays(day, 2)];
    if (view === 'woche') return [monday(day), addDays(monday(day), 6)];
    if (view === 'monat') return [`${day.slice(0, 7)}-01`, iso(new Date(Date.UTC(yr, monthIdx(day) + 1, 0)))];
    return [`${yr}-01-01`, `${yr}-12-31`];
  }, [view, day, yr]);

  if (view === 'heute') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <Head end={0}><Title text={WD_LONG[weekday(TODAY)]} sub={dmShort(TODAY)} open={open} onPress={toggle} right={<HeaderRight />} />{seg}</Head>
        <Animated.View entering={build} style={{ flex: 1 }}><AgendaView /></Animated.View>
      </View>
    );
  }

  const title = view === 'tag' ? tx('Tage', 'Days')
    : view === 'woche' ? tx(`KW ${isoWeek(day)}`, `Week ${isoWeek(day)}`)
    : view === 'monat' ? monthTitle(day).month
    : String(yr);
  // Short, so it fits behind the title beside the arrows and the two buttons.
  const sub = view === 'tag' || view === 'woche' ? span(first, lastDay) : view === 'monat' ? String(yr) : undefined;
  const arrows = <HeadArrows onStep={(dir) => step(view, dir)} prev={STEP_LABEL[view][0]} next={STEP_LABEL[view][1]} />;
  return (
    <Screen tab gap={14} headEnd={0} head={<><Title text={title} sub={sub} open={open} onPress={toggle} right={<HeaderRight before={arrows} />} />{seg}</>}>
      <GestureDetector gesture={pinch} touchAction="pan-y">
        <Animated.View style={zoomed}>
          <Arrive key={view} from={from.current}>
            {view === 'tag' ? <WeekView n={3} /> : view === 'woche' ? <WeekView n={7} /> : view === 'monat' ? <MonthView /> : <YearView />}
          </Arrive>
        </Animated.View>
      </GestureDetector>
    </Screen>
  );
}
