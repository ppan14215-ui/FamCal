/**
 * The start (Julian 07.11.): the whole screen is Memo, teal with two eyes. It
 * blinks, then melts upwards like paint running backwards, drips trailing at
 * its lower edge, and gathers into a small Memo at the top of the screen,
 * which then flies down to its spot above the field (BuddyHost).
 * Once per app start, about 1.5 s, a tap skips it, reduced motion skips it.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, useAnimatedStyle, withTiming, withDelay, withSequence, Easing, runOnJS, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { BLOB } from './Blob';
import { setBuddy } from '../../lib/buddy';
import { useDockTop } from '../../lib/dockSpace';

const APath = Animated.createAnimatedComponent(Path);

/** Drips along the lower edge: x as a share of the width, half width, how long it gets, how late it lets go. */
const DRIPS = [
  [0.06, 0.035, 0.9, 0.1], [0.19, 0.03, 1.25, 0.0], [0.33, 0.04, 0.7, 0.25], [0.47, 0.028, 1.4, 0.05],
  [0.6, 0.038, 1.0, 0.18], [0.74, 0.03, 1.3, 0.08], [0.88, 0.036, 0.85, 0.2], [0.97, 0.025, 1.1, 0.12],
];

function curtain(W: number, edge: number, p: number, maxL: number) {
  'worklet';
  let d = `M0 -40L${W} -40L${W} ${edge.toFixed(1)}`;
  for (let i = DRIPS.length - 1; i >= 0; i--) {
    const [fx, fw, fl, lag] = DRIPS[i];
    // Each drip grows as the paint pulls up, then snaps back up at the end.
    const q = Math.max(0, Math.min(1, (p - lag) / (1 - lag)));
    const L = maxL * fl * Math.sin(Math.PI * Math.pow(q, 0.8));
    const xc = W * fx, hw = W * fw;
    d += `L${(xc + hw).toFixed(1)} ${edge.toFixed(1)}`;
    d += `C${(xc + hw * 0.55).toFixed(1)} ${(edge + L * 0.35).toFixed(1)} ${(xc + hw * 0.95).toFixed(1)} ${(edge + L).toFixed(1)} ${xc.toFixed(1)} ${(edge + L).toFixed(1)}`;
    d += `C${(xc - hw * 0.95).toFixed(1)} ${(edge + L).toFixed(1)} ${(xc - hw * 0.55).toFixed(1)} ${(edge + L * 0.35).toFixed(1)} ${(xc - hw).toFixed(1)} ${edge.toFixed(1)}`;
  }
  return d + `L0 ${edge.toFixed(1)}Z`;
}

let played = false;

export default function BuddyIntro() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const dockTop = useDockTop();
  const reduced = useReducedMotion();
  const [on, setOn] = useState(!played);
  useEffect(() => { if (played && !on) setBuddy({ intro: false }); }, []);
  const p = useSharedValue(0); // 0 full screen .. 1 gathered at the top
  const blink = useSharedValue(1);
  const gone = useSharedValue(1);
  const topY = insets.top + 22;

  // Only where Memo lives (screens with the field), never over the onboarding or sign-in.
  const skip = /onboarding|anmelden/.test(path);
  // It starts once the field is there (Memo's spot is known), or after a moment anyway.
  const [late, setLate] = useState(false);
  useEffect(() => { const id = setTimeout(() => setLate(true), 900); return () => clearTimeout(id); }, []);
  const go = !!dockTop || late;
  useEffect(() => {
    if (!on) return;
    if (skip || reduced) { played = true; setBuddy({ intro: false }); setOn(false); return; }
    if (!go) return;
    played = true;
    setBuddy({ intro: true });
    const done = () => { setBuddy({ intro: false, from: { x: W / 2, y: topY } }); setOn(false); };
    blink.value = withDelay(260, withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 120 })));
    p.value = withDelay(520, withTiming(1, { duration: 820, easing: Easing.bezier(0.6, 0, 0.3, 1) }, (f) => {
      if (f) gone.value = withTiming(0, { duration: 120 }, (g) => { if (g) runOnJS(done)(); });
    }));
  }, [on, skip, reduced, go]);

  const props = useAnimatedProps(() => {
    // The lower edge rises from the bottom to the top, slow at first, then pulled.
    const edge = H + 10 - (H + 10 - topY - 10) * p.value;
    return { d: curtain(W, edge, p.value, 110) };
  });
  // The eyes ride in the middle of what is left, getting smaller, then become the small Memo's eyes.
  const eyes = useAnimatedStyle(() => {
    const edge = H + 10 - (H + 10 - topY - 10) * p.value;
    const s = 1.6 - 0.9 * p.value;
    return { transform: [{ translateY: Math.max(topY, edge / 2) - 14 }, { scale: s }, { scaleY: blink.value }] as any };
  });
  // At the end the last bit of paint is a round drop at the top.
  const drop = useAnimatedStyle(() => {
    const k = Math.max(0, (p.value - 0.75) / 0.25);
    return { opacity: k, transform: [{ scale: 0.4 + 0.6 * k }] as any };
  });
  const fade = useAnimatedStyle(() => ({ opacity: gone.value }));

  if (!on || skip) return null;
  const finish = () => { p.value = 1; gone.value = 0; setBuddy({ intro: false, from: { x: W / 2, y: topY } }); setOn(false); };
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, fade]}>
      <Pressable onPress={finish} style={{ flex: 1 }} accessibilityLabel="Intro überspringen">
        <Svg width={W} height={H} style={{ position: 'absolute' }}>
          <APath animatedProps={props} d={curtain(W, H + 10, 0, 110)} fill={BLOB.mid} />
        </Svg>
        <Animated.View style={[{ position: 'absolute', left: W / 2 - 19, top: topY - 19, width: 38, height: 38, borderRadius: 19, backgroundColor: BLOB.mid }, drop]} />
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'center', gap: 14 }, eyes]}>
          <View style={{ width: 9, height: 16, borderRadius: 5, backgroundColor: BLOB.eye }} />
          <View style={{ width: 9, height: 16, borderRadius: 5, backgroundColor: BLOB.eye }} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
