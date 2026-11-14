/**
 * Farben (Julian 04.11.): the colour theme for the whole family, then each person's colour from it.
 * The app's own colours stay as they are.
 */
import React from 'react';
import { View } from 'react-native';
import { Screen, BackBar, H1, Seg } from '../src/components/ui/kit';
import { useColorBy, setColorBy, usePalette } from '../src/theme/mode';
import { CATEGORIES } from '../src/lib/iconCategory';
import { personPalette, shade } from '../src/theme';
import { haptics } from '../src/lib/haptics';
import Txt from '../src/components/ui/Txt';
import ThemePicker from '../src/components/ThemePicker';
import ColorPicker from '../src/components/ColorPicker';
import { tokens } from '../src/theme';
import { actions, useStore } from '../src/state/store';
import { tx } from '../src/i18n/lang';

export default function Design() {
  const names = useStore((s) => s.names);
  const colors = useStore((s) => s.colors);
  const by = useColorBy();
  usePalette();
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
      {/* Julian 04.11.: a setting, colour by person or by category. */}
      <Txt size={13} weight={600} color={tokens.sub} style={{ paddingHorizontal: 4, marginTop: 8 }}>{tx('Termine färben nach', 'Colour events by')}</Txt>
      <Seg items={[{ key: 'person', label: tx('Person', 'Person') }, { key: 'kategorie', label: tx('Kategorie', 'Category') }]} value={by} onChange={(k) => { haptics.select(); setColorBy(k as 'person' | 'kategorie'); }} />
      {by === 'kategorie' ? (
        <View style={{ backgroundColor: tokens.row, borderRadius: 20, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c, i) => {
            const p = shade(personPalette[i % personPalette.length]);
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: p.bg }}>
                <Txt size={13} weight={600} color={p.fg}>{tx(c.de, c.en)}</Txt>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}
