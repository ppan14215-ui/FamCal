/**
 * Bottom navigation (Julian 30.10. 21:52, "super simpel"): one dark pill.
 * The open tab is a white pill with its word, the others are just their icon.
 * The talk field sits right above it on every screen (Dock.tsx).
 *
 * Julian 31.10. 15:40, like keep2read: a flick to the right (or a push upwards) folds the pill into a small
 * handle on the right edge, and the talk field drops into its place. A tap on the handle, or pulling it
 * inwards, brings the tabs back. Same numbers as keep2read's dock (static/app.js dkSpring, dkDock, dkCollapse):
 * the box morphs x, y, w, h, r together; open k 1000 c 53, fold k 250 c 27; fold when the thrown centre
 * passes 78 % of the width or faster than 700 px/s; open from the handle after 24 px inwards, 64 px from the
 * edge or a flick faster than 300 px/s. The keyboard still pushes the bar away while typing.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Platform, Pressable, BackHandler, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, withDelay, Easing, useReducedMotion, interpolate, Extrapolation, FadeIn } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { tx } from '../i18n/lang';
import { useNavFolded, setNavFolded, setHandleY, getHandleY } from '../lib/navFold';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Txt from './ui/Txt';
import LineIcon, { LineName } from './ui/LineIcon';
import PressScale from './ui/PressScale';
import { tokens, glass } from '../theme';
import { haptics } from '../lib/haptics';
import { useTyping as useFocus, useKeyboardInset } from '../lib/keyboard';
import { useDockTop } from '../lib/dockSpace';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { navStyle, useBarMode, setBarMode, setBarNav } from '../lib/navStyle';
import MemoMic from './buddy/MemoMic';
import { buddyTalk, buddyKeys } from '../lib/buddy';
import { useSpeak, speakOpen } from '../lib/speak';
import { useMemoOut, setMemoOut } from '../lib/memoOut';
import { usePrivat } from '../lib/privat';
import { router } from 'expo-router';
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export const TABS: { name: string; key: string; icon: LineName }[] = [
  { name: 'chat', key: 'nav.chat', icon: 'chat' },
  { name: 'kalender', key: 'nav.kalender', icon: 'cal' },
  { name: 'listen', key: 'nav.listen', icon: 'list' },
];

/** Height of the bar; Dock.tsx puts the field right above it. */
export const navH = () => (navStyle() === 'klar' ? 52 : navStyle() === 'pill' ? 54 : navStyle() === 'bar' ? 54 : 50);
/** Width of the icon pill in the one-bar navigation. */
// One bar (Julian 04.11.): the old dark pill's look, the light block sits on the active tab with its word.
const BAR_ON_W = 100;
export const BAR_TABS_W = BAR_ON_W + 40 * 2 + 8;
/** The open tab always has the same width, so the bar never changes size and recenters while the pill moves (Julian 31.10.: Listen overshot). */
const ON_W = 128;
/** Where the pill's top edge sits above the screen bottom. */
/** Klar: how far the glass pill floats above the screen bottom. */
export const klarFoot = (insetBottom: number) => Math.max(insetBottom, 10) + 8;
export const navTop = (insetBottom: number) => (navStyle() === 'klar' ? klarFoot(insetBottom) + navH() : navStyle() === 'pill' ? Math.max(insetBottom, 12) + 10 + navH() : navStyle() === 'bar' ? Math.max(insetBottom, 8) + 4 + navH() : Math.max(insetBottom, 4) + navH());

/** The pill's width before it is measured: one open tab and two icons. */
const PILL_W = ON_W + 56 * 2 + 4 + 10;
const HANDLE_W = 8;
const HANDLE_H = 44;
const EDGE = 16;

/** Tab switch: the white pill glides and the tabs resize on the same curve, so the two stay together. */
const SWITCH = { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) };
const FADE_H = 36;

export const floatShadow = { boxShadow: '0 12px 28px rgba(22,35,42,0.28)' } as any;

