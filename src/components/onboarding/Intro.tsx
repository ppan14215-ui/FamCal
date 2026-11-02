/**
 * The opening film (Julian 01.11.2026: "Das ist unsere Chance die Leute zu überzeugen", claim
 * "A digital assistant you both can speak to"). One continuous scene in four beats, no cuts:
 *
 *   0 fridge   Paper notes on a fridge door. Memo, the magnet, clacks onto the dentist note and winks.
 *   1 phone    The door becomes the phone (the one signature move); every note flies into a card.
 *   2 talk     Julia says a date, Memo thinks, her card comes out of Memo. Then Tom, a little quicker.
 *   3 claim    The cards and the phone go into Memo; Memo centre stage, Julia and Tom where the notes
 *              were, both voices reach Memo.
 *
 * Built to /onboarding/motion-skill.md (02.11.2026), section 8:
 * - ONE clock. `g` is film time in seconds; beat b plays from S[b] to E[b] with a linear withTiming
 *   and then holds still. Every element is a pure function of `g` (helpers in theme/film.ts), so
 *   the film is scrubbable and identical on every run. No setTimeout, no withRepeat, no randomness.
 * - Beats move on only by a tap (Weiter or the stage; Julian found auto play too fast). A tap
 *   during a beat lets the rest of it play out in 450 to 900 ms with a soft start and end (no jump
 *   cut), then the next beat plays.
 * - The door/phone outline is one SVG rounded-rect path (same commands at every frame, so it cannot
 *   knot); cards are SVG bodies plus content moved by transforms. No layout animation.
 * - Haptics at five moments only, and only while a beat plays at normal speed.
 * - Reduced motion: the beat's end state at once.
 *
 * Storyboard (seconds from the beat's start). Text first: every beat's action waits for its caption.
 *   b0 0.15/0.29/0.43 notes pinned · 0.70 Memo comes in from the top right, pulled the last 30 % ·
 *      1.15 clack (haptic), the note settles 80 ms later · 1.60 eyes to the viewer · 2.10 wink · hold
 *   b1 0.80 eyes to the notes · 1.05 anticipation (door dips, handles retract) · 1.40–2.60 morph,
 *      top edge leads the bottom by 70 ms, camera pushes in · 1.52 Memo lifts off to the phone top ·
 *      1.60/1.74/1.88 notes fly on arcs, text out then card in · 2.75 seated (haptic), happy hop ·
 *      2.95 light runs along the inside of the glass · 3.00 the second phone slides out · hold
 *   b2 0.30 Memo looks to Julia · 0.45 avatar · 0.70 bubble, words light with the wave until 1.95 ·
 *      2.45 think, "?" · 3.40 bubble back, card comes out of Memo · 4.00 lands (haptic) · 4.60 looks
 *      to Tom · 4.80 avatar · 5.05 bubble · 6.10 think · 6.75 card · 7.35 lands (haptic) · hold
 *   b3 0.60 cards fly into Memo · 1.00 the phone closes into Memo's ring · 1.50 camera pulls back,
 *      Memo to centre · 2.25/2.42 Julia, Tom · 2.70/2.87 one voice each, a dotted trace stays ·
 *      3.45 glint, happy hop (haptic) · hold (screenshot frame)
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, useAnimatedReaction, withTiming, withSequence,
  Easing, useReducedMotion, cancelAnimation, runOnJS, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path } from 'react-native-svg';
import Txt from '../ui/Txt';
import { Tile } from '../ui/Clay';
import { MemoFace, type EyeKey } from './Memo';
import { tokens, persons } from '../../theme';
import { isDark, nightBg, nightFg } from '../../theme/tokens';
import { tx } from '../../i18n/lang';
import { haptics } from '../../lib/haptics';
import { seg, mix, kf, eOut, eMove, eTail, eIn, crit, recoil, quad, rrect, rrectEdges } from '../../theme/film';

export const INTRO_BEATS = 4;
const W = 300;
const H = 390;
// Beat starts and ends on the film clock (s). Each beat plays once, then holds still.
const S = [0, 3.0, 7.0, 16.0];
const E = [3.0, 7.0, 16.0, 21.5];
const [S1, S2, S3] = [S[1], S[2], S[3]];
/** A tap mid-beat lets the rest play out in a quarter of its time, kept between these (ms). */
const RESOLVE = [450, 900];
// The film's couple. Fixed names: before sign-up we don't know yours.
const NAME = { J: 'Julia', T: 'Tom' } as const;

// Fridge door, phone, and the card slots inside the phone (stage coordinates).
const FR = { l: 30, t: 6, r: 270, b: 384, rad: 28 };
const PH = { l: 52, t: 8, r: 248, b: 382, rad: 40 };
const SLOT = { cx: 150, cy0: 116, pitch: 52, w: 180, h: 46 };
const MEMO = 128; // Memo is drawn at this size and scaled.
const BODY = 0.37; // Memo's round body: radius as a share of the art size.
/** Memo at the top of the phone (the new cards come out of it). Worklets capture it, so it is defined first. */
const M1 = { x: 150, y: 49, s: 54 };

// Plain data only: worklets read these on the UI thread.
const GEO = [
  { x: 62, y: 112, w: 112, h: 92, rot: -5, paper: '#FFF3D6', slot: 0, fly: 0, ax: 0, ay: -18 },
  { x: 154, y: 150, w: 92, h: 84, rot: 6, paper: '#FBEFE0', slot: 1, fly: 1, ax: -22, ay: 16 },
  { x: 78, y: 246, w: 132, h: 76, rot: -2, paper: '#FFF8E8', slot: 2, fly: 2, ax: -7, ay: 0 },
];
const NOTES = [
  { text: () => tx('Zahnarzt', 'Dentist'), sub: () => tx('Fr 15 Uhr', 'Fri 3pm'), icon: 'zahnarzt' as const },
  { text: () => tx('Milch!', 'Milk!'), sub: () => tx('und Brot', 'and bread'), icon: 'einkauf' as const },
  { text: () => tx('Elternabend', 'Parent night'), sub: () => tx('Di 19 Uhr', 'Tue 7pm'), icon: 'elternabend' as const },
];
// The two cards the assistant makes in beat 2: leave Memo at `t`, land at t + FLY.
const NEW = [{ t: S2 + 3.4, side: -1 }, { t: S2 + 6.75, side: 1 }];
const FLY = 0.6;
/** The cards below start making room this much before a new card leaves Memo. */
const LEAD = 0.12;

