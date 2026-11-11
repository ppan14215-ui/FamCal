/**
 * The mascot of the story onboarding (Julian 11.11.2026: "mit unserem neuen Maskottchen und zur App passend"):
 * Pin, the clay fridge magnet (src/components/buddy/Pin.tsx, App Design thread). It brings its own poses:
 *   peek  looks up from the bottom edge with a gentle sway (the caller puts the lower half below the edge)
 *   wave  rocks hello on its bottom edge (a magnet has no arms)
 *   jump  a big happy hop with squash
 * joy and poke come from the shared buddy store, so every tap on an answer squishes it.
 */
import React from 'react';
import Pin from '../buddy/Pin';
import { useBuddy, type Mood } from '../../lib/buddy';

export type Pose = 'rest' | 'peek' | 'wave' | 'jump';

export default function Mascot({ size, mood = 'idle', pose = 'rest', glance, gaze, shadow = true }: {
  size: number;
  mood?: Mood;
  pose?: Pose;
  /** Kept for callers; Pin plays a pose when it changes. */
  n?: number;
  glance?: { x: number; y: number; n: number };
  gaze?: { x: number; y: number } | null;
  shadow?: boolean;
}) {
  const b = useBuddy();
  return (
    <Pin
      size={size}
      mood={mood}
      joy={b.joy}
      poke={b.poke}
      glance={glance}
      gaze={gaze ?? undefined}
      pose={pose === 'rest' ? undefined : pose}
      shadow={shadow && pose !== 'peek'}
    />
  );
}