/** The dark swipeable pill (Julian 30.10. to 03.11.), kept behind navStyle(). */
function PillNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const current = state.routes[state.index]?.name;
  // While typing the keyboard takes this place, so the bar slides away; the field drops into it.
  // On a phone only while the keyboard is really up, so the tabs can never stay away.
  const focus = useFocus();
  const kb = useKeyboardInset();
  const typing = focus && (Platform.OS === 'web' || kb > 0);
  const away = useSharedValue(0);
  useEffect(() => { away.value = withTiming(typing ? 1 : 0, { duration: typing ? 180 : 260, easing: Easing.bezier(0.22, 1, 0.36, 1) }); }, [typing]);
  const hide = useAnimatedStyle((): any => ({ opacity: 1 - away.value, transform: [{ translateY: away.value * 40 }] }));

  const folded = useNavFolded();
  const reduced = useReducedMotion();
  const [W, setW] = useState(0);
  const [H, setH] = useState(0);
  const [pw, setPw] = useState(PILL_W);
  const foot = Math.max(insets.bottom, 12) + 10;
  // The two boxes: the pill at the bottom, and the handle on the right edge.
  const dock = { x: (W - pw) / 2, y: H - foot - navH(), w: pw, h: navH(), r: navH() / 2 };
  const handle = (fy = getHandleY()) => ({ x: W - EDGE - HANDLE_W, y: fy * H - HANDLE_H / 2, w: HANDLE_W, h: HANDLE_H, r: HANDLE_W / 2 });
  const bx = useSharedValue(0), by = useSharedValue(0), bw = useSharedValue(PILL_W), bh = useSharedValue(navH()), br = useSharedValue(navH() / 2);
  const ready = useSharedValue(0);

  const go = (b: { x: number; y: number; w: number; h: number; r: number }, open: boolean, vx = 0, vy = 0) => {
    'worklet';
    if (reduced) { bx.value = b.x; by.value = b.y; bw.value = b.w; bh.value = b.h; br.value = b.r; return; }
    const k = open ? { stiffness: 1000, damping: 53, mass: 1 } : { stiffness: 250, damping: 27, mass: 1 };
    bx.value = withSpring(b.x, { ...k, velocity: vx });
    by.value = withSpring(b.y, { ...k, velocity: vy });
    bw.value = withSpring(b.w, k);
    bh.value = withSpring(b.h, k);
    br.value = withSpring(b.r, k);
  };
  // Layout or a fold from elsewhere: put the box where it belongs (first time without motion).
  useEffect(() => {
    if (!W || !H) return;
    const b = folded ? handle() : dock;
    if (!ready.value) { bx.value = b.x; by.value = b.y; bw.value = b.w; bh.value = b.h; br.value = b.r; ready.value = 1; return; }
    go(b, !folded);
  }, [W, H, pw, folded, foot]);

  const fold = (vx: number, vy: number) => { haptics.select(); go(handle(), false, vx, vy); setNavFolded(true); };
  const open = (vx = 0) => { haptics.select(); go(dock, true, vx, 0); setNavFolded(false); };

  // From the pill: it follows the finger. Down is a rubber band, left squeezes against the wall, right and up glide.
  const sx = useSharedValue(0), sy = useSharedValue(0);
  const pillPan = Gesture.Pan()
    .enabled(!folded && !typing && W > 0)
    .activeOffsetX([-8, 8]).activeOffsetY([-8, 8])
    .onBegin(() => { sx.value = bx.value; sy.value = by.value; })
    .onUpdate((e) => {
      const dx = e.translationX, dy = e.translationY;
      bx.value = sx.value + (dx < 0 ? -rubber(-dx, 40) : dx);
      by.value = sy.value + (dy > 0 ? rubber(dy, 30) : dy);
    })
    .onEnd((e) => {
      const projX = bx.value + bw.value / 2 + e.velocityX * 0.18;
      const projUp = sy.value - (by.value + e.velocityY * 0.18);
      if (projX > W * 0.78 || e.velocityX > 700 || projUp > 90 || e.velocityY < -700) scheduleOnRN(fold, e.velocityX, e.velocityY);
      else go(dock, true, e.velocityX, e.velocityY);
    });

  // From the handle: a tap opens. Dragging moves it up and down; pulling inwards opens.
  const hy = useSharedValue(0);
  const handlePan = Gesture.Pan()
    .enabled(folded && !typing && W > 0)
    .minDistance(4)
    .onBegin(() => { hy.value = by.value; })
    .onUpdate((e) => {
      const inward = Math.max(0, -e.translationX);
      // The handle grows a little towards the finger, so it feels like it unfolds.
      const grow = 44 * (1 - Math.pow(1 - Math.min(1, inward / 44), 3));
      bw.value = HANDLE_W + grow;
      bx.value = W - EDGE - HANDLE_W - grow;
      by.value = Math.min(H * 0.68, Math.max(H * 0.25, hy.value + e.translationY + HANDLE_H / 2)) - HANDLE_H / 2;
    })
    .onEnd((e) => {
      const inward = -e.translationX;
      const fromEdge = W - e.absoluteX;
      if (inward >= 24 || fromEdge > 64 || e.velocityX < -300) scheduleOnRN(open, e.velocityX);
      else {
        const fy = (by.value + HANDLE_H / 2) / H;
        scheduleOnRN(setHandleY, fy);
        go({ x: W - EDGE - HANDLE_W, y: by.value, w: HANDLE_W, h: HANDLE_H, r: HANDLE_W / 2 }, true);
      }
    });
  const handleTap = Gesture.Tap().enabled(folded && !typing).onEnd(() => { scheduleOnRN(open, 0); });
  const handleGesture = Gesture.Exclusive(handlePan, handleTap);

  // m: 0 at the pill, 1 at the handle.
  const m = () => {
    'worklet';
    return interpolate(bw.value, [HANDLE_W, Math.max(pw, HANDLE_W + 1)], [1, 0], Extrapolation.CLAMP);
  };
  const box = useAnimatedStyle(() => ({ left: bx.value, top: by.value, width: bw.value, height: bh.value, borderRadius: br.value, opacity: ready.value }));
  const inner = useAnimatedStyle(() => {
    const p = m();
    return { opacity: interpolate(1 - (p - 0.2) * 2.4, [0, 1], [0, 1], Extrapolation.CLAMP), transform: [{ scale: interpolate(bw.value / pw, [0.2, 1], [0.6, 1], Extrapolation.CLAMP) }] };
  });
  // Julian 01.11.: the chat showed through between field and pill, and after folding and opening there was no ground at all.
  // One ground now, owned here: solid from the screen bottom up to the top of the talk field, a short fade above it.
  // It follows the field (folded or open) instead of fading with the pill, so nothing can read through in between.
  const dockTop = useDockTop();
  const groundTo = Math.max(dockTop, folded ? 0 : navTop(insets.bottom) + 6);
  const gh = useSharedValue(groundTo);
  useEffect(() => { gh.value = reduced ? groundTo : withSpring(groundTo, { stiffness: 250, damping: 27, mass: 1 }); }, [groundTo]);
  const ground = useAnimatedStyle(() => ({ height: gh.value }));
  const groundFade = useAnimatedStyle(() => ({ bottom: gh.value - 0.5 }));
  // The white pill glides to the open tab like the calendar switch (Julian 01.11.).
  const at = Math.max(0, TABS.findIndex((tb) => tb.name === current));
  const ix = useSharedValue(at);
  useEffect(() => { ix.value = reduced ? at : withTiming(at, SWITCH); }, [at]);
  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: 5 + ix.value * 58 }] }));
  const zone = useAnimatedStyle(() => ({ top: by.value + bh.value / 2 - 44 }));

  return (
    <Animated.View pointerEvents={typing ? 'none' : 'box-none'} onLayout={(e) => { setW(e.nativeEvent.layout.width); setH(e.nativeEvent.layout.height); }} style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, hide]}>
      {/* Calm ground under the pill, so nothing reads through around it. It fades as the pill folds away. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: tokens.bg }, ground]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, height: FADE_H }, groundFade]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="navground" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tokens.bg} stopOpacity={0} />
              <Stop offset="0.35" stopColor={tokens.bg} stopOpacity={0.35} />
              <Stop offset="0.7" stopColor={tokens.bg} stopOpacity={0.8} />
              <Stop offset="1" stopColor={tokens.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#navground)" />
        </Svg>
      </Animated.View>
      <GestureDetector gesture={pillPan}>
        <Animated.View accessibilityRole="tablist" pointerEvents={folded ? 'none' : 'auto'} style={[{ position: 'absolute', overflow: 'hidden', backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }, floatShadow, box]}>
          <Animated.View onLayout={(e) => { const w = Math.round(e.nativeEvent.layout.width); if (w && w !== pw) setPw(w); }} style={[{ position: 'absolute', flexDirection: 'row', gap: 2, padding: 5 }, inner]}>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 5, width: ON_W, height: navH() - 10, borderRadius: 999, backgroundColor: tokens.onInk }, marker]} />
            {TABS.map((tab) => {
              const on = current === tab.name;
              return <Tab key={tab.name} on={on} icon={tab.icon} label={t(tab.key)} onPress={() => { if (!on) { haptics.select(); navigation.navigate(tab.name); } }} />;
            })}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {/* The handle's touch zone is wider than the handle and keeps clear of the edge, so Android's back swipe never takes it. */}
      {folded ? (
        <GestureDetector gesture={handleGesture}>
          <Animated.View accessibilityRole="button" accessibilityLabel={tx('Tabs zeigen', 'Show tabs')} style={[{ position: 'absolute', right: 14, width: 46, height: 88 }, zone]} />
        </GestureDetector>
      ) : null}
    </Animated.View>
  );
}

