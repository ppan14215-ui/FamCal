/**
 * Pin, the clay fridge magnet (Julian 11.11.2026: "a new mascot with the clay style, just like our icons ...
 * goes back to the PIN idea ... similar to the blob, with similar animations. It should react to what I'm saying").
 *
 * The body is one render of the Blender model (assets/memo/pin-body.webp: teal clay rim, cream face, no eyes),
 * lit and coloured like the clay icons. Everything that moves is drawn on top: black enamel eyes that blink,
 * glance, read along, turn into ^^, and a body that breathes, squashes, tilts and hops with the voice. That way the
 * motion is never forced onto a still picture (the icon rule: motion first, then the exact assets).
 *
 * Same props as Blob, so any Memo on screen can switch by import. Extra:
 *   heard  bumps when new words came in while listening: a small nod, as if he follows along
 *   pose   for the onboarding: 'peek' (look up from the bottom edge, gentle sway), 'wave' (rocks hello, he has
 *          no arms), 'jump' (one big happy jump with ^^)
 */
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useFrameCallback, withTiming, withSequence, withRepeat, withDelay,
  cancelAnimation, Easing, useReducedMotion, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import type { Mood } from '../../lib/buddy';

const BODY = require('../../../assets/memo/pin-body.webp');

/** Colours of the clay, for anything drawn next to him. */
export const PIN = { rim: '#1F6F72', rimDeep: '#0E5256', face: '#F0E5D2', ink: '#1A2124' };

/** Where the face and eyes sit on the 600 px render, as shares of its width. */
const EYE_X = 0.119; // from the centre
const EYE_Y = 0.518;
const EYE_W = 0.085;
const EYE_H = 0.122;

export type PinPose = 'peek' | 'wave' | 'jump';

export type PinProps = {
  size?: number;
  mood?: Mood;
  joy?: number;
  poke?: number;
  glance?: { x: number; y: number; n: number };
  level?: SharedValue<number>;
  still?: boolean;
  typeAt?: { x: number; y: number };
  gaze?: { x: number; y: number } | null;
  shadow?: boolean;
  /** Bumps each time new words arrive while listening. */
  heard?: number;
  pose?: PinPose;
  style?: StyleProp<ViewStyle>;
};

let seq = 0;
const OUT = Easing.bezier(0.23, 1, 0.32, 1);
const OVER = Easing.bezier(0.34, 1.56, 0.64, 1);
const SINE = Easing.inOut(Easing.sin);

