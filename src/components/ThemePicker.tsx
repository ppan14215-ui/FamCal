/**
 * Themes (Julian 04.11.): one look for the whole family, picked in the
 * settings. Each tile previews the theme's ground, text and accent.
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { tokens, THEMES, isDark } from '../theme/tokens';
import { usePalette, setPalette } from '../theme/mode';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const BASE = { light: { bg: '#F5F5F4', row: '#FFFFFF', ink: '#16232A', done: '#075056', hair: '#E7E7E4' }, dark: { bg: '#0F1518', row: '#1A2328', ink: '#F2F4F4', done: '#5FB7AE', hair: '#2C3840' } };

export default function ThemePicker() {
  const cur = usePalette();
  const d = isDark();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {THEMES.map((t) => {
        const v = { ...(d ? BASE.dark : BASE.light), ...(d ? t.dark : t.light) } as Record<string, string>;
        const on = t.id === cur;
        return (
          <PressScale
            key={t.id}
            accessibilityLabel={tx(t.de, t.en)}
            accessibilityState={{ selected: on }}
            scale={0.94}
            onPress={() => { haptics.select(); setPalette(t.id); }}
            style={{ width: '31.5%', padding: 4, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? tokens.done : tokens.hair, gap: 6 }}
          >
            <View style={{ height: 48, borderRadius: 10, backgroundColor: v.bg, padding: 7, gap: 6 }}>
              <View style={{ height: 7, width: '62%', borderRadius: 4, backgroundColor: v.ink }} />
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <View style={{ flex: 1, height: 12, borderRadius: 4, backgroundColor: v.done }} />
                <View style={{ flex: 1, height: 12, borderRadius: 4, backgroundColor: v.row, borderWidth: 1, borderColor: v.hair }} />
              </View>
            </View>
            <Txt size={12} weight={on ? 700 : 500} color={on ? tokens.ink : tokens.sub} style={{ textAlign: 'center', paddingBottom: 2 }}>{tx(t.de, t.en)}</Txt>
          </PressScale>
        );
      })}
    </View>
  );
}