// Memo's eyes over the whole film: curious → attentive → listening, thinking, glad → proud and calm.
const EYES: EyeKey[] = [
  { t: 1.6, e: 'open' }, { t: 2.1, e: 'wink', direct: true }, { t: 2.62, e: 'open', direct: true },
  { t: S1 + 0.8, e: 'wide' }, { t: S1 + 2.75, e: 'happy' }, { t: S1 + 3.4, e: 'open' },
  { t: S2 + 0.3, e: 'left' }, { t: S2 + 2.45, e: 'think' }, { t: S2 + 4.0, e: 'happy' },
  { t: S2 + 4.6, e: 'right' }, { t: S2 + 6.1, e: 'think' }, { t: S2 + 7.35, e: 'happy' }, { t: S2 + 8.0, e: 'open' },
  { t: S3 + 0.5, e: 'wide' }, { t: S3 + 2.2, e: 'open' }, { t: S3 + 3.45, e: 'happy' }, { t: S3 + 4.4, e: 'open' },
];
// Five haptics in the whole film, each on a contact or a benefit.
const HITS = [
  { t: 1.15, k: 0 }, { t: S1 + 2.75, k: 0 }, { t: NEW[0].t + FLY, k: 1 }, { t: NEW[1].t + FLY, k: 1 }, { t: S3 + 3.45, k: 1 },
];
const buzz = (k: number) => (k ? haptics.success() : haptics.tap());

const AP = Animated.createAnimatedComponent(Path);

/** Beat 2 tells two stories. A tap during Julia's first plays out to her landed card and stops there. */
const CHECK = { beat: 2, t: S2 + 4.15 };
const catchUp = (from: number, to: number) => Math.min(RESOLVE[1], Math.max(RESOLVE[0], (to - from) * 250));

/**
 * `tap` is filled with a handler the screen calls before it moves on: it returns true when the film
 * used the tap itself (the checkpoint in beat 2).
 */
export default function Intro({ beat, tap }: { beat: number; tap?: React.MutableRefObject<(() => boolean) | null> }) {
  const reduced = useReducedMotion();
  const g = useSharedValue(reduced ? E[beat] : S[beat]);
  const cur = useSharedValue(beat);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const was = prev.current;
    prev.current = beat;
    cur.value = beat;
    cancelAnimation(g);
    if (reduced) { g.value = E[beat]; return; }
    const play = (from: number) => withTiming(E[beat], { duration: Math.max(0, E[beat] - from) * 1000, easing: Easing.linear });
    const now = g.value;
    if (was === null || beat < was || now > E[beat]) {
      // First frame of the film, or back: the beat plays from its start.
      g.value = S[beat];
      g.value = play(S[beat]);
    } else if (now < S[beat]) {
      // Tapped on mid-beat: the rest plays out quickly with a soft start and end, then this beat plays.
      g.value = withSequence(withTiming(S[beat], { duration: catchUp(now, S[beat]), easing: Easing.inOut(Easing.cubic) }), play(S[beat]));
    } else {
      g.value = play(now);
    }
  }, [beat, reduced]);
  useEffect(() => () => cancelAnimation(g), []);
  useEffect(() => {
    if (!tap) return;
    tap.current = () => {
      const now = g.value;
      if (reduced || beat !== CHECK.beat || now >= CHECK.t - 0.3) return false;
      cancelAnimation(g);
      g.value = withSequence(
        withTiming(CHECK.t, { duration: catchUp(now, CHECK.t), easing: Easing.inOut(Easing.cubic) }),
        withTiming(E[beat], { duration: (E[beat] - CHECK.t) * 1000, easing: Easing.linear }),
      );
      return true;
    };
    return () => { tap.current = null; };
  }, [beat, reduced, tap]);

  // Haptics fire when the clock crosses a hit inside the beat that is playing (never while resolving).
  useAnimatedReaction(() => g.value, (now, was) => {
    if (was === null || reduced || now <= was) return;
    const start = S[cur.value];
    for (let i = 0; i < HITS.length; i++) {
      const h = HITS[i];
      if (h.t >= start && was < h.t && now >= h.t) runOnJS(buzz)(h.k);
    }
  });

  // Camera: push in when the door becomes the phone, lock while people speak, pull back for the claim.
  const camera = useAnimatedStyle((): any => {
    const v = g.value;
    const s = 1 + 0.04 * eTail(seg(v, S1 + 1.4, S1 + 2.8)) - 0.08 * eTail(seg(v, S3 + 1.5, S3 + 2.8));
    return { transform: [{ scale: s }] };
  });

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, camera]}>
        <Ghost g={g} />
        <Door g={g} />
        {GEO.map((_, i) => <NoteCard key={i} i={i} g={g} />)}
        <NewCard k={0} g={g} reduced={!!reduced} />
        <NewCard k={1} g={g} reduced={!!reduced} />
        <Glass g={g} />
        <Speech who="J" g={g} t={S2 + 0.45} text={tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming')} words={[S2 + 0.75, S2 + 1.95]} back={NEW[0].t} out={NEW[0].t + 0.2} />
        <Speech who="T" g={g} t={S2 + 4.8} text={tx('Brot noch auf die Liste', 'Add bread to the list')} words={[S2 + 5.1, S2 + 6.1]} back={NEW[1].t} out={NEW[1].t + 0.2} />
        <Claim g={g} />
        <MemoActor g={g} />
      </Animated.View>
    </View>
  );
}

/** Stage colours that follow the app's light or dark mode (read at render time). */
function look() {
  const night = isDark();
  return {
    enamel0: night ? '#202A2F' : '#FFFFFF',
    enamel1: night ? '#172025' : '#ECEAE5',
    light: night ? 0.08 : 1,
    shadow: night ? '#000000' : tokens.ink,
  };
}

