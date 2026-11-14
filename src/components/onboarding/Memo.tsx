/**
 * Memo, FamCal's mascot (Julian 01.11.2026: name Memo, clay look like the
 * app icons). A glazed clay fridge magnet with two eyes and no mouth. It never
 * talks; it does one thing at a time:
 *
 *   land    falls in from above, squashes, springs back, blinks
 *   blink   one blink ("Okay, mach ich")
 *   wobble  tilts left and right while something is being worked on
 *   peek    rises from below a line and looks
 *   sleep   lies flat with closed eyes and breathes slowly, little z's rise
 *   idle    rests, blinks now and then
 *   look    curious: tilts and looks up at a question
 *   think   eyes up to the side, a "?" floats, slow tilt (assistant working)
 *   happy   eyes close into arcs, a small hop (a card has landed)
 *   cheer   eyes wide, jumps with motion lines, then happy (a list item ticked)
 *   wink    one wink (end of the onboarding)
 *   roll    rolls in from the left, settles, blinks
 *   note    holds a sticky note above its head (the fridge story)
 *
 * Expressions come from the character sheet (01.11.2026); the eye variants are
 * derived from the Blender renders so they keep the same light and glaze.
 *
 * The art is three renders of the Blender model (assets/memo). Squash, tilt
 * and the fall are transforms, so it stays sharp at any size and needs no
 * native module (ships by OTA). Reduced motion shows the resting pose.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, Text, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, withRepeat, withDelay,
  Easing, useReducedMotion, cancelAnimation, runOnJS, type SharedValue,
} from 'react-native-reanimated';
import { seg } from '../../theme/film';
import { BlobArt, type ArtEyes } from '../buddy/Blob';
import { haptics } from '../../lib/haptics';

const ART = {
  open: require('../../../assets/memo/memo-neutral.webp'),
  closed: require('../../../assets/memo/memo-blink.webp'),
  sleep: require('../../../assets/memo/memo-sleep.webp'),
  happy: require('../../../assets/memo/memo-happy.webp'),
  up: require('../../../assets/memo/memo-up.webp'),
  think: require('../../../assets/memo/memo-think.webp'),
  wink: require('../../../assets/memo/memo-wink.webp'),
  wide: require('../../../assets/memo/memo-wide.webp'),
  // Looking to the side (film only): made from memo-neutral, the eyes moved on the face.
  left: require('../../../assets/memo/memo-left.webp'),
  right: require('../../../assets/memo/memo-right.webp'),
};
export type Eyes = keyof typeof ART;

export type MemoAct = 'land' | 'blink' | 'wobble' | 'peek' | 'sleep' | 'idle' | 'look' | 'think' | 'happy' | 'cheer' | 'wink' | 'roll' | 'note';

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
  const x = useSharedValue(act === 'roll' && !reduced ? -size * 2.4 : 0);
  const fade = useSharedValue((act === 'land' || act === 'roll') && !reduced ? 0 : 1);
  const extra = useSharedValue(0); // overlay: "?", z's, motion lines, note
  const [eyes, setEyes] = useState<Eyes>(restEyes(act));

  // Blink back to whatever this act rests with (happy arcs stay arcs).
  const blink = (after = 0, back: Eyes = restEyes(act)) => {
    setTimeout(() => setEyes('closed'), after);
    setTimeout(() => setEyes(back), after + 140);
  };
  const done = () => onDone?.();

  useEffect(() => {
    if (reduced) { y.value = 0; fade.value = 1; done(); return; }
    cancelAnimation(y); cancelAnimation(sx); cancelAnimation(sy); cancelAnimation(rot); cancelAnimation(extra);
    setEyes(restEyes(act));
    extra.value = 0;
    const settle = () => { y.value = withSpring(0); x.value = withSpring(0); sx.value = withSpring(1); sy.value = withSpring(1); };
    const hop = (h: number, then?: () => void) => {
      sy.value = withSequence(withTiming(0.86, { duration: 90 }), withTiming(1.06, { duration: 140 }), withSpring(1, { stiffness: 320, damping: 12 }));
      sx.value = withSequence(withTiming(1.08, { duration: 90 }), withTiming(0.96, { duration: 140 }), withSpring(1, { stiffness: 320, damping: 12 }));
      y.value = withSequence(withDelay(90, withTiming(-h, { duration: 170, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }, (ok) => { if (ok && then) runOnJS(then)(); }));
    };
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
      rot.value = withTiming(0, { duration: 160 });
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
      extra.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1);
    } else if (act === 'look') {
      settle();
      rot.value = withSequence(withTiming(-8, { duration: 220, easing: Easing.out(Easing.quad) }), withDelay(900, withSpring(-3)));
      y.value = withSequence(withTiming(-size * 0.06, { duration: 220 }), withSpring(0));
      blink(1400);
      setTimeout(done, 300);
    } else if (act === 'think') {
      settle();
      rot.value = withRepeat(withSequence(
        withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ), -1, true);
      extra.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.55, { duration: 900 })), -1, true);
    } else if (act === 'happy') {
      rot.value = withTiming(0, { duration: 160 });
      hop(size * 0.12, done);
    } else if (act === 'cheer') {
      rot.value = withTiming(0, { duration: 120 });
      extra.value = withSequence(withTiming(1, { duration: 120 }), withDelay(520, withTiming(0, { duration: 260 })));
      hop(size * 0.26, () => { setEyes('happy'); done(); });
    } else if (act === 'wink') {
      rot.value = withSequence(withTiming(6, { duration: 140 }), withDelay(380, withSpring(0)));
      setTimeout(() => setEyes('wink'), 60);
      setTimeout(() => setEyes('open'), 620);
      setTimeout(done, 640);
    } else if (act === 'roll') {
      x.value = -size * 2.4;
      fade.value = withDelay(delay, withTiming(1, { duration: 160 }));
      rot.value = -360;
      x.value = withDelay(delay, withSpring(0, { stiffness: 90, damping: 15 }));
      rot.value = withDelay(delay, withSpring(0, { stiffness: 90, damping: 15 }, (ok) => {
        if (!ok) return;
        runOnJS(blink)(120);
        runOnJS(done)();
      }));
    } else if (act === 'note') {
      settle(); rot.value = withTiming(0);
      extra.value = withDelay(delay, withSpring(1, { stiffness: 160, damping: 13 }));
      blink(delay + 700);
    } else {
      rot.value = withTiming(0, { duration: 200 }); settle();
    }
  }, [act, beat, reduced]);

  // Now and then a blink, so Memo feels present without asking for attention.
  useEffect(() => {
    if (!alive || reduced || act === 'sleep' || act === 'wobble' || act === 'think' || act === 'happy' || act === 'cheer') return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => { t = setTimeout(() => { blink(); next(); }, 3800 + Math.random() * 3200); };
    next();
    return () => clearTimeout(t);
  }, [alive, act, reduced]);

  const body = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: x.value },
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

  const fx = Math.max(10, size * 0.26);
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
        {/* The blob (Julian 07.11.: the new Memo replaces the magnet everywhere); same moves, new body. */}
        <BlobArt size={size} eyes={act === 'sleep' ? 'sleep' : eyes as ArtEyes} />
      </Animated.View>
      {act === 'think' ? <Over v={extra} kind="think" size={size} fx={fx} /> : null}
      {act === 'sleep' ? <Over v={extra} kind="sleep" size={size} fx={fx} /> : null}
      {act === 'cheer' ? <Over v={extra} kind="cheer" size={size} fx={fx} /> : null}
      {act === 'note' ? <Over v={extra} kind="note" size={size} fx={fx} /> : null}
    </View>
  );
}

