/**
 * Bottom navigation (Julian 30.10. 21:52, "super simpel"): one dark pill,
 * always there. The open tab is a white pill with its word, the others are
 * just their icon. The talk field sits right above it on every screen
 * (Dock.tsx); nothing folds away and nothing swaps places. Only the keyboard
 * pushes the bar away while typing.
 */
import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Txt from './ui/Txt';
import LineIcon, { LineName } from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { haptics } from '../lib/haptics';
import { useTyping as useFocus, useKeyboardInset } from '../lib/keyboard';

const TABS: { name: string; key: string; icon: LineName }[] = [
  { name: 'chat', key: 'nav.chat', icon: 'chat' },
  { name: 'kalender', key: 'nav.kalender', icon: 'cal' },
  { name: 'listen', key: 'nav.listen', icon: 'list' },
];

/** Height of the pill; Dock.tsx puts the field right above it. */
export const NAV_H = 54;
/** The open tab always has the same width, so the bar never changes size and recenters while the pill moves (Julian 31.10.: Listen overshot). */
const ON_W = 128;
/** Where the pill's top edge sits above the screen bottom. */
export const navTop = (insetBottom: number) => Math.max(insetBottom, 12) + 10 + NAV_H;

const floatShadow = { boxShadow: '0 12px 28px rgba(22,35,42,0.28)' } as any;

export default function NavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const current = state.routes[state.index]?.name;
  // While typing the keyboard takes this place, so the bar slides away; the field drops into it.
  // On a phone only while the keyboard is really up, so the tabs can never stay away.
  const focus = useFocus();
  const kb = useKeyboardInset();
  const typing = focus && (Platform.OS === 'web' || kb > 0);
  const away = useSharedValue(0);
  useEffect(() => { away.value = withTiming(typing ? 1 : 0, { duration: typing ? 180 : 260, easing: Easing.bezier(0.22, 1, 0.36, 1) }); }, [typing]);
  const hide = useAnimatedStyle(() => ({ opacity: 1 - away.value, transform: [{ translateY: away.value * 40 }] }));
  return (
    <Animated.View pointerEvents={typing ? 'none' : 'box-none'} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: navTop(insets.bottom) + 6, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: Math.max(insets.bottom, 12) + 10 }, hide]}>
      {/* Calm ground under the pill, so nothing reads through around it. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: tokens.bg, opacity: 0.98 }} />
      <View accessibilityRole="tablist" style={[{ flexDirection: 'row', gap: 2, padding: 5, borderRadius: 999, backgroundColor: tokens.ink }, floatShadow]}>
        {TABS.map((tab) => {
          const on = current === tab.name;
          return <Tab key={tab.name} on={on} icon={tab.icon} label={t(tab.key)} onPress={() => { if (!on) { haptics.select(); navigation.navigate(tab.name); } }} />;
        })}
      </View>
    </Animated.View>
  );
}

/** Each tab grows and shrinks by its own width, so the white pill moves without stretching icons or overshooting. */
function Tab({ on, icon, label, onPress }: { on: boolean; icon: LineName; label: string; onPress: () => void }) {
  const w = useSharedValue(on ? ON_W : 56);
  useEffect(() => { w.value = withTiming(on ? ON_W : 56, { duration: 240, easing: Easing.bezier(0.22, 1, 0.36, 1) }); }, [on]);
  const size = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View style={[{ overflow: 'hidden', borderRadius: 999 }, size]}>
      <PressScale
        scale={0.92}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={onPress}
        style={{ height: NAV_H - 10, paddingHorizontal: on ? 12 : 0, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: on ? tokens.onInk : 'transparent' }}
      >
        <LineIcon name={icon} size={21} color={on ? tokens.ink : tokens.mute} />
        {on ? <Txt size={14} weight={600} color={tokens.ink} numberOfLines={1}>{label}</Txt> : null}
      </PressScale>
    </Animated.View>
  );
}
