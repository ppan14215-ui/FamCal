/**
 * Memo, FamCal's mascot (Julian 01.11.2026: name Memo, clay look like the
 * app icons). A glazed clay fridge magnet with two eyes and no mouth. It never
 * talks; it does one thing at a time:
 *
 *   land    falls in from above, squashes, springs back, blinks
 *   blink   one blink ("Okay, mach ich")
 *   wobble  tilts left and right while something is being worked on
 *   peek    rises from below a line and looks
 *   sleep   lies flat with closed eyes and breathes slowly
 *   idle    rests, blinks now and then
 *
 * The art is three renders of the Blender model (assets/memo). Squash, tilt
 * and the fall are transforms, so it stays sharp at any size and needs no
 * native module (ships by OTA). Reduced motion shows the resting pose.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, withRepeat, withDelay,
  Easing, useReducedMotion, cancelAnimation, runOnJS,
} from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';

const ART = {
  open: require('../../../assets/memo/memo-neutral.webp'),
  closed: require('../../../assets/memo/memo-blink.webp'),
  sleep: require('../../../assets/memo/memo-sleep.webp'),
};

export type MemoAct = 'land' | 'blink' | 'wobble' | 'peek' | 'sleep' | 'idle';

type Props = {
  act?: MemoAct;
  size?: number;
  /** Changing it plays `act` again (e.g. blink once per new person). */
  beat?: number;
  /** Idle blinks every few seconds. */
  alive?: boolean;
  /** A soft shadow on the ground under Memo. */
  shadow?: boolean;
  delay?: number;
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function Memo({ act = 'idle', size = 88, beat = 0, alive = true, shadow = true, delay = 0, onDone, style }: Props) {
  const reduced = useReducedMotion();
  const y = useSharedValue(act === 'land' && !reduced ? -size * 3.2 : act === 'peek' && !reduced ? size * 0.9 : 0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const rot = useSharedValue(0);
  const fade = useSharedValue(act === 'land' && !reduced ? 0 : 1);
  const [eyes, setEyes] = useState<'open' | 'closed'>(act === 'sleep' ? 'closed' : 'open');

  const blink = (after = 0) => {
    setTimeout(() => setEyes('closed'), after);
    setTimeout(() => setEyes('open'), after + 140);
  };
  const done = () => onDone?.();

  useEffect(() => {
    if (reduced) { y.value = 0; fade.value = 1; done(); return; }
    cancelAnimation(y); cancelAnimation(sx); cancelAnimation(sy); cancelAnimation(rot);
    const squash = (k: number, ms: number) => {
      sy.value = withTiming(k, { duration: ms, easing: Easing.out(Easing.quad) });
      sx.value = withTiming(1 / Math.sqrt(k), { duration: ms, easing: Easing.out(Easing.quad) });
    };
    if (act === 'land') {
      y.value = -size * 3.2;
      fade.value = withDelay(delay, withTiming(1, { duration: 120 }));
      // Gravity in, then the squash on impact, one soft overshoot and rest.
      y.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }, (ok) => {
        if (!ok) return;
        runOnJS(haptics.tap)();
        sy.value = withSequence(withTiming(0.68, { duration: 90, easing: Easing.out(Easing.quad) }), withSpring(1, { stiffness: 320, damping: 11, mass: 0.8 }));
        sx.value = withSequence(withTiming(1.2, { duration: 90, easing: Easing.out(Easing.quad) }), withSpring(1, { stiffness: 320, damping: 11, mass: 0.8 }));
        runOnJS(blink)(520);
        runOnJS(done)();
      }));
      sy.value = withDelay(delay, withTiming(1.1, { duration: 420, easing: Easing.in(Easing.quad) }));
      sx.value = withDelay(delay, withTiming(0.93, { duration: 420, easing: Easing.in(Easing.quad) }));
    } else if (act === 'blink') {
      squash(0.94, 80);
      setTimeout(() => { sy.value = withSpring(1, { stiffness: 400, damping: 14 }); sx.value = withSpring(1, { stiffness: 400, damping: 14 }); }, 90);
      blink(40);
      setTimeout(done, 300);
    } else if (act === 'wobble') {
      rot.value = withRepeat(withSequence(
        withTiming(-9, { duration: 260, easing: Easing.inOut(Easing.quad) }),
        withTiming(9, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      ), -1);
    } else if (act === 'peek') {
      y.value = size * 0.9;
      y.value = withDelay(delay, withSpring(size * 0.28, { stiffness: 180, damping: 16 }, (ok) => { if (ok) runOnJS(blink)(300); }));
    } else if (act === 'sleep') {
      setEyes('closed');
      sy.value = withRepeat(withSequence(withTiming(1.03, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0.98, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1);
    } else {
      rot.value = withTiming(0, { duration: 200 }); y.value = withSpring(0); sx.value = withSpring(1); sy.value = withSpring(1);
    }
  }, [act, beat, reduced]);

  // Now and then a blink, so Memo feels present without asking for attention.
  useEffect(() => {
    if (!alive || reduced || act === 'sleep' || act === 'wobble') return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => { t = setTimeout(() => { blink(); next(); }, 3800 + Math.random() * 3200); };
    next();
    return () => clearTimeout(t);
  }, [alive, act, reduced]);

  const body = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: y.value + (size * (1 - sy.value)) / 2 },
      { rotate: `${rot.value}deg` },
      { scaleX: sx.value },
      { scaleY: sy.value },
    ] as any,
  }));
  const ground = useAnimatedStyle(() => {
    const h = Math.min(1, Math.max(0, 1 + y.value / (size * 3.2)));
    return { opacity: fade.value * (0.25 + 0.75 * h), transform: [{ scaleX: (0.55 + 0.45 * h) * sx.value }] };
  });

  const src = act === 'sleep' ? ART.sleep : eyes === 'open' ? ART.open : ART.closed;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center' }, style]} accessible accessibilityLabel="Memo" pointerEvents="none">
      {shadow ? (
        // Two stacked ellipses read as one soft contact shadow without a blur filter.
        <Animated.View style={[{ position: 'absolute', bottom: size * 0.035, width: size * 0.78, height: size * 0.09, alignItems: 'center', justifyContent: 'center' }, ground]}>
          <View style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: size, backgroundColor: 'rgba(22,35,42,0.05)' }} />
          <View style={{ width: '72%', height: '62%', borderRadius: size, backgroundColor: 'rgba(22,35,42,0.08)' }} />
        </Animated.View>
      ) : null}
      <Animated.View style={[{ width: size, height: size }, body]}>
        <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
