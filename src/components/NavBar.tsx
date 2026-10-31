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
import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, Easing, useReducedMotion, interpolate, Extrapolation } from 'react-native-reanimated';
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
import { tokens } from '../theme';
import { haptics } from '../lib/haptics';
import { useTyping as useFocus, useKeyboardInset } from '../lib/keyboard';

const TABS: { name: string; key: string; icon: LineName }[] = [
  { name: 'chat', key: 'nav.chat', icon: 'chat' },
  { name: 'kalender', key: 'nav.kalender', icon: 'cal' },
  { name: 'listen', key: 'nav.listen', icon: 'list' },
];

/** Height of the pill; Dock.tsx puts the field right above it. */
export const NAV_H = 54;
/** The open tab always has the same width, so the bar never changes size and recenters while the pill moves (Julian 31.10.: Listen overshot). */
const ON_W = 128;
/** Where the pill's top edge sits above the screen bottom. */
export const navTop = (insetBottom: number) => Math.max(insetBottom, 12) + 10 + NAV_H;

/** The pill's width before it is measured: one open tab and two icons. */
const PILL_W = ON_W + 56 * 2 + 4 + 10;
const HANDLE_W = 8;
const HANDLE_H = 44;
const EDGE = 16;

const floatShadow = { boxShadow: '0 12px 28px rgba(22,35,42,0.28)' } as any;

export default function NavBar({ state, navigation }: BottomTabBarProps) {
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
  const hide = useAnimatedStyle(() => ({ opacity: 1 - away.value, transform: [{ translateY: away.value * 40 }] }));

  const folded = useNavFolded();
  const reduced = useReducedMotion();
  const [W, setW] = useState(0);
  const [H, setH] = useState(0);
  const [pw, setPw] = useState(PILL_W);
  const foot = Math.max(insets.bottom, 12) + 10;
  // The two boxes: the pill at the bottom, and the handle on the right edge.
  const dock = { x: (W - pw) / 2, y: H - foot - NAV_H, w: pw, h: NAV_H, r: NAV_H / 2 };
  const handle = (fy = getHandleY()) => ({ x: W - EDGE - HANDLE_W, y: fy * H - HANDLE_H / 2, w: HANDLE_W, h: HANDLE_H, r: HANDLE_W / 2 });
  const bx = useSharedValue(0), by = useSharedValue(0), bw = useSharedValue(PILL_W), bh = useSharedValue(NAV_H), br = useSharedValue(NAV_H / 2);
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
  const ground = useAnimatedStyle(() => ({ opacity: interpolate(1 - (m() - 0.3) * 1.9, [0, 1], [0, 1], Extrapolation.CLAMP) }));
  const zone = useAnimatedStyle(() => ({ top: by.value + bh.value / 2 - 44 }));

  return (
    <Animated.View pointerEvents={typing ? 'none' : 'box-none'} onLayout={(e) => { setW(e.nativeEvent.layout.width); setH(e.nativeEvent.layout.height); }} style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, hide]}>
      {/* Calm ground under the pill, so nothing reads through around it. It fades as the pill folds away. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: navTop(insets.bottom) + 6, backgroundColor: tokens.bg }, ground]} />
      <GestureDetector gesture={pillPan}>
        <Animated.View accessibilityRole="tablist" pointerEvents={folded ? 'none' : 'auto'} style={[{ position: 'absolute', overflow: 'hidden', backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }, floatShadow, box]}>
          <Animated.View onLayout={(e) => { const w = Math.round(e.nativeEvent.layout.width); if (w && w !== pw) setPw(w); }} style={[{ position: 'absolute', flexDirection: 'row', gap: 2, padding: 5 }, inner]}>
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
  useEffect(() => { w.value = withTiming(on ? ON_W : 56, { duration: 240, easing: Easing.bezier(0.22, 1, 0.36, 1) }); }, [on]);
  const size = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View style={[{ overflow: 'hidden', borderRadius: 999 }, size]}>
      <PressScale
        scale={0.92}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={onPress}
        style={{ height: NAV_H - 10, paddingHorizontal: on ? 12 : 0, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: on ? tokens.onInk : 'transparent' }}
      >
        <LineIcon name={icon} size={21} color={on ? tokens.ink : tokens.mute} />
        {on ? <Txt size={14} weight={600} color={tokens.ink} numberOfLines={1}>{label}</Txt> : null}
      </PressScale>
    </Animated.View>
  );
}
