/**
 * First-launch intro (Julian 26.10.: "ein wunderschön animiertes Video statt
 * der vier Icons"). Built as real UI on one clock instead of a video file, so
 * it is sharp, light and plays the same on the web link.
 *
 * One idea: everything that lands on you ends up sorted on one calm page.
 * Each clay object arrives from above, holds, then flies into its row and
 * becomes that row's tile (same object, same path every time).
 *
 * Storyboard (ms from mount):
 *    0  "Heute" card rises in, empty.
 *  300  A: the letter (umschlag-euro) drops in above the card, holds.
 * 1200  A flies into row 1, shrinks into its tile. "Elterngeld beantragen,
 *       Frist 12. Dez" writes in. Haptic tick on landing.
 * 2300  B: the stethoscope arrives the same way, lands in row 2: "U5 bei
 *       Dr. Weber". 3300 Tom's avatar slides in: he takes it.
 * 3900  C: the shopping bag lands in row 3: "Hafermilch". 4900 the check
 *       fills (the only bounce, it is the person's own kind of action),
 *       success haptic.
 * 5500  One light sweep over the card. Then it holds still.
 * Tap skips to the end. Reduced motion shows the end state at once.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, LayoutChangeEvent, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useReducedMotion, cancelAnimation, SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { ClayIcon } from './ui/Clay';
import { Avatar } from './ui/Person';
import { tokens, tint } from '../theme';
import { haptics } from '../lib/haptics';
import type { ClayName } from '../lib/clayIcons';

// ─── Choreography ──────────────────────────────────────────────────────────
const T_CARD = 0;
const SCENES = [300, 2300, 3900]; // A, B, C arrive
const IN = 450;      // drop in
const HOLD = 450;    // readable hold before it flies
const FLY = 520;     // into the row
const TEXT = 320;    // row text writes in
const T_TOM = 3300;
const T_CHECK = 4900;
const T_SHEEN = 5500;
const T_END = 6400;

// ─── Geometry ──────────────────────────────────────────────────────────────
const PAD = 16;
const HEAD = 58;
const ROW = 66;
const TILE = 46;
const HERO = 120;
const STAGE_H = 150 + HEAD + ROW * 3 + PAD;
const CARD_TOP = 150;

const ROWS: { icon: ClayName; title: string; meta: string; metaColor?: string }[] = [
  { icon: 'umschlag-euro', title: 'Elterngeld beantragen', meta: 'Frist 12. Dez · aus der Post', metaColor: tokens.frist },
  { icon: 'stethoskop', title: 'U5 bei Dr. Weber', meta: 'Do 12. Nov · 9:30' },
  { icon: 'einkauf', title: 'Hafermilch', meta: 'Einkauf · Supermarkt' },
];

// Worklet easings (same curves as theme easing.out / easing.inOut).
const out = (x: number) => { 'worklet'; return 1 - Math.pow(1 - x, 3); };
const inOut = (x: number) => { 'worklet'; return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const p = (t: number, a: number, d: number) => { 'worklet'; return Math.max(0, Math.min(1, (t - a) / d)); };

const shadow = Platform.select({
  web: { boxShadow: '0 24px 60px rgba(22,35,42,.10), 0 2px 6px rgba(22,35,42,.05)' } as any,
  default: { shadowColor: '#16232A', shadowOpacity: 0.1, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 6 },
});

export default function Intro() {
  const t = useSharedValue(0);
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!w) return;
    if (reduced) { t.value = T_END; return; }
    t.value = withTiming(T_END, { duration: T_END, easing: Easing.linear });
    // Accents land on the meaningful moment, not when motion starts.
    const ids = [
      ...SCENES.map((s) => setTimeout(haptics.select, s + IN + HOLD + FLY)),
      setTimeout(haptics.tap, T_TOM + 200),
      setTimeout(haptics.success, T_CHECK + 120),
    ];
    return () => ids.forEach(clearTimeout);
  }, [w, reduced]);

  const skip = () => { cancelAnimation(t); t.value = withTiming(T_END, { duration: 240, easing: Easing.out(Easing.cubic) }); };

  const card = useAnimatedStyle((): any => {
    const k = out(p(t.value, T_CARD, 420));
    return { opacity: k, transform: [{ translateY: (1 - k) * 18 }] };
  });

  return (
    <Pressable accessibilityLabel="Intro überspringen" onPress={skip} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: STAGE_H }}>
      {w ? (
        <>
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: CARD_TOP, borderRadius: 28, backgroundColor: tokens.row, overflow: 'hidden', paddingHorizontal: PAD, paddingBottom: PAD }, shadow, card]}>
            <View style={{ height: HEAD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={22} weight={700} tracking={-0.6}>Heute</Txt>
              <Txt size={13.5} color={tokens.sub}>Do 29. Oktober</Txt>
            </View>
            {ROWS.map((r, i) => <IntroRow key={r.icon} i={i} row={r} t={t} />)}
            <Sheen t={t} w={w} />
          </Animated.View>
          {ROWS.map((r, i) => <Hero key={r.icon} i={i} icon={r.icon} t={t} w={w} />)}
        </>
      ) : null}
    </Pressable>
  );
}

/** Row content; its tile is drawn by the Hero that lands in it. */
function IntroRow({ i, row, t }: { i: number; row: (typeof ROWS)[number]; t: SharedValue<number> }) {
  const land = SCENES[i] + IN + HOLD + FLY;
  const text = useAnimatedStyle((): any => {
    const k = out(p(t.value, land - 120, TEXT));
    return { opacity: k, transform: [{ translateX: (1 - k) * 10 }] };
  });
  const slot = useAnimatedStyle(() => ({ opacity: 1 - p(t.value, land - 80, 120) }));
  const tom = useAnimatedStyle((): any => {
    const k = out(p(t.value, T_TOM, 360));
    return { opacity: k, transform: [{ translateX: (1 - k) * 28 }, { scale: 0.8 + 0.2 * k }] };
  });
  const ring = useAnimatedStyle(() => ({ opacity: out(p(t.value, land, 240)) }));
  // The check: fill springs once (critically damped would feel dead here).
  const fill = useAnimatedStyle((): any => {
    const x = p(t.value, T_CHECK, 380);
    const s = x === 0 ? 0 : 1 + Math.sin(x * Math.PI) * 0.18 * (1 - x) + (1 - out(Math.min(1, x * 2))) * -0.6;
    return { opacity: Math.min(1, x * 3), transform: [{ scale: Math.max(0, s) }] };
  });
  const strike = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * out(p(t.value, T_CHECK + 120, 260)) }));
  return (
    <View style={{ height: ROW, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      <Animated.View style={[{ width: TILE, height: TILE, borderRadius: 14, backgroundColor: tokens.bg }, slot]} />
      <Animated.View style={[{ flex: 1, minWidth: 0, gap: 1 }, text]}>
        <Animated.View style={i === 2 ? strike : undefined}>
          <Txt size={16} line={21} weight={600} numberOfLines={1}>{row.title}</Txt>
        </Animated.View>
        <Txt size={13} line={18} color={row.metaColor ?? tokens.sub} numberOfLines={1}>{row.meta}</Txt>
      </Animated.View>
      {i === 1 ? <Animated.View style={tom}><Avatar p="T" letter="T" size={28} /></Animated.View> : null}
      {i === 2 ? (
        <Animated.View style={[{ width: 26, height: 26, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }, ring]}>
          <Animated.View style={[{ position: 'absolute', top: -1.5, left: -1.5, width: 26, height: 26, borderRadius: 999, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }, fill]}>
            <LineIcon name="check" size={16} color="#FFFFFF" stroke={2.4} />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The clay object: drops in, holds, flies into its row and becomes the tile. */
function Hero({ i, icon, t, w }: { i: number; icon: ClayName; t: SharedValue<number>; w: number }) {
  const s = SCENES[i];
  const from = { x: w / 2, y: 70 };
  const to = { x: PAD + TILE / 2, y: CARD_TOP + HEAD + i * ROW + ROW / 2 };
  const end = TILE / HERO;
  const st = useAnimatedStyle((): any => {
    const a = out(p(t.value, s, IN));
    const f = inOut(p(t.value, s + IN + HOLD, FLY));
    const x = from.x + (to.x - from.x) * f;
    const y = from.y - 26 * (1 - a) + (to.y - from.y) * f;
    const sc = (0.92 + 0.08 * a) * (1 + (end - 1) * f);
    return { opacity: a, transform: [{ translateX: x - HERO / 2 }, { translateY: y - HERO / 2 }, { scale: sc }] };
  });
  // Tinted tile grows in under the object as it lands.
  const tile = useAnimatedStyle(() => ({ opacity: p(t.value, s + IN + HOLD + FLY * 0.55, FLY * 0.45) }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: HERO, height: HERO, alignItems: 'center', justifyContent: 'center' }, st]}>
      <Animated.View style={[{ position: 'absolute', width: HERO, height: HERO, borderRadius: HERO * 0.3, backgroundColor: tint(icon) }, tile]} />
      <ClayIcon name={icon} size={HERO * 0.82} />
    </Animated.View>
  );
}

/** One soft light pass over the finished card. */
function Sheen({ t, w }: { t: SharedValue<number>; w: number }) {
  const st = useAnimatedStyle((): any => {
    const k = inOut(p(t.value, T_SHEEN, 700));
    return { opacity: k > 0 && k < 1 ? 1 : 0, transform: [{ translateX: -160 + (w + 160) * k }, { rotate: '12deg' }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -40, bottom: -40, width: 120 }, st]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.7} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
      </Svg>
    </Animated.View>
  );
}

export const INTRO_MS = T_END;