/* ─── Door → phone ─────────────────────────────────────────────────────────────────────────── */

/** Beat 3: the phone closes into Memo's ring (0 → 1). */
function closing(v: number) {
  'worklet';
  return eMove(seg(v, S3 + 1.0, S3 + 1.5));
}

function doorShape(v: number) {
  'worklet';
  const l = v - S1;
  // Top edge leads, bottom follows 70 ms later: the shape stretches, resolved by 2.60.
  const pT = eMove(seg(l, 1.4, 2.53));
  const pB = eMove(seg(l, 1.47, 2.6));
  const pm = (pT + pB) / 2;
  // A → narrower slab → phone: the door slims and sinks before the phone stands up tall.
  // The slab stays wide enough on the right for the Milch note until it has left.
  let L = kf(pm, [0, 0.5, 1], [FR.l, 60, PH.l]);
  let R = kf(pm, [0, 0.5, 1], [FR.r, 256, PH.r]);
  let T = kf(pT, [0, 0.5, 1], [FR.t, 22, PH.t]);
  let B = kf(pB, [0, 0.5, 1], [FR.b, 366, PH.b]);
  let rad = kf(pT, [0, 0.6, 1], [FR.rad, 30, PH.rad]);
  // Anticipation: the door dips 1.5 % before it goes.
  const an = 1 - 0.015 * eOut(seg(l, 1.05, 1.25)) * (1 - eMove(seg(l, 1.4, 1.9)));
  L = 150 + (L - 150) * an;
  R = 150 + (R - 150) * an;
  T = 195 + (T - 195) * an;
  B = 195 + (B - 195) * an;
  // Beat 3: the rounded rect closes into the circle of Memo's ring (same path, so no knot).
  const z = closing(v);
  const r0 = BODY * M1.s;
  L = mix(L, M1.x - r0, z);
  R = mix(R, M1.x + r0, z);
  T = mix(T, M1.y - r0, z);
  B = mix(B, M1.y + r0, z);
  rad = mix(rad, r0, z);
  return { d: rrectEdges(L, T, R, B, rad), pT, pm, gone: 1 - seg(z, 0.85, 1) };
}

function Door({ g }: { g: SharedValue<number> }) {
  const lk = look();
  // Colours never animate directly (react-native-web ignores animated colour props): layers cross by opacity.
  const base = useAnimatedProps(() => {
    const s = doorShape(g.value);
    return { d: s.d, opacity: s.gone } as any;
  });
  const glass = useAnimatedProps(() => {
    const s = doorShape(g.value);
    return { d: s.d, opacity: seg(s.pm, 0.3, 0.8) * s.gone } as any;
  });
  const enamel = useAnimatedProps(() => {
    const s = doorShape(g.value);
    return { d: s.d, opacity: 1 - seg(s.pm, 0.25, 0.7) } as any;
  });
  const hair = useAnimatedProps(() => {
    const s = doorShape(g.value);
    const k = seg(s.pT, 0.5, 0.9);
    return { d: s.d, opacity: 1 - k, strokeWidth: mix(1.2, 3, k) } as any;
  });
  const ink = useAnimatedProps(() => {
    const s = doorShape(g.value);
    const k = seg(s.pT, 0.5, 0.9);
    return { d: s.d, opacity: k * s.gone, strokeWidth: mix(1.2, 3, k) } as any;
  });
  // The door's own parts go first (anticipation), the phone's notch comes last and leaves first.
  const gap = useAnimatedStyle(() => ({ opacity: 1 - seg(g.value - S1, 1.05, 1.3) }));
  const handle = useAnimatedStyle((): any => {
    const k = eOut(seg(g.value - S1, 1.05, 1.25));
    return { opacity: 1 - seg(g.value - S1, 1.1, 1.25), transform: [{ scaleY: 1 - k }] };
  });
  const notch = useAnimatedStyle(() => ({ opacity: seg(g.value - S1, 2.25, 2.65) * (1 - seg(g.value, S3 + 0.95, S3 + 1.1)) }));
  return (
    <>
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="introEnamel" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lk.enamel0} />
            <Stop offset="1" stopColor={lk.enamel1} />
          </LinearGradient>
          {/* Soft top light on the enamel, falling off towards the floor. */}
          <RadialGradient id="introTop" cx="0.35" cy="0.06" r="0.75">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={lk.light} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <AP animatedProps={base} fill={tokens.row} />
        <AP animatedProps={glass} fill={tokens.bg} />
        <AP animatedProps={enamel} fill="url(#introEnamel)" />
        <AP animatedProps={enamel} fill="url(#introTop)" />
        <AP animatedProps={hair} fill="none" stroke={tokens.hair} />
        <AP animatedProps={ink} fill="none" stroke={tokens.ink} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: FR.l, top: FR.t + 96, width: FR.r - FR.l, height: 1.5, backgroundColor: tokens.hair }, gap]} />
      <Animated.View style={[{ position: 'absolute', left: FR.l + 16, top: FR.t + 30, width: 7, height: 50, borderRadius: 4, backgroundColor: tokens.hair }, handle]} />
      <Animated.View style={[{ position: 'absolute', left: FR.l + 16, top: FR.t + 120, width: 7, height: 96, borderRadius: 4, backgroundColor: tokens.hair }, handle]} />
      <Animated.View style={[{ position: 'absolute', left: 150 - 30, top: PH.t + 9, width: 60, height: 6, borderRadius: 3, backgroundColor: tokens.hair }, notch]} />
    </>
  );
}

/**
 * "Bei euch beiden": once the phone is complete, a second phone slides out from behind it (a solid
 * object, so it moves and never fades). It slides back the way it came before the voices start.
 */
