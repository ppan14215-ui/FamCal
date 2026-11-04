/**
 * Colour themes (Julian 04.11.): one set of person colours for the whole family. Each tile shows the
 * theme's colours as magnets; picking one recolours everyone, the app's own colours stay.
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { tokens, THEMES } from '../theme/tokens';
import { usePalette, setPalette } from '../theme/mode';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

export default function ThemePicker() {
  const cur = usePalette();
  return (
    <View style={{ gap: 8 }}>
      {THEMES.map((t) => {
        const on = t.id === cur;
        return (
          <PressScale key={t.id} accessibilityLabel={tx(t.de, t.en)} accessibilityState={{ selected: on }} scale={0.98}
            onPress={() => { if (!on) { haptics.select(); setPalette(t.id); } }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: tokens.row, borderWidth: on ? 2 : 1, borderColor: on ? tokens.ink : tokens.hair }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Txt size={15.5} weight={on ? 700 : 600}>{tx(t.de, t.en)}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {t.colors.map((c) => (
                  <View key={c.name} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.fg }} />
                  </View>
                ))}
              </View>
            </View>
            {on ? <LineIcon name="check" size={20} color={tokens.ink} stroke={2.4} /> : null}
          </PressScale>
        );
      })}
    </View>
  );
}
