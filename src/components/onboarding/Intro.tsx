/**
 * The opening film (v5, Julian 02.11.2026: "the clip is too short ... the ideas we had to position
 * the app need to be in the video"). The app is the calendar first: INTRO_CLAIM. One continuous
 * scene in eight beats, no cuts:
 *
 *   0 fridge   Paper notes on a fridge door. Memo, the magnet, clacks onto the first note and winks.
 *   1 phone    The door becomes the phone (the one signature move); every note flies into a card.
 *   2 talk     Julia says a date, Memo thinks, her card comes out of Memo. Then Tom, a little quicker.
 *   3 photo    A paper letter from the Kita comes up in front of the phone; Julia photographs it (the
 *              flash is light), it flies into Memo and becomes a date plus a list item (bring a lantern).
 *   4 mail     Tom forwards the school's email to Memo (feature: soon); it becomes a date.
 *   5 context  Tom says only "dentist with Ben on Thursday"; the last visit comes up and its details
 *              fly into the new card one by one: Memo already knows them.
 *   6 memory   Julia: "remember Ben's shoe size is 24", the chip goes into Memo ("1 remembered").
 *              Thursday, Tom asks; Memo answers in a bubble.
 *   7 claim    The phone steps back and becomes the month: every date drops into its day, list items
 *              go into Memo, who sits on the calendar's top edge. Julia and Tom beside it, both voices
 *              reach Memo: people talking to a calendar.
 *
 * Built to /onboarding/motion-skill.md (02.11.2026), section 8:
 * - ONE clock. `g` is film time in seconds; beat b plays from S[b] to E[b] with a linear withTiming
 *   and then holds still. Every element is a pure function of `g` (helpers in theme/film.ts), so
 *   the film is scrubbable and identical on every run. No setTimeout, no withRepeat, no randomness.
 * - Beats move on only by a tap (Weiter or the stage). A tap during a beat lets the rest of it play
 *   out in 450 to 900 ms with a soft start and end (no jump cut), then the next beat plays.
 * - The door/phone outline is one SVG rounded-rect path (same commands at every frame, so it cannot
 *   knot); cards are SVG bodies plus content moved by transforms. No layout animation.
 * - The phone holds one list. A new card enters at the top and pushes the rest down (one critically
 *   damped spring per insert); cards that reach the bottom of the glass fade out there.
 * - Haptics only on landings (a contact, a card in place, something stored), only at normal speed.
 * - Reduced motion: the beat's end state at once.
 *
 * Storyboard (seconds from the beat's start). Text first: every beat's first action is small and
 * starts on frame 1, the main action waits for the caption.
 *   b0 0.15/0.29/0.43 notes pinned · 0.70 Memo comes in from the top right, pulled the last 30 % ·
 *      1.15 clack (haptic), the note settles 80 ms later · 1.60 eyes to the viewer · 2.10 wink · hold
 *   b1 0.80 eyes to the notes · 1.05 anticipation (door dips, handles retract) · 1.40–2.60 morph,
 *      top edge leads the bottom by 70 ms, camera pushes in · 1.52 Memo lifts off to the phone top ·
 *      1.60/1.74/1.88 notes fly on arcs, text out then card in · 2.75 seated (haptic), happy hop ·
 *      2.95 light runs along the inside of the glass · 3.00 the second phone slides out · hold
 *   b2 0.30 Memo looks to Julia · 0.45 avatar · 0.70 bubble, words light with the wave until 1.95 ·
 *      2.45 think, "?" · 3.40 bubble back, card comes out of Memo · 4.00 lands (haptic) · 4.60 looks
 *      to Tom · 4.80 avatar · 5.05 bubble · 6.10 think · 6.75 card · 7.35 lands (haptic) · hold
 *   b3 0.00 the list dims · 0.20 Julia with her phone · 0.35 the letter comes up from below · 1.60 the
 *      viewfinder closes in · 2.00 flash over the stage (haptic) · 2.40 the letter arcs into Memo ·
 *      3.15 think · 4.00 date card · 4.60 lands (haptic) · 4.85 "Laterne" item · 5.45 lands · hold
 *   b4 0.05 Tom with ↪ · 0.30 the email grows out of his side · 2.40 arcs into Memo · 3.15 think ·
 *      3.90 card · 4.50 lands (haptic) · hold
 *   b5 0.10 Tom speaks · 2.40 think · 3.00 card · 3.20 the last visit rises · 3.95/4.45/4.95 its
 *      details land in the card (mint) · 5.45 Ben's colour, the last visit goes · hold
 *   b6 0.10 Julia speaks · 2.10 the chip rises to a clear spot · 2.75–3.13 into Memo (haptic), wide
 *      eyes, hop, "1 gemerkt" · 4.00 "Thursday" · 4.30 Tom asks · 5.95 think · 6.40 the answer
 *      bubble · 6.95 lands (haptic) · hold
 *   b7 0.00 the answer goes back into Memo · 0.40–1.20 the phone steps back, Memo onto its top edge ·
 *      0.50+ cards drop into their days, list items into Memo · 0.85 the month · 1.85/2.00 Julia, Tom
 *      · 2.30/2.47 voices · 3.10 glint, happy hop (haptic) · hold (screenshot frame)
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, useAnimatedReaction, withTiming, withSequence,
  Easing, useReducedMotion, cancelAnimation, runOnJS, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Circle } from 'react-native-svg';
import Txt from '../ui/Txt';
import { Tile } from '../ui/Clay';
import LineIcon from '../ui/LineIcon';
import { MemoFace, type EyeKey } from './Memo';
import { tokens, persons, personPalette, allColors } from '../../theme';
import { isDark, nightBg, nightFg } from '../../theme/tokens';
import { tx } from '../../i18n/lang';
import { haptics } from '../../lib/haptics';
import type { ClayName } from '../../lib/clayIcons';
import { seg, mix, kf, eOut, eMove, eTail, eIn, crit, recoil, quad, rrect, rrectEdges } from '../../theme/film';

/**
 * The claim, in one place (Julian 02.11.: the calendar first, not a family assistant). The film's
 * last beat and the showcase's last chapter both read it.
 */
export const INTRO_CLAIM = () => tx('Der klügste Kalender, mit dem ihr je gesprochen habt', 'The smartest calendar you’ve ever talked to');

export const INTRO_BEATS = 8;
const W = 300;
const H = 390;
// Beat starts and ends on the film clock (s). Each beat plays once, then holds still.
const S = [0, 3.0, 7.0, 16.0, 23.5, 30.5, 39.5, 48.0];
const E = [3.0, 7.0, 16.0, 23.5, 30.5, 39.5, 48.0, 53.0];
const [S1, S2, S3, S4, S5, S6, S7] = [S[1], S[2], S[3], S[4], S[5], S[6], S[7]];
/** A tap mid-beat lets the rest play out in a quarter of its time, kept between these (ms). */
const RESOLVE = [450, 900];
// The film's family. Fixed names: before sign-up we don't know yours.
const NAME = { J: 'Julia', T: 'Tom' } as const;

// Fridge door, phone, and the card slots inside the phone (stage coordinates).
const FR = { l: 30, t: 6, r: 270, b: 384, rad: 28 };
const PH = { l: 52, t: 8, r: 248, b: 382, rad: 40 };
/** The claim: the phone steps back to this size and shows the month. */
const CPH = { l: 80, t: 84, r: 220, b: 348, rad: 30 };
const SLOT = { cx: 150, cy0: 116, pitch: 52, w: 180, h: 46 };
/** Top of the list in the phone, and the gap between cards. */
const TOP0 = SLOT.cy0 - SLOT.h / 2;
const GAP = SLOT.pitch - SLOT.h;
/** Cards fade out as their bottom edge goes from here to there (the glass ends in round corners). */
const FADE = [350, 368];
const MEMO = 128; // Memo is drawn at this size and scaled.
const BODY = 0.37; // Memo's round body: radius as a share of the art size.
/** Memo at the top of the phone (the new cards come out of it). Worklets capture it, so it is defined first. */
const M1 = { x: 150, y: 49, s: 54 };
/** The claim: Memo sits on the top edge of the calendar. */
const M3 = { x: 150, y: CPH.t, s: 84 };