function Ghost({ g }: { g: SharedValue<number> }) {
  const p = useAnimatedProps(() => {
    const v = g.value;
    const k = eOut(seg(v, S1 + 3.0, S1 + 3.5)) * (1 - eIn(seg(v, S2 + 0.0, S2 + 0.3)));
    return { d: rrectEdges(PH.l + 26 * k, PH.t + 12 * k, PH.r + 26 * k, PH.b + 12 * k, PH.rad), opacity: k > 0 ? 1 : 0 } as any;
  });
  return (
    <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <AP animatedProps={p} fill={tokens.row} stroke={tokens.mute} strokeWidth={2.5} />
    </Svg>
  );
}

/** Light, not particles: one glint runs along the inside of the glass when the phone is complete. */
function Glass({ g }: { g: SharedValue<number> }) {
  const p = useAnimatedProps(() => {
    const k = seg(g.value - S1, 2.95, 3.55);
    return {
      strokeDashoffset: mix(90, -330, eMove(k)),
      opacity: Math.sin(Math.PI * k) * 0.6,
    } as any;
  });
  return (
    <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <AP animatedProps={p} d={rrectEdges(PH.l + 3.5, PH.t + 3.5, PH.r - 3.5, PH.b - 3.5, PH.rad - 3.5)} fill="none" stroke={isDark() ? '#FFFFFF' : tokens.done} strokeWidth={1.4} strokeLinecap="round" strokeDasharray="90 2400" />
    </Svg>
  );
}

/* ─── Cards ────────────────────────────────────────────────────────────────────────────────── */

/** How far a card in slot `slot` has been pushed down by the new cards (each 40 ms after the one above). */
function pushed(v: number, slot: number) {
  'worklet';
  return crit(v - (NEW[0].t - LEAD + 0.04 * slot), 13) + crit(v - (NEW[1].t - LEAD + 0.04 * (slot + 1)), 13);
}

/** Beat 3: the cards fly into Memo one by one from the top, 50 ms apart (0 → 1, ease-in). */
function sucked(v: number, order: number) {
  'worklet';
  const a = S3 + 0.6 + 0.05 * order;
  return eIn(seg(v, a, a + 0.45));
}

function noteGeo(v: number, i: number) {
  'worklet';
  const n = GEO[i];
  const ncx = n.x + n.w / 2;
  const ncy = n.y + n.h / 2;
  // Beat 0: pinned up one by one, rising 14 pt, the rotation settling from 2° extra.
  const a = v - (0.15 + 0.14 * i);
  const rise = 14 * (1 - eOut(seg(a, 0, 0.36)));
  let o = seg(a, 0, 0.2);
  let rot = n.rot + 2 * (a <= 0 ? 1 : (1 + 20 * a) * Math.exp(-20 * a));
  // The dentist note settles under Memo's contact, 80 ms late.
  if (i === 0) rot += 2 * crit(v - 1.23, 20);
  // Beat 1: flight on an arc into its slot. Each arc bulges away from the cards already seated,
  // so no card passes over another.
  const fs = S1 + 1.6 + 0.14 * n.fly;
  const lin = seg(v, fs, fs + 0.9);
  const p = eMove(lin);
  const lift = Math.sin(Math.PI * p);
  const scy = SLOT.cy0 + SLOT.pitch * (n.slot + pushed(v, n.slot));
  let cx = mix(ncx, SLOT.cx, p) + n.ax * lift;
  let cy = mix(ncy + rise, scy, p) + n.ay * lift;
  let w = mix(n.w, SLOT.w, p);
  let h = mix(n.h, SLOT.h, p);
  rot = rot * (1 - crit(v - fs, 9));
  // Beat 3: into Memo.
  const z = sucked(v, 2 + n.slot);
  cx = mix(cx, M1.x, z);
  cy = mix(cy, M1.y, z);
  w *= 1 - 0.8 * z;
  h *= 1 - 0.8 * z;
  const gone = 1 - seg(z, 0.8, 1);
  o *= gone;
  return { cx, cy, w, h, r: mix(3, 14, p) * (1 - 0.6 * z), rot, o, lin, p, lift, ncx, ncy, gone };
}

function CardBody({ g, geoKind, i, fill0, fill1 }: { g: SharedValue<number>; geoKind: 'note' | 'new'; i: number; fill0: string; fill1: string }) {
  const shadow = look().shadow;
  const halo = useAnimatedProps(() => {
    const c = geoKind === 'note' ? noteGeo(g.value, i) : newGeo(g.value, i);
    return { d: rrect(c.cx, c.cy + 3 + 7 * c.lift, c.w + 6, c.h + 6, c.r + 3, c.rot), opacity: c.o * (0.035 + 0.03 * c.lift) } as any;
  });
  const shade = useAnimatedProps(() => {
    const c = geoKind === 'note' ? noteGeo(g.value, i) : newGeo(g.value, i);
    return { d: rrect(c.cx, c.cy + 1.5 + 5 * c.lift, c.w + 1, c.h + 1, c.r, c.rot), opacity: c.o * (0.07 + 0.04 * c.lift) } as any;
  });
  const body = useAnimatedProps(() => {
    const c = geoKind === 'note' ? noteGeo(g.value, i) : newGeo(g.value, i);
    return { d: rrect(c.cx, c.cy, c.w, c.h, c.r, c.rot), opacity: c.o } as any;
  });
  // Paper turns into card white over the second half of the flight.
  const tint = useAnimatedProps(() => {
    const c = geoKind === 'note' ? noteGeo(g.value, i) : newGeo(g.value, i);
    return { d: rrect(c.cx, c.cy, c.w, c.h, c.r, c.rot), opacity: c.o * (1 - seg(c.p, 0.35, 0.9)) } as any;
  });
  return (
    <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <AP animatedProps={halo} fill={shadow} />
      <AP animatedProps={shade} fill={shadow} />
      <AP animatedProps={body} fill={fill1} stroke="rgba(22,35,42,0.07)" strokeWidth={1} />
      {fill0 !== fill1 ? <AP animatedProps={tint} fill={fill0} /> : null}
    </Svg>
  );
}