function restEyes(act: MemoAct): Eyes {
  if (act === 'sleep') return 'closed';
  if (act === 'look') return 'up';
  if (act === 'think') return 'think';
  if (act === 'happy') return 'happy';
  if (act === 'cheer') return 'wide';
  return 'open';
}

const INK = '#1E2A30';

/** The small things around Memo: a "?", z's, motion lines, a sticky note. */
function Over({ v, kind, size, fx }: { v: SharedValue<number>; kind: 'think' | 'sleep' | 'cheer' | 'note'; size: number; fx: number }) {
  const st = useAnimatedStyle((): any => {
    const t = v.value;
    if (kind === 'think') return { opacity: t, transform: [{ translateY: -size * 0.04 * t }, { scale: 0.85 + 0.15 * t }] };
    if (kind === 'sleep') return { opacity: t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85, transform: [{ translateY: -size * 0.35 * t }, { translateX: size * 0.08 * t }] };
    if (kind === 'cheer') return { opacity: t, transform: [{ scale: 0.8 + 0.2 * t }] };
    return { opacity: Math.min(1, t * 1.4), transform: [{ translateY: size * 0.25 * (1 - t) }, { rotate: `${-8 + 4 * t}deg` }] };
  });
  if (kind === 'note') {
    const w = size * 0.5;
    return (
      <Animated.View style={[{ position: 'absolute', top: -w * 0.82, left: size / 2 - w / 2, width: w, height: w * 0.9, borderRadius: w * 0.08, backgroundColor: '#FFE59A', padding: w * 0.14, gap: w * 0.09, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, st]}>
        <View style={{ height: Math.max(1.5, w * 0.05), width: '80%', borderRadius: 2, backgroundColor: 'rgba(30,42,48,0.55)' }} />
        <View style={{ height: Math.max(1.5, w * 0.05), width: '60%', borderRadius: 2, backgroundColor: 'rgba(30,42,48,0.45)' }} />
        <View style={{ height: Math.max(1.5, w * 0.05), width: '70%', borderRadius: 2, backgroundColor: 'rgba(30,42,48,0.35)' }} />
      </Animated.View>
    );
  }
  if (kind === 'cheer') {
    const L = (rot: number, l: number, t: number) => <View style={{ position: 'absolute', left: l, top: t, width: fx * 0.18, height: fx * 0.7, borderRadius: fx, backgroundColor: INK, opacity: 0.7, transform: [{ rotate: `${rot}deg` }] }} />;
    return (
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, st]}>
        {L(-35, size * 0.06, size * 0.02)}{L(0, size * 0.48, -size * 0.14)}{L(35, size * 0.88, size * 0.02)}
      </Animated.View>
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: -fx * 0.2, top: -fx * 0.5 }, st]}>
      <Text style={{ fontSize: fx, lineHeight: fx * 1.1, fontWeight: '800', color: INK }}>{kind === 'think' ? '?' : 'z'}</Text>
    </Animated.View>
  );
}