/** The claim's month: November 2026 from Monday the 2nd, four weeks. A day's chip sits in its cell. */
const GRID = { l: CPH.l + 8, cw: (CPH.r - CPH.l - 16) / 7, head: 130, days: 148, top: 160, pitch: 44 };
function cellXY(day: number) {
  'worklet';
  const i = day - 2;
  const c = i % 7;
  const r = (i - c) / 7;
  return { x: GRID.l + GRID.cw * (c + 0.5), y: GRID.top + GRID.pitch * r + 29 };
}

// Plain data only: worklets read these on the UI thread.
const GEO = [
  { x: 62, y: 112, w: 112, h: 92, rot: -5, paper: '#FFF3D6', slot: 0, fly: 0, ax: 0, ay: -18 },
  { x: 154, y: 150, w: 92, h: 84, rot: 6, paper: '#FBEFE0', slot: 1, fly: 1, ax: -22, ay: 16 },
  { x: 78, y: 246, w: 132, h: 76, rot: -2, paper: '#FFF8E8', slot: 2, fly: 2, ax: -7, ay: 0 },
];
const NOTES = [
  { text: () => tx('Friseur', 'Haircut'), sub: () => tx('Mi 15 Uhr', 'Wed 3pm'), icon: 'friseur' as const },
  { text: () => tx('Milch!', 'Milk!'), sub: () => tx('und Brot', 'and bread'), icon: 'einkauf' as const },
  { text: () => tx('Oma 70!', 'Grandma 70!'), sub: () => tx('So 15 Uhr', 'Sun 3pm'), icon: 'geburtstag' as const },
];

/** The tall card of beat 5: header plus three detail lines. */
const TALL = 46 + 3 * 17 + 9;
/** Beat 5: each thing Memo knows lands in the card at these times, then Ben's colour. */
const DETAIL = [S5 + 3.95, S5 + 4.45, S5 + 4.95];
const BEN_AT = S5 + 5.45;
/** Beat 5: the last dentist visit rises from the bottom of the glass; its details fly up into the new card. */
const PAST = { a: S5 + 3.2, out: S5 + 5.45, x: 150, y: 318, w: 184, h: 58 };
/** The past card's three details: left edge and width of each, in stage coordinates. */
const PILL = [{ x: 68, w: 54 }, { x: 126, w: 66 }, { x: 196, w: 40 }];
const PILL_Y = PAST.y + 12;
/**
 * Every card Memo makes, in order: leaves Memo at `t`, lands at t + FLY in the top slot and pushes the
 * list down by its height. `side` bends the arc; `bar` is when its person's colour draws in.
 */
const FLY = 0.6;
const NEW = [
  { t: S2 + 3.4, side: -1, h: 46, bar: S2 + 4.03 },
  { t: S2 + 6.75, side: 1, h: 46, bar: S2 + 7.38 },
  { t: S3 + 4.0, side: -1, h: 46, bar: S3 + 4.63 },
  { t: S3 + 4.85, side: 1, h: 46, bar: S3 + 5.48 },
  { t: S4 + 3.9, side: 1, h: 46, bar: S4 + 4.53 },
  { t: S5 + 3.0, side: 1, h: TALL, bar: BEN_AT },
];
/** The cards below start making room this much before a new card leaves Memo. */
const LEAD = 0.12;
const landOf = (k: number) => NEW[k].t + FLY;

const BEN = allColors.find((p) => p.name === 'Sand')!;
const MIA = allColors.find((p) => p.name === 'Mint')!;
type Kind = 'card' | 'todo' | 'tall';
/** What each new card shows (JS only, never read in a worklet). */
const NEWC: { kind: Kind; icon?: ClayName; ink: string; title: () => string; sub: () => string }[] = [
  { kind: 'card', icon: 'schwimmen', ink: persons.J.ink, title: () => tx('Schwimmen', 'Swimming'), sub: () => `${tx('Sa 10:00', 'Sat 10am')} · ${NAME.J}` },
  { kind: 'card', icon: 'einkauf', ink: persons.T.ink, title: () => tx('Brot', 'Bread'), sub: () => `${tx('Einkauf', 'Shopping')} · ${NAME.T}` },
  { kind: 'card', icon: 'kita', ink: BEN.fg, title: () => tx('Laternenfest', 'Lantern walk'), sub: () => `${tx('Fr 16:00', 'Fri 4pm')} · Ben` },
  { kind: 'todo', ink: BEN.fg, title: () => tx('Laterne', 'Lantern'), sub: () => tx('Mitbringen · Fr', 'Bring along · Fri') },
  { kind: 'card', icon: 'elternabend', ink: MIA.fg, title: () => tx('Elternabend', 'Parent night'), sub: () => `${tx('Do 12.11.', 'Thu 12 Nov')} · Mia` },
  { kind: 'tall', icon: 'zahnarzt', ink: BEN.fg, title: () => tx('Zahnarzt', 'Dentist'), sub: () => `${tx('Donnerstag', 'Thursday')} · Ben` },
];
/**
 * The claim: where each card goes. A date drops into its day of the month (a chip in its person's
 * colour); a list item goes into Memo. -1 = Memo.
 */
const NOTE_DAY = [4, -1, 8];
const NEW_DAY = [7, -1, 6, -1, 12, 5];
const CHIPS = [
  { day: 4, ink: persons.J.ink, order: NEW.length + 0 },
  { day: 8, ink: tokens.done, order: NEW.length + 2 },
  { day: 7, ink: persons.J.ink, order: NEW.length - 1 },
  { day: 6, ink: BEN.fg, order: NEW.length - 3 },
  { day: 12, ink: MIA.fg, order: NEW.length - 5 },
  { day: 5, ink: BEN.fg, order: NEW.length - 6 },
];

/** Beat 3 and 4: a paper letter and an email, held up in front of the phone, then taken in by Memo. */
const PAPERS = [
  // The letter comes up from below the phone, as paper in the room, and is photographed there.
  { a: S3 + 0.35, from: [150, 360, 7], s0: 0.96, at: [150, 288, 4], out: S3 + 2.4, ctl: [40, 40], w: 150, h: 182, spin: -1 },
  // The email comes from Tom's side, forwarded: small at his avatar, then held up to be read.
  { a: S4 + 0.3, from: [272, 334, 10], s0: 0.25, at: [150, 214, -2], out: S4 + 2.4, ctl: [286, 70], w: 176, h: 128, spin: 1 },
];
const FLASH = S3 + 2.0;
/** Beat 6: the memory chip leaves Julia's bubble, is held up, then goes into Memo (380 ms). */
const CHIP = { a: S6 + 2.1, fly: S6 + 2.75, land: S6 + 3.13, x: 116, y: 318, hx: 150, hy: 196 };
/** Beat 6: a few days later. */
const DAY = { a: S6 + 4.0, out: S6 + 5.3 };
/** Beat 6: Memo's answer, a bubble to Tom. It goes back into Memo when the claim begins. */
const REPLY = { a: S6 + 6.4, land: S6 + 6.95, x: 146, y: 232, w: 186 };

/** Thinking: from the eye key `a` until the card (or answer) leaves Memo at `b`. */
const THINK = [
  { a: S2 + 2.45, b: NEW[0].t }, { a: S2 + 6.1, b: NEW[1].t }, { a: S3 + 3.15, b: NEW[2].t },
  { a: S4 + 3.15, b: NEW[4].t }, { a: S5 + 2.4, b: NEW[5].t }, { a: S6 + 5.95, b: REPLY.a },
];