/** keep2read's rubber band: the further you pull, the less it follows. */
function rubber(x: number, d: number) {
  'worklet';
  return (1 - 1 / ((Math.abs(x) * 0.55) / d + 1)) * d;
}

/** Each tab grows and shrinks by its own width, so the white pill moves without stretching icons or overshooting. */
function Tab({ on, icon, label, onPress }: { on: boolean; icon: LineName; label: string; onPress: () => void }) {
  const w = useSharedValue(on ? ON_W : 56);
  useEffect(() => { w.value = withTiming(on ? ON_W : 56, SWITCH); }, [on]);
  const size = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View style={[{ overflow: 'hidden', borderRadius: 999 }, size]}>
      <PressScale
        scale={0.92}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={onPress}
        style={{ height: navH() - 10, paddingHorizontal: on ? 12 : 0, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
      >
        <LineIcon name={icon} size={21} color={on ? tokens.ink : tokens.mute} />
        {on ? <Animated.View entering={FadeIn.duration(180).delay(90)}><Txt size={14} weight={600} color={tokens.ink} numberOfLines={1}>{label}</Txt></Animated.View> : null}
      </PressScale>
    </Animated.View>
  );
}

/**
 * Julian 04.11. (option 2): the talk card sits at the bottom like in the Claude app,
 * and under it small icons with their names. No gestures; the open tab is ink, the others mute.
 */
function StripNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const current = state.routes[state.index]?.name;
  const focus = useFocus();
  const kb = useKeyboardInset();
  const typing = focus && (Platform.OS === 'web' || kb > 0);
  const away = useSharedValue(0);
  useEffect(() => { away.value = withTiming(typing ? 1 : 0, { duration: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [typing]);
  const hide = useAnimatedStyle((): any => ({ opacity: 1 - away.value }));
  // Julian 05.11.: no soft fade; a solid ground up to the middle of the field, which hides the edge.
  const groundTo = navTop(insets.bottom) + 4 + 27;
  return (
    <Animated.View pointerEvents={typing ? 'none' : 'box-none'} style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, hide]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: groundTo, backgroundColor: tokens.bg }} />
      <View accessibilityRole="tablist" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 4), height: navH(), flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 }}>
        {TABS.map((tab) => {
          const on = current === tab.name;
          return (
            <PressScale key={tab.name} scale={0.9} accessibilityRole="tab" accessibilityLabel={t(tab.key)} accessibilityState={{ selected: on }}
              onPress={() => { if (!on) { haptics.select(); navigation.navigate(tab.name); } }}
              style={{ minWidth: 72, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <LineIcon name={tab.icon} size={22} color={on ? tokens.ink : tokens.mute} />
              <Txt size={11} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.mute} numberOfLines={1}>{t(tab.key)}</Txt>
            </PressScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

/**
 * One bar (Julian 05.11. 08:48: "the one shared component in dark mode, at the bottom").
 * Tabs and field live in one dark shape the Dock draws; here only the calm ground under it,
 * the tap-outside that folds the open tabs, and the hand-over of the current tab.
 */
function BarNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name ?? 'chat';
  const m = useBarMode();
  const nav = useRef(navigation);
  nav.current = navigation;
  const go = useCallback((name: string) => { nav.current.navigate(name as never); }, []);
  useEffect(() => { setBarNav({ current, go }); }, [current, go]);
  useEffect(() => {
    if (m !== 'tabs') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setBarMode('rest'); return true; });
    return () => sub.remove();
  }, [m]);
  // Julian 05.11.: no soft fade; a solid ground up to the middle of the bar, which hides the edge.
  const groundTo = Math.max(insets.bottom, 8) + 4 + navH() / 2;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: groundTo, backgroundColor: tokens.bg }} />
      {/* Open, a tap anywhere else folds the tabs back into the icon. */}
      {m === 'tabs' ? <Pressable accessibilityLabel={tx('Tabs schließen', 'Close tabs')} onPress={() => setBarMode('rest')} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
    </View>
  );
}

