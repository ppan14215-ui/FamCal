/**
 * Memo, the blob (Julian 07.11.2026). A soft, glossy teal drop with two cream
 * pill eyes and no mouth. Everything it says, it says with its body and its
 * eyes: it breathes, its outline never quite holds still (jelly), it blinks,
 * looks around, squashes flat while it thinks, grows and wobbles with your
 * voice, and squishes with a happy wiggle and ^^ eyes when something has landed.
 *
 * The outline is a closed spline through eight points whose distance from the
 * centre drifts a little every frame; the shine is two SVG gradients, so it is
 * sharp at every size and ships by OTA (no native module). Reduced motion
 * keeps the shape still and only swaps the eyes.
 */
import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Path, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, useFrameCallback, withTiming, withSequence,
  withRepeat, withDelay, cancelAnimation, Easing, useReducedMotion, type SharedValue,
} from 'react-native-reanimated';
import type { Mood } from '../../lib/buddy';

const APath = Animated.createAnimatedComponent(Path);

/** FamCal colours (cream + teal): the body is the app's teal, lit from the top left. */
export const BLOB = {
  light: '#7AD6CD',
  mid: '#13878C',
  deep: '#08535A',
  eye: '#FFFBF2',
};

const N = 8;
/** Catmull-Rom handles stretched so eight points draw a true circle at rest. */
const K = 1.125 / 6;

/** The outline: eight points drifting around a slightly wide, bottom-heavy drop. */
function blobPath(cx: number, cy: number, R: number, t: number, amp: number, lvl: number) {
  'worklet';
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const n = Math.sin(t * 1.3 + i * 1.7) * 0.6 + Math.sin(t * 2.1 + i * 2.9) * 0.4;
    const v = Math.sin(t * 10 + i * 2.3) * lvl * 0.045;
    const r = R * (1 + amp * n + v);
    const s = Math.sin(a);
    xs.push(cx + Math.cos(a) * r * 1.05);
    // The bottom is a little flatter, so it sits like a drop and not a ball.
    ys.push(cy + s * r * (s > 0 ? 0.9 : 0.97));
  }
  let d = `M${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < N; i++) {
    const p0 = (i - 1 + N) % N, p1 = i, p2 = (i + 1) % N, p3 = (i + 2) % N;
    const c1x = xs[p1] + (xs[p2] - xs[p0]) * K, c1y = ys[p1] + (ys[p2] - ys[p0]) * K;
    const c2x = xs[p2] - (xs[p3] - xs[p1]) * K, c2y = ys[p2] - (ys[p3] - ys[p1]) * K;
    d += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${xs[p2].toFixed(2)} ${ys[p2].toFixed(2)}`;
  }
  return d + 'Z';
}

let seq = 0;

