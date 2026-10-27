/**
 * Bottom navigation (Julian 25.10.): a floating pill with line icons and
 * labels. Clay icons never appear here. Since 27.10. the "+" lives in the
 * talk field above it, which is on every screen.
 */
import React, { useEffect, useState } from 'react';
import { View, Platform, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Txt from './ui/Txt';
import LineIcon, { LineName } from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens, springs } from '../theme';
import { haptics } from '../lib/haptics';

const TABS: { name: string; key: string; icon: LineName }[] = [
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
  const idx = Math.max(0, TABS.findIndex((t) => t.name === current));
  // The grey pill slides to the new tab instead of jumping.
  const [w, setW] = useState(0);
  const x = useSharedValue(idx);
  useEffect(() => { x.value = withSpring(idx, springs.smooth); }, [idx]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (w + 2) }] }));
  const onLayout = (e: LayoutChangeEvent) => setW((e.nativeEvent.layout.width - 8 - 2 * (TABS.length - 1)) / TABS.length);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(insets.bottom, 12) + 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View accessibilityRole="tablist" onLayout={onLayout} style={[{ flex: 1, flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.96)' }, floatShadow]}>
        {w ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, top: 4, bottom: 4, width: w, borderRadius: 999, backgroundColor: '#EFEFEC' }, pill]} /> : null}
        {TABS.map((tab) => {
          const on = current === tab.name;
          return (
            <PressScale
              key={tab.name}
              scale={0.92}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!on) { haptics.select(); navigation.navigate(tab.name); }
              }}
              style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 7, borderRadius: 999, backgroundColor: !w && on ? '#EFEFEC' : 'transparent' }}
            >
              <LineIcon name={tab.icon} size={22} color={on ? tokens.ink : tokens.mute} />
              <Txt size={10.5} line={13} weight={600} color={on ? tokens.ink : tokens.mute}>{t(tab.key)}</Txt>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}