// Memo's eyes over the whole film: curious → attentive → listening, thinking, glad → proud and calm.
const EYES: EyeKey[] = [
  { t: 1.6, e: 'open' }, { t: 2.1, e: 'wink', direct: true }, { t: 2.62, e: 'open', direct: true },
  { t: S1 + 0.8, e: 'wide' }, { t: S1 + 2.75, e: 'happy' }, { t: S1 + 3.4, e: 'open' },
  { t: S2 + 0.3, e: 'left' }, { t: S2 + 2.45, e: 'think' }, { t: landOf(0), e: 'happy' },
  { t: S2 + 4.6, e: 'right' }, { t: S2 + 6.1, e: 'think' }, { t: landOf(1), e: 'happy' }, { t: S2 + 8.0, e: 'open' },
  { t: S3 + 0.45, e: 'wide' }, { t: S3 + 3.15, e: 'think' }, { t: landOf(2), e: 'happy' }, { t: S3 + 6.6, e: 'open' },
  { t: S4 + 0.5, e: 'right' }, { t: S4 + 1.2, e: 'wide' }, { t: S4 + 3.15, e: 'think' }, { t: landOf(4), e: 'happy' }, { t: S4 + 5.6, e: 'open' },
  { t: S5 + 0.05, e: 'right' }, { t: S5 + 2.4, e: 'think' }, { t: landOf(5), e: 'happy' }, { t: S5 + 4.25, e: 'open' },
  { t: S6 + 0.05, e: 'left' }, { t: CHIP.land, e: 'wide' }, { t: CHIP.land + 0.4, e: 'happy' }, { t: S6 + 4.3, e: 'right' },
  { t: S6 + 5.95, e: 'think' }, { t: REPLY.land, e: 'happy' }, { t: S6 + 7.9, e: 'open' },
  { t: S7 + 0.4, e: 'wide' }, { t: S7 + 1.4, e: 'open' }, { t: S7 + 3.1, e: 'happy' }, { t: S7 + 4.05, e: 'open' },
];
/** Memo's head follows the eyes 60 ms later: one damped spring per change (tilt r°, shift x pt). */
const LOOKS = [
  { t: S2 + 0.36, r: -10, x: -5, w: 13 }, { t: S2 + 2.51, r: 6, x: 0, w: 13 }, { t: landOf(0), r: 4, x: 5, w: 15 },
  { t: S2 + 4.66, r: 10, x: 5, w: 13 }, { t: S2 + 6.16, r: -6, x: 0, w: 13 }, { t: landOf(1), r: -4, x: -5, w: 15 },
  { t: S3 + 0.51, r: -4, x: 0, w: 13 }, { t: S3 + 3.1, r: 4, x: 0, w: 15 },
  { t: S4 + 0.56, r: 8, x: 4, w: 13 }, { t: S4 + 1.26, r: -6, x: -3, w: 13 }, { t: S4 + 3.1, r: -2, x: -1, w: 15 },
  { t: S5 + 0.11, r: 10, x: 5, w: 13 }, { t: S5 + 2.46, r: -6, x: 0, w: 13 }, { t: landOf(5), r: -4, x: -5, w: 15 },
  { t: S6 + 0.11, r: -10, x: -5, w: 13 }, { t: CHIP.land, r: 10, x: 5, w: 15 },
  { t: S6 + 4.36, r: 10, x: 5, w: 13 }, { t: S6 + 6.01, r: -6, x: 0, w: 13 }, { t: REPLY.land, r: 4, x: 3, w: 15 },
  { t: S7 + 0.46, r: -8, x: -3, w: 13 },
];
/** Something lands in Memo (the letter, the email) or Memo lands: hard and heavy, one rebound. */
const TAKES = [{ t: 1.15, a: 0.09 }, { t: S3 + 3.1, a: 0.05 }, { t: S4 + 3.1, a: 0.05 }, { t: S7 + 1.2, a: 0.06 }];
const PEAK = S7 + 3.1;
const HOPS = [{ t: S1 + 2.75, h: 7, d: 0.3 }, { t: CHIP.land + 0.16, h: 6, d: 0.28 }, { t: PEAK, h: 10, d: 0.32 }];

// Haptics only on landings: a contact, a card in place, something stored, the shutter.
const HITS = [
  { t: 1.15, k: 0 }, { t: S1 + 2.75, k: 0 }, { t: landOf(0), k: 1 }, { t: landOf(1), k: 1 },
  { t: FLASH, k: 0 }, { t: landOf(2), k: 1 }, { t: landOf(3), k: 0 }, { t: landOf(4), k: 1 }, { t: landOf(5), k: 1 },
  { t: CHIP.land, k: 0 }, { t: REPLY.land, k: 1 }, { t: PEAK, k: 1 },
];
const buzz = (k: number) => (k ? haptics.success() : haptics.tap());

const AP = Animated.createAnimatedComponent(Path);
const AC = Animated.createAnimatedComponent(Circle);

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

  // Camera: push in when the door becomes the phone, then on each new beat's subject (it stays where
  // it is: the push scales about that point), pulled back at the seam.
  const camera = useAnimatedStyle((): any => {
    const v = g.value;
    let s = 1 + 0.04 * eTail(seg(v, S1 + 1.4, S1 + 2.8)) - 0.04 * eMove(seg(v, S7 + 0.4, S7 + 1.2));
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < PUSH.length; i++) {
      const P = PUSH[i];
      const p = P.k * eTail(seg(v, P.a, P.a + 1.2)) * (1 - eMove(seg(v, P.b, P.b + 0.6)));
      s += p;
      dx -= p * (P.fx - W / 2);
      dy -= p * (P.fy - H / 2);
    }
    return { transform: [{ translateX: dx }, { translateY: dy }, { scale: s }] };
  });

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, camera]}>
        <Ghost g={g} />
        <Door g={g} />
        {GEO.map((_, i) => <NoteCard key={i} i={i} g={g} />)}
        {NEW.map((_, k) => <NewCard key={k} k={k} g={g} reduced={!!reduced} />)}
        <Month g={g} />
        <Glass g={g} />
        <Speech who="J" g={g} t={S2 + 0.45} text={tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming')} words={[S2 + 0.75, S2 + 1.95]} back={NEW[0].t} out={NEW[0].t + 0.2} />
        <Speech who="T" g={g} t={S2 + 4.8} text={tx('Brot noch auf die Liste', 'Add bread to the list')} words={[S2 + 5.1, S2 + 6.1]} back={NEW[1].t} out={NEW[1].t + 0.2} />
        <Past g={g} />
        <Scrim g={g} />
        <Speech who="J" g={g} t={S3 + 0.2} out={S3 + 2.7} prop="cam" />
        <Speech who="T" g={g} t={S4 + 0.05} out={S4 + 2.7} prop="fwd" />
        <Viewfinder g={g} />
        <Paper i={0} g={g} />
        <Paper i={1} g={g} />
        <Speech who="T" g={g} t={S5 + 0.1} text={tx('Zahnarzt mit Ben nächsten Donnerstag', 'Dentist with Ben next Thursday')} words={[S5 + 0.45, S5 + 2.05]} back={NEW[5].t} out={NEW[5].t + 0.2} />
        <Speech who="J" g={g} t={S6 + 0.1} text={tx('Merk dir: Bens Schuhgröße ist 24', 'Remember: Ben’s shoe size is 24')} words={[S6 + 0.45, S6 + 2.0]} back={CHIP.a} out={CHIP.a + 0.3} />
        <Speech who="T" g={g} t={S6 + 4.3} text={tx('Welche Schuhgröße hat Ben?', 'What’s Ben’s shoe size?')} words={[S6 + 4.85, S6 + 5.8]} back={S6 + 5.95} out={S7 + 0.05} />
        <Tokens g={g} />
        <Reply g={g} />
        <Chip g={g} />
        <Badges g={g} />
        <Claim g={g} />
        <MemoActor g={g} />
        <Flash g={g} />
      </Animated.View>
    </View>
  );
}

/** Camera pushes on each new beat's subject: from a, held until b (s), scale by k about (fx, fy). */
const PUSH = [
  { a: S3 + 0.35, b: S3 + 2.3, fx: 150, fy: 280, k: 0.1 },
  { a: S4 + 0.4, b: S4 + 2.35, fx: 150, fy: 214, k: 0.1 },
  { a: S5 + 3.1, b: S6 - 0.3, fx: 150, fy: 205, k: 0.12 },
  { a: S6 + 1.9, b: S6 + 3.05, fx: 150, fy: 170, k: 0.08 },
  { a: S6 + 6.3, b: S7, fx: 150, fy: 236, k: 0.1 },
];

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

