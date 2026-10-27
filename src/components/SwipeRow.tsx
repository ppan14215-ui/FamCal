/**
 * Swipe left to delete (Julian 26.10.: nur nach links wischen löscht, danach
 * Rückgängig; nach rechts wischen gibt es nicht). A short swipe parks the row
 * on the red tx('Löschen', 'Delete') button; a long or fast swipe deletes right away.
 * Rightward drags meet rubber-band resistance and spring back.
 */
import React, { useCallback } from 'react';
import { View, Pressable, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolate, Extrapolation } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { tokens, springs, motion } from '../theme';
import { haptics } from '../lib/haptics';
import { tx } from '../i18n/lang';

const OPEN = 96;

export default function SwipeRow({ children, onDelete, bg = tokens.row }: { children: React.ReactNode; onDelete: () => void; bg?: string }) {
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const w = useSharedValue(360);
  const armed = useSharedValue(false);

  const fire = useCallback(() => { haptics.commit(); onDelete(); }, [onDelete]);
  const tick = useCallback(() => haptics.select(), []);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => { start.value = x.value; })
    .onUpdate((e) => {
      const raw = start.value + e.translationX;
      // Rightward: rubber band, never reveals anything.
      x.value = raw > 0 ? raw * 0.15 : raw;
      const nowArmed = -x.value > w.value * 0.5;
      if (nowArmed !== armed.value) { armed.value = nowArmed; scheduleOnRN(tick); }
    })
    .onEnd((e) => {
      const far = -x.value > w.value * 0.5 || (e.velocityX < -900 && -x.value > 40);
      if (far) {
        x.value = withTiming(-w.value, { duration: motion.micro }, (done) => { if (done) scheduleOnRN(fire); });
      } else if (-x.value > OPEN * 0.6) {
        x.value = withSpring(-OPEN, { ...springs.smooth, velocity: e.velocityX });
      } else {
        x.value = withSpring(0, { ...springs.snapBack, velocity: e.velocityX });
      }
      armed.value = false;
    });

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const action = useAnimatedStyle(() => ({
    width: Math.max(OPEN, -x.value),
    opacity: interpolate(-x.value, [0, 24, 60], [0, 0.6, 1], Extrapolation.CLAMP),
  }));

  const onLayout = (e: LayoutChangeEvent) => { w.value = e.nativeEvent.layout.width; };

  return (
    <View onLayout={onLayout} style={{ overflow: 'hidden', backgroundColor: bg }}>
      <Animated.View style={[{ position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: tokens.danger }, action]}>
        <Pressable
          accessibilityLabel={tx('Löschen', 'Delete')}
          onPress={() => { x.value = withTiming(-w.value, { duration: motion.micro }, (d) => { if (d) scheduleOnRN(fire); }); }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
        >
          <LineIcon name="x" size={18} color="#FFFFFF" stroke={2.2} />
          <Txt size={13} weight={600} color="#FFFFFF">{tx('Löschen', 'Delete')}</Txt>
        </Pressable>
      </Animated.View>
      {/* pan-y keeps vertical scrolling alive on mobile web */}
      <GestureDetector gesture={pan} touchAction="pan-y">
        <Animated.View style={[{ backgroundColor: bg }, row]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