/** A paper note on the fridge that flies into the phone and becomes a card. */
function NoteCard({ i, g }: { i: number; g: SharedValue<number> }) {
  const n = GEO[i];
  const note = NOTES[i];
  // Paper text leaves over the first 35 % of the flight, the card's content arrives over the last 45 %.
  const paper = useAnimatedStyle((): any => {
    const c = noteGeo(g.value, i);
    return {
      opacity: c.o * (1 - seg(c.lin, 0, 0.35)),
      transform: [{ translateX: c.cx - c.ncx }, { translateY: c.cy - c.ncy }, { rotate: `${c.rot}deg` }, { scale: Math.min(c.w / n.w, c.h / n.h) }],
    };
  });
  const card = useAnimatedStyle((): any => {
    const c = noteGeo(g.value, i);
    return {
      opacity: seg(c.lin, 0.55, 1) * c.gone,
      transform: [{ translateX: c.cx - SLOT.cx }, { translateY: c.cy - SLOT.cy0 }, { rotate: `${c.rot}deg` }, { scale: c.w / SLOT.w }],
    };
  });
  return (
    <>
      <CardBody g={g} geoKind="note" i={i} fill0={nightBg(n.paper)} fill1={tokens.row} />
      <Animated.View style={[{ position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h, padding: 12, gap: 2 }, paper]}>
        {i ? <View style={{ position: 'absolute', top: -4, left: n.w / 2 - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: tokens.done }} /> : null}
        <Txt size={16} weight={700} color={nightFg('#3A3324')} style={{ marginTop: 10 }} numberOfLines={1}>{note.text()}</Txt>
        <Txt size={14} color={nightFg('#6B6150')} numberOfLines={1}>{note.sub()}</Txt>
      </Animated.View>
      <Animated.View style={[slotBox, card]}>
        <Tile name={note.icon} size={32} radius={10} />
        <View style={{ flex: 1 }}>
          <Txt size={13} line={16} weight={700} numberOfLines={1}>{note.text()}</Txt>
          <Txt size={11} line={14} color={tokens.sub} numberOfLines={1}>{note.sub()}</Txt>
        </View>
      </Animated.View>
    </>
  );
}

const slotBox = {
  position: 'absolute' as const, left: SLOT.cx - SLOT.w / 2, top: SLOT.cy0 - SLOT.h / 2, width: SLOT.w, height: SLOT.h,
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingLeft: 12, paddingRight: 12,
};

function newGeo(v: number, k: number) {
  'worklet';
  const nw = NEW[k];
  const lin = seg(v, nw.t, nw.t + FLY);
  const p = eMove(lin);
  // Out of Memo's centre at 20 % size (narrower than Memo's body, so nothing blank sticks out), down into the top slot on a slight arc to the speaker's side.
  const scy = SLOT.cy0 + SLOT.pitch * (k === 0 ? crit(v - (NEW[1].t - LEAD), 13) : 0);
  let cx = quad(M1.x, M1.x + nw.side * 34, SLOT.cx, p);
  let cy = quad(M1.y, M1.y + 40, scy, p);
  let w = mix(SLOT.w * 0.2, SLOT.w, p);
  let h = mix(SLOT.h * 0.2, SLOT.h, p);
  // Beat 3: back into Memo, the newest first.
  const z = sucked(v, 1 - k);
  cx = mix(cx, M1.x, z);
  cy = mix(cy, M1.y, z);
  w *= 1 - 0.8 * z;
  h *= 1 - 0.8 * z;
  const gone = 1 - seg(z, 0.8, 1);
  return {
    cx, cy, w, h,
    r: mix(10, 14, p) * (1 - 0.6 * z),
    rot: nw.side * 4 * (1 - p),
    // Drawn under Memo: it is born inside Memo's body and comes out of it, card and content together.
    o: seg(lin, 0.02, 0.14) * gone,
    lin, p: 1, lift: Math.sin(Math.PI * p), gone,
  };
}

/** A card the assistant just made: leaves Memo, lands in the top slot, the speaker's colour draws in. */
function NewCard({ k, g, reduced }: { k: number; g: SharedValue<number>; reduced: boolean }) {
  const who = k === 0 ? 'J' : 'T';
  const p = persons[who];
  const land = NEW[k].t + FLY;
  const [lit, setLit] = useState(false);
  useAnimatedReaction(() => g.value >= land + 0.03 && g.value < S3 + 0.5, (v, was) => { if (v !== was) runOnJS(setLit)(v && !reduced); });
  const content = useAnimatedStyle((): any => {
    const c = newGeo(g.value, k);
    return {
      opacity: seg(c.lin, 0.06, 0.3) * c.gone,
      transform: [{ translateX: c.cx - SLOT.cx }, { translateY: c.cy - SLOT.cy0 }, { rotate: `${c.rot}deg` }, { scale: c.w / SLOT.w }],
    };
  });
  const bar = useAnimatedProps(() => {
    const c = newGeo(g.value, k);
    const b = eOut(seg(g.value, land + 0.03, land + 0.17));
    const bw = 4 * b * (1 - 0.8 * (1 - c.gone));
    return { d: rrect(c.cx - c.w / 2 + 5 + bw / 2, c.cy, Math.max(0.01, bw), c.h - 18, 2, 0), opacity: b > 0 ? c.gone : 0 } as any;
  });
  return (
    <>
      <CardBody g={g} geoKind="new" i={k} fill0={tokens.row} fill1={tokens.row} />
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <AP animatedProps={bar} fill={p.ink} />
      </Svg>
      <Animated.View style={[slotBox, content]}>
        <Tile name={k === 0 ? 'schwimmen' : 'einkauf'} size={32} radius={10} celebrate={lit} />
        <View style={{ flex: 1 }}>
          <Txt size={13} line={16} weight={700} numberOfLines={1}>{k === 0 ? tx('Schwimmen', 'Swimming') : tx('Brot', 'Bread')}</Txt>
          <Txt size={11} line={14} color={nightFg(p.ink)} numberOfLines={1}>{k === 0 ? `${tx('Sa 10:00', 'Sat 10am')} · ${NAME.J}` : `${tx('Einkauf', 'Shopping')} · ${NAME.T}`}</Txt>
        </View>
        <Txt size={12} weight={700} color={tokens.done}>✓</Txt>
      </Animated.View>
    </>
  );
}

