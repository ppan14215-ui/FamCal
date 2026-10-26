/** Kalender: everything with a time. Tag, Woche, Monat, Jahr in one place. */
import React from 'react';
import { View } from 'react-native';
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

const VIEWS: { key: CalView; label: string }[] = [
  { key: 'tag', label: 'Tag' },
  { key: 'woche', label: 'Woche' },
  { key: 'monat', label: 'Monat' },
  { key: 'jahr', label: 'Jahr' },
];

export default function Kalender() {
  const view = useStore((s) => s.calView);
  const day = useStore((s) => s.calDay);
  const kid = useStore((s) => s.kid);
  const { month, year } = monthTitle(day);
  const pair = <PressScale accessibilityLabel="Familie und Einstellungen" onPress={() => router.push('/einstellungen')}><Pair /></PressScale>;
  return (
    <Screen tab gap={14}>
      {view === 'jahr' ? (
        <H1 right={pair}>{kid?.name ? `${kid.name}${/[sxzß]$/i.test(kid.name) ? '’' : 's'} Jahr` : 'Euer Jahr'}</H1>
      ) : view === 'monat' ? (
        <H1 sub={String(year)} right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MonthArrows />{pair}</View>}>{month}</H1>
      ) : (
        <H1 right={pair}>{month}</H1>
      )}
      <Seg items={VIEWS} value={view} onChange={actions.setCalView} />
      <Animated.View key={view} entering={swapIn} style={{ gap: 14 }}>
        {view === 'tag' ? <DayView /> : view === 'woche' ? <WeekView /> : view === 'monat' ? <MonthView /> : <YearView />}
      </Animated.View>
    </Screen>
  );
}
