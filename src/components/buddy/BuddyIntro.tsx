/**
 * The start (Julian 07.11.): the whole screen is Memo, teal with two eyes. It
 * blinks, then melts upwards like paint running backwards, drips trailing at
 * its lower edge, and gathers into a small Memo at the top of the screen,
 * which glides down to its spot on the field (BuddyHost).
 *
 * 08.11. (Julian: "not smooth enough"): everything moves by transform only, so
 * it runs on the UI thread at full frame rate even while the app loads behind
 * it. The paint is a plain view sliding up; the drips are one fixed shape that
 * stretches and pulls back; the eyes ride along and shrink into the small
 * Memo's eyes, and the small Memo takes over in the same spot without a gap.
 * Once per app start, about 1.4 s, a tap skips it, reduced motion skips it.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing, runOnJS, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import Pin, { PIN } from './Pin';
import { mascot } from '../../lib/mascot';
import { setBuddy } from '../../lib/buddy';
import { useFieldTop } from '../../lib/dockSpace';

/** Drips along the lower edge: x as a share of the width, half width, length as a share of DRIP. */
const DRIPS = [
  [0.05, 0.03, 0.7], [0.17, 0.028, 1.0], [0.3, 0.038, 0.55], [0.44, 0.026, 0.9],
  [0.57, 0.036, 0.75], [0.7, 0.028, 1.0], [0.83, 0.034, 0.6], [0.95, 0.024, 0.85],
];
const DRIP = 120;
const SMALL = 38; // the companion's size (BuddyHost)

function dripPath(W: number) {
  let d = `M0 0L${W} 0`;
  for (let i = DRIPS.length - 1; i >= 0; i--) {
    const [fx, fw, fl] = DRIPS[i];
    const L = DRIP * fl, xc = W * fx, hw = W * fw;
    d += `L${xc + hw} 0C${xc + hw * 0.55} ${L * 0.35} ${xc + hw * 0.95} ${L} ${xc} ${L}C${xc - hw * 0.95} ${L} ${xc - hw * 0.55} ${L * 0.35} ${xc - hw} 0`;
  }
  return d + 'L0 0Z';
}

let played = false;

export default function BuddyIntro() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const fieldTop = useFieldTop();
  const reduced = useReducedMotion();
  const [on, setOn] = useState(!played);
  useEffect(() => { if (played && !on) setBuddy({ intro: false }); }, []);
  const p = useSharedValue(0); // 0 full screen .. 1 gathered at the top
  const blink = useSharedValue(1);
  const small = useSharedValue(0); // the small Memo at the top appearing
  const gone = useSharedValue(1);
  const topY = insets.top + 24; // centre of the small Memo at the top

  // Only where Memo lives (screens with the field), never over the onboarding or sign-in.
  const skip = /onboarding|anmelden/.test(path) || mascot() === 'minimal';
  // It starts once the field is there (Memo's spot is known), or after a moment anyway.
  const [late, setLate] = useState(false);
  useEffect(() => { const id = setTimeout(() => setLate(true), 900); return () => clearTimeout(id); }, []);
  const go = !!fieldTop || late;
  const handOver = () => { setBuddy({ intro: false, from: { x: W / 2, y: topY } }); };
  const close = () => setOn(false);
  useEffect(() => {
    if (!on) return;
    if (skip || reduced) { played = true; setBuddy({ intro: false }); setOn(false); return; }
    if (!go) return;
    played = true;
    setBuddy({ intro: true });
    blink.value = withDelay(220, withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 110 })));
    // One continuous pull: slow start, long smooth glide, soft arrival.
    p.value = withDelay(460, withTiming(1, { duration: 900, easing: Easing.bezier(0.55, 0, 0.25, 1) }));
    small.value = withDelay(460 + 640, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }, (f) => {
      if (!f) return;
      runOnJS(handOver)();
      // The companion now sits exactly here; this one fades out underneath it.
      gone.value = withDelay(60, withTiming(0, { duration: 140 }, (g) => { if (g) runOnJS(close)(); }));
    }));
  }, [on, skip, reduced, go]);

  // The paint's lower edge goes from below the screen to the top, ending just above the small Memo.
  const endEdge = topY - SMALL / 2;
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: -(H - endEdge) * p.value }] as any }));
  // The drips stretch while the paint pulls, then snap back up as it arrives.
  const drips = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.sin(Math.PI * Math.min(1, p.value * 1.1)) }] as any }));
  // The eyes ride in the middle of what is left and shrink into the small Memo's eyes.
  const eyes = useAnimatedStyle(() => {
    const edge = H - (H - endEdge) * p.value;
    const yMid = Math.max(topY, edge / 2);
    const s = 1.5 - 1.08 * p.value;
    return { opacity: 1 - small.value, transform: [{ translateY: yMid - 8 }, { scale: s }, { scaleY: blink.value }] as any };
  });
  const drop = useAnimatedStyle(() => ({ opacity: small.value, transform: [{ scale: 0.6 + 0.4 * small.value }] as any }));
  const fade = useAnimatedStyle(() => ({ opacity: gone.value }));

  if (!on || skip) return null;
  const finish = () => { p.value = 1; small.value = 1; gone.value = 0; handOver(); setOn(false); };
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, fade]}>
      <Pressable onPress={finish} style={{ flex: 1 }} accessibilityLabel="Intro überspringen">
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, sheet]}>
          <View style={{ position: 'absolute', left: 0, top: -H, width: W, height: H * 2, backgroundColor: PIN.rim }} />
          <Animated.View style={[{ position: 'absolute', left: 0, top: H - 1, width: W, height: DRIP + 1, transformOrigin: ['50%', '0%', 0] }, drips]}>
            <Svg width={W} height={DRIP + 1}><Path d={dripPath(W)} fill={PIN.rim} /></Svg>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: W / 2 - SMALL / 2, top: topY - SMALL / 2, width: SMALL, height: SMALL }, drop]}>
          <Pin size={SMALL} still shadow={false} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'center', gap: 14 }, eyes]}>
          <View style={{ width: 9, height: 16, borderRadius: 5, backgroundColor: PIN.face }} />
          <View style={{ width: 9, height: 16, borderRadius: 5, backgroundColor: PIN.face }} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
