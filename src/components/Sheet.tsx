/**
 * Bottom sheet for transparent-modal routes. Slides up on the drawer curve,
 * follows the finger when pulled down and springs back at the edge (DESIGN.md
 * rule 8: "Sheets federn am Rand, jede Bewegung lässt sich mittendrin
 * abbrechen"). Pulling far enough or tapping the scrim closes it.
 */
import React, { useEffect, useCallback } from 'react';
import { Pressable, StyleProp, ViewStyle, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, runOnJS, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SheetHandle } from './ui/kit';
import { tokens, easing, motion, springs } from '../theme';

type Props = {
  children: React.ReactNode;
  bg?: string;
  /** Distance from the top of the screen; omit to size to content. */
  top?: number;
  style?: StyleProp<ViewStyle>;
  onClose?: () => void;
  /** Content scrolls: only the handle drags the sheet. */
  scrollable?: boolean;
};

export default function Sheet({ children, bg = tokens.bg, top, style, onClose, scrollable }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(height);
  const drag = useSharedValue(0);

  useEffect(() => { y.value = withTiming(0, { duration: motion.sheet, easing: easing.drawer }); }, []);

  const close = useCallback(() => {
    if (onClose) onClose();
    else if (router.canGoBack()) router.back();
  }, [onClose]);

  const dismiss = () => {
    y.value = withTiming(height, { duration: motion.sheetOut, easing: easing.drawer }, (d) => { if (d) runOnJS(close)(); });
  };

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      // Downward follows the finger; upward meets resistance.
      drag.value = e.translationY > 0 ? e.translationY : e.translationY * 0.12;
    })
    .onEnd((e) => {
      if (drag.value > 120 || e.velocityY > 900) {
        y.value = withTiming(height, { duration: 220, easing: easing.drawer }, (d) => { if (d) runOnJS(close)(); });
      } else {
        drag.value = withSpring(0, springs.smooth);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value + drag.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value + drag.value, [0, height * 0.6], [1, 0]) }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.scrim }, scrimStyle]}>
        <Pressable accessibilityLabel="Schließen" style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>
      {scrollable ? (
        <Animated.View style={[sheetBase(bg, top, insets.bottom), style, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={{ paddingVertical: 4, marginTop: -4 }}><SheetHandle /></View>
          </GestureDetector>
          {children}
        </Animated.View>
      ) : (
        <GestureDetector gesture={pan}>
          <Animated.View style={[sheetBase(bg, top, insets.bottom), style, sheetStyle]}>
            <SheetHandle />
            {children}
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const sheetBase = (bg: string, top: number | undefined, bottom: number): ViewStyle => ({
  position: 'absolute', left: 0, right: 0, bottom: 0, top, backgroundColor: bg,
  borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 18, paddingBottom: 24 + bottom, gap: 16,
});
