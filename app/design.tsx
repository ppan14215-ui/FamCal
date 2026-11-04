/**
 * Farben (Julian 04.11.): the colour theme for the whole family, then each person's colour from it.
 * The app's own colours stay as they are.
 */
import React from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1 } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import ThemePicker from '../src/components/ThemePicker';
import ColorPicker from '../src/components/ColorPicker';
import { tokens } from '../src/theme';
import { actions, useStore } from '../src/state/store';
import { tx } from '../src/i18n/lang';

export default function Design() {
  const names = useStore((s) => s.names);
  const colors = useStore((s) => s.colors);
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{tx('Farben', 'Colours')}</H1>
      <View style={{ backgroundColor: tokens.row, borderRadius: 20, padding: 14, gap: 12 }}>
        <ColorPicker p="J" name={names.J || tx('Du', 'You')} sel={colors.J} taken={colors.T} onSel={(i) => actions.setColor('J', i)} />
        <View style={{ height: 1, backgroundColor: tokens.hair }} />
        <ColorPicker p="T" name={names.T || tx('Partner', 'Partner')} sel={colors.T} taken={colors.J} onSel={(i) => actions.setColor('T', i)} />
      </View>
      <Txt size={13} weight={600} color={tokens.sub} style={{ paddingHorizontal: 4, marginTop: 8 }}>{tx('Farbthema für die ganze Familie', 'Colour theme for the whole family')}</Txt>
      <ThemePicker />
    </Screen>
  );
}
