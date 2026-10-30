/**
 * Top right of every tab: the family pair that opens the settings. The "+" for
 * a new entry lives in the input bar at the bottom (Julian 30.10.: oben geht es
 * unter, es gehört dahin, wo ich auch eingebe).
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import PressScale from './PressScale';
import { Pair } from './Person';
import { tx } from '../../i18n/lang';

export default function HeaderRight({ before }: { before?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {before}
      <PressScale accessibilityLabel={tx('Familie und Einstellungen', 'Family and settings')} onPress={() => router.push('/einstellungen')}><Pair /></PressScale>
    </View>
  );
}