export type BlobProps = {
  size?: number;
  mood?: Mood;
  /** Bumping it plays one happy wiggle with ^^ eyes. */
  joy?: number;
  /** Bumping it plays a small squish (a tap, a new message, landing on the field). */
  poke?: number;
  /** Look towards a point for a moment (x, y in -1..1); a new n plays it again. */
  glance?: { x: number; y: number; n: number };
  /** Voice level 0..1 while listening. */
  level?: SharedValue<number>;
  /** No frame loop: the shape holds still and only the eyes follow the mood (small faces in a long chat). */
  still?: boolean;
  /** Where the eyes rest while typing (x, y in -1..1). Above the field that is down at the text; in the bar the text sits up and left (Julian 08.11. 23:49: "he should be looking up at the text as I type"). */
  typeAt?: { x: number; y: number };
  /** A lasting gaze target that replaces the resting look in idle and type (the onboarding looks at its text with it). */
  gaze?: { x: number; y: number } | null;
  /** A soft shadow on the ground. */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Blob({ size = 40, mood = 'idle', joy = 0, poke = 0, glance, level, still, shadow = true, style, typeAt, gaze }: BlobProps) {
  const tAt = gaze ?? typeAt ?? { x: -0.55, y: 0.75 };
  const restRef = useRef(gaze ?? { x: 0, y: 0 }); restRef.current = gaze ?? { x: 0, y: 0 };
  const tAtRef = useRef(tAt); tAtRef.current = tAt;
  const S = size;
  const reduced = useReducedMotion();
  const live = !still && !reduced;
  const id = useRef(`blob${++seq}`).current;
  const cx = S / 2, cy = S * 0.54, R = S * 0.4;

  // Time and breathing phase run on the UI thread.
  const t = useSharedValue(1.7);
  const ph = useSharedValue(0);
  const bf = useSharedValue(2.2); // breathing speed
  const ba = useSharedValue(0.018); // breathing depth
  const amp = useSharedValue(0.03); // jelly
  const lvlOn = useSharedValue(0); // how much the voice shakes it
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const grow = useSharedValue(1);
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const rot = useSharedValue(0);
  const gx = useSharedValue(0);
  const gy = useSharedValue(0);
  const blink = useSharedValue(1);
  const wide = useSharedValue(1);
  const happy = useSharedValue(mood === 'happy' ? 1 : 0);
  const zero = useSharedValue(0);
  const lv = level ?? zero;

  useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    t.value += dt;
    ph.value += dt * bf.value;
  }, live);

  const pathProps = useAnimatedProps(() => ({ d: blobPath(cx, cy, R, t.value, amp.value, lv.value * lvlOn.value) }));

  const bodyStyle = useAnimatedStyle(() => {
    const b = Math.sin(ph.value) * ba.value;
    const v = lv.value * lvlOn.value;
    return {
      transform: [
        { translateX: tx.value + gx.value * S * 0.05 },
        { translateY: ty.value },
        { rotate: `${rot.value + gx.value * 3}deg` },
        { scaleX: sx.value * grow.value * (1 - b * 0.6 + v * 0.05) },
        { scaleY: sy.value * grow.value * (1 + b + v * 0.07) },
      ] as any,
    };
  });
  const eyeStyle = useAnimatedStyle(() => ({
    opacity: 1 - happy.value,
    transform: [{ translateX: gx.value * S * 0.13 }, { translateY: gy.value * S * 0.12 }, { scaleY: blink.value * wide.value }] as any,
  }));
  const arcStyle = useAnimatedStyle(() => ({
    opacity: happy.value,
    transform: [{ translateX: gx.value * S * 0.04 }, { translateY: S * 0.01 - happy.value * S * 0.012 }, { scale: 0.85 + happy.value * 0.15 }] as any,
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const up = Math.min(1, -ty.value / (S * 0.5));
    return { opacity: 0.9 - up * 0.6, transform: [{ scaleX: sx.value * grow.value * (1 - up * 0.35) }] as any };
  });

  // Mood: set the targets, then keep small life going with timers.
  useEffect(() => {
    const all = [sx, sy, grow, rot, gx, gy, blink, wide, amp, bf, ba, lvlOn, tx];
    all.forEach(cancelAnimation);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    // No springs anywhere (Julian 08.11.: "die Spring-Animation ist immer noch da"): every move eases out and settles, no overshoot.
    const sp = { duration: 260, easing: Easing.bezier(0.23, 1, 0.32, 1) };
    const look = (x: number, y: number, ms = 260) => { gx.value = withTiming(x, { duration: ms, easing: Easing.bezier(0.23, 1, 0.32, 1) }); gy.value = withTiming(y, { duration: ms, easing: Easing.bezier(0.23, 1, 0.32, 1) }); };
    const blinkOnce = (twice = false) => {
      const one = [withTiming(0.12, { duration: 70 }), withTiming(1, { duration: 110 })];
      blink.value = twice ? withSequence(...one, withTiming(1, { duration: 90 }), ...one) : withSequence(...one);
    };

    if (mood !== 'happy') happy.value = withTiming(0, { duration: 160 });
    lvlOn.value = withTiming(mood === 'listen' ? 1 : 0, { duration: 250 });
    wide.value = withTiming(mood === 'listen' ? 1.12 : 1, sp);
    grow.value = withTiming(mood === 'listen' ? 1.15 : 1, { duration: 320, easing: Easing.bezier(0.23, 1, 0.32, 1) });
    amp.value = withTiming(mood === 'listen' ? 0.038 : mood === 'think' ? 0.04 : mood === 'sleep' ? 0.015 : 0.026, { duration: 400 });
    bf.value = mood === 'sleep' ? 0.9 : mood === 'listen' ? 3.2 : 2.2;
    ba.value = withTiming(mood === 'sleep' ? 0.035 : 0.018, { duration: 400 });
    rot.value = withTiming(0, sp);
    tx.value = withTiming(0, sp);

    if (mood === 'think') {
      // Squashed flat and wide, pulsing like it is mulling it over; eyes go up and wander.
      sx.value = withRepeat(withSequence(withTiming(1.16, { duration: 420, easing: Easing.inOut(Easing.sin) }), withTiming(1.06, { duration: 420, easing: Easing.inOut(Easing.sin) })), -1, false);
      sy.value = withRepeat(withSequence(withTiming(0.8, { duration: 420, easing: Easing.inOut(Easing.sin) }), withTiming(0.92, { duration: 420, easing: Easing.inOut(Easing.sin) })), -1, false);
      blink.value = withTiming(1, { duration: 100 });
      look(0.7, -0.6);
      if (live) {
        let k = 0;
        const wander = () => { k++; look(k % 2 ? -0.7 : 0.7, -0.6, 420); rot.value = withTiming(k % 2 ? -4 : 4, { duration: 420, easing: Easing.inOut(Easing.sin) }); later(900, wander); };
        later(700, wander);
      }
    } else {
      sx.value = withTiming(1, sp);
      sy.value = withTiming(1, sp);
      if (mood === 'listen') { look(0, -0.5); blink.value = withTiming(1, { duration: 100 }); }
      else if (mood === 'type') look(tAtRef.current.x, tAtRef.current.y);
      else if (mood === 'sleep') { look(0, 0.3); blink.value = withTiming(0.12, { duration: 300 }); }
      else look(restRef.current.x, restRef.current.y);
    }

    if (live && mood !== 'sleep' && mood !== 'think') {
      // Blinks, now and then a double one.
      const nextBlink = () => later(2200 + Math.random() * 3300, () => { blinkOnce(Math.random() < 0.18); nextBlink(); });
      nextBlink();
    }
    if (live && mood === 'idle') {
      // Glances around: towards the chat, up, back to you.
      const spots: [number, number][] = [[-0.9, 0.1], [-0.6, -0.6], [0.7, -0.4], [0, 0], [0, 0], [-0.9, 0.5]];
      const glance = () => later(3500 + Math.random() * 4500, () => {
        const [x, y] = spots[Math.floor(Math.random() * spots.length)];
        look(x, y, 300);
        if (Math.random() < 0.3) later(1200 + Math.random() * 800, () => look(0, 0, 300));
        glance();
      });
      glance();
      // Tiny eye darts in between, the way a living face never quite holds still.
      const dart = () => later(700 + Math.random() * 1400, () => {
        const bx = gx.value, by = gy.value;
        gx.value = withSequence(withTiming(bx + (Math.random() - 0.5) * 0.3, { duration: 60 }), withDelay(220 + Math.random() * 300, withTiming(bx, { duration: 90 })));
        gy.value = withSequence(withTiming(by + (Math.random() - 0.5) * 0.2, { duration: 60 }), withDelay(220 + Math.random() * 300, withTiming(by, { duration: 90 })));
        dart();
      });
      dart();
    }
    if (live && mood === 'type') {
      // Follows the typing with small nods.
      const nod = () => later(900 + Math.random() * 700, () => { const y = tAtRef.current.y; gy.value = withSequence(withTiming(y + 0.2, { duration: 140 }), withTiming(y, { duration: 220 })); nod(); });
      nod();
    }
    return () => { timers.forEach(clearTimeout); };
  }, [mood, live]);

  // Reactions stay in place (Julian 08.11.: "the jumping doesn't make sense"), but with real life in them
  // (Julian 08.11. 23:50: "top notch, not boring spring"): a small gather (anticipation), a stretch that
  // overshoots on its own curve, a little counter-squash as the jelly settles (follow-through). No springs.
  const OUT = Easing.bezier(0.23, 1, 0.32, 1);
  const OVER = Easing.bezier(0.34, 1.56, 0.64, 1);
  const react = (big: boolean, eyes: number) => {
    happy.value = withSequence(withDelay(big ? 90 : 0, withTiming(1, { duration: 120 })), withDelay(eyes, withTiming(0, { duration: 220 })));
    gx.value = withTiming(0, { duration: 160 }); gy.value = withTiming(big ? -0.25 : 0, { duration: 160 });
    if (!live) return;
    cancelAnimation(sx); cancelAnimation(sy); cancelAnimation(rot); cancelAnimation(amp);
    const k = big ? 1 : 0.55;
    sx.value = withSequence(withTiming(1 + 0.1 * k, { duration: 90, easing: OUT }), withTiming(1 - 0.09 * k, { duration: 170, easing: OVER }), withTiming(1 + 0.03 * k, { duration: 160, easing: OUT }), withTiming(1, { duration: 260, easing: OUT }));
    sy.value = withSequence(withTiming(1 - 0.12 * k, { duration: 90, easing: OUT }), withTiming(1 + 0.13 * k, { duration: 170, easing: OVER }), withTiming(1 - 0.04 * k, { duration: 160, easing: OUT }), withTiming(1, { duration: 260, easing: OUT }));
    // The jelly ripples a moment longer, like a body that really moved.
    amp.value = withSequence(withTiming(0.06 * k + 0.02, { duration: 120 }), withTiming(0.026, { duration: 700, easing: OUT }));
    if (big) rot.value = withSequence(withDelay(90, withTiming(-6, { duration: 170, easing: OVER })), withTiming(3, { duration: 200, easing: OUT }), withTiming(0, { duration: 300, easing: OUT }));
    if (!big) return;
    // ...and then he looks at you, pleased.
    later2(eyes + 260, () => { gy.value = withTiming(0, { duration: 300, easing: OUT }); });
  };
  const timers2 = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later2 = (ms: number, f: () => void) => { timers2.current.push(setTimeout(f, ms)); };
  useEffect(() => () => timers2.current.forEach(clearTimeout), []);
  // Perks up when something starts (the keyboard opens, the mic starts): gather, rise, eyes pop open.
  const prevMood = useRef(mood);
  useEffect(() => {
    const was = prevMood.current; prevMood.current = mood;
    if (!live || first.current || was === mood) return;
    if (!((mood === 'type' || mood === 'listen') && (was === 'idle' || was === 'sleep'))) return;
    const k = was === 'sleep' ? 1.2 : 1;
    blink.value = withSequence(withTiming(0.2, { duration: 70 }), withTiming(1.15, { duration: 140, easing: OVER }), withTiming(1, { duration: 200 }));
    sy.value = withSequence(withTiming(1 - 0.08 * k, { duration: 80, easing: OUT }), withTiming(1 + 0.09 * k, { duration: 160, easing: OVER }), withTiming(1, { duration: 280, easing: OUT }));
    sx.value = withSequence(withTiming(1 + 0.06 * k, { duration: 80, easing: OUT }), withTiming(1 - 0.05 * k, { duration: 160, easing: OVER }), withTiming(1, { duration: 280, easing: OUT }));
  }, [mood]);
  // Follows you: eyes go where you touched, then drift back.
  useEffect(() => {
    if (!glance || (mood !== 'idle' && mood !== 'type')) return;
    const out = Easing.bezier(0.23, 1, 0.32, 1);
    const over = Easing.bezier(0.34, 1.56, 0.64, 1);
    // Eyes first, in one quick dart; the body follows a beat later and leans in, like he's curious.
    gx.value = withSequence(withTiming(glance.x, { duration: 90, easing: out }), withDelay(1300, withTiming(mood === 'type' ? tAtRef.current.x : restRef.current.x, { duration: 420, easing: out })));
    gy.value = withSequence(withTiming(glance.y, { duration: 90, easing: out }), withDelay(1300, withTiming(mood === 'type' ? tAtRef.current.y : restRef.current.y, { duration: 420, easing: out })));
    if (live) {
      rot.value = withSequence(withDelay(60, withTiming(glance.x * 8, { duration: 260, easing: over })), withDelay(1050, withTiming(0, { duration: 480, easing: out })));
      tx.value = withSequence(withDelay(60, withTiming(glance.x * S * 0.06, { duration: 260, easing: over })), withDelay(1050, withTiming(0, { duration: 480, easing: out })));
      sy.value = withSequence(withDelay(40, withTiming(1.04, { duration: 140, easing: out })), withTiming(1, { duration: 300, easing: out }));
    }
  }, [glance?.n]);
  // Reading along: as the text grows the eyes move with it.
  useEffect(() => {
    if (mood === 'idle' && gaze) { const out = Easing.bezier(0.23, 1, 0.32, 1); gx.value = withTiming(gaze.x, { duration: 200, easing: out }); gy.value = withTiming(gaze.y, { duration: 200, easing: out }); return; }
    if (mood !== 'type') return;
    const out = Easing.bezier(0.23, 1, 0.32, 1);
    gx.value = withTiming(tAt.x, { duration: 160, easing: out });
    gy.value = withSequence(withTiming(tAt.y + 0.12, { duration: 90, easing: out }), withTiming(tAt.y, { duration: 200, easing: out }));
    if (live) sy.value = withSequence(withTiming(0.97, { duration: 80, easing: out }), withTiming(1, { duration: 220, easing: out }));
  }, [tAt.x, tAt.y]);
  const first = useRef(true);
  useEffect(() => { if (first.current) return; react(true, 1600); }, [joy]);
  useEffect(() => { if (first.current) return; react(false, 450); }, [poke]);
  useEffect(() => { first.current = false; if (mood === 'happy') happy.value = withTiming(1, { duration: 160 }); }, [mood]);

  const ew = S * 0.1, eh = S * 0.175; // a pill eye
  const aw = S * 0.15, at = Math.max(1.4, S * 0.042); // a ^ eye
  const ey = cy + S * 0.02, ex = S * 0.155;

  return (
    <View pointerEvents="none" style={[{ width: S, height: S }, style]}>
      {shadow ? (
        <Animated.View style={[{ position: 'absolute', left: S * 0.18, right: S * 0.18, top: S * 0.9, height: S * 0.12 }, shadowStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id={`${id}s`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#16232A" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#16232A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={50} cy={10} rx={50} ry={10} fill={`url(#${id}s)`} />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: S, height: S, transformOrigin: ['50%', '94%', 0] }, bodyStyle]}>
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id={`${id}b`} cx="36%" cy="28%" r="80%" fx="34%" fy="24%">
              <Stop offset="0" stopColor={BLOB.light} />
              <Stop offset="0.48" stopColor={BLOB.mid} />
              <Stop offset="1" stopColor={BLOB.deep} />
            </RadialGradient>
            <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`${id}r`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#9BE7DF" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#8FE0D8" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <APath animatedProps={pathProps} d={blobPath(cx, cy, R, 1.7, 0.03, 0)} fill={`url(#${id}b)`} />
          {/* Bounce light from below, the gloss on top. */}
          <Ellipse cx={cx + R * 0.15} cy={cy + R * 0.72} rx={R * 0.5} ry={R * 0.16} fill={`url(#${id}r)`} />
          <Ellipse cx={cx - R * 0.32} cy={cy - R * 0.5} rx={R * 0.36} ry={R * 0.24} fill={`url(#${id}h)`} />
        </Svg>
        {/* Eyes: cream pills; happy turns them into ^^. */}
        {[-1, 1].map((side) => (
          <React.Fragment key={side}>
            <Animated.View style={[{ position: 'absolute', left: cx + side * ex - ew / 2, top: ey - eh / 2, width: ew, height: eh, borderRadius: ew / 2, backgroundColor: BLOB.eye }, eyeStyle]} />
            <Animated.View style={[{ position: 'absolute', left: cx + side * ex - aw / 2, top: ey - aw / 2, width: aw, height: aw / 2 + at / 2, overflow: 'hidden' }, arcStyle]}>
              <View style={{ width: aw, height: aw, borderRadius: aw / 2, borderWidth: at, borderColor: BLOB.eye }} />
            </Animated.View>
          </React.Fragment>
        ))}
      </Animated.View>
    </View>
  );
}

/** Eyes of a still Memo, keyed like the old magnet's art (onboarding films drive them by name). */
export type ArtEyes = 'open' | 'closed' | 'sleep' | 'happy' | 'up' | 'think' | 'wink' | 'wide' | 'left' | 'right';

/**
 * A still Memo blob with a named face: the onboarding and its films move it with their own transforms
 * and swap faces on a clock, so it draws no loop of its own. Same body and gloss as the live Blob.
 */
export function BlobArt({ size: S, eyes = 'open' }: { size: number; eyes?: ArtEyes }) {
  const id = useRef(`blobart${++seq}`).current;
  const cx = S / 2, cy = S * 0.54, R = S * 0.4;
  const ew = S * 0.1, eh = S * 0.175, aw = S * 0.15, at = Math.max(1.4, S * 0.042);
  const ex = S * 0.155, ey = cy + S * 0.02;
  const [gx, gy] = eyes === 'up' ? [0, -0.6] : eyes === 'think' ? [0.7, -0.6] : eyes === 'left' ? [-0.9, 0] : eyes === 'right' ? [0.9, 0] : [0, 0];
  const k = eyes === 'wide' ? 1.15 : 1;
  const eye = (side: number) => {
    const x = cx + side * ex + gx * S * 0.075, y = ey + gy * S * 0.06;
    const shut = eyes === 'closed' || eyes === 'sleep' || (eyes === 'wink' && side < 0);
    if (eyes === 'happy') return (
      <View key={side} style={{ position: 'absolute', left: x - aw / 2, top: y - aw / 2, width: aw, height: aw / 2 + at / 2, overflow: 'hidden' }}>
        <View style={{ width: aw, height: aw, borderRadius: aw / 2, borderWidth: at, borderColor: BLOB.eye }} />
      </View>
    );
    const h = shut ? Math.max(1.5, eh * 0.16) : eh * k, w = shut ? ew * 1.25 : ew * k;
    return <View key={side} style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: w / 2, backgroundColor: BLOB.eye }} />;
  };
  return (
    <View style={{ width: S, height: S }} pointerEvents="none">
      <Svg width={S} height={S}>
        <Defs>
          <RadialGradient id={`${id}b`} cx="36%" cy="28%" r="80%" fx="34%" fy="24%">
            <Stop offset="0" stopColor={BLOB.light} />
            <Stop offset="0.48" stopColor={BLOB.mid} />
            <Stop offset="1" stopColor={BLOB.deep} />
          </RadialGradient>
          <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={blobPath(cx, cy, R, 1.7, 0.03, 0)} fill={`url(#${id}b)`} />
        <Ellipse cx={cx - R * 0.32} cy={cy - R * 0.5} rx={R * 0.36} ry={R * 0.24} fill={`url(#${id}h)`} />
      </Svg>
      {eye(-1)}{eye(1)}
    </View>
  );
}
