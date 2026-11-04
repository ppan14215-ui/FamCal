/**
 * Design (Julian 04.11.): the theme for the whole family, a normal settings page. Light only for now.
 */
import React from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1 } from '../src/components/ui/kit';
import ThemePicker from '../src/components/ThemePicker';
import { tokens } from '../src/theme';
import { tx } from '../src/i18n/lang';

export default function Design() {
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{tx('Design', 'Theme')}</H1>
      <View style={{ backgroundColor: tokens.row, borderRadius: 20, padding: 12 }}>
        <ThemePicker />
      </View>
    </Screen>
  );
}