/** The claim: the phone steps back and becomes the month (0 → 1). */
function closing(v: number) {
  'worklet';
  return eMove(seg(v, S7 + 0.4, S7 + 1.2));
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
  // The claim: the phone steps back to a smaller calendar (same path, so no knot). It stays.
  const z = closing(v);
  L = mix(L, CPH.l, z);
  R = mix(R, CPH.r, z);
  T = mix(T, CPH.t, z);
  B = mix(B, CPH.b, z);
  rad = mix(rad, CPH.rad, z);
  return { d: rrectEdges(L, T, R, B, rad), pT, pm, gone: 1 };
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
  const notch = useAnimatedStyle(() => ({ opacity: seg(g.value - S1, 2.25, 2.65) * (1 - seg(g.value, S7 + 0.3, S7 + 0.5)) }));
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
    // A little smaller and further back, so its whole outline stays inside the stage.
    return { d: rrectEdges(PH.l + 30 * k, PH.t + 12 * k, PH.r + 22 * k, PH.b - 12 * k, PH.rad - 4 * k), opacity: k > 0 ? 1 : 0 } as any;
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

/* ─── The list in the phone ────────────────────────────────────────────────────────────────── */

/** A card's height now: the tall card of beat 5 starts as a plain card and grows by one line per detail. */
function hOf(v: number, j: number) {
  'worklet';
  if (j !== 5) return NEW[j].h;
  // Each line opens as its detail leaves the past card, so the place is free when it lands.
  let h = SLOT.h + 9 * crit(v - (DETAIL[0] - 0.4), 15);
  for (let i = 0; i < DETAIL.length; i++) h += 17 * crit(v - (DETAIL[i] - 0.4), 15);
  return h;
}

/**
 * How far the new cards after `from` have pushed a card down: each insert is one critically damped
 * spring, the card `between` places below the new one moving 40 ms later per place.
 */
function pushedBy(v: number, from: number, between: number) {
  'worklet';
  let y = 0;
  for (let j = from; j < NEW.length; j++) {
    const n = NEW[j];
    y += (hOf(v, j) + GAP) * crit(v - (n.t - LEAD + 0.04 * Math.min(6, between + j - from)), 13);
  }
  return y;
}

/** A card fades out as it reaches the round bottom of the glass. */
function fadeBottom(top: number, h: number) {
  'worklet';
  return 1 - seg(top + h, FADE[0], FADE[1]);
}

/**
 * The claim: the cards leave the list one by one from the top, 100 ms apart. A date drops into its
 * day of the month and becomes a chip there; a list item goes into Memo. Returns where it goes.
 */
function folded(v: number, order: number, day: number) {
  'worklet';
  const a = S7 + 0.5 + 0.1 * order;
  const z = eMove(seg(v, a, a + 0.55));
  if (day < 0) return { z, x: M1.x, y: mix(M1.y, M3.y, eMove(seg(v, S7 + 0.5, S7 + 1.2))), w: 0.2, h: 0.2, cell: 0 };
  const c = cellXY(day);
  return { z, x: c.x, y: c.y, w: 14, h: 6, cell: 1 };
}

/** Morph a card (cx, cy, w, h) towards where the claim sends it. */
function fold(cx: number, cy: number, w: number, h: number, f: { z: number; x: number; y: number; w: number; h: number; cell: number }) {
  'worklet';
  const z = f.z;
  return {
    cx: mix(cx, f.x, z),
    cy: mix(cy, f.y, z) - 18 * f.cell * Math.sin(Math.PI * z),
    w: mix(w, f.cell ? f.w : w * f.w, z),
    h: mix(h, f.cell ? f.h : h * f.h, z),
    // A card in a day hands over to its chip as it lands.
    gone: 1 - seg(z, f.cell ? 0.75 : 0.8, 1),
    ct: 1 - seg(z, 0, 0.35),
  };
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
  const top = TOP0 + SLOT.pitch * n.slot + pushedBy(v, 0, n.slot);
  const scy = top + SLOT.h / 2;
  let cx = mix(ncx, SLOT.cx, p) + n.ax * lift;
  let cy = mix(ncy + rise, scy, p) + n.ay * lift;
  let w = mix(n.w, SLOT.w, p);
  let h = mix(n.h, SLOT.h, p);
  rot = rot * (1 - crit(v - fs, 9));
  // The claim: into its day, or into Memo.
  const f = folded(v, NEW.length + n.slot, NOTE_DAY[i]);
  const F = fold(cx, cy, w, h, f);
  const gone = F.gone * fadeBottom(top, SLOT.h);
  o *= gone;
  return { cx: F.cx, cy: F.cy, w: F.w, h: F.h, r: Math.min(mix(3, 14, p), F.h / 2), rot, o, lin, p, lift, ncx, ncy, gone, ct: F.ct };
}

function newGeo(v: number, k: number) {
  'worklet';
  const nw = NEW[k];
  const lin = seg(v, nw.t, nw.t + FLY);
  const p = eMove(lin);
  // Out of Memo's centre at 20 % size (narrower than Memo's body, so nothing blank sticks out), down into the top slot on a slight arc.
  const top = TOP0 + pushedBy(v, k + 1, 0);
  const nh = hOf(v, k);
  const cx0 = quad(M1.x, M1.x + nw.side * 34, SLOT.cx, p);
  const cy0 = quad(M1.y, M1.y + 40, top + nh / 2, p);
  // The claim: into its day or into Memo, the newest (top) first.
  const F = fold(cx0, cy0, mix(SLOT.w * 0.2, SLOT.w, p), mix(nh * 0.2, nh, p), folded(v, NEW.length - 1 - k, NEW_DAY[k]));
  const { cx, cy, w, h } = F;
  const gone = F.gone * fadeBottom(top, nh);
  return {
    cx, cy, w, h, nh, ct: F.ct,
    r: Math.min(mix(10, 14, p), h / 2),
    rot: nw.side * 4 * (1 - p),
    // Drawn under Memo: it is born inside Memo's body and comes out of it, card and content together.
    o: seg(lin, 0.02, 0.14) * gone,
    lin, p: 1, lift: Math.sin(Math.PI * p), gone,
  };
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
      opacity: seg(c.lin, 0.55, 1) * c.gone * c.ct,
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
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, height: SLOT.h, paddingLeft: 12, paddingRight: 12 };

/** A card Memo just made: leaves Memo, lands in the top slot, its person's colour draws in. */
function NewCard({ k, g, reduced }: { k: number; g: SharedValue<number>; reduced: boolean }) {
  const c0 = NEWC[k];
  const h = NEW[k].h;
  const land = landOf(k);
  const barAt = NEW[k].bar;
  const [lit, setLit] = useState(false);
  useAnimatedReaction(() => g.value >= land + 0.03 && g.value < S7 + 0.4, (v, was) => { if (v !== was) runOnJS(setLit)(v && !reduced); });
  const content = useAnimatedStyle((): any => {
    const c = newGeo(g.value, k);
    return {
      opacity: seg(c.lin, 0.06, 0.3) * c.gone * c.ct,
      // The content box is as tall as the card can get and hangs from the card's top edge.
      transform: [{ translateX: c.cx - SLOT.cx }, { translateY: c.cy + ((h - c.nh) * c.w) / SLOT.w / 2 - (TOP0 + h / 2) }, { rotate: `${c.rot}deg` }, { scale: c.w / SLOT.w }],
    };
  });
  const bar = useAnimatedProps(() => {
    const c = newGeo(g.value, k);
    const b = eOut(seg(g.value, barAt, barAt + 0.14));
    const bw = 4 * b * c.ct;
    return { d: rrect(c.cx - c.w / 2 + 5 + bw / 2, c.cy, Math.max(0.01, bw), c.h - 18, 2, 0), opacity: b > 0 ? c.gone : 0 } as any;
  });
  return (
    <>
      <CardBody g={g} geoKind="new" i={k} fill0={tokens.row} fill1={tokens.row} />
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <AP animatedProps={bar} fill={nightFg(c0.ink)} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: SLOT.cx - SLOT.w / 2, top: TOP0, width: SLOT.w, height: h }, content]}>
        {c0.kind === 'card' ? (
          <View style={row}>
            <Tile name={c0.icon!} size={32} radius={10} celebrate={lit} />
            <View style={{ flex: 1 }}>
              <Txt size={13} line={16} weight={700} numberOfLines={1}>{c0.title()}</Txt>
              <Txt size={11} line={14} color={nightFg(c0.ink)} numberOfLines={1}>{c0.sub()}</Txt>
            </View>
            <Txt size={12} weight={700} color={tokens.done}>✓</Txt>
          </View>
        ) : c0.kind === 'todo' ? (
          <View style={row}>
            {/* A list item: an open circle to tick, not a date. */}
            <View style={{ width: 32, alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tokens.hair }} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={13} line={16} weight={700} numberOfLines={1}>{c0.title()}</Txt>
              <Txt size={11} line={14} color={nightFg(c0.ink)} numberOfLines={1}>{c0.sub()}</Txt>
            </View>
          </View>
        ) : (
          <TallContent g={g} c0={c0} lit={lit} />
        )}
      </Animated.View>
    </>
  );
}

