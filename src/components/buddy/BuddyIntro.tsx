/**
 * The start (Julian 07.11.): the whole screen is Memo, his colour with two eyes, and he blinks.
 *
 * 16.11. (Julian: "three different disconnected steps ... the black bg merge into memo after the blink, then have memo
 * actually move into the bar below, well animated with no jump"): ONE motion. The colour draws itself together around
 * the eyes until it is Memo, round, in the middle of the screen. While it still closes he already sets off: he looks
 * where he is going and glides into his seat in the bar, getting smaller on the way. He arrives at exactly the size and
 * the spot of the bar's Memo, which then stands under him as the same picture, so nothing jumps when this one goes.
 *
 * One shared value drives all of it, by transform only, so it runs on the UI thread at full frame rate even while the
 * app loads behind it (Julian 08.11.: "not smooth enough"). Once per app start, about 1.4 s, a tap skips it, reduced
 * motion skips it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing, runOnJS, useReducedMotion } from 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { mascot } from '../../lib/mascot';
import { useMemoColor } from '../../lib/look';
import { tokens } from '../../theme';
import { setBuddy, useBuddy, buddyPoke, getBuddy } from '../../lib/buddy';
import { haptics } from '../../lib/haptics';
import { useFieldTop } from '../../lib/dockSpace';

/** Memo as he stands in the middle before he sets off: his body's diameter. The start's eyes are his eyes at this size. */
const HERO = 116;
/** Pin's own measures (buddy/Pin.tsx): the body is 0.8 of his box wide, its middle sits 0.54 of the box below the top. */
const BODY = 0.8, BODY_MID = 0.54;
/** The floating Memo above the field (BuddyHost), for the nav styles without a seat in the bar. */
const FLOAT = 38, FLOAT_RIGHT = 20, FLOAT_GAP = 6;
/** When he blinks, when the motion begins, and how long it runs. */
const BLINK = 220, START = 460, RUN = 980;
/** Shares of the run: the colour closes from 0 to CLOSE, he travels from GO to the end. They overlap, so he never stands still. */
const CLOSE = 0.56, GO = 0.42;
/** From FALL on he drops into his seat. */
const FALL = 0.62;

const cl = (v: number) => { 'worklet'; return v < 0 ? 0 : v > 1 ? 1 : v; };
/** Slow out of rest, slow into rest. */
const io = (t: number) => { 'worklet'; return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; };

let played = false;

