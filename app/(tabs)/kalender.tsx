/**
 * Kalender: everything with a time. Opens on Heute (Julian 27.10., design A
 * "Heute zuerst"); Tag, Woche, Monat and Jahr sit behind the title, so the
 * switch only shows when you ask for it.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { tokens, swapIn, persons, personPalette, shade, PersonId } from '../../src/theme';
import { router } from 'expo-router';
import { Screen, Seg } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import HeaderRight from '../../src/components/ui/HeaderRight';
import { useStore, actions, CalView } from '../../src/state/store';
import TodayView from '../../src/screens/kalender/TodayView';
import DayView from '../../src/screens/kalender/DayView';
import WeekView from '../../src/screens/kalender/WeekView';
import MonthView, { monthTitle } from '../../src/screens/kalender/MonthView';
import YearView, { YearArrows } from '../../src/screens/kalender/YearView';
import PressScale from '../../src/components/ui/PressScale';
import { TODAY, WD_LONG, weekday, dayNum, MONTHS, monthIdx, addDays, monday, isoWeek, daysBetween } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx, EN } from '../../src/i18n/lang';

const VIEWS: { key: CalView; label: string }[] = [
  { key: 'heute', label: tx('Heute', 'Today') },
  { key: 'tag', label: tx('Tage', 'Days') },
  { key: 'woche', label: tx('Woche', 'Week') },
  { key: 'monat', label: tx('Monat', 'Month') },
  { key: 'jahr', label: tx('Jahr', 'Year') },
];

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

/** The page title; tapping it opens the view switch. */
function Title({ text, sub, open, onPress, right }: { text: string; sub?: string; open: boolean; onPress: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <PressScale scale={0.97} onPress={onPress} accessibilityLabel={tx('Ansicht wechseln', 'Change view')} accessibilityState={{ expanded: open }} style={{ flex: 1, gap: 2 }}>
        {sub ? <Txt size={15} color={tokens.sub}>{sub}</Txt> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt size={34} line={40} weight={700} tracking={-1} numberOfLines={1}>{text}<Dot /></Txt>
          <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }], marginTop: 4 }}><LineIcon name="chev" size={16} color={tokens.sub} stroke={2.2} /></View>
        </View>
      </PressScale>
      {right}
    </View>
  );
}

export default function Kalender() {
  const view = useStore((s) => s.calView);
  const day = useStore((s) => s.calDay);
  const kid = useStore((s) => s.kid);
  // The view switch starts open and stays open after a pick (Julian 28.10.); the chevron folds it away.
  const [open, setOpen] = useState(true);
  // A week across two months is named after its Thursday, like calendar weeks (Julian 28.10.: Oct 26 to Nov 1 said November).
  const { month, year } = monthTitle(view === 'woche' ? addDays(monday(day), 3) : day);
  const insets = useSafeAreaInsets();
  const toggle = () => { haptics.select(); setOpen((o) => !o); };
  const choose = (v: CalView) => { actions.setCalView(v); if (v === 'heute') actions.setCalDay(TODAY); };
  const pair = <HeaderRight />;
  const seg = open ? (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(120)} style={{ gap: 10 }}>
      <Seg items={VIEWS} value={view} onChange={choose} />
      <WhoFilter />
    </Animated.View>
  ) : <WhoFilter only />;

  if (view === 'heute') {
    const date = EN ? `${MONTHS[monthIdx(TODAY)]} ${dayNum(TODAY)}` : `${dayNum(TODAY)}. ${MONTHS[monthIdx(TODAY)]}`;
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <TodayView header={<View style={{ gap: 14, paddingTop: 12 }}><Title sub={WD_LONG[weekday(TODAY)]} text={date} open={open} onPress={toggle} right={pair} />{seg}</View>} />
      </View>
    );
  }
  // Tag keeps title and week strip in place; only the days scroll (Julian 27.10.).
  if (view === 'tag') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <DayView header={(today) => <><Title sub={tx(`${WD_LONG[weekday(day)]}, ${dayNum(day)}.`, `${WD_LONG[weekday(day)]} ${dayNum(day)}`)} text={month} open={open} onPress={toggle} right={<HeaderRight before={today} />} />{seg}</>} />
      </View>
    );
  }
  // The small line above the title is always there (Julian 30.10.): weekday, KW, year.
  const yr = Number(day.slice(0, 4));
  const left = daysBetween(TODAY, `${TODAY.slice(0, 4)}-12-31`);
  const title = view === 'jahr' ? String(yr) : month;
  const sub = view === 'woche' ? tx(`KW ${isoWeek(day)} · ${year}`, `Week ${isoWeek(day)} · ${year}`)
    : view === 'monat' ? String(year)
    : yr === Number(TODAY.slice(0, 4)) ? tx(`Noch ${left} Tage im Jahr`, `${left} days left this year`) : yr < Number(TODAY.slice(0, 4)) ? tx('Rückblick', 'Looking back') : tx('Vorschau', 'Looking ahead');
  return (
    <Screen tab gap={14}>
      <Title text={title} sub={sub} open={open} onPress={toggle} right={view === 'jahr' ? <HeaderRight before={<YearArrows />} /> : pair} />
      {seg}
      <Animated.View key={view} entering={swapIn} style={{ gap: 14 }}>
        {view === 'woche' ? <WeekView /> : view === 'monat' ? <MonthView /> : <YearView />}
      </Animated.View>
    </Screen>
  );
}