/** Beat 5: what Tom said on top; under it, what Memo already knows, one line after the other. */
function TallContent({ g, c0, lit }: { g: SharedValue<number>; c0: (typeof NEWC)[number]; lit: boolean }) {
  // Ben's colour arrives last: the line under the title takes his colour as his bar draws in.
  const own = useAnimatedStyle(() => ({ opacity: seg(g.value, BEN_AT, BEN_AT + 0.2) }));
  const plain = useAnimatedStyle(() => ({ opacity: 1 - seg(g.value, BEN_AT, BEN_AT + 0.2) }));
  const lines: { icon: 'pin' | 'clock' | null; text: string; strong?: boolean }[] = [
    { icon: 'pin', text: 'Dr. Weber', strong: true },
    { icon: null, text: tx('Hauptstr. 12', 'Hauptstr. 12') },
    { icon: 'clock', text: tx('15:00, wie letztes Mal', '3pm, like last time'), strong: true },
  ];
  return (
    <View>
      <View style={row}>
        <Tile name={c0.icon!} size={32} radius={10} celebrate={lit} />
        <View style={{ flex: 1 }}>
          <Txt size={13} line={16} weight={700} numberOfLines={1}>{c0.title()}</Txt>
          <View>
            <Animated.View style={plain}><Txt size={11} line={14} color={tokens.sub} numberOfLines={1}>{c0.sub()}</Txt></Animated.View>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0 }, own]}><Txt size={11} line={14} color={nightFg(c0.ink)} numberOfLines={1}>{c0.sub()}</Txt></Animated.View>
          </View>
        </View>
        <Txt size={12} weight={700} color={tokens.done}>✓</Txt>
      </View>
      <View style={{ paddingLeft: 21, paddingRight: 10, marginTop: -2 }}>
        {lines.map((l, i) => <Detail key={i} g={g} at={DETAIL[i]} {...l} />)}
      </View>
    </View>
  );
}

function Detail({ g, at, icon, text, strong }: { g: SharedValue<number>; at: number; icon: 'pin' | 'clock' | null; text: string; strong?: boolean }) {
  // The line appears as its detail lands from the past card, and glows mint for a moment.
  const st = useAnimatedStyle(() => ({ opacity: seg(g.value, at - 0.06, at + 0.08) }));
  const glow = useAnimatedStyle(() => ({ opacity: 0.9 * seg(g.value, at - 0.06, at + 0.04) * (1 - seg(g.value, at + 0.35, at + 1.0)) }));
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 17 }, st]}>
      <Animated.View style={[{ position: 'absolute', left: -4, top: 0, bottom: 0, right: 8, borderRadius: 6, backgroundColor: nightBg('#DDF0EA') }, glow]} />
      <View style={{ width: 13, alignItems: 'center' }}>{icon ? <LineIcon name={icon} size={13} color={tokens.sub} stroke={2} /> : null}</View>
      <Txt size={11} line={15} weight={strong ? 600 : 400} color={strong ? tokens.ink : tokens.sub} numberOfLines={1}>{text}</Txt>
    </Animated.View>
  );
}

/* ─── Beats 3 and 4: a letter and an email ─────────────────────────────────────────────────── */

/** Comes in (the letter from below, the email from Tom), is held still to be read, then arcs into Memo. */
function paperGeo(v: number, i: number) {
  'worklet';
  const P = PAPERS[i];
  const pin = eOut(seg(v, P.a, P.a + 0.75));
  // The email travels on a slight arc from Tom's avatar; the letter rises straight up.
  const arc = i ? -30 * Math.sin(Math.PI * pin) : 0;
  let x = mix(P.from[0], P.at[0], pin);
  let y = mix(P.from[1], P.at[1], pin) + arc;
  let rot = mix(P.from[2], P.at[2], pin);
  let s = mix(P.s0, 1, pin);
  let o = seg(v, P.a, P.a + 0.12);
  const k = seg(v, P.out, P.out + 0.7);
  const q = eMove(k);
  // Up and over to the side of the list, not across it, and only then small.
  x = quad(x, P.ctl[0], M1.x, q);
  y = quad(y, P.ctl[1], M1.y, q) - 24 * Math.sin(Math.PI * q);
  s *= mix(1, 0.1, eMove(seg(k, 0.1, 1)));
  rot += P.spin * 12 * q;
  o *= 1 - seg(k, 0.85, 1);
  return { x, y, rot, s, o };
}

function Paper({ i, g }: { i: number; g: SharedValue<number> }) {
  const P = PAPERS[i];
  const st = useAnimatedStyle((): any => {
    const c = paperGeo(g.value, i);
    return {
      opacity: c.o,
      transform: [{ translateX: c.x - P.at[0] }, { translateY: c.y - P.at[1] }, { rotate: `${c.rot}deg` }, { scale: c.s }],
    };
  });
  const frame = {
    position: 'absolute' as const, left: P.at[0] - P.w / 2, top: P.at[1] - P.h / 2, width: P.w, height: P.h,
    shadowColor: '#16232A', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  };
  if (i === 0) {
    // The letter from the Kita: the three things that matter in bold, the rest is just a letter.
    return (
      <Animated.View style={[frame, { backgroundColor: nightBg('#FFFDF8'), borderRadius: 3, paddingHorizontal: 13, paddingTop: 13, gap: 5 }, st] as any}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Tile name="kita" size={18} radius={5} />
          <Txt size={10} line={13} weight={600} color={tokens.sub} numberOfLines={1}>{tx('Kita Sonnenblume', 'Sunflower Nursery')}</Txt>
        </View>
        <Txt size={10} line={13} color={tokens.sub} style={{ marginTop: 3 }}>{tx('Liebe Eltern,', 'Dear parents,')}</Txt>
        <Txt size={17} line={21} weight={700} numberOfLines={1}>{tx('Laternenfest', 'Lantern walk')}</Txt>
        <Txt size={13} line={17} weight={600} numberOfLines={1}>{tx('Freitag, 16 Uhr', 'Friday, 4pm')}</Txt>
        <Txt size={11} line={15} color={tokens.ink} numberOfLines={2}>{tx('Bitte eine Laterne mitbringen.', 'Please bring a lantern.')}</Txt>
        <View style={{ gap: 5, marginTop: 3 }}>
          {[0.92, 0.78, 0.55].map((w, j) => <View key={j} style={{ height: 4, width: `${w * 100}%`, borderRadius: 2, backgroundColor: tokens.hair }} />)}
        </View>
      </Animated.View>
    );
  }
  // The forwarded email: an envelope, forwarded to Memo's address, stamped "soon" (not built yet).
  return (
    <Animated.View style={[frame, { backgroundColor: nightBg('#EAF0F6'), borderRadius: 14, borderWidth: 1, borderColor: nightBg('#D3DEEA'), overflow: 'visible' }, st] as any}>
      <Svg width={P.w} height={P.h} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Path d={`M10 10L${P.w / 2} ${P.h * 0.36}L${P.w - 10} 10`} fill="none" stroke={nightFg('#9FB3C8')} strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
      <View style={{ position: 'absolute', right: -8, top: -10, transform: [{ rotate: '8deg' }], paddingHorizontal: 7, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: nightFg(BEN.fg), backgroundColor: nightBg(BEN.bg), justifyContent: 'center' }}>
        <Txt size={10} line={13} weight={700} color={nightFg(BEN.fg)}>{tx('BALD', 'SOON')}</Txt>
      </View>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 11, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Txt size={13} line={15} weight={700} color={tokens.done}>↪</Txt>
          <Txt size={10} line={13} weight={600} color={tokens.done} numberOfLines={1}>{tx('An: memo@…', 'To: memo@…')}</Txt>
        </View>
        <Txt size={10} line={13} color={tokens.sub} numberOfLines={1}>{tx('Von: Schule', 'From: School')}</Txt>
        <Txt size={13} line={17} weight={700} numberOfLines={1}>{tx('WG: Elternabend 12.11.', 'Fwd: Parent night')}</Txt>
      </View>
    </Animated.View>
  );
}