export function BarTab({ on, icon, label, onPress, onW, offW }: { on: boolean; icon: LineName; label: string; onPress: () => void; onW: number; offW: number }) {
  const w = useSharedValue(on ? onW : offW);
  useEffect(() => { w.value = withTiming(on ? onW : offW, SWITCH); }, [on, onW]);
  const size = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View style={[{ overflow: 'hidden', borderRadius: 999, backgroundColor: on ? tokens.onInk : 'transparent' }, size]}>
      <PressScale scale={0.92} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress}
        style={{ height: navH() - 10, paddingHorizontal: on ? 12 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <LineIcon name={icon} size={20} color={on ? tokens.ink : 'rgba(255,255,255,0.66)'} />
        {on ? <Animated.View entering={FadeIn.duration(180).delay(90)}><Txt size={13.5} weight={600} color={tokens.ink} numberOfLines={1}>{label}</Txt></Animated.View> : null}
      </PressScale>
    </Animated.View>
  );
}

/**
 * Klar (Julian 13.11.2026): one small glass pill in the middle. The open tab shows its icon and word on a soft grey
 * fill, the others only their icon; after a hairline sits Memo. Tap him and the input grows out of him and lies over
 * the pill (Dock.tsx); a long press goes straight to the keyboard. Content scrolls under the pill, there is no ground.
 */
