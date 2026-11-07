/**
 * Memo sits right above the talk field, at its right end, on every screen that
 * has the field (Julian 07.11.: "well integrated into the app experience").
 * It reads what the app is doing and shows it: listening, thinking, typing,
 * happy when something landed, asleep late at night. A tap makes it hop.
 * On start it flies in from where the intro left it (top of the screen).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, Easing, useReducedMotion } from 'react-native-reanimated';
import Blob from './Blob';
import { useBuddy, setBuddy, buddyJoy, buddyPoke, voiceLevel, isNight, type Mood } from '../../lib/buddy';
import { useDockTop } from '../../lib/dockSpace';
import { useTyping } from '../../lib/keyboard';
import { useVeil } from '../Veil';
import { useFeed } from '../../lib/feed';
import { getFamily, myRole } from '../../lib/sync';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';

const SIZE = 38;
const RIGHT = 20;

export default function BuddyHost() {
  const b = useBuddy();
  const dockTop = useDockTop();
  const typing = useTyping();
  const veil = useVeil();
  const feed = useFeed();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [night, setNight] = useState(isNight());
  useEffect(() => { const id = setInterval(() => setNight(isNight()), 60000); return () => clearInterval(id); }, []);

  // Something landed: the assistant finished (think -> off/land) or answered in the chat.
  // One hop per answer, even when the reply and the landing come close together.
  const lastJoy = useRef(0);
  const joy = () => { if (Date.now() - lastJoy.current < 1500) return; lastJoy.current = Date.now(); buddyJoy(); };
  const was = useRef(veil.phase);
  useEffect(() => {
    if (was.current === 'think' && veil.phase !== 'think') joy();
    was.current = veil.phase;
  }, [veil.phase]);
  const replied = useRef<string | undefined>(undefined);
  useEffect(() => { if (veil.reply && !replied.current) joy(); replied.current = veil.reply; }, [veil.reply]);
  // A message from someone else in the family: Memo looks up and hops a little.
  const seen = useRef(feed.length);
  useEffect(() => {
    if (feed.length > seen.current) {
      const last = feed[feed.length - 1];
      const me = getFamily() ? myRole() : 'J';
      if (last && last.by !== me) buddyPoke();
    }
    seen.current = feed.length;
  }, [feed.length]);

  const mood: Mood = b.listening ? 'listen' : veil.phase === 'think' ? 'think' : typing ? 'type' : night ? 'sleep' : 'idle';

  // Position: just above the field's top edge, right end. Flies in on start.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  const flew = useRef(false);
  const restY = H - dockTop - SIZE - 6;
  const restX = W - RIGHT - SIZE;
  // The field goes away for a moment (a sheet, a screen without it): Memo fades and comes back where it was.
  const hidden = useRef(false);
  useEffect(() => {
    if (!dockTop) { if (flew.current) { hidden.current = true; o.value = withTiming(0, { duration: 140 }); } return; }
    if (hidden.current) { hidden.current = false; o.value = withTiming(1, { duration: 200 }); }
  }, [!!dockTop]);
  useEffect(() => {
    if (!dockTop || b.intro) return;
    if (!flew.current) {
      flew.current = true;
      if (b.from && !reduced) {
        // From the top of the screen in a soft arc, stretching as it falls, squashing on landing (Blob does the hop).
        x.value = b.from.x - SIZE / 2; y.value = b.from.y - SIZE / 2; o.value = 1;
        x.value = withTiming(restX, { duration: 620, easing: Easing.bezier(0.33, 0, 0.2, 1) });
        y.value = withSequence(withTiming(b.from.y - SIZE / 2 - 30, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(restY, { duration: 460, easing: Easing.bezier(0.5, 0, 0.75, 0.4) }));
        setTimeout(() => buddyPoke(), 600);
        setBuddy({ from: null });
        return;
      }
      x.value = restX; y.value = restY + 12;
      o.value = withDelay(150, withTiming(1, { duration: 260 }));
      y.value = withDelay(150, withSpring(restY, { stiffness: 220, damping: 16 }));
      return;
    }
    x.value = withSpring(restX, { stiffness: 220, damping: 24 });
    y.value = withSpring(restY, { stiffness: 220, damping: 22 });
  }, [dockTop, W, H, b.intro]);

  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }, { translateY: y.value }] as any }));
  return (
    <Animated.View pointerEvents={dockTop ? 'box-none' : 'none'} style={[{ position: 'absolute', left: 0, top: 0 }, st]}>
      <Pressable onPress={() => { haptics.select(); buddyPoke(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={tx('Memo', 'Memo')}>
        <Blob size={SIZE} mood={mood} joy={b.joy} poke={b.poke} level={voiceLevel} />
      </Pressable>
    </Animated.View>
  );
}