/**
 * Windows (s) in which the list steps back, so the new thing is the one thing to read: the letter
 * (the list dims first, then the letter comes), the email, Julia's memory, Memo's answer.
 */
const FOCUS = [[S3, S3 + 2.85], [S4, S4 + 2.85], [S6 + 1.9, S6 + 3.0], [S6 + 6.1, S7 + 0.25]];
function Scrim({ g }: { g: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const v = g.value;
    let o = 0;
    for (let i = 0; i < FOCUS.length; i++) {
      const F = FOCUS[i];
      o = Math.max(o, seg(v, F[0], F[0] + 0.25) * (1 - seg(v, F[1], F[1] + 0.4)));
    }
    return { opacity: 0.75 * o } as any;
  });
  return (
    <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <AP animatedProps={props} d={rrectEdges(PH.l + 1.5, PH.t + 1.5, PH.r - 1.5, PH.b - 1.5, PH.rad - 1.5)} fill={tokens.bg} />
    </Svg>
  );
}

/** Beat 3: corner marks close in on the letter like a camera's frame, press once, and leave. */
function Viewfinder({ g }: { g: SharedValue<number> }) {
  const P = PAPERS[0];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  return (
    <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      {corners.map(([sx, sy], j) => <Corner key={j} g={g} sx={sx} sy={sy} cx={P.at[0]} cy={P.at[1]} hw={P.w / 2 + 4} hh={P.h / 2 + 4} />)}
    </Svg>
  );
}

function Corner({ g, sx, sy, cx, cy, hw, hh }: { g: SharedValue<number>; sx: number; sy: number; cx: number; cy: number; hw: number; hh: number }) {
  const props = useAnimatedProps(() => {
    const v = g.value - S3;
    const press = Math.sin(Math.PI * seg(v, 1.9, 2.06));
    const d = mix(26, 6, eOut(seg(v, 1.6, 1.95))) - 4 * press;
    const x = cx + sx * (hw + d);
    const y = cy + sy * (hh + d);
    const L = 18;
    return {
      d: `M${x - sx * L} ${y}L${x} ${y}L${x} ${y - sy * L}`,
      opacity: seg(v, 1.6, 1.72) * (1 - seg(v, 2.25, 2.45)),
    } as any;
  });
  return <AP animatedProps={props} fill="none" stroke={tokens.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />;
}

/** The shutter as light: the whole stage goes white for a moment (80 ms up, 220 ms exponential out). */
function Flash({ g }: { g: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const a = g.value - FLASH;
    const o = a < 0 ? 0 : a < 0.08 ? a / 0.08 : a > 0.3 ? 0 : Math.exp(-14 * (a - 0.08));
    return { opacity: 0.9 * o };
  });
  return <Animated.View style={[{ position: 'absolute', left: -40, top: -20, width: W + 80, height: H + 40, backgroundColor: '#FFFFFF' }, st]} />;
}

/* ─── Beat 5: what Memo already knows ──────────────────────────────────────────────────────── */

const PILLS = () => ['Dr. Weber', 'Hauptstr. 12', tx('15:00', '3pm')];

/** The last dentist visit, faded, from the bottom of the glass: the source of what Memo fills in. */
function Past({ g }: { g: SharedValue<number> }) {
  const st = useAnimatedStyle((): any => {
    const v = g.value;
    const up = eOut(seg(v, PAST.a, PAST.a + 0.5));
    const out = eIn(seg(v, PAST.out, PAST.out + 0.4));
    return { opacity: seg(v, PAST.a, PAST.a + 0.2) * (1 - out), transform: [{ translateY: 26 * (1 - up) + 14 * out }] };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', left: PAST.x - PAST.w / 2, top: PAST.y - PAST.h / 2, width: PAST.w, height: PAST.h, borderRadius: 12,
      backgroundColor: nightBg('#EFEEEA'), borderWidth: 1, borderColor: tokens.hair, borderStyle: 'dashed', paddingHorizontal: 10, paddingTop: 7,
    } as any, st]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <LineIcon name="clock" size={11} color={tokens.sub} stroke={2} />
        <Txt size={10} line={13} weight={600} color={tokens.sub} numberOfLines={1}>{`${tx('Letztes Mal', 'Last time')} · ${tx('Zahnarzt', 'Dentist')} · 14.05.`}</Txt>
      </View>
      {/* The three details sit where the flying copies start; they empty out as those leave. */}
      {PILLS().map((t, i) => <PastPill key={i} g={g} i={i} text={t} />)}
    </Animated.View>
  );
}

function PastPill({ g, i, text }: { g: SharedValue<number>; i: number; text: string }) {
  const st = useAnimatedStyle(() => ({ opacity: 1 - 0.75 * seg(g.value, DETAIL[i] - 0.42, DETAIL[i] - 0.3) }));
  return (
    <Animated.View style={[{ position: 'absolute', left: PILL[i].x - (PAST.x - PAST.w / 2), top: PILL_Y - 8 - (PAST.y - PAST.h / 2), width: PILL[i].w, height: 16, borderRadius: 8, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center' }, st]}>
      <Txt size={10} line={13} weight={600} color={tokens.sub} numberOfLines={1}>{text}</Txt>
    </Animated.View>
  );
}

/** Each detail flies from the past card into its line of the new card, on a small arc. */
function Tokens({ g }: { g: SharedValue<number> }) {
  return <>{PILLS().map((t, i) => <Token key={i} g={g} i={i} text={t} />)}</>;
}

function Token({ g, i, text }: { g: SharedValue<number>; i: number; text: string }) {
  // Target: the start of detail line i in the tall card (left edge of its text).
  const tx0 = SLOT.cx - SLOT.w / 2 + 21 + 13 + 5 - 4;
  const ty0 = TOP0 + 44 + 17 * i + 8.5;
  const st = useAnimatedStyle((): any => {
    const v = g.value;
    const k = seg(v, DETAIL[i] - 0.42, DETAIL[i]);
    const q = eMove(k);
    const x = quad(PILL[i].x, PILL[i].x - 30, tx0, q);
    const y = quad(PILL_Y, (PILL_Y + ty0) / 2, ty0, q);
    return {
      opacity: k > 0 && k < 1 ? seg(k, 0, 0.1) * (1 - seg(k, 0.85, 1)) : 0,
      transform: [{ translateX: x - PILL[i].x }, { translateY: y - PILL_Y }, { scale: 1 + 0.12 * Math.sin(Math.PI * q) }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: PILL[i].x, top: PILL_Y - 8, width: PILL[i].w, height: 16, borderRadius: 8, backgroundColor: nightBg('#DDF0EA'), alignItems: 'center', justifyContent: 'center', shadowColor: '#16232A', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } } as any, st]}>
      <Txt size={10} line={13} weight={700} numberOfLines={1}>{text}</Txt>
    </Animated.View>
  );
}

/* ─── Beat 6: a memory ─────────────────────────────────────────────────────────────────────── */

/** What Julia said, as a chip: rises out of her bubble to a clear spot, is held, then arcs into Memo. */
function Chip({ g }: { g: SharedValue<number> }) {
  const st = useAnimatedStyle((): any => {
    const v = g.value;
    const up = eOut(seg(v, CHIP.a, CHIP.a + 0.45));
    const k = seg(v, CHIP.fly, CHIP.land);
    const q = eOut(k);
    const x0 = mix(CHIP.x, CHIP.hx, up);
    const y0 = mix(CHIP.y, CHIP.hy, up);
    const x = quad(x0, 70, M1.x, q);
    const y = quad(y0, 70, M1.y, q);
    const s = mix(0.7, 1, up) * mix(1, 0.14, q);
    const o = seg(v, CHIP.a, CHIP.a + 0.1) * (1 - seg(k, 0.85, 1));
    return { opacity: o, transform: [{ translateX: x - CHIP.hx }, { translateY: y - CHIP.hy }, { scale: s }] };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', left: CHIP.hx - 88, top: CHIP.hy - 20, width: 176, height: 40, borderRadius: 20,
      // Memo's mint, like its answer later: what goes in is what comes back.
      backgroundColor: nightBg('#E2EEEC'), borderWidth: 1, borderColor: tokens.hair, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 7,
      shadowColor: '#16232A', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    } as any, st]}>
      <Tile name="fussabdruck" size={26} radius={13} />
      <Txt size={13} line={16} weight={700} numberOfLines={1}>{tx('Ben · Schuhgröße 24', 'Ben · shoe size 24')}</Txt>
    </Animated.View>
  );
}

