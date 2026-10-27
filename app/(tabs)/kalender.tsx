/** Kalender: everything with a time. Tag, Woche, Monat, Jahr in one place. */
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../../src/theme';
import Animated from 'react-native-reanimated';
import { swapIn } from '../../src/theme';
import { router } from 'expo-router';
import { Screen, H1, Seg } from '../../src/components/ui/kit';
import { Pair } from '../../src/components/ui/Person';
import { useStore, actions, CalView } from '../../src/state/store';
import DayView from '../../src/screens/kalender/DayView';
import WeekView from '../../src/screens/kalender/WeekView';
import MonthView, { monthTitle, MonthArrows } from '../../src/screens/kalender/MonthView';
import YearView from '../../src/screens/kalender/YearView';
import PressScale from '../../src/components/ui/PressScale';
import { tx } from '../../src/i18n/lang';

const VIEWS: { key: CalView; label: string }[] = [
  { key: 'tag', label: tx('Tag', 'Day') },
  { key: 'woche', label: tx('Woche', 'Week') },
  { key: 'monat', label: tx('Monat', 'Month') },
  { key: 'jahr', label: tx('Jahr', 'Year') },
];

export default function Kalender() {
  const view = useStore((s) => s.calView);
  const day = useStore((s) => s.calDay);
  const kid = useStore((s) => s.kid);
  const { month, year } = monthTitle(day);
  const insets = useSafeAreaInsets();
  const pair = <PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>;
  // Tag keeps title, switch and week strip in place; only the days scroll (Julian 27.10.).
  if (view === 'tag') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <DayView header={(today) => <><H1 right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{today}{pair}</View>}>{month}</H1><Seg items={VIEWS} value={view} onChange={actions.setCalView} /></>} />
      </View>
    );
  }
  return (
    <Screen tab gap={14}>
      {view === 'jahr' ? (
        <H1 right={pair}>{kid?.name ? tx(`${kid.name}${/[sxzß]$/i.test(kid.name) ? '’' : 's'} Jahr`, `${kid.name}’s year`) : tx('Euer Jahr', 'Your year')}</H1>
      ) : view === 'monat' ? (
        <H1 sub={String(year)} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MonthArrows />{pair}</View>}>{month}</H1>
      ) : (
        <H1 right={pair}>{month}</H1>
      )}
      <Seg items={VIEWS} value={view} onChange={actions.setCalView} />
      <Animated.View key={view} entering={swapIn} style={{ gap: 14 }}>
        {view === 'woche' ? <WeekView /> : view === 'monat' ? <MonthView /> : <YearView />}
      </Animated.View>
    </Screen>
  );
}
