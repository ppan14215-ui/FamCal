/**
 * Motion values, same idiom as Namore's theme/motion.ts. DESIGN.md:
 * enter = ease-out (0.23, 1, 0.32, 1), move = (0.77, 0, 0.175, 1),
 * UI chrome stays under 300 ms. "Bewegung nach Häufigkeit": daily surfaces
 * get no animation, weekly ones under 200 ms, rare moments may move the clay
 * icon.
 */
import { Easing } from 'react-native-reanimated';

export const motion = {
  press: 120,
  micro: 180,
  base: 240,
  sheet: 320,
  sheetOut: 240,
} as const;

export const easing = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

export const springs = {
  snappy: { stiffness: 400, damping: 30, mass: 1 },
  smooth: { stiffness: 250, damping: 27, mass: 1 },
  reveal: { stiffness: 160, damping: 18, mass: 1 },
  snapBack: { stiffness: 600, damping: 32, mass: 0.6 },
} as const;