/** Next to Memo: "1 remembered" once the memory is in; under Memo: a few days later. */
function Badges({ g }: { g: SharedValue<number> }) {
  const mem = useAnimatedStyle((): any => {
    const v = g.value;
    const p = crit(v - (CHIP.land + 0.12), 18);
    return { opacity: seg(v, CHIP.land + 0.12, CHIP.land + 0.22) * (1 - seg(v, S7 + 0.2, S7 + 0.4)), transform: [{ scale: 0.6 + 0.4 * p }] };
  });
  const day = useAnimatedStyle((): any => {
    const v = g.value;
    const k = eOut(seg(v, DAY.a, DAY.a + 0.6));
    return { opacity: seg(v, DAY.a, DAY.a + 0.2) * (1 - seg(v, DAY.out, DAY.out + 0.3)), transform: [{ translateX: 30 * (1 - k) }] };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', right: W - (M1.x - 26), top: M1.y - 9, height: 18, paddingHorizontal: 7, borderRadius: 9, backgroundColor: nightBg('#DDF0EA'), flexDirection: 'row', alignItems: 'center', gap: 4, transformOrigin: 'right center' } as any, mem]}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.done }} />
        <Txt size={10} line={13} weight={700} color={tokens.done} numberOfLines={1}>{tx('1 gemerkt', '1 remembered')}</Txt>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: M1.x - 50, width: 100, top: M1.y + 25, height: 18, borderRadius: 9, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }, day]}>
        <Txt size={10} line={13} weight={700} color={tokens.sub}>{tx('Donnerstag', 'Thursday')}</Txt>
      </Animated.View>
    </>
  );
}

/** Memo's answer to Tom: a bubble out of Memo with its tail to Tom; back into Memo at the claim. */
function Reply({ g }: { g: SharedValue<number> }) {
  const st = useAnimatedStyle((): any => {
    const v = g.value;
    const k = seg(v, REPLY.a, REPLY.land);
    const q = eMove(k);
    const z = eIn(seg(v, S7, S7 + 0.4));
    let x = quad(M1.x, 200, REPLY.x, q);
    let y = quad(M1.y, 110, REPLY.y, q);
    let s = mix(0.15, 1, q) * (1 + 0.04 * crit(v - REPLY.land, 18) * (1 - crit(v - REPLY.land - 0.1, 18)));
    x = mix(x, M1.x, z);
    y = mix(y, M1.y, z);
    s *= 1 - 0.88 * z;
    return { opacity: seg(k, 0.02, 0.15) * (1 - seg(z, 0.8, 1)), transform: [{ translateX: x - REPLY.x }, { translateY: y - REPLY.y }, { scale: s }] };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', left: REPLY.x - REPLY.w / 2, top: REPLY.y - 30, width: REPLY.w, minHeight: 60, borderRadius: 18, borderBottomRightRadius: 5,
      backgroundColor: nightBg('#E2EEEC'), borderWidth: 1, borderColor: tokens.hair, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center',
      shadowColor: '#16232A', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    } as any, st]}>
      <Txt size={15} line={20} numberOfLines={2}><Txt size={15} line={20} weight={700}>24</Txt>{tx(', hat Julia am Montag gesagt.', ', Julia said on Monday.')}</Txt>
    </Animated.View>
  );
}

/* ─── The claim: the month ─────────────────────────────────────────────────────────────────── */

/** The calendar the phone becomes: the month name, the weekdays, four weeks, and a chip per date. */
function Month({ g }: { g: SharedValue<number> }) {
  const frame = useAnimatedStyle(() => ({ opacity: seg(g.value, S7 + 0.85, S7 + 1.15) }));
  const wd = tx('MDMDFSS', 'MTWTFSS').split('');
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, frame]}>
        <View style={{ position: 'absolute', left: CPH.l, width: CPH.r - CPH.l, top: GRID.head - 9, alignItems: 'center' }}>
          <Txt size={13} line={18} weight={700}>{tx('November', 'November')}</Txt>
        </View>
        {wd.map((d, c) => (
          <View key={c} style={{ position: 'absolute', left: GRID.l + GRID.cw * c, width: GRID.cw, top: GRID.days - 6, alignItems: 'center' }}>
            <Txt size={8} line={11} weight={700} color={tokens.sub}>{d}</Txt>
          </View>
        ))}
        {Array.from({ length: 28 }).map((_, i) => {
          const c = i % 7;
          const r = (i - c) / 7;
          const today = i === 0;
          return (
            <View key={i} style={{ position: 'absolute', left: GRID.l + GRID.cw * c, width: GRID.cw, top: GRID.top + GRID.pitch * r + 4, alignItems: 'center' }}>
              <View style={{ width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: today ? tokens.ink : 'transparent' }}>
                <Txt size={9} line={12} weight={today ? 700 : 500} color={today ? tokens.onInk : tokens.ink}>{String(i + 2)}</Txt>
              </View>
            </View>
          );
        })}
        {[1, 2, 3].map((r) => <View key={r} style={{ position: 'absolute', left: GRID.l, width: GRID.cw * 7, top: GRID.top + GRID.pitch * r - 1, height: 1, backgroundColor: tokens.hair }} />)}
      </Animated.View>
      {CHIPS.map((c, i) => <DayChip key={i} g={g} {...c} />)}
    </>
  );
}

