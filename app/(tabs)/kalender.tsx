/**
 * Kalender: everything with a time. Opens on Heute (Julian 27.10., design A
 * "Heute zuerst"); Tag, Woche, Monat and Jahr sit behind the title, so the
 * switch only shows when you ask for it.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { tokens, swapIn } from '../../src/theme';
import { router } from 'expo-router';
import { Screen, Seg } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Pair } from '../../src/components/ui/Person';
import { useStore, actions, CalView } from '../../src/state/store';
import TodayView from '../../src/screens/kalender/TodayView';
import DayView from '../../src/screens/kalender/DayView';
import WeekView from '../../src/screens/kalender/WeekView';
import MonthView, { monthTitle, MonthArrows } from '../../src/screens/kalender/MonthView';
import YearView from '../../src/screens/kalender/YearView';
import PressScale from '../../src/components/ui/PressScale';
import { TODAY, WD_LONG, weekday, dayNum, MONTHS, monthIdx } from '../../src/lib/dates';
import { haptics } from '../../src/lib/haptics';
import { tx, EN } from '../../src/i18n/lang';

const VIEWS: { key: CalView; label: string }[] = [
  { key: 'heute', label: tx('Heute', 'Today') },
  { key: 'tag', label: tx('Tage', 'Days') },
  { key: 'woche', label: tx('Woche', 'Week') },
  { key: 'monat', label: tx('Monat', 'Month') },
  { key: 'jahr', label: tx('Jahr', 'Year') },
];

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
  const [open, setOpen] = useState(false);
  const { month, year } = monthTitle(day);
  const insets = useSafeAreaInsets();
  const toggle = () => { haptics.select(); setOpen((o) => !o); };
  const choose = (v: CalView) => { actions.setCalView(v); if (v === 'heute') actions.setCalDay(TODAY); setOpen(false); };
  const pair = <PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>;
  const seg = open ? (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(120)}>
      <Seg items={VIEWS} value={view} onChange={choose} />
    </Animated.View>
  ) : null;

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
        <DayView header={(today) => <><Title text={month} open={open} onPress={toggle} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{today}{pair}</View>} />{seg}</>} />
      </View>
    );
  }
  const title = view === 'jahr'
    ? (kid?.name ? tx(`${kid.name}${/[sxzß]$/i.test(kid.name) ? '’' : 's'} Jahr`, `${kid.name}’s year`) : tx('Euer Jahr', 'Your year'))
    : month;
  return (
    <Screen tab gap={14}>
      <Title text={title} sub={view === 'monat' ? String(year) : undefined} open={open} onPress={toggle} right={view === 'monat' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MonthArrows />{pair}</View> : pair} />
      {seg}
      <Animated.View key={view} entering={swapIn} style={{ gap: 14 }}>
        {view === 'woche' ? <WeekView /> : view === 'monat' ? <MonthView /> : <YearView />}
      </Animated.View>
    </Screen>
  );
}
