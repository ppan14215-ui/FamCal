/**
 * Memo sits right above the talk field, at its right end, on every screen that
 * has the field (Julian 07.11.: "well integrated into the app experience").
 * It reads what the app is doing and shows it: listening, thinking, typing,
 * happy when something landed, asleep late at night. It never leaves the field (Julian 08.11.).
 *
 * Its job (Julian 08.11.: "needs to have a purpose"): Memo is the talk button. Tap him and the field
 * listens. He glances wherever you touch, and shows a "?" while a question waits for your answer
 * (tap him and just say it). The first few starts a small line says so.
 * On start it flies in from where the intro left it (top of the screen).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, Easing, useReducedMotion } from 'react-native-reanimated';
import Blob from './Blob';
import { useBuddy, setBuddy, buddyJoy, buddyPoke, buddyTalk, voiceLevel, isNight, type Mood } from '../../lib/buddy';
import { getPref, setPref, onPrefsReady } from '../../lib/prefs';
import Txt from '../ui/Txt';
import { tokens } from '../../theme';
import { useFieldTop } from '../../lib/dockSpace';
import { useTyping } from '../../lib/keyboard';
import { useVeil } from '../Veil';
import { useFeed } from '../../lib/feed';
import { getFamily, myRole } from '../../lib/sync';
import { haptics } from '../../lib/haptics';
import { usePathname } from 'expo-router';
import { useStore } from '../../state/store';
import { useSpeak, speakOpen } from '../../lib/speak';
import { tx } from '../../i18n/lang';

const SIZE = 38;
const RIGHT = 20;

export default function BuddyHost() {
  const b = useBuddy();
  const dockTop = useFieldTop();
  const typing = useTyping();
  const veil = useVeil();
  const feed = useFeed();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [night, setNight] = useState(isNight());
  useEffect(() => { const id = setInterval(() => setNight(isNight()), 60000); return () => clearInterval(id); }, []);

  // Something landed (a happy jiggle in place): the assistant finished (think -> off/land) or answered in the chat.
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
  // A message from someone else in the family: Memo looks up with a little squish.
  const seen = useRef(feed.length);
  useEffect(() => {
    if (feed.length > seen.current) {
      const last = feed[feed.length - 1];
      const me = getFamily() ? myRole() : 'J';
      if (last && last.by !== me) buddyPoke();
    }
    seen.current = feed.length;
  }, [feed.length]);

  // He notices what you do (Julian 08.11. 23:49: "react to everything I do inside the app"):
  // another screen = a little look-up squish; something ticked off on a list or a task done = a small happy wiggle.
  const path = usePathname();
  const firstPath = useRef(true);
  useEffect(() => { if (firstPath.current) { firstPath.current = false; return; } buddyPoke(); }, [path]);
  const doneCount = useStore((s) => s.tasks.filter((t) => t.done).length + s.lists.reduce((n, l) => n + l.sections.reduce((m, sec) => m + sec.items.filter((i) => i.done).length, 0), 0));
  const allCount = useStore((s) => s.events.length + s.tasks.length + s.lists.reduce((n, l) => n + l.sections.reduce((m, sec) => m + sec.items.length, 0), 0));
  const seenDone = useRef(doneCount);
  const seenAll = useRef(allCount);
  useEffect(() => { if (doneCount > seenDone.current) joy(); seenDone.current = doneCount; }, [doneCount]);
  // Something removed: a small startled squish.
  useEffect(() => { if (allCount < seenAll.current) buddyPoke(); seenAll.current = allCount; }, [allCount]);

  const mood: Mood = b.listening ? 'listen' : veil.phase === 'think' ? 'think' : typing ? 'type' : night ? 'sleep' : 'idle';

  // Position: just above the field's top edge, right end. Flies in on start.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  const flew = useRef(false);
  // Docked in the bar (Julian 08.11. 23:19): the arrival glides into the mic spot, then the bar's Memo takes over.
  const dk = b.docked > 0 && b.dockAt ? b.dockAt : null;
  const restY = dk ? dk.y - SIZE / 2 : H - dockTop - SIZE - 6;
  const restX = dk ? dk.x - SIZE / 2 : W - RIGHT - SIZE;
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
        // From the top of the screen in one smooth glide down to the field, then a soft squish (Julian 08.11.: no jumping).
        x.value = b.from.x - SIZE / 2; y.value = b.from.y - SIZE / 2; o.value = 1;
        x.value = withTiming(restX, { duration: 700, easing: Easing.bezier(0.45, 0, 0.2, 1) });
        y.value = withTiming(restY, { duration: 700, easing: Easing.bezier(0.6, 0, 0.3, 1) });
        setTimeout(() => buddyPoke(), 680);
        setBuddy({ from: null });
        return;
      }
      x.value = restX; y.value = restY;
      o.value = withDelay(150, withTiming(1, { duration: 260 }));
      return;
    }
    // The field moved (keyboard, a longer sentence): Memo glides along, no spring (Julian 08.11.).
    const move = { duration: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) };
    x.value = withTiming(restX, move);
    y.value = withTiming(restY, move);
  }, [dockTop, W, H, b.intro, dk?.x, dk?.y]);

  // The Sprechkarte is open: Memo lives in its middle as the talk button, so this one steps aside (Julian 08.11.: "make sure the mascot doesn't overlap").
  // After the arrival the bar's own Memo is the only one (a short wait so the glide finishes in place).
  const [landed, setLanded] = useState(false);
  useEffect(() => { if (b.intro) return; const t = setTimeout(() => { setLanded(true); setBuddy({ landed: true }); }, b.from ? 720 : 0); return () => clearTimeout(t); }, [b.intro]);
  const blocked = speakOpen(useSpeak()) || b.covered;
  const docked = b.docked > 0 && landed;
  const inCard = blocked || docked;
  const away = useSharedValue(1);
  const hv = useSharedValue(1);
  useEffect(() => { away.value = withTiming(inCard ? 0 : 1, { duration: inCard ? (docked && !blocked ? 0 : 120) : 220, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [inCard]);
  useEffect(() => { hv.value = withTiming(blocked ? 0 : 1, { duration: 140 }); }, [blocked]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }, { translateY: y.value }] as any }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: away.value }));
  // Glance at the last touch, relative to where Memo sits.
  const glance = React.useMemo(() => {
    if (!b.touch) return undefined;
    const c = (v: number) => Math.max(-1, Math.min(1, v));
    return { x: c((b.touch.x - (restX + SIZE / 2)) / 140), y: c((b.touch.y - (restY + SIZE / 2)) / 140), n: b.touch.n };
  }, [b.touch?.n]);

  // "?" while a question waits for my answer.
  const ask = b.waiting && mood !== 'listen' && mood !== 'think';
  const askA = useSharedValue(0);
  useEffect(() => { askA.value = ask ? withTiming(1, { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) }) : withTiming(0, { duration: 140 }); }, [ask]);
  const askStyle = useAnimatedStyle(() => ({ opacity: askA.value, transform: [{ scale: 0.4 + 0.6 * askA.value }] as any }));

  // The first three starts: a small line beside Memo says what he is for.
  const [hint, setHint] = useState(false);
  const hintA = useSharedValue(0);
  useEffect(() => {
    if (b.intro || !dockTop) return;
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    onPrefsReady(() => {
      const n = Number(getPref('memoHint') ?? '0');
      if (n >= 3) return;
      setPref('memoHint', String(n + 1));
      t1 = setTimeout(() => { setHint(true); hintA.value = withTiming(1, { duration: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) }); buddyPoke(); }, 1600);
      t2 = setTimeout(() => { hintA.value = withTiming(0, { duration: 200 }); setTimeout(() => setHint(false), 220); }, 6200);
    });
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [b.intro, !!dockTop]);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintA.value * hv.value, transform: [{ translateX: 8 * (1 - hintA.value) }] as any }));

  const tap = () => {
    haptics.select();
    buddyPoke();
    hintA.value = withTiming(0, { duration: 150 });
    if (!b.listening) buddyTalk();
  };

  return (
    <Animated.View pointerEvents={dockTop && !inCard ? 'box-none' : 'none'} style={[{ position: 'absolute', left: 0, top: 0 }, st]}>
      {hint ? (
        // Docked in the bar the line sits just above Memo, so it never covers the field.
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', ...(b.docked > 0 ? { right: -4, bottom: SIZE + 8 } : { right: SIZE + 8, top: SIZE / 2 - 15 }), height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}, 0 4px 12px rgba(22,35,42,0.08)` } as any, hintStyle]}>
          <Txt size={13} weight={600} color={tokens.sub} numberOfLines={1}>{tx('Tipp mich an und sprich', 'Tap me and talk')}</Txt>
        </Animated.View>
      ) : null}
      <Animated.View style={bodyStyle}>
      <Pressable onPress={tap} hitSlop={{ top: 10, left: 10, right: 10, bottom: 0 }} accessibilityRole="button" accessibilityLabel={tx('Memo, tippen zum Sprechen', 'Memo, tap to talk')}>
        <Blob size={SIZE} mood={mood} joy={b.joy} poke={b.poke} level={voiceLevel} glance={glance} />
      </Pressable>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: -4, top: -6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.row, boxShadow: `0 0 0 1px ${tokens.hair}` } as any, askStyle]}>
        <Txt size={11} weight={700} color={tokens.done} style={{ lineHeight: 13 }}>?</Txt>
      </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