const CLOSE_MS = 70;
const OPEN_MS = 90;

/** An eye key on a film clock: at time t (s) the eyes become e. `direct` crosses over without closing (wink). */
export type EyeKey = { t: number; e: Eyes; direct?: boolean };

function eyeAt(t: number, keys: EyeKey[], initial: Eyes): [Eyes, Eyes, number] {
  'worklet';
  let prev = initial;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (t < k.t - CLOSE_MS / 1000) return [prev, prev, 0];
    if (k.direct) {
      if (t < k.t + 0.03) return [prev, k.e, seg(t, k.t - CLOSE_MS / 1000, k.t + 0.03)];
    } else {
      if (t < k.t) return [prev, 'closed', seg(t, k.t - CLOSE_MS / 1000, k.t)];
      if (t < k.t + OPEN_MS / 1000) return ['closed', k.e, seg(t, k.t, k.t + OPEN_MS / 1000)];
    }
    prev = k.e;
  }
  return [prev, prev, 0];
}

/**
 * Memo's face driven by a film clock (seconds): every frame is a pure function of the clock, so the
 * film can be scrubbed. All eye arts are stacked; the closed one lies lowest so a crossing never shows
 * the background through the body.
 */
export function MemoFace({ size, clock, keys, initial = 'open' }: { size: number; clock: SharedValue<number>; keys: EyeKey[]; initial?: Eyes }) {
  const order: Eyes[] = ['closed'];
  for (const e of [initial, ...keys.map((k) => k.e)]) if (!order.includes(e)) order.push(e);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel="Memo" pointerEvents="none">
      {order.map((e) => <EyeLayer key={e} e={e} order={order} size={size} clock={clock} keys={keys} initial={initial} />)}
    </View>
  );
}

function EyeLayer({ e, order, size, clock, keys, initial }: { e: Eyes; order: Eyes[]; size: number; clock: SharedValue<number>; keys: EyeKey[]; initial: Eyes }) {
  const st = useAnimatedStyle(() => {
    const [A, B, a0] = eyeAt(clock.value, keys, initial);
    const a = a0 * a0 * (3 - 2 * a0);
    let o = 0;
    if (A === B) o = e === A ? 1 : 0;
    else if (order.indexOf(B) > order.indexOf(A)) o = e === A ? 1 : e === B ? a : 0;
    else o = e === B ? 1 : e === A ? 1 - a : 0;
    return { opacity: o };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, st]}><BlobArt size={size} eyes={e as ArtEyes} /></Animated.View>;
}