/** Memo in the klar pill: his body fills the pill up to its padding, like in the draft (34 of 42 there). Pin draws its body at 0.8 of its size. */
export const memoS = () => (navH() - 10) / 0.8;
const KLAR_ON = 118;
const KLAR_OFF = 46;
function KlarNav({ state, navigation }: BottomTabBarProps) {
  return <KlarPill current={state.routes[state.index]?.name} onTab={(name) => navigation.navigate(name)} />;
}
/**
 * The pill itself. The tabs use it through KlarNav; the onboarding shows the same pill in its try step, where the
 * tabs are only to be seen (no `onTab`) and Memo is the one thing to tap.
 */
export function KlarPill({ current, onTab }: { current?: string; onTab?: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const focus = useFocus();
  const kb = useKeyboardInset();
  const typing = focus && (Platform.OS === 'web' || kb > 0);
  const mode = useBarMode();
  const speaking = speakOpen(useSpeak());
  const priv = usePrivat();
  // The input lies over the pill: the pill steps back a little, down and out, and slides back in when the input closes
  // or Memo comes back from thinking (Julian 14.11.: "the nav slides back in").
  const mo = useMemoOut();
  const away = typing || mode === 'input' || speaking || mo.away;
  const a = useSharedValue(away ? 1 : 0);
  useEffect(() => { a.value = withTiming(away ? 1 : 0, { duration: away ? 160 : 320, easing: EASE_OUT }); }, [away]);
  const hide = useAnimatedStyle((): any => ({ opacity: 1 - a.value, transform: [{ translateY: 14 * a.value }, { scale: 1 - 0.04 * a.value }] }));
  // Where Memo sits in the pill, so the Sprechkarte can grow out of him and bring him back to exactly this spot.
  const pillW = useRef(0), memoAt = useRef(0);
  const tell = () => { if (pillW.current && memoAt.current) setMemoOut({ dx: Math.round((memoAt.current - pillW.current / 2) * 2) / 2 }); };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Animated.View pointerEvents={away ? 'none' : 'box-none'} style={[{ position: 'absolute', left: 0, right: 0, bottom: klarFoot(insets.bottom), alignItems: 'center' }, hide]}>
        <View onLayout={(e) => { pillW.current = e.nativeEvent.layout.width; tell(); }} style={[{ height: navH(), borderRadius: navH() / 2, padding: 5, flexDirection: 'row', alignItems: 'center' }, glass.nav]}>
          <View accessibilityRole="tablist" pointerEvents={onTab ? 'auto' : 'none'} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {TABS.map((tab) => {
              const on = current === tab.name;
              return <KlarTab key={tab.name} on={on} icon={tab.icon} label={t(tab.key)} onPress={() => { if (!on) { haptics.select(); onTab?.(tab.name); } }} />;
            })}
          </View>
          <View style={{ width: 1, height: 20, marginHorizontal: 6, backgroundColor: tokens.hair }} />
          {/* Ohne KI there is nothing to talk to: Memo opens the plus sheet instead. */}
          <View onLayout={(e) => { memoAt.current = e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2; tell(); }}>
            <MemoMic box={navH() - 10} size={memoS()} ground={tokens.row}
              onPress={() => (priv.ohneKi ? router.push('/neu') : buddyTalk())}
              onLongPress={priv.ohneKi ? undefined : buddyKeys} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function KlarTab({ on, icon, label, onPress }: { on: boolean; icon: LineName; label: string; onPress: () => void }) {
  const w = useSharedValue(on ? KLAR_ON : KLAR_OFF);
  useEffect(() => { w.value = withTiming(on ? KLAR_ON : KLAR_OFF, SWITCH); }, [on]);
  const size = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View style={[{ overflow: 'hidden', borderRadius: 999, backgroundColor: on ? tokens.pillOn : 'transparent' }, size]}>
      <PressScale scale={0.94} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress}
        style={{ height: navH() - 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <LineIcon name={icon} size={20} color={on ? tokens.ink : tokens.sub} />
        {on ? <Animated.View entering={FadeIn.duration(180).delay(90)}><Txt size={14} weight={600} color={tokens.ink} numberOfLines={1}>{label}</Txt></Animated.View> : null}
      </PressScale>
    </Animated.View>
  );
}

export default function NavBar(props: BottomTabBarProps) {
  return navStyle() === 'klar' ? <KlarNav {...props} /> : navStyle() === 'pill' ? <PillNav {...props} /> : navStyle() === 'bar' ? <BarNav {...props} /> : <StripNav {...props} />;
}
