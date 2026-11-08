/**
 * The live Memo of the onboarding (Julian 08.11.2026 23:50: "the little guy should react to everything I do
 * and be embedded fully in my onboarding", "he must feel alive"). The real Blob from src/components/buddy,
 * never a scripted face: he breathes, blinks, looks where you touch, reads along while you type, and
 * squishes with ^^ when something lands (joy and poke come from the shared buddy store).
 *
 * He moves between three homes:
 *   hero  big in the upper middle (hallo, fertig)
 *   mid   a little smaller above the content (namen, leiste, ki)
 *   dock  down in the talk bar, where he is the talk button (the try steps): he flies there and the bar's
 *         own Memo (MemoMic) takes over in the same spot, so there is only ever one.
 *
 * Motion (no stock springs): every move is an arc (x and y on different curves), the body stretches along
 * the way and lands with a squash that settles in two smaller swings. The first arrival is a drop that
 * falls in stretched, splats, wobbles back and opens its eyes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, Easing, useReducedMotion, cancelAnimation } from 'react-native-reanimated';
import Blob from '../buddy/Blob';
import { useBuddy, setBuddy, buddyPoke, type Mood } from '../../lib/buddy';
import { haptics } from '../../lib/haptics';

export type Place = 'hero' | 'mid' | 'dock';
/** The size the blob is drawn at; smaller homes scale it down. */
export const BIG = 150;
/** The bar's Memo (MemoMic) draws at 40. */
const DOCK = 40;