export default function Pin({ size = 40, mood = 'idle', joy = 0, poke = 0, glance, level, still, shadow = true, style, typeAt, gaze, heard = 0, pose }: PinProps) {
  const S = size;
  const tAt = gaze ?? typeAt ?? { x: -0.55, y: 0.75 };
  const restRef = useRef(gaze ?? { x: 0, y: 0 }); restRef.current = gaze ?? { x: 0, y: 0 };
  const tAtRef = useRef(tAt); tAtRef.current = tAt;
  const reduced = useReducedMotion();
  const live = !still && !reduced;
  const id = useRef(`pin${++seq}`).current;

  const ph = useSharedValue(0);
  const bf = useSharedValue(2.2);
  const ba = useSharedValue(0.014);
  const lvlOn = useSharedValue(0);
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
  // The voice shakes him a little, smoothed so it reads as bobbing along, not jitter.
  const vs = useSharedValue(0);

  useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    ph.value += dt * bf.value;
    const target = lv.value * lvlOn.value;
    vs.value += (target - vs.value) * Math.min(1, dt * 14);
  }, live);

  const bodyStyle = useAnimatedStyle(() => {
    const b = Math.sin(ph.value) * ba.value;
    const v = vs.value;
    return {
      transform: [
        { translateX: tx.value + gx.value * S * 0.03 },
        { translateY: ty.value - v * S * 0.05 },
        { rotate: `${rot.value + gx.value * 2.5 + Math.sin(ph.value * 1.7) * v * 5}deg` },
        { scaleX: sx.value * grow.value * (1 - b * 0.6 + v * 0.04) },
        { scaleY: sy.value * grow.value * (1 + b + v * 0.06) },
      ] as any,
    };
  });
  const eyeStyle = useAnimatedStyle(() => ({
    opacity: 1 - happy.value,
    transform: [{ translateX: gx.value * S * 0.075 }, { translateY: gy.value * S * 0.07 }, { scaleX: 1 + (wide.value - 1) * 0.6 }, { scaleY: blink.value * wide.value }] as any,
  }));
  const arcStyle = useAnimatedStyle(() => ({
    opacity: happy.value,
    transform: [{ translateX: gx.value * S * 0.03 }, { translateY: -happy.value * S * 0.01 }, { scale: 0.85 + happy.value * 0.15 }] as any,
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const up = Math.min(1, Math.max(0, -ty.value / (S * 0.5)));
    return { opacity: 1 - up * 0.65, transform: [{ scaleX: sx.value * grow.value * (1 - up * 0.4) }] as any };
  });

  const timers2 = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later2 = (ms: number, f: () => void) => { timers2.current.push(setTimeout(f, ms)); };
  useEffect(() => () => timers2.current.forEach(clearTimeout), []);

  // Mood: set the targets, then keep small life going with timers. No springs (Julian 08.11.), ease out and settle.
  useEffect(() => {
    [sx, sy, grow, rot, gx, gy, blink, wide, bf, ba, lvlOn, tx].forEach(cancelAnimation);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const sp = { duration: 260, easing: OUT };
    const look = (x: number, y: number, ms = 260) => { gx.value = withTiming(x, { duration: ms, easing: OUT }); gy.value = withTiming(y, { duration: ms, easing: OUT }); };
    const blinkOnce = (twice = false) => {
      const one = [withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 110 })];
      blink.value = twice ? withSequence(...one, withTiming(1, { duration: 90 }), ...one) : withSequence(...one);
    };

    if (mood !== 'happy') happy.value = withTiming(0, { duration: 160 });
    lvlOn.value = withTiming(mood === 'listen' ? 1 : 0, { duration: 250 });
    wide.value = withTiming(mood === 'listen' ? 1.12 : 1, sp);
    grow.value = withTiming(mood === 'listen' ? 1.1 : 1, { duration: 320, easing: OUT });
    bf.value = mood === 'sleep' ? 0.9 : mood === 'listen' ? 3 : 2.2;
    ba.value = withTiming(mood === 'sleep' ? 0.028 : 0.014, { duration: 400 });
    rot.value = withTiming(0, sp);
    tx.value = withTiming(0, sp);

    if (mood === 'think') {
      // Rocks from side to side and sinks a little, like turning it over; eyes up and wandering.
      sx.value = withTiming(1.05, sp);
      sy.value = withTiming(0.94, sp);
      blink.value = withTiming(1, { duration: 100 });
      look(0.7, -0.6);
      if (live) {
        let k = 0;
        const wander = () => { k++; look(k % 2 ? -0.7 : 0.7, -0.6, 420); rot.value = withTiming(k % 2 ? -6 : 6, { duration: 520, easing: SINE }); later(950, wander); };
        later(600, wander);
      }
    } else {
      sx.value = withTiming(1, sp);
      sy.value = withTiming(1, sp);
      if (mood === 'listen') { look(0, -0.45); blink.value = withTiming(1, { duration: 100 }); }
      else if (mood === 'type') look(tAtRef.current.x, tAtRef.current.y);
      else if (mood === 'sleep') { look(0, 0.3); blink.value = withTiming(0.1, { duration: 300 }); }
      else look(restRef.current.x, restRef.current.y);
      if (mood !== 'sleep' && mood !== 'listen') blink.value = withTiming(1, { duration: 160 });
    }

    if (live && mood !== 'sleep' && mood !== 'think') {
      const nextBlink = () => later(2200 + Math.random() * 3300, () => { blinkOnce(Math.random() < 0.18); nextBlink(); });
      nextBlink();
    }
    if (live && mood === 'idle' && !gaze) {
      const spots: [number, number][] = [[-0.9, 0.1], [-0.6, -0.6], [0.7, -0.4], [0, 0], [0, 0], [-0.9, 0.5]];
      const around = () => later(3500 + Math.random() * 4500, () => {
        const [x, y] = spots[Math.floor(Math.random() * spots.length)];
        look(x, y, 300);
        if (Math.random() < 0.3) later(1200 + Math.random() * 800, () => look(0, 0, 300));
        around();
      });
      around();
      const dart = () => later(700 + Math.random() * 1400, () => {
        const bx = gx.value, by = gy.value;
        gx.value = withSequence(withTiming(bx + (Math.random() - 0.5) * 0.3, { duration: 60 }), withDelay(220 + Math.random() * 300, withTiming(bx, { duration: 90 })));
        gy.value = withSequence(withTiming(by + (Math.random() - 0.5) * 0.2, { duration: 60 }), withDelay(220 + Math.random() * 300, withTiming(by, { duration: 90 })));
        dart();
      });
      dart();
    }
    if (live && mood === 'type') {
      const nod = () => later(900 + Math.random() * 700, () => { const y = tAtRef.current.y; gy.value = withSequence(withTiming(y + 0.2, { duration: 140 }), withTiming(y, { duration: 220 })); nod(); });
      nod();
    }
    return () => { timers.forEach(clearTimeout); };
  }, [mood, live]);

  // Poses for the onboarding.
  useEffect(() => {
    if (!pose || !live) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (pose === 'peek') {
      gx.value = withTiming(0, { duration: 300, easing: OUT }); gy.value = withTiming(-0.7, { duration: 300, easing: OUT });
      rot.value = withRepeat(withSequence(withTiming(-4, { duration: 1400, easing: SINE }), withTiming(4, { duration: 1400, easing: SINE })), -1, true);
    } else if (pose === 'wave') {
      // Hello: rocks on his bottom edge three times, easing out, then waits and does it again.
      const hello = () => {
        rot.value = withSequence(
          withTiming(-12, { duration: 180, easing: OUT }), withTiming(10, { duration: 220, easing: SINE }),
          withTiming(-8, { duration: 220, easing: SINE }), withTiming(5, { duration: 220, easing: SINE }), withTiming(0, { duration: 260, easing: OUT }),
        );
        happy.value = withSequence(withTiming(1, { duration: 140 }), withDelay(900, withTiming(0, { duration: 200 })));
        timers.push(setTimeout(hello, 2600));
      };
      hello();
    } else if (pose === 'jump') {
      jump();
    }
    return () => { timers.forEach(clearTimeout); cancelAnimation(rot); rot.value = withTiming(0, { duration: 200 }); if (pose === 'peek') gy.value = withTiming(0, { duration: 260 }); };
  }, [pose, live]);

  /** One big happy jump: gathers, flies up stretched, lands squashed, settles. */
  const jump = () => {
    happy.value = withSequence(withTiming(1, { duration: 120 }), withDelay(1100, withTiming(0, { duration: 220 })));
    if (!live) return;
    [ty, sx, sy].forEach(cancelAnimation);
    ty.value = withSequence(withDelay(110, withTiming(-S * 0.4, { duration: 260, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) }));
    sy.value = withSequence(withTiming(0.86, { duration: 110, easing: OUT }), withTiming(1.1, { duration: 160, easing: OUT }), withTiming(1, { duration: 330 }), withTiming(0.85, { duration: 70, easing: OUT }), withTiming(1.04, { duration: 160, easing: OVER }), withTiming(1, { duration: 200, easing: OUT }));
    sx.value = withSequence(withTiming(1.1, { duration: 110, easing: OUT }), withTiming(0.93, { duration: 160, easing: OUT }), withTiming(1, { duration: 330 }), withTiming(1.12, { duration: 70, easing: OUT }), withTiming(0.98, { duration: 160, easing: OVER }), withTiming(1, { duration: 200, easing: OUT }));
    rot.value = withSequence(withDelay(110, withTiming(-8, { duration: 260, easing: OUT })), withTiming(0, { duration: 300, easing: OUT }));
  };

  // A joy or a poke: gather, stretch, a little counter squash as the clay settles (follow-through). No springs.
  const react = (big: boolean, eyes: number) => {
    happy.value = withSequence(withDelay(big ? 90 : 0, withTiming(1, { duration: 120 })), withDelay(eyes, withTiming(0, { duration: 220 })));
    gx.value = withTiming(0, { duration: 160 }); gy.value = withTiming(big ? -0.25 : 0, { duration: 160 });
    if (!live) return;
    cancelAnimation(sx); cancelAnimation(sy); cancelAnimation(rot);
    const k = big ? 1 : 0.55;
    sx.value = withSequence(withTiming(1 + 0.08 * k, { duration: 90, easing: OUT }), withTiming(1 - 0.07 * k, { duration: 170, easing: OVER }), withTiming(1 + 0.02 * k, { duration: 160, easing: OUT }), withTiming(1, { duration: 260, easing: OUT }));
    sy.value = withSequence(withTiming(1 - 0.1 * k, { duration: 90, easing: OUT }), withTiming(1 + 0.1 * k, { duration: 170, easing: OVER }), withTiming(1 - 0.03 * k, { duration: 160, easing: OUT }), withTiming(1, { duration: 260, easing: OUT }));
    if (big) {
      ty.value = withSequence(withDelay(90, withTiming(-S * 0.12, { duration: 170, easing: OUT })), withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }));
      rot.value = withSequence(withDelay(90, withTiming(-6, { duration: 170, easing: OVER })), withTiming(3, { duration: 200, easing: OUT }), withTiming(0, { duration: 300, easing: OUT }));
      later2(eyes + 260, () => { gy.value = withTiming(0, { duration: 300, easing: OUT }); });
    }
  };
  // Perks up when something starts (keyboard, mic): blink, rise, eyes pop open.
  const prevMood = useRef(mood);
  const first = useRef(true);
  useEffect(() => {
    const was = prevMood.current; prevMood.current = mood;
    if (!live || first.current || was === mood) return;
    if (!((mood === 'type' || mood === 'listen') && (was === 'idle' || was === 'sleep'))) return;
    const k = was === 'sleep' ? 1.2 : 1;
    blink.value = withSequence(withTiming(0.2, { duration: 70 }), withTiming(1.15, { duration: 140, easing: OVER }), withTiming(1, { duration: 200 }));
    sy.value = withSequence(withTiming(1 - 0.07 * k, { duration: 80, easing: OUT }), withTiming(1 + 0.07 * k, { duration: 160, easing: OVER }), withTiming(1, { duration: 280, easing: OUT }));
    sx.value = withSequence(withTiming(1 + 0.05 * k, { duration: 80, easing: OUT }), withTiming(1 - 0.04 * k, { duration: 160, easing: OVER }), withTiming(1, { duration: 280, easing: OUT }));
  }, [mood]);
  // Follows along while you speak: each new bit of text, a small nod and a blink of attention.
  useEffect(() => {
    if (first.current || !heard || mood !== 'listen' || !live) return;
    gy.value = withSequence(withTiming(-0.2, { duration: 90, easing: OUT }), withTiming(-0.45, { duration: 240, easing: OUT }));
    rot.value = withSequence(withTiming((heard % 2 ? 1 : -1) * 3, { duration: 120, easing: OUT }), withTiming(0, { duration: 260, easing: OUT }));
  }, [heard]);
  // Eyes go where you touched, then drift back; the body leans in a beat later.
  useEffect(() => {
    if (!glance || (mood !== 'idle' && mood !== 'type')) return;
    gx.value = withSequence(withTiming(glance.x, { duration: 90, easing: OUT }), withDelay(1300, withTiming(mood === 'type' ? tAtRef.current.x : restRef.current.x, { duration: 420, easing: OUT })));
    gy.value = withSequence(withTiming(glance.y, { duration: 90, easing: OUT }), withDelay(1300, withTiming(mood === 'type' ? tAtRef.current.y : restRef.current.y, { duration: 420, easing: OUT })));
    if (live) {
      rot.value = withSequence(withDelay(60, withTiming(glance.x * 7, { duration: 260, easing: OVER })), withDelay(1050, withTiming(0, { duration: 480, easing: OUT })));
      tx.value = withSequence(withDelay(60, withTiming(glance.x * S * 0.05, { duration: 260, easing: OVER })), withDelay(1050, withTiming(0, { duration: 480, easing: OUT })));
    }
  }, [glance?.n]);
  // Reading along.
  useEffect(() => {
    if (mood === 'idle' && gaze) { gx.value = withTiming(gaze.x, { duration: 200, easing: OUT }); gy.value = withTiming(gaze.y, { duration: 200, easing: OUT }); return; }
    if (mood !== 'type') return;
    gx.value = withTiming(tAt.x, { duration: 160, easing: OUT });
    gy.value = withSequence(withTiming(tAt.y + 0.12, { duration: 90, easing: OUT }), withTiming(tAt.y, { duration: 200, easing: OUT }));
    if (live) sy.value = withSequence(withTiming(0.98, { duration: 80, easing: OUT }), withTiming(1, { duration: 220, easing: OUT }));
  }, [tAt.x, tAt.y]);
  useEffect(() => { if (first.current) return; react(true, 1600); }, [joy]);
  useEffect(() => { if (first.current) return; react(false, 450); }, [poke]);
  useEffect(() => { first.current = false; if (mood === 'happy') happy.value = withTiming(1, { duration: 160 }); }, [mood]);

  const ew = S * EYE_W, eh = S * EYE_H;
  const aw = S * 0.125, at = Math.max(1.5, S * 0.038);
  const cx = S / 2, ey = S * EYE_Y, ex = S * EYE_X;
  const hl = Math.max(1, ew * 0.28);

  return (
    <View pointerEvents="none" style={[{ width: S, height: S }, style]}>
      {shadow ? (
        <Animated.View style={[{ position: 'absolute', left: S * 0.16, right: S * 0.16, top: S * 0.92, height: S * 0.11 }, shadowStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id={`${id}s`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#16232A" stopOpacity={0.2} />
                <Stop offset="1" stopColor="#16232A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={50} cy={10} rx={50} ry={10} fill={`url(#${id}s)`} />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: S, height: S, transformOrigin: ['50%', '92%', 0] }, bodyStyle]}>
        <Image source={BODY} style={{ width: S, height: S }} resizeMode="contain" accessibilityIgnoresInvertColors />
        {[-1, 1].map((side) => (
          <React.Fragment key={side}>
            <Animated.View style={[{ position: 'absolute', left: cx + side * ex - ew / 2, top: ey - eh / 2, width: ew, height: eh, borderRadius: ew / 2, backgroundColor: PIN.ink }, eyeStyle]}>
              {/* The enamel catches the light top left. */}
              <View style={{ position: 'absolute', left: ew * 0.22, top: eh * 0.16, width: hl, height: hl * 1.3, borderRadius: hl, backgroundColor: 'rgba(255,255,255,0.55)' }} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', left: cx + side * ex - aw / 2, top: ey - aw / 2, width: aw, height: aw / 2 + at / 2, overflow: 'hidden' }, arcStyle]}>
              <View style={{ width: aw, height: aw, borderRadius: aw / 2, borderWidth: at, borderColor: PIN.ink }} />
            </Animated.View>
          </React.Fragment>
        ))}
      </Animated.View>
    </View>
  );
}