/* ─── Beat 2: voices ───────────────────────────────────────────────────────────────────────── */

function Avatar({ who, size }: { who: 'J' | 'T'; size: number }) {
  const p = persons[who];
  return (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: nightBg(p.tint), borderWidth: 2, borderColor: tokens.row, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={size * 0.42} weight={700} color={nightFg(p.ink)}>{NAME[who][0]}</Txt>
    </View>
  );
}

const AV = 42;
const BUB = { bottom: 40, inset: 8, max: 180 };

/**
 * Someone speaking: the avatar rises beside the phone, the bubble grows inside the phone from the
 * avatar's side, the words light up with the wave (unsung words stay readable at 35 %), the wave lies
 * flat when they stop, and the bubble shrinks back towards the avatar the way it came.
 */
function Speech({ who, g, t, text, words, back, out }: { who: 'J' | 'T'; g: SharedValue<number>; t: number; text: string; words: [number, number]; back: number; out: number }) {
  const p = persons[who];
  const left = who === 'J';
  const tb = t + 0.25;
  const list = text.split(' ');
  const av = useAnimatedStyle((): any => {
    const v = g.value;
    const up = eOut(seg(v, t, t + 0.28));
    const down = eIn(seg(v, out, out + 0.26));
    return { opacity: seg(v, t, t + 0.16) * (1 - down), transform: [{ translateY: 14 * (1 - up) + 10 * down }] };
  });
  const bub = useAnimatedStyle((): any => {
    const v = g.value;
    const sh = eIn(seg(v, back, back + 0.18));
    return {
      opacity: seg(v, tb, tb + 0.12) * (1 - sh),
      transform: [{ scale: (0.9 + 0.1 * crit(v - tb, 20)) * (1 - 0.1 * sh) }],
    };
  });
  // Avatar fully outside the phone (8 pt or more), bubble fully inside it.
  const side = left ? { left: PH.l - 10 - AV } : { right: W - PH.r - 10 - AV };
  const bside = left ? { left: PH.l + BUB.inset } : { right: W - PH.r + BUB.inset };
  return (
    <>
      <Animated.View style={[{ position: 'absolute', bottom: BUB.bottom, ...side }, av]}><Avatar who={who} size={AV} /></Animated.View>
      <Animated.View style={[{ position: 'absolute', bottom: BUB.bottom, ...bside, maxWidth: BUB.max, transformOrigin: left ? 'left bottom' : 'right bottom', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 16, borderBottomLeftRadius: left ? 5 : 16, borderBottomRightRadius: left ? 16 : 5, backgroundColor: tokens.ink, gap: 4, shadowColor: '#16232A', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } } as any, bub]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 10 }}>
          {Array.from({ length: 16 }).map((_, i) => <Bar key={i} i={i} g={g} from={words[0]} to={words[1]} color={p.tint} />)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 }}>
          {list.map((w, i) => <Word key={i} g={g} at={words[0] + ((words[1] - words[0]) * i) / list.length} text={w} />)}
        </View>
      </Animated.View>
    </>
  );
}

function Word({ g, at, text }: { g: SharedValue<number>; at: number; text: string }) {
  const st = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * seg(g.value, at, at + 0.12) }));
  return <Animated.View style={st}><Txt size={13} line={17} color={tokens.onInk}>{text}</Txt></Animated.View>;
}

/** One waveform bar: moves only while the person speaks, then lies flat. Deterministic in time. */
function Bar({ i, g, from, to, color }: { i: number; g: SharedValue<number>; from: number; to: number; color: string }) {
  const st = useAnimatedStyle((): any => {
    const v = g.value;
    const env = seg(v, from - 0.05, from + 0.12) * (1 - seg(v, to - 0.18, to));
    const wob = 0.5 + 0.5 * Math.sin(v * 17 + i * 1.9) * Math.sin(v * 6.3 + i * 0.7 + 1);
    const shape = 0.55 + 0.45 * Math.sin((i / 15) * Math.PI);
    return { transform: [{ scaleY: 0.16 + env * shape * (0.25 + 0.75 * wob) }] };
  });
  return <Animated.View style={[{ width: 3, height: 10, borderRadius: 2, backgroundColor: color }, st]} />;
}

/* ─── Beat 3: the claim ────────────────────────────────────────────────────────────────────── */

const M3 = { x: 150, y: 170, s: 124 };
const PAV = 64;
const PEOPLE = { J: { x: 56, y: 280, t: S3 + 2.25, amp: 14, bend: -1 }, T: { x: 244, y: 280, t: S3 + 2.42, amp: 12, bend: 1 } };
const VOICE = { J: S3 + 2.7, T: S3 + 2.87 };
const PEAK = S3 + 3.45;

function Claim({ g }: { g: SharedValue<number> }) {
  const shadow = useAnimatedStyle((): any => {
    const v = g.value;
    const hop = Math.sin(Math.PI * seg(v, PEAK, PEAK + 0.32));
    return { opacity: seg(v, S3 + 1.95, S3 + 2.25) * (1 - 0.3 * hop), transform: [{ scaleX: 1 - 0.12 * hop }] };
  });
  const sy = M3.y + BODY * M3.s * 0.96;
  const sc = look().shadow;
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: M3.x - 36, top: sy - 3, width: 72, height: 9, alignItems: 'center', justifyContent: 'center' }, shadow]}>
        <View style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 50, backgroundColor: sc, opacity: 0.035 }} />
        <View style={{ width: '66%', height: '56%', borderRadius: 50, backgroundColor: sc, opacity: 0.07 }} />
      </Animated.View>
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Trace who="J" g={g} />
        <Trace who="T" g={g} />
      </Svg>
      <Person who="J" g={g} />
      <Person who="T" g={g} />
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[0, 1, 2].map((j) => <Voice key={`J${j}`} who="J" j={j} g={g} />)}
        {[0, 1, 2].map((j) => <Voice key={`T${j}`} who="T" j={j} g={g} />)}
      </Svg>
    </>
  );
}