const out = Easing.bezier(0.23, 1, 0.32, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export default function LiveMemo({ place, hero, mid, midScale, look, gaze, entrance, mood: forced }: {
  place: Place;
  hero: { x: number; y: number };
  mid: { x: number; y: number };
  /** mid size as a share of BIG. */
  midScale: number;
  /** An explicit look (a sticker popping, the letters you type), x and y in -1..1. */
  look?: { x: number; y: number; n: number };
  /** Plays the drop on the first mount. */
  /** A lasting look (the text you type), x and y in -1..1. */
  gaze?: { x: number; y: number } | null;
  entrance?: boolean;
  mood?: Mood;
}) {
  const b = useBuddy();
  const reduced = useReducedMotion();
  const cx = useSharedValue(place === 'mid' ? mid.x : hero.x);
  const cy = useSharedValue(entrance && !reduced ? -BIG : place === 'mid' ? mid.y : hero.y);
  const k = useSharedValue(place === 'mid' ? midScale : 1);
  const o = useSharedValue(entrance && !reduced ? 1 : place === 'dock' ? 0 : 1);
  const sx = useSharedValue(entrance && !reduced ? 0.78 : 1);
  const sy = useSharedValue(entrance && !reduced ? 1.3 : 1);
  const [awake, setAwake] = useState(!entrance || reduced);
  const [gl, setGl] = useState<{ x: number; y: number; n: number } | undefined>(undefined);
  const n = useRef(0);
  const glance = (x: number, y: number) => setGl({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), n: ++n.current });

  // Where he is right now, for glances and for leaving the bar.
  const at = useRef({ x: cx.value, y: cy.value, k: k.value });
  const lastDock = useRef<{ x: number; y: number } | null>(null);
  const dockAt = useRef(b.dockAt);
  dockAt.current = b.dockAt;
  if (b.dockAt) lastDock.current = b.dockAt;

  const settle = (big = 1) => {
    // Lands: squash, then two smaller swings back (the drop of water feeling), all eased, nothing bouncy.
    sx.value = withSequence(withTiming(1 + 0.16 * big, { duration: 110, easing: out }), withTiming(1 - 0.06 * big, { duration: 170, easing: inOut }), withTiming(1 + 0.025 * big, { duration: 170, easing: inOut }), withTiming(1, { duration: 200, easing: inOut }));
    sy.value = withSequence(withTiming(1 - 0.16 * big, { duration: 110, easing: out }), withTiming(1 + 0.07 * big, { duration: 170, easing: inOut }), withTiming(1 - 0.025 * big, { duration: 170, easing: inOut }), withTiming(1, { duration: 200, easing: inOut }));
  };
  /** An arc: x eases evenly, y starts slow (or fast) so the path curves; the body leans into the move. */
  const fly = (x: number, y: number, s: number, ms: number, done?: () => void) => {
    const up = y < cy.value;
    cancelAnimation(cx); cancelAnimation(cy); cancelAnimation(k);
    cx.value = withTiming(x, { duration: ms, easing: inOut });
    cy.value = withTiming(y, { duration: ms, easing: up ? Easing.bezier(0.2, 0.6, 0.35, 1) : Easing.bezier(0.55, 0, 0.75, 0.4) });
    k.value = withTiming(s, { duration: ms, easing: inOut });
    // Stretch along the way, round again just before contact.
    sx.value = withSequence(withTiming(0.9, { duration: ms * 0.4, easing: out }), withTiming(1, { duration: ms * 0.6, easing: inOut }));
    sy.value = withSequence(withTiming(1.12, { duration: ms * 0.4, easing: out }), withTiming(1, { duration: ms * 0.6, easing: inOut }));
    at.current = { x, y, k: s };
    if (done) setTimeout(done, ms);
  };

  // The first arrival: a drop falls in stretched, splats, wobbles round, then opens its eyes.
  useEffect(() => {
    if (!entrance || reduced) return;
    const y = place === 'mid' ? mid.y : hero.y;
    cy.value = withDelay(120, withTiming(y, { duration: 520, easing: Easing.bezier(0.5, 0, 0.9, 0.5) }));
    sx.value = withDelay(120, withSequence(withTiming(0.82, { duration: 520 }), withTiming(1.26, { duration: 90, easing: out }), withTiming(0.9, { duration: 200, easing: inOut }), withTiming(1.05, { duration: 200, easing: inOut }), withTiming(1, { duration: 240, easing: inOut })));
    sy.value = withDelay(120, withSequence(withTiming(1.25, { duration: 520 }), withTiming(0.7, { duration: 90, easing: out }), withTiming(1.12, { duration: 200, easing: inOut }), withTiming(0.96, { duration: 240, easing: inOut }), withTiming(1, { duration: 240, easing: inOut })));
    const t1 = setTimeout(() => haptics.tap(), 640);
    const t2 = setTimeout(() => setAwake(true), 1050);
    // Wakes up and looks right at you, then a curious look around.
    const t3 = setTimeout(() => glance(0, 0.25), 1150);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Moving between homes.
  const prev = useRef(place);
  useEffect(() => {
    const was = prev.current;
    prev.current = place;
    if (was === place) return;
    const target = place === 'hero' ? { ...hero, k: 1 } : place === 'mid' ? { ...mid, k: midScale } : null;
    if (reduced) {
      if (target) { cx.value = target.x; cy.value = target.y; k.value = target.k; o.value = 1; } else o.value = 0;
      setBuddy({ dockHidden: false });
      return;
    }
    if (place === 'dock') {
      // The bar's Memo waits invisible; this one flies down into its spot and hands over.
      setBuddy({ dockHidden: true });
      const t = setTimeout(() => {
        const d = dockAt.current;
        if (!d) { o.value = withTiming(0, { duration: 160 }); setBuddy({ dockHidden: false }); return; }
        fly(d.x, d.y, DOCK / BIG, 620, () => { setBuddy({ dockHidden: false }); o.value = 0; buddyPoke(); haptics.tap(); });
      }, 140);
      return () => clearTimeout(t);
    }
    if (was === 'dock') {
      // Out of the bar: starts small where the bar's Memo sat and flies up.
      const d = lastDock.current;
      cx.value = d?.x ?? hero.x; cy.value = d?.y ?? hero.y + 300; k.value = DOCK / BIG; o.value = 1;
      fly(target!.x, target!.y, target!.k, 680, () => settle(1));
      return;
    }
    fly(target!.x, target!.y, target!.k, 480, () => settle(0.6));
  }, [place]);
  // The layout changed under him (keyboard, rotation): glide along.
  useEffect(() => {
    if (place === 'dock' || prev.current !== place) return;
    const t = place === 'hero' ? hero : mid;
    cx.value = withTiming(t.x, { duration: 240, easing: out });
    cy.value = withTiming(t.y, { duration: 240, easing: out });
    at.current = { ...at.current, x: t.x, y: t.y };
  }, [hero.x, hero.y, mid.x, mid.y]);

  // Looks where you touch, anywhere on the screen.
  useEffect(() => {
    if (!b.touch || place === 'dock' || !awake) return;
    const r = (BIG * at.current.k) / 2 + 120;
    glance((b.touch.x - at.current.x) / r, (b.touch.y - at.current.y) / r);
  }, [b.touch?.n]);
  useEffect(() => { if (look && awake) setGl(look); }, [look?.n]);
  // On the bar's hand-over, make sure the bar's Memo never stays hidden.
  useEffect(() => () => { setBuddy({ dockHidden: false }); }, []);

  const st = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateX: cx.value - BIG / 2 }, { translateY: cy.value - BIG / 2 }, { scale: k.value }, { scaleX: sx.value }, { scaleY: sy.value }] as any,
  }));
  const tap = () => {
    haptics.select();
    buddyPoke();
    glance(0, 0.2);
  };
  return (
    <Animated.View pointerEvents={place === 'dock' ? 'none' : 'box-none'} style={[{ position: 'absolute', left: 0, top: 0, width: BIG, height: BIG, transformOrigin: ['50%', '90%', 0] } as any, st]}>
      <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel="Memo" style={{ width: BIG, height: BIG }}>
        <Blob size={BIG} mood={!awake ? 'happy' : forced ?? 'idle'} joy={b.joy} poke={b.poke} glance={gl} gaze={awake ? gaze : null} />
      </Pressable>
    </Animated.View>
  );
}
