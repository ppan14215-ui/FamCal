/**
 * Motion values, taken from Namore's theme/motion.ts. Principles in
 * docs/MOTION.md ("Fühlen der Aktion", Julian 26.10.): every tap answers
 * with movement, content arrives instead of appearing, nothing feels rigid.
 * - Enter/exit: `easing.out`. Movement across the screen: `easing.inOut`.
 *   Sheets: `easing.drawer`. Never ease-in alone.
 * - Gesture-driven or interruptible motion is a spring and takes over the
 *   gesture velocity. Programmatic fades use timing.
 * - UI chrome stays under 300 ms. Animate transform and opacity only.
 * - Reanimated's default ReduceMotion.System jumps to the end state when the
 *   OS asks for reduced motion.
 */
import { Platform } from 'react-native';
import { Easing, FadeInDown, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

export const motion = {
  press: 120,     // press-in / press-out feedback
  micro: 180,     // toasts, chips, small state swaps
  base: 240,      // cards, rows, content entrances
  sheet: 320,     // sheets and modals in
  sheetOut: 240,  // sheets and modals out
  reveal: 520,    // rare moments
  flyOff: 220,    // swipe card leaving the screen
} as const;

export const easing = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

// Comments give the iOS-equivalent response / damping ratio.
export const springs = {
  // 0.3 s, ζ 0.75: press feedback, toggles, small chrome.
  snappy: { stiffness: 400, damping: 30, mass: 1 },
  // 0.4 s, ζ 0.86: sheets, sliding pills, anything settling into place.
  smooth: { stiffness: 250, damping: 27, mass: 1 },
  // 0.5 s, ζ 0.7: one soft overshoot. Only after the person's own action.
  reveal: { stiffness: 160, damping: 18, mass: 1 },
  // ζ 0.84: swipe card or row snapping back under the finger.
  snapBack: { stiffness: 600, damping: 32, mass: 0.6 },
} as const;

/** Delay between siblings entering together. */
export const stagger = 50;

/**
 * Content rises in from 12 pt below, one stagger apart (capped at 6).
 * Web: Reanimated 4.2 pins entering views with custom initial values to
 * `position: absolute` once the animation ends, which breaks the layout. The
 * web link uses the stock FadeInDown curve instead.
 */
export const rise = (i = 0) => {
  const a = FadeInDown.duration(motion.base).easing(easing.out).delay(Math.min(i, 6) * stagger);
  return Platform.OS === 'web' ? a : a.withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
};

/** Rows in a list: fade in and out, neighbours slide into the gap. */
export const rowIn = FadeIn.duration(motion.micro).easing(easing.out);
export const rowOut = FadeOut.duration(motion.micro).easing(easing.out);
export const rowLayout = LinearTransition.duration(motion.base).easing(easing.out);

/** Swapping content in place (tab, view, step). */
export const swapIn = FadeIn.duration(motion.micro).easing(easing.out);