function Person({ who, g }: { who: 'J' | 'T'; g: SharedValue<number> }) {
  const P = PEOPLE[who];
  const st = useAnimatedStyle((): any => {
    const a = g.value - P.t;
    return { opacity: seg(a, 0, 0.22), transform: [{ translateY: P.amp * (1 - eOut(seg(a, 0, 0.42))) }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: P.x - 44, top: P.y - PAV / 2, width: 88, alignItems: 'center', gap: 6 }, st]}>
      <Avatar who={who} size={PAV} />
      <Txt size={13} weight={600} color={tokens.sub}>{NAME[who]}</Txt>
    </Animated.View>
  );
}

/** Where a voice runs: from the edge of the avatar to the edge of Memo's body. */
function lane(who: 'J' | 'T') {
  'worklet';
  const P = PEOPLE[who];
  const dx = M3.x - P.x;
  const dy = M3.y - P.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { P, ux: dx / len, uy: dy / len, len, a: PAV / 2 + 6, b: len - BODY * M3.s - 8 };
}

/** One arc of a voice, travelling once from the person to Memo. Three per side, 70 ms apart. */
function Voice({ who, j, g }: { who: 'J' | 'T'; j: number; g: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const { P, ux, uy, a, b } = lane(who);
    const t0 = VOICE[who] + 0.07 * j;
    const lin = seg(g.value, t0, t0 + 0.55);
    const k = eMove(lin * 0.85 + 0.15 * lin * lin);
    const dist = mix(a, b, k);
    const r = 11 + 3 * j;
    // The arc bulges towards Memo: its centre sits r behind the travelling point.
    const cx = P.x + ux * (dist - r);
    const cy = P.y + uy * (dist - r);
    const th = Math.atan2(uy, ux);
    const sp = 0.75;
    const x1 = cx + r * Math.cos(th - sp);
    const y1 = cy + r * Math.sin(th - sp);
    const x2 = cx + r * Math.cos(th + sp);
    const y2 = cy + r * Math.sin(th + sp);
    return { d: `M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`, opacity: seg(lin, 0, 0.1) * (1 - seg(lin, 0.8, 1)) } as any;
  });
  return <AP animatedProps={props} fill="none" stroke={tokens.done} strokeWidth={3} strokeLinecap="round" />;
}

/** What stays of a voice: one faint dotted line from the person to Memo, drawn behind the passing arcs. */
function Trace({ who, g }: { who: 'J' | 'T'; g: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const { P, ux, uy, a, b } = lane(who);
    const t0 = VOICE[who];
    const k = eOut(seg(g.value, t0 + 0.05, t0 + 0.6));
    const end = mix(a, b, k);
    const x1 = P.x + ux * a;
    const y1 = P.y + uy * a;
    const x2 = P.x + ux * end;
    const y2 = P.y + uy * end;
    // A slight bow upwards, so it reads as a voice and not a connector.
    const mx = (x1 + x2) / 2 + uy * 10 * PEOPLE[who].bend;
    const my = (y1 + y2) / 2 - Math.abs(ux) * 10;
    return { d: `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`, opacity: k > 0.01 ? 0.25 : 0 } as any;
  });
  return <AP animatedProps={props} fill="none" stroke={tokens.done} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 7" />;
}

/* ─── Memo ─────────────────────────────────────────────────────────────────────────────────── */

const M0 = { x: 118, y: 107, s: 70 };
/** Beat 0: Memo comes in from off the top right of the stage, a little nearer (larger) than the door. */
const MSTART = { x: 390, y: -30, k: 1.15 };

/** Tossed in, slowing, then pulled in by the magnet for the last 30 % (arrives with speed). */
function pulled(u: number) {
  'worklet';
  if (u < 0.7) {
    const a = u / 0.7;
    return (0.8 * (2 * a - 0.8 * a * a)) / 1.2;
  }
  const b = (u - 0.7) / 0.3;
  return 0.8 + 0.2 * (0.57 * b + 0.43 * b * b);
}

/** A small hop: crouch, parabola, landing recoil. Returns [dy (px), squash]. */
function hop(v: number, T: number, h: number, dur: number) {
  'worklet';
  const k = seg(v, T, T + dur);
  const air = k > 0 && k < 1 ? 1 : 0;
  const dy = -h * 4 * k * (1 - k);
  const crouch = 0.05 * Math.sin(Math.PI * seg(v, T - 0.09, T));
  const stretch = air * 0.04 * Math.sin(Math.PI * k);
  return [dy, -crouch + stretch - recoil(v - T - dur, 0.05)];
}