/** A date in its day: pops in as its card lands there (or, for cards long scrolled away, in turn). */
function DayChip({ g, day, ink, order }: { g: SharedValue<number>; day: number; ink: string; order: number }) {
  const at = S7 + 0.5 + 0.1 * order + 0.45;
  const c = cellXY(day);
  const st = useAnimatedStyle((): any => {
    const a = g.value - at;
    return { opacity: seg(a, 0, 0.06), transform: [{ scale: 0.4 + 0.6 * crit(a, 20) }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: c.x - 7, top: c.y - 3, width: 14, height: 6, borderRadius: 3, backgroundColor: nightFg(ink) }, st]} />;
}

/* ─── Voices ───────────────────────────────────────────────────────────────────────────────── */

function Avatar({ who, size }: { who: 'J' | 'T'; size: number }) {
  const p = persons[who];
  return (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: nightBg(p.tint), borderWidth: 2, borderColor: tokens.row, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={size * 0.42} weight={700} color={nightFg(p.ink)}>{NAME[who][0]}</Txt>
    </View>
  );
}

const AV = 42;
const AVP = 52;
const BUB = { bottom: 40, inset: 8, max: 180 };

/**
 * Someone speaking: the avatar rises beside the phone, the bubble grows inside the phone from the
 * avatar's side, the words light up with the wave (unsung words stay readable at 35 %), the wave lies
 * flat when they stop, and the bubble shrinks back towards the avatar the way it came. Without text
 * only the avatar comes (with a camera badge when they take a photo).
 */
function Speech({ who, g, t, text, words, back, out, prop }: { who: 'J' | 'T'; g: SharedValue<number>; t: number; text?: string; words?: [number, number]; back?: number; out: number; prop?: 'cam' | 'fwd' }) {
  const p = persons[who];
  const left = who === 'J';
  const tb = t + 0.25;
  const list = text ? text.split(' ') : [];
  const b0 = back ?? out;
  const av = useAnimatedStyle((): any => {
    const v = g.value;
    const up = eOut(seg(v, t, t + 0.28));
    const down = eIn(seg(v, out, out + 0.26));
    return { opacity: seg(v, t, t + 0.16) * (1 - down), transform: [{ translateY: 14 * (1 - up) + 10 * down }] };
  });
  const bub = useAnimatedStyle((): any => {
    const v = g.value;
    const sh = eIn(seg(v, b0, b0 + 0.18));
    return {
      opacity: seg(v, tb, tb + 0.12) * (1 - sh),
      transform: [{ scale: (0.9 + 0.1 * crit(v - tb, 20)) * (1 - 0.1 * sh) }],
    };
  });
  // Avatar fully outside the phone (8 pt or more), bubble fully inside it. With a phone in hand
  // (taking the photo, forwarding the mail) the person comes a little nearer.
  const av0 = prop ? AVP : AV;
  const side = left ? { left: PH.l - 10 - av0 } : { right: W - PH.r - 10 - av0 };
  const bside = left ? { left: PH.l + BUB.inset } : { right: W - PH.r + BUB.inset };
  return (
    <>
      <Animated.View style={[{ position: 'absolute', bottom: BUB.bottom, ...side }, av]}>
        <Avatar who={who} size={av0} />
        {prop === 'cam' ? (
          // Julia's phone, held up with its camera to the letter.
          <View style={{ position: 'absolute', left: av0 - 8, top: -22, width: 24, height: 40, borderRadius: 6, borderWidth: 2.5, borderColor: tokens.ink, backgroundColor: tokens.row, transform: [{ rotate: '18deg' }], alignItems: 'center', paddingTop: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: tokens.ink }} />
          </View>
        ) : prop === 'fwd' ? (
          <View style={{ position: 'absolute', left: -8, top: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={14} line={16} weight={700} color={tokens.done}>↪</Txt>
          </View>
        ) : null}
      </Animated.View>
      {text && words ? (
        <Animated.View style={[{ position: 'absolute', bottom: BUB.bottom, ...bside, maxWidth: BUB.max, transformOrigin: left ? 'left bottom' : 'right bottom', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 16, borderBottomLeftRadius: left ? 5 : 16, borderBottomRightRadius: left ? 16 : 5, backgroundColor: tokens.ink, gap: 4, shadowColor: '#16232A', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } } as any, bub]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 10 }}>
            {Array.from({ length: 16 }).map((_, i) => <Bar key={i} i={i} g={g} from={words[0]} to={words[1]} color={p.tint} />)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 }}>
            {list.map((w, i) => <Word key={i} g={g} at={words[0] + ((words[1] - words[0]) * i) / list.length} text={w} />)}
          </View>
        </Animated.View>
      ) : null}
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

/* ─── The claim ────────────────────────────────────────────────────────────────────────────── */

const PAV = 52;
const PEOPLE = { J: { x: 38, y: 168, t: S7 + 1.85, amp: 14, bend: -1 }, T: { x: 262, y: 168, t: S7 + 2.0, amp: 12, bend: 1 } };
const VOICE = { J: S7 + 2.3, T: S7 + 2.47 };

/** The claim: Julia and Tom beside the calendar, each voice reaches Memo on its top edge. */
function Claim({ g }: { g: SharedValue<number> }) {
  return (
    <>
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
  // The claim: down onto the top edge of the calendar, growing to 84 pt, landing lightly.
  const u3 = seg(v, S7 + 0.5, S7 + 1.2);
  if (u3 > 0) {
    const q3 = pulled(u3);
    x = quad(M1.x, M1.x, M3.x, q3);
    y = quad(M1.y, 30, M3.y, q3);
    s = mix(M1.s, M3.s, eMove(u3));
    stretch = 0.04 * Math.sin(Math.PI * u3);
  }
  // Tilts and glances: one critically damped spring per change. Eyes lead (the art changes under a
  // blink at the same key), the head follows.
  rot += 6 * (crit(v - 2.1, 18) - crit(v - 2.62, 16)); // wink
  rot += 4 * (crit(v - (S1 + 0.8), 13) - crit(v - (S1 + 1.52), 13)); // eyes on the notes
  let tx = 0;
  for (let i = 0; i < LOOKS.length; i++) {
    const L = LOOKS[i];
    const c = crit(v - L.t, L.w);
    rot += L.r * c;
    tx += L.x * c;
  }
  // Thinking lifts Memo 3 pt; the thought becomes a card and Memo settles back.
  let dy = 0;
  for (let i = 0; i < THINK.length; i++) dy -= 3 * (crit(v - THINK[i].a - 0.06, 15) - crit(v - THINK[i].b, 15));
  // Contacts: hard and heavy, at most 9 % squash, one rebound.
  let sq = 0;
  for (let i = 0; i < TAKES.length; i++) sq -= recoil(v - TAKES[i].t, TAKES[i].a);
  for (let i = 0; i < HOPS.length; i++) {
    const h = hop(v, HOPS[i].t, HOPS[i].h, HOPS[i].d);
    dy += h[0];
    sq += h[1];
  }
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
    let o = 0;
    let pop = 0;
    let lift = 0;
    for (let i = 0; i < THINK.length; i++) {
      const T = THINK[i];
      const a = v - (T.a + 0.05);
      o = Math.max(o, seg(a, 0, 0.1) * (1 - seg(v, T.b - 0.1, T.b + 0.02)));
      if (a > 0) pop = crit(a, 20);
      lift -= 3 * (crit(a + 0.05, 15) - crit(v - T.b, 15));
    }
    return { opacity: o, transform: [{ translateY: -4 * pop + lift }, { scale: 0.6 + 0.4 * pop }] };
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

/** Captions: title at most six words, one lead line. `soon` marks a feature that is not built yet. */
export function introCopy(beat: number): { title: string; lead: string; soon?: boolean } {
  return [
    { title: tx('Hallo, ich bin Memo', 'Hi, I’m Memo'), lead: tx('Bisher hing ich an eurem Kühlschrank.', 'Until now I lived on your fridge.') },
    // One sentence per line, so no word is left alone on the second line.
    { title: tx('Jetzt bin ich in eurem Handy', 'Now I live in your phone'), lead: tx('Aus jedem Zettel wird eine Karte.\nBei euch beiden.', 'Every note becomes a card.\nOn both your phones.') },
    { title: tx('Ihr sagt es einfach', 'You just say it'), lead: tx('Julia sagt einen Termin, Tom was fehlt.', 'Julia says a date, Tom what’s missing.') },
    { title: tx('Ein Foto vom Brief genügt', 'Snap the letter'), lead: tx('Termin im Kalender, Laterne auf der Liste.', 'Date in the calendar, lantern on the list.') },
    { title: tx('Oder leitet die Mail weiter', 'Or forward the email'), lead: tx('Aus der Mail der Schule wird ein Termin.', 'The school’s email becomes a date.'), soon: true },
    { title: tx('Memo kennt euren Alltag', 'Memo knows your life'), lead: tx('Und fragt nicht, was es schon weiß.', 'It won’t ask what it already knows.') },
    { title: tx('Und merkt sich, was ihr sagt', 'And remembers what you say'), lead: tx('Fragt einfach später danach.', 'Just ask for it later.') },
    { title: INTRO_CLAIM(), lead: tx('Sprechen, tippen, fotografieren, teilen oder weiterleiten: Sagt mir einfach, was ansteht.', 'Speak, type, snap, share or forward: Just tell me what’s coming up.') },
  ][beat];
}
