/**
 * Bottom navigation (Julian 25.10.): a floating pill with line icons and
 * labels, next to a round dark "+" button. Clay icons never appear here.
 */
import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Txt from './ui/Txt';
import LineIcon, { LineName } from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { haptics } from '../lib/haptics';

const TABS: { name: string; key: string; icon: LineName }[] = [
  { name: 'heute', key: 'nav.heute', icon: 'home' },
  { name: 'kalender', key: 'nav.kalender', icon: 'cal' },
  { name: 'listen', key: 'nav.listen', icon: 'list' },
  { name: 'eingang', key: 'nav.eingang', icon: 'inbox' },
];

const floatShadow = Platform.select({
  web: { boxShadow: `0 0 0 1px ${tokens.hair}, 0 8px 24px rgba(22,35,42,.08)` } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6, borderWidth: 1, borderColor: tokens.hair },
});
const plusShadow = Platform.select({
  web: { boxShadow: '0 8px 20px rgba(22,35,42,.22)' } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});

export default function NavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const current = state.routes[state.index]?.name;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(insets.bottom, 12) + 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View accessibilityRole="tablist" style={[{ flex: 1, flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.96)' }, floatShadow]}>
        {TABS.map((tab) => {
          const on = current === tab.name;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!on) { haptics.select(); navigation.navigate(tab.name); }
              }}
              style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 7, borderRadius: 999, backgroundColor: on ? '#EFEFEC' : 'transparent' }}
            >
              <LineIcon name={tab.icon} size={22} color={on ? tokens.ink : tokens.mute} />
              <Txt size={10.5} line={13} weight={600} color={on ? tokens.ink : tokens.mute}>{t(tab.key)}</Txt>
            </Pressable>
          );
        })}
      </View>
      <PressScale
        accessibilityLabel={t('nav.neu')}
        onPress={() => { haptics.tap(); router.push('/neu'); }}
        style={[{ width: 58, height: 58, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }, plusShadow]}
      >
        <LineIcon name="plus" size={26} color="#FFFFFF" stroke={2.2} />
      </PressScale>
    </View>
  );
}
