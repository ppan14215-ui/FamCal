/**
 * Der Schleier (Julian 26.10.): what you said is now being done. Three beats.
 * Think: the orb leaves the mic, a circular wave fills the screen with the
 * parents' colours, the thinking steps appear one by one under the orb.
 * Land: the wave pulls back, the orb shrinks to a drop and flies to the day
 * where the Termin lands. Off: nothing, the calendar is the result.
 */
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, withDelay, Easing, runOnJS, FadeInDown, cancelAnimation, useReducedMotion } from 'react-native-reanimated';
import Txt from './ui/Txt';
import Orb, { Clouds } from './Orb';
import { tokens } from '../theme';

export type Pt = { x: number; y: number };
export type VeilPhase = 'off' | 'think' | 'land';

const ORB = 132;
const out = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export default function Veil({ phase, origin, target, lines, shown, onLanded }: { phase: VeilPhase; origin: Pt; target: Pt | null; lines: string[]; shown: number; onLanded: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const still = useReducedMotion();
  const R = Math.max(Math.hypot(origin.x, origin.y), Math.hypot(W - origin.x, origin.y), Math.hypot(origin.x, H - origin.y), Math.hypot(W - origin.x, H - origin.y));
  const centre = { x: W / 2, y: H * 0.34 };

  const reveal = useSharedValue(0);
  const ox = useSharedValue(origin.x);
  const oy = useSharedValue(origin.y);
  const os = useSharedValue(48 / ORB);
  const oo = useSharedValue(0);
  const bob = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    if (phase === 'think') {
      const d = still ? 0 : 1;
      reveal.value = 0; ox.value = origin.x; oy.value = origin.y; os.value = 48 / ORB; oo.value = 1; text.value = 0;
      reveal.value = withTiming(1, { duration: 700 * d, easing: out });
      ox.value = withTiming(centre.x, { duration: 760 * d, easing: out });
      oy.value = withTiming(centre.y, { duration: 760 * d, easing: out });
      os.value = withSequence(withTiming(1.08, { duration: 620 * d, easing: out }), withTiming(1, { duration: 300 * d }));
      text.value = withDelay(350 * d, withTiming(1, { duration: 300 * d }));
      bob.value = withRepeat(withSequence(withTiming(-6, { duration: 1400, easing: inOut }), withTiming(6, { duration: 1400, easing: inOut })), -1, true);
    } else if (phase === 'land') {
      const d = still ? 0 : 1;
      const to = target ?? { x: W / 2, y: H * 0.5 };
      cancelAnimation(bob);
      bob.value = withTiming(0, { duration: 200 });
      text.value = withTiming(0, { duration: 180 });
      ox.value = withTiming(to.x, { duration: 640 * d, easing: inOut });
      oy.value = withTiming(to.y, { duration: 640 * d, easing: inOut });
      os.value = withTiming(18 / ORB, { duration: 640 * d, easing: inOut });
      reveal.value = withDelay(120 * d, withTiming(0, { duration: 560 * d, easing: inOut }));
      oo.value = withDelay(560 * d, withTiming(0, { duration: 160 * d }, (f) => { if (f) runOnJS(onLanded)(); }));
    } else {
      reveal.value = 0; oo.value = 0;
    }
  }, [phase]);

  const wave = useAnimatedStyle(() => ({ transform: [{ scale: reveal.value }], opacity: reveal.value < 0.02 ? 0 : 1 }));
  const orb = useAnimatedStyle(() => ({
    opacity: oo.value,
    transform: [{ translateX: ox.value - ORB / 2 }, { translateY: oy.value - ORB / 2 + bob.value }, { scale: os.value }] as const,
  }));
  const words = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 10 }] }));

  if (phase === 'off') return null;
  const recent = lines.slice(0, shown).slice(-3);
  const offset = Math.max(0, Math.min(shown, lines.length) - 3);

  return (
    <View pointerEvents={phase === 'think' ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      <Animated.View style={[{ position: 'absolute', left: origin.x - R, top: origin.y - R, width: R * 2, height: R * 2, borderRadius: R, overflow: 'hidden' }, wave]}>
        <View style={{ position: 'absolute', left: R - origin.x, top: R - origin.y, width: W, height: H, backgroundColor: 'rgba(250,249,246,0.95)' }}>
          <View style={{ position: 'absolute', left: (W - H * 1.2) / 2, top: -H * 0.1, width: H * 1.2, height: H * 1.2 }}>
            <Clouds size={H * 1.2} speed={0.45} soft tag="veil" />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: ORB, height: ORB }, orb]}>
        <Orb size={ORB} speed={1.6} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: 32, right: 32, top: centre.y + ORB / 2 + 36, gap: 10, alignItems: 'center' }, words]}>
        {recent.map((l, i) => {
          const last = i === recent.length - 1;
          return (
            <Animated.View key={offset + i} entering={FadeInDown.duration(260)}>
              <Txt size={last ? 21 : 16} line={last ? 28 : 22} weight={last ? 600 : 400} tracking={last ? -0.3 : 0} center color={last ? tokens.ink : tokens.sub}>{l}</Txt>
            </Animated.View>
          );
        })}
        {shown < lines.length || !lines.length ? <Txt size={15} color={tokens.mute} center>denkt nach …</Txt> : null}
      </Animated.View>
    </View>
  );
}

// ─── Host ──────────────────────────────────────────────────────────────────
// The veil covers the tab bar too, so it is drawn once at the root (next to
// the toasts) and driven from the screen that talks.

type VeilState = { phase: VeilPhase; origin: Pt; target: Pt | null; lines: string[]; shown: number; onLanded?: () => void };
let veil: VeilState = { phase: 'off', origin: { x: 0, y: 0 }, target: null, lines: [], shown: 0 };
const subs = new Set<() => void>();
export function setVeil(patch: Partial<VeilState>) {
  veil = { ...veil, ...patch };
  subs.forEach((l) => l());
}
export function VeilHost() {
  const v = React.useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => veil, () => veil);
  return <Veil phase={v.phase} origin={v.origin} target={v.target} lines={v.lines} shown={v.shown} onLanded={() => { setVeil({ phase: 'off' }); v.onLanded?.(); }} />;
}