export default function BuddyIntro() {
  const { width: W, height: H } = useWindowDimensions();
  const path = usePathname();
  const fieldTop = useFieldTop();
  const reduced = useReducedMotion();
  const b = useBuddy();
  const color = useMemoColor();
  const eye = color === tokens.ink ? tokens.onInk : '#FFFFFF';
  const [on, setOn] = useState(!played);
  useEffect(() => { if (played && !on) setBuddy({ intro: false }); }, []);
  const p = useSharedValue(0); // 0 the whole screen .. 1 in his seat
  const blink = useSharedValue(1);
  const [arrived, setArrived] = useState(false);
  const started = useRef(false);

  // He starts in the middle of the screen; D0 is how wide the colour must be to reach every corner from there.
  const cx0 = W / 2, cy0 = H / 2;
  const D0 = 2 * Math.hypot(cx0, cy0) + 16;
  // Where he is going: his seat in the bar (its Memo's body, see MemoMic), else his place above the field.
  const docked = b.docked > 0;
  // The bar's Memo reports where it is with measureInWindow. On Android that number is not counted from the same top as
  // this layer (Julian 18.11.: "drops but not all the way down", the status bar went missing), so this layer measures
  // itself the same way and the seat is taken relative to it: whatever offset the phone adds cancels out.
  const box = useRef<any>(null);
  const [org, setOrg] = useState<{ x: number; y: number } | null>(null);
  const measureOrg = () => box.current?.measureInWindow?.((x: number, y: number, w: number) => { if (w) setOrg((o) => (o && o.x === x && o.y === y ? o : { x, y })); });
  const seat = docked
    ? (b.dockAt && org ? { x: b.dockAt.x - org.x, y: b.dockAt.y - org.y + 0.2, d: (b.dockS ?? 40) * BODY } : null)
    : fieldTop ? { x: W - FLOAT_RIGHT - FLOAT / 2, y: H - fieldTop - FLOAT - FLOAT_GAP + FLOAT * BODY_MID, d: FLOAT * BODY } : null;
  const tx = useSharedValue(cx0), ty = useSharedValue(cy0), td = useSharedValue(0); // td 0: nowhere to go, he fades where he stands
  // A seat that is measured again while he is on his way bends his path instead of making him jump.
  const known = useRef(false);
  useEffect(() => {
    if (!seat) return;
    if (!known.current || !started.current) { tx.value = seat.x; ty.value = seat.y; td.value = seat.d; known.current = true; return; }
    const T = { duration: 140, easing: Easing.bezier(0.23, 1, 0.32, 1) };
    tx.value = withTiming(seat.x, T); ty.value = withTiming(seat.y, T); td.value = withTiming(seat.d, T);
  }, [seat?.x, seat?.y, seat?.d]);

  // Only where Memo lives (screens with the field), never over the onboarding or sign-in.
  const skip = /onboarding|anmelden/.test(path) || mascot() === 'minimal';
  // It starts once his seat is known, or after a moment anyway.
  const [late, setLate] = useState(false);
  useEffect(() => { const id = setTimeout(() => setLate(true), 900); const m = [setTimeout(measureOrg, 60), setTimeout(measureOrg, 700)]; return () => { clearTimeout(id); m.forEach(clearTimeout); }; }, []);
  const go = !!seat || late;
  // The hit (Julian 18.11.: "almost like it's making impact and the others are pushed aside because of the force"): one
  // contact, he squashes flat and wide with his bottom on the seat, rebounds once and is still. The tabs beside him get
  // shoved (NavBar reads `thud`). Only then the bar's own Memo takes over under him.
  const sq = useSharedValue(0);
  const settled = () => { setArrived(true); setBuddy({ intro: false }); };
  const arrive = () => {
    if (td.value > 0) { haptics.commit(); setBuddy({ thud: getBuddy().thud + 1 }); }
    sq.value = withSequence(
      withTiming(1, { duration: 70, easing: Easing.bezier(0.23, 1, 0.32, 1) }),
      withTiming(-0.3, { duration: 150, easing: Easing.bezier(0.77, 0, 0.175, 1) }),
      withTiming(0, { duration: 190, easing: Easing.bezier(0.23, 1, 0.32, 1) }, (f) => { if (f) runOnJS(settled)(); }),
    );
  };
  useEffect(() => {
    if (!on || started.current) return;
    if (skip || reduced) { played = true; setBuddy({ intro: false }); setOn(false); return; }
    if (!go) return;
    played = true; started.current = true;
    setBuddy({ intro: true });
    blink.value = withDelay(BLINK, withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 110 })));
    p.value = withDelay(START, withTiming(1, { duration: RUN, easing: Easing.linear }, (f) => { if (f) runOnJS(arrive)(); }));
  }, [on, skip, reduced, go]);

  // Arrived: the bar's Memo shows from `landed` on (BuddyHost says so). This one lies over him as the same picture and
  // fades, so not even half a pixel can tick; then he blinks once, as if he had just sat down.
  const gone = useSharedValue(1);
  const close = () => { setOn(false); if (docked) buddyPoke(); };
  useEffect(() => {
    if (!arrived) return;
    const wait = docked ? (b.landed ? 30 : 600) : 440; // above the field the floating Memo fades in under this one
    const t = setTimeout(() => { gone.value = withTiming(0, { duration: 120 }, (f) => { if (f) runOnJS(close)(); }); }, wait);
    return () => clearTimeout(t);
  }, [arrived, b.landed, docked]);
  const fade = useAnimatedStyle(() => ({ opacity: gone.value }));

  const u = HERO / 34; // Pin's unit at this size
  // The colour: a circle of Memo's size, blown up until it reaches every corner. It closes evenly (each frame the same
  // share smaller), so it sweeps in and then settles slowly into his shape.
  const body = useAnimatedStyle(() => {
    const A = io(cl(p.value / CLOSE));
    return { transform: [{ scale: Math.pow(D0 / HERO, 1 - A) }] as any };
  });
  // Memo as a whole, colour and eyes: where he is and how big. He gets his size first and lifts a little (he gathers
  // himself), then he drops: slow at the top, faster and faster, and hits his seat at full speed (gravity, no easing
  // into the seat). Without a seat he just fades where he stands.
  const whole = useAnimatedStyle(() => {
    const B = io(cl((p.value - GO) / (1 - GO)));
    const S = 1 - Math.pow(1 - cl((p.value - GO) / (FALL - GO)), 3);
    const lift = Math.sin(Math.PI * cl((p.value - GO) / (FALL - GO))) * -14;
    const g = cl((p.value - FALL) / (1 - FALL));
    const drop = g * g * g;
    const Bx = io(cl((p.value - GO) / (0.9 - GO)));
    const end = td.value > 0 ? td.value : HERO * 0.6;
    const k = 1 + (end / HERO - 1) * S;
    // The squash keeps his bottom on the seat: flat and wide on contact, a touch tall on the rebound.
    const sy = 1 - 0.18 * sq.value, sx = 1 + 0.14 * sq.value;
    const y = td.value > 0 ? (ty.value - cy0) * drop + lift * (1 - drop) + (1 - sy) * end / 2 : 0;
    return { opacity: td.value > 0 ? 1 : 1 - B, transform: [{ translateX: (tx.value - cx0) * Bx }, { translateY: y }, { scale: k }, { scaleX: sx }, { scaleY: sy }] as any };
  });
  // He looks where he is going a moment before he sets off, and straight ahead again as he sits down.
  const eyes = useAnimatedStyle(() => {
    const dx = tx.value - cx0, dy = ty.value - cy0, len = Math.sqrt(dx * dx + dy * dy) || 1;
    const look = io(cl((p.value - 0.3) / 0.22)) * (1 - io(cl((p.value - 0.74) / 0.24)));
    return { transform: [{ translateX: (dx / len) * 2.6 * u * look }, { translateY: (dy / len) * 2.6 * u * look }, { scaleY: blink.value }] as any };
  });

  if (!on || skip) return null;
  // A tap skips it: he is in his seat at once. Tapped before it began, it never begins; with no seat known yet nothing
  // of him is on screen, so this one leaves right away.
  const finish = () => {
    if (arrived) return;
    played = true; started.current = true;
    p.value = 1;
    settled();
    if (!seat) setOn(false);
  };
  const eyeBox = { position: 'absolute' as const, top: HERO / 2 - 3.5 * u, width: 4 * u, height: 7 * u, borderRadius: 2 * u, backgroundColor: eye };
  return (
    <Animated.View ref={box} onLayout={measureOrg} collapsable={false} pointerEvents={arrived ? 'none' : 'auto'} style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' }, fade]}>
      <Pressable onPress={finish} style={{ flex: 1 }} accessibilityLabel="Intro überspringen">
        <Animated.View style={[{ position: 'absolute', left: cx0 - HERO / 2, top: cy0 - HERO / 2, width: HERO, height: HERO }, whole]}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: HERO, height: HERO, borderRadius: HERO / 2, backgroundColor: color }, body]} />
          <Animated.View style={[eyeBox, { left: HERO / 2 - 4 * u - 2 * u }, eyes]} />
          <Animated.View style={[eyeBox, { left: HERO / 2 + 4 * u - 2 * u }, eyes]} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
