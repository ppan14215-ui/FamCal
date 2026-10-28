/**
 * One hint for everything (Julian 28.10.: "Die Toasts brauchen durchgängig
 * ein besseres Design"). A white card like the receipt, so the talk button
 * stays the only dark thing on screen. The tile says what kind it is, a thin
 * line runs down while Rückgängig still works, a swipe down closes it.
 * "Nur nach links wischen löscht, danach Rückgängig": deleting never asks
 * first, it offers Rückgängig here instead.
 */
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutDown, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import PressScale from './ui/PressScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Txt from './ui/Txt';
import LineIcon, { type LineName } from './ui/LineIcon';
import { tokens, motion, easing } from '../theme';
import { useStore, dismissToast } from '../state/store';
import type { ToastKind } from '../state/types';
import { haptics } from '../lib/haptics';

const LOOK: Record<ToastKind, { icon: LineName; tile: string; ink: string }> = {
  done: { icon: 'check', tile: tokens.doneSoft, ink: tokens.done },
  undo: { icon: 'trash', tile: tokens.chipBg, ink: tokens.sub },
  warn: { icon: 'warn', tile: '#F7EDE1', ink: '#9A5B13' },
  info: { icon: 'sparkle', tile: tokens.chipBg, ink: tokens.ink },
};

const shadow = Platform.select({
  web: { boxShadow: '0 10px 28px rgba(22,35,42,0.12)', borderWidth: 1, borderColor: tokens.hair } as object,
  default: { shadowColor: tokens.ink, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8, borderWidth: 1, borderColor: tokens.hair },
});

export default function ToastHost() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const left = useSharedValue(1);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (!toast) return;
    drag.value = 0;
    left.value = 1;
    if (toast.undo) left.value = withTiming(0, { duration: toast.ms, easing: Easing.linear });
    if (toast.kind === 'warn') haptics.warning();
  }, [toast?.id]);

  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }));
  const follow = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }], opacity: 1 - Math.min(drag.value / 120, 0.6) }));
  const swipe = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => { drag.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 40 || e.velocityY > 600) scheduleOnRN(dismissToast);
      else drag.value = withTiming(0, { duration: 160 });
    });

  if (!toast) return null;
  const look = LOOK[toast.kind];
  return (
    <Animated.View
      key={toast.id}
      pointerEvents="box-none"
      entering={FadeInDown.duration(motion.base).easing(easing.out)}
      exiting={FadeOutDown.duration(motion.micro).easing(easing.out)}
      style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 86 }}
    >
      <GestureDetector gesture={swipe}>
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: tokens.row, overflow: 'hidden' }, shadow, follow]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: look.tile, alignItems: 'center', justifyContent: 'center' }}>
            <LineIcon name={look.icon} size={18} color={look.ink} stroke={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Txt size={15} weight={600} line={20} numberOfLines={2}>{toast.text}</Txt>
            {toast.sub ? <Txt size={13} line={18} color={tokens.sub} numberOfLines={3}>{toast.sub}</Txt> : null}
          </View>
          {toast.undo ? (
            <PressScale
              hitSlop={10}
              scale={0.94}
              accessibilityRole="button"
              onPress={() => { haptics.tap(); toast.undo?.(); dismissToast(); }}
              style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.doneSoft, alignItems: 'center', justifyContent: 'center' }}
            >
              <Txt size={14} weight={600} color={tokens.done}>{t('common.undo')}</Txt>
            </PressScale>
          ) : null}
          {toast.undo ? (
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: tokens.done, opacity: 0.5, transformOrigin: 'left' }, bar]} />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
