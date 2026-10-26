/**
 * Undo toast. "Nur nach links wischen löscht, danach Rückgängig" (Julian):
 * deleting never asks first, it offers Rückgängig here instead.
 */
import React from 'react';
import { Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import PressScale from './ui/PressScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { tokens, motion, easing } from '../theme';
import { useStore, dismissToast } from '../state/store';
import { haptics } from '../lib/haptics';

export default function ToastHost() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      // Rises from below and leaves the way it came.
      entering={Platform.OS === 'web' ? FadeInUp.duration(motion.base).easing(easing.out) : FadeInUp.duration(motion.base).easing(easing.out).withInitialValues({ opacity: 0, transform: [{ translateY: 16 }] })}
      exiting={FadeOutDown.duration(motion.micro).easing(easing.out)}
      style={{
        position: 'absolute', left: 18, right: 18, bottom: Math.max(insets.bottom, 12) + 86,
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: tokens.ink,
      }}
    >
      <LineIcon name={toast.undo ? 'x' : 'check'} size={18} color="#FFFFFF" />
      <Txt size={15} color="#FFFFFF" style={{ flex: 1 }} numberOfLines={2}>{toast.text}</Txt>
      {toast.undo ? (
        <PressScale
          hitSlop={12}
          scale={0.92}
          onPress={() => { haptics.tap(); toast.undo?.(); dismissToast(); }}
        >
          <Txt size={15} weight={600} color="#FFFFFF">{t('common.undo')}</Txt>
        </PressScale>
      ) : null}
    </Animated.View>
  );
}
