/**
 * The mascot slot of the story onboarding (Julian 11.11.2026: "mit unserem neuen Maskottchen und zur App
 * passend"). The new clay magnet Pin (App Design thread, src/components/buddy/Pin.tsx) is a drop-in for the
 * Blob with the same props, plus poses. Until it lands this draws the Blob; the swap is this one file.
 *
 * Poses the onboarding asks for, done here as body motion so they work with either mascot:
 *   peek  only the top half shows above the bottom edge, eyes up (the caller clips)
 *   wave  a rocking hello (a magnet has no arms)
 *   jump  a big happy hop with squash
 */
import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, useReducedMotion } from 'react-native-reanimated';
import Blob from '../buddy/Blob';
import { useBuddy, type Mood } from '../../lib/buddy';

export type Pose = 'rest' | 'peek' | 'wave' | 'jump';
const out = Easing.bezier(0.23, 1, 0.32, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export default function Mascot({ size, mood = 'idle', pose = 'rest', n = 0, glance, gaze, shadow = true }: {
  size: number;
  mood?: Mood;
  pose?: Pose;
  /** Bump to replay the pose. */
  n?: number;
  glance?: { x: number; y: number; n: number };
  gaze?: { x: number; y: number } | null;
  shadow?: boolean;
}) {
  const b = useBuddy();
  const reduced = useReducedMotion();
  const rot = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    if (pose === 'wave') {
      rot.value = withSequence(
        withTiming(-12, { duration: 180, easing: out }), withTiming(10, { duration: 240, easing: inOut }),
        withTiming(-7, { duration: 220, easing: inOut }), withTiming(4, { duration: 200, easing: inOut }), withTiming(0, { duration: 220, easing: inOut }),
      );
    }
    if (pose === 'jump') {
      const h = size * 0.32;
      sy.value = withSequence(withTiming(0.82, { duration: 120, easing: out }), withTiming(1.12, { duration: 160, easing: out }), withTiming(1, { duration: 220, easing: inOut }), withTiming(0.86, { duration: 90, easing: out }), withTiming(1.04, { duration: 170, easing: inOut }), withTiming(1, { duration: 200, easing: inOut }));
      sx.value = withSequence(withTiming(1.16, { duration: 120, easing: out }), withTiming(0.9, { duration: 160, easing: out }), withTiming(1, { duration: 220, easing: inOut }), withTiming(1.12, { duration: 90, easing: out }), withTiming(0.97, { duration: 170, easing: inOut }), withTiming(1, { duration: 200, easing: inOut }));
      ty.value = withSequence(withTiming(0, { duration: 120 }), withTiming(-h, { duration: 260, easing: Easing.bezier(0.2, 0.6, 0.35, 1) }), withTiming(0, { duration: 230, easing: Easing.bezier(0.55, 0, 0.75, 0.4) }));
    }
  }, [pose, n]);

  const st = useAnimatedStyle(() => ({
    transformOrigin: ['50%', '92%', 0],
    transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }, { scaleX: sx.value }, { scaleY: sy.value }],
  }) as any);
  const eyes = pose === 'peek' ? { x: 0, y: -0.6 } : gaze;
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, st]}>
      <Blob size={size} mood={pose === 'jump' ? 'happy' : mood} joy={b.joy} poke={b.poke} glance={glance} gaze={eyes ?? undefined} shadow={shadow && pose !== 'peek'} />
    </Animated.View>
  );
}