function memoGeo(v: number) {
  'worklet';
  // Beat 0: comes in on an arc from off stage (top right) through the empty freezer door, never
  // across a note, and shrinks onto the surface as the magnet takes it. Solid: it never fades.
  const u0 = seg(v, 0.7, 1.15);
  const q = pulled(u0);
  let x = quad(MSTART.x, 210, M0.x, q);
  let y = quad(MSTART.y, 14, M0.y, q);
  let s = M0.s * mix(MSTART.k, 1, q);
  const o = v >= 0.69 ? 1 : 0;
  let stretch = 0.05 * Math.sin(Math.PI * u0);
  let rot = 8 * Math.sin(Math.PI * u0);
  // Held to the note: follows its tilt (−5° → −3° after the clack), a bit less than the paper.
  const noteRot = (-5 + 2 * crit(v - 1.23, 20)) * 0.6 * seg(v, 1.1, 1.2);
  // Beat 1: lifts off to the top of the phone, on its own arc, 70 → 54 pt.
  const u1 = seg(v, S1 + 1.52, S1 + 2.55);
  const p1 = eMove(u1);
  if (u1 > 0) {
    x = quad(M0.x, 116, M1.x, p1);
    y = quad(M0.y, 52, M1.y, p1);
    s = mix(M0.s, M1.s, p1);
  }
  rot += noteRot * (1 - p1);
  // Beat 3: to centre stage, growing to 124 pt, landing lightly.
  const u3 = seg(v, S3 + 1.55, S3 + 2.15);
  if (u3 > 0) {
    const q3 = pulled(u3);
    x = quad(M1.x, 196, M3.x, q3);
    y = quad(M1.y, 92, M3.y, q3);
    s = mix(M1.s, M3.s, eMove(u3));
    stretch = 0.04 * Math.sin(Math.PI * u3);
  }
  // Tilts and glances: one critically damped spring per change. Eyes lead (the art changes under a
  // blink at the same key), the head follows.
  rot += 6 * (crit(v - 2.1, 18) - crit(v - 2.62, 16)); // wink
  rot += 4 * (crit(v - (S1 + 0.8), 13) - crit(v - (S1 + 1.52), 13)); // eyes on the notes
  const J0 = S2 + 0.3; // looks to Julia
  const J1 = S2 + 2.45; // thinks
  const J2 = NEW[0].t + FLY; // her card has landed
  const T0 = S2 + 4.6; // looks to Tom (170 ms later than a mirror would)
  const T1 = S2 + 6.1;
  const T2 = NEW[1].t + FLY;
  rot += -10 * crit(v - J0 - 0.06, 13) + 6 * crit(v - J1 - 0.06, 13) + 4 * crit(v - J2, 15);
  rot += 10 * crit(v - T0 - 0.06, 13) - 6 * crit(v - T1 - 0.06, 13) - 4 * crit(v - T2, 15);
  const tx = -5 * crit(v - J0 - 0.06, 13) + 5 * crit(v - J2, 15) + 5 * crit(v - T0 - 0.06, 13) - 5 * crit(v - T2, 15);
  // Thinking lifts Memo 3 pt; the thought becomes a card and Memo settles back.
  let dy = -3 * (crit(v - J1 - 0.06, 15) - crit(v - NEW[0].t, 15) + crit(v - T1 - 0.06, 15) - crit(v - NEW[1].t, 15));
  // Contacts: hard and heavy, at most 9 % squash, one rebound.
  let sq = -recoil(v - 1.15, 0.09) - recoil(v - (S3 + 2.15), 0.06);
  const h1 = hop(v, S1 + 2.75, 7, 0.3);
  const h3 = hop(v, PEAK, 10, 0.32);
  sq += h1[1] + h3[1];
  dy += h1[0] + h3[0];
  const sy = 1 + sq + (u0 < 1 || (u3 > 0 && u3 < 1) ? stretch : 0);
  return { x: x + tx, y: y + dy, s, o, rot, sy, sx: 1 / Math.sqrt(sy) };
}

function MemoActor({ g }: { g: SharedValue<number> }) {
  const box = useAnimatedStyle((): any => {
    const m = memoGeo(g.value);
    const k = m.s / MEMO;
    // Squash about the bottom of the body, so contacts press down instead of shrinking.
    const keep = BODY * m.s * (1 - m.sy);
    return {
      opacity: m.o,
      transform: [
        { translateX: m.x - MEMO / 2 }, { translateY: m.y - MEMO / 2 + keep },
        { rotate: `${m.rot}deg` }, { scale: k }, { scaleX: m.sx }, { scaleY: m.sy },
      ],
    };
  });
  // The "?" pops once per thought and stays until the card comes out of Memo.
  const mark = useAnimatedStyle((): any => {
    const v = g.value;
    const a1 = v - (S2 + 2.5);
    const a2 = v - (S2 + 6.15);
    const v1 = seg(a1, 0, 0.1) * (1 - seg(v, NEW[0].t - 0.1, NEW[0].t + 0.02));
    const v2 = seg(a2, 0, 0.1) * (1 - seg(v, NEW[1].t - 0.1, NEW[1].t + 0.02));
    const pop = a2 > 0 ? crit(a2, 20) : crit(a1, 20);
    const lift = -3 * (crit(a1 + 0.05, 15) - crit(v - NEW[0].t, 15) + crit(a2 + 0.05, 15) - crit(v - NEW[1].t, 15));
    return { opacity: Math.max(v1, v2), transform: [{ translateY: -4 * pop + lift }, { scale: 0.6 + 0.4 * pop }] };
  });
  // The claim made true: a glaze glint crosses Memo once.
  const glint = useAnimatedStyle((): any => {
    const k = seg(g.value, PEAK, PEAK + 0.45);
    return { opacity: Math.sin(Math.PI * k) * 0.42, transform: [{ translateX: mix(-70, 70, eMove(k)) }, { rotate: '24deg' }] };
  });
  const d = MEMO * BODY * 2;
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: MEMO, height: MEMO }, box]}>
        <MemoFace size={MEMO} clock={g} keys={EYES} initial="up" />
        <View style={{ position: 'absolute', left: (MEMO - d) / 2, top: (MEMO - d) / 2, width: d, height: d, borderRadius: d / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ width: 11, height: d * 1.4, backgroundColor: '#FFFFFF', borderRadius: 6 }, glint]} />
        </View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: M1.x + 26, top: M1.y - 31 }, mark]}>
        <Txt size={22} line={26} weight={700} color={tokens.ink}>?</Txt>
      </Animated.View>
    </>
  );
}

export function introCopy(beat: number) {
  return [
    { title: tx('Hallo, ich bin Memo', 'Hi, I’m Memo'), lead: tx('Bisher hing ich an eurem Kühlschrank.', 'Until now I lived on your fridge.') },
    // One sentence per line, so no word is left alone on the second line.
    { title: tx('Jetzt bin ich in eurem Handy', 'Now I live in your phone'), lead: tx('Aus jedem Zettel wird eine Karte.\nBei euch beiden.', 'Every note becomes a card.\nOn both your phones.') },
    { title: tx('Ihr sagt es einfach', 'You just say it'), lead: tx('Julia sagt einen Termin, Tom was fehlt.', 'Julia says a date, Tom what’s missing.') },
    { title: tx('Ein digitaler Assistent, mit dem ihr beide sprechen könnt', 'A digital assistant you both can speak to'), lead: tx('Gleich zeige ich euch den Alltag.', 'Next, I’ll show you how it works.') },
  ][beat];
}
