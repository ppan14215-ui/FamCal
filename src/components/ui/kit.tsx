/**
 * Layout and control primitives. Each maps 1:1 to a helper in design/gen.py
 * (h1, h2, meta, group, card, btn, back, seg, toggle, chip, note, row, wrow).
 */
import { useDockSpace } from '../../lib/dockSpace';
import { useScroller, useHeadUnder } from '../../lib/landing';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleProp, View, ViewStyle, Platform, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolateColor, makeMutable, type SharedValue } from 'react-native-reanimated';
import Txt, { Dot } from './Txt';
import LineIcon, { LineName } from './LineIcon';
import PressScale from './PressScale';
import { Tile, ClayIcon } from './Clay';
import { ClayName } from '../../lib/clayIcons';
import { tokens, springs, rise, rowIn, rowOut, rowLayout, motion, easing, glass, fonts } from '../../theme';
import { goBack } from '../../lib/nav';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';

// ─── Screen ────────────────────────────────────────────────────────────────

type ScreenProps = {
  children: React.ReactNode;
  /** Tab screens leave room for the floating nav. */
  tab?: boolean;
  /** Pinned below the scroll area (main action). */
  footer?: React.ReactNode;
  bg?: string;
  gap?: number;
  scroll?: boolean;
  padTop?: number;
  /** Extra room at the end, e.g. for the talk field docked above the nav. */
  padBottom?: number;
  /** For screens that scroll something into view themselves. */
  scrollRef?: React.RefObject<ScrollView | null>;
  onScrollY?: (y: number) => void;
  /** Stays put above the scroll area: title and switches (Julian 30.10.: "Der Header Bereich sollte nicht mit scrollen"). */
  head?: React.ReactNode;
  /** Room under the head, see Head. */
  headEnd?: number;
};

/**
 * A screen's title and switches, standing still above what scrolls (Julian 30.10.: "padding im Header",
 * "sehr flach"): room above and below, and a soft fade where the content slides under it.
 */
export function Head({ children, gap = 14, bg = tokens.bg, pad = 18, end = 10 }: { children: React.ReactNode; gap?: number; bg?: string; pad?: number; /** Room under the last thing in the head; 0 when it ends on a hairline (the word tabs). */ end?: number }) {
  // Once content lies under the head, a very faint shadow shows the edge (Julian 31.10.: "sehr subtil").
  const under = useHeadUnder();
  const shade = useSharedValue(under ? 1 : 0);
  useEffect(() => { shade.value = withTiming(under ? 1 : 0, { duration: 220 }); }, [under]);
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));
  return (
    <View style={{ zIndex: 2, paddingHorizontal: pad, paddingTop: 16, paddingBottom: end, gap, backgroundColor: bg }}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: -10, height: 10, zIndex: 1 }, shadeStyle]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="headshade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.06} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#headshade)" />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -18, height: 18 }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="headfade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={bg} stopOpacity={1} />
              <Stop offset="1" stopColor={bg} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#headfade)" />
        </Svg>
      </View>
    </View>
  );
}

export function Screen({ children, head, headEnd, tab, footer, bg = tokens.bg, gap = 14, scroll = true, padTop = 8, padBottom = 0, scrollRef, onScrollY }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // The talk dock floats over the end of every screen (Julian 27.10.), so leave room for it.
  const dock = useDockSpace();
  const own = useRef<ScrollView>(null);
  const ref = scrollRef ?? own;
  const track = useScroller(ref);
  const bottom = (tab ? 110 + insets.bottom : footer ? 16 : 34 + insets.bottom) + padBottom + (footer ? 0 : dock);
  // Content arrives instead of appearing (docs/MOTION.md).
  const content = (
    <Animated.View entering={rise()} style={{ gap, paddingHorizontal: 18, paddingTop: padTop, paddingBottom: bottom, flexGrow: 1 }}>{children}</Animated.View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {head ? <Head gap={gap} bg={bg} end={headEnd}>{head}</Head> : null}
      {scroll ? (
        <ScrollView ref={ref} onScroll={(e) => { track(e.nativeEvent.contentOffset.y); onScrollY?.(e.nativeEvent.contentOffset.y); }} scrollEventThrottle={16} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
      {footer ? <Animated.View entering={rise(2)} style={{ paddingHorizontal: 18, paddingBottom: 18 + insets.bottom, paddingTop: 8, gap: 8 }}>{footer}</Animated.View> : null}
    </View>
  );
}

// ─── Type ──────────────────────────────────────────────────────────────────

/**
 * Screen title in the klar look as Julian approved it, before the Recordings style (14.11. 09:33: "das Design vor
 * dem orangen Button Einfluss"): semibold, no period. A short info stands behind it on the same line, a long one
 * under it. `dot` is kept for callers and ignored.
 */
export function H1({ children, sub, right, size = 29 }: { children: React.ReactNode; sub?: string; right?: React.ReactNode; size?: number; dot?: string }) {
  const inline = !!sub && sub.length <= 16;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
          <Txt size={size} line={Math.round(size * 1.18)} weight={600} tracking={-size * 0.025} numberOfLines={1} style={{ flexShrink: 1 }}>{children}</Txt>
          {inline ? <Txt size={16} line={21} color={tokens.sub} numberOfLines={1}>{sub}</Txt> : null}
        </View>
        {sub && !inline ? <Txt size={14} line={19} color={tokens.sub} numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

/** Section label over a flat group: small caps, grey, an optional count on the right. */
export function H2({ children, right }: { children: React.ReactNode; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 }}>
      <Txt size={12} line={16} weight={600} tracking={0.7} color={tokens.sub} style={{ textTransform: 'uppercase' }}>{children}</Txt>
      {right ? <Txt size={12} line={16} weight={600} color={tokens.sub}>{right}</Txt> : null}
    </View>
  );
}

export function Meta({ children, color = tokens.sub, numberOfLines }: { children: React.ReactNode; color?: string; numberOfLines?: number }) {
  return <Txt size={13.5} line={19} color={color} numberOfLines={numberOfLines}>{children}</Txt>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <Txt size={16} line={24} color={tokens.sub} style={{ marginTop: -8 }}>{children}</Txt>;
}

// ─── Surfaces ──────────────────────────────────────────────────────────────

/**
 * Flat rows separated by 1px hairlines, straight on the ground (klar look, Julian 13.11.: dense, no white blocks). Rows rise
 * in one stagger apart on first show; later rows fade in or out and their
 * neighbours slide into place. Give rows a key so the right one leaves.
 */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  return (
    <Animated.View layout={rowLayout} style={style}>
      {kids.map((k, i) => (
        <Animated.View
          key={(k as React.ReactElement).key ?? i}
          entering={first.current ? rise(i) : rowIn}
          exiting={rowOut}
          layout={rowLayout}
          style={i > 0 ? { borderTopWidth: 1, borderTopColor: tokens.hair } : undefined}
        >
          {k}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export function Card({ children, pad = 14, gap = 12, style, radius = 18 }: { children: React.ReactNode; pad?: number; gap?: number; style?: StyleProp<ViewStyle>; radius?: number }) {
  return <View style={[{ padding: pad, borderRadius: radius, gap }, glass.line, style]}>{children}</View>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: tokens.noteBg }}>
      <LineIcon name="sparkle" size={16} color={tokens.sub} />
      <Txt size={13.5} line={19} color={tokens.sub} style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

export function Hint({ children, center, icon }: { children: React.ReactNode; center?: boolean; icon?: LineName }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: center ? 'center' : 'flex-start' }}>
      {icon ? <LineIcon name={icon} size={16} color={tokens.sub} /> : null}
      <Txt size={13.5} line={19} color={tokens.sub} center={center} style={icon ? { flex: 1 } : undefined}>{children}</Txt>
    </View>
  );
}

// ─── Controls ──────────────────────────────────────────────────────────────

type BtnProps = { label: string; onPress?: () => void; primary?: boolean; icon?: LineName; style?: StyleProp<ViewStyle>; height?: number; disabled?: boolean };

/** Primary = the solid ink pill. Secondary = a glass pill (klar look: glass only on things you press). */
export function Btn({ label, onPress, primary = true, icon, style, height = 50, disabled }: BtnProps) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        {
          height, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
          opacity: disabled ? 0.4 : 1,
        },
        primary ? { backgroundColor: tokens.ink } : glass.sm,
        style,
      ]}
    >
      {icon ? <LineIcon name={icon} size={18} color={primary ? tokens.onInk : tokens.ink} /> : null}
      <Txt size={15.5} weight={600} color={primary ? tokens.onInk : tokens.ink}>{label}</Txt>
    </PressScale>
  );
}

export function TextLink({ label, onPress, color = tokens.sub, weight = 600 }: { label: string; onPress?: () => void; color?: string; weight?: 400 | 600 }) {
  return (
    <PressScale onPress={onPress} hitSlop={10} scale={0.94} style={{ alignSelf: 'center', paddingVertical: 4 }}>
      <Txt size={15} weight={weight} color={color} center>{label}</Txt>
    </PressScale>
  );
}

export function RoundButton({ icon, onPress, label, bg, size = 38, color = tokens.ink }: { icon: LineName; onPress?: () => void; label: string; bg?: string; size?: number; color?: string }) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={label} hitSlop={6} style={[{ width: size, height: size, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }, bg ? { backgroundColor: bg } : glass.sm]}>
      <LineIcon name={icon} size={19} color={color} />
    </PressScale>
  );
}

/** Back button left, optional centre content (dots, meta), spacer right. */
export function BackBar({ center, onBack }: { center?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
      <RoundButton icon="back" label={tx('Zurück', 'Back')} onPress={onBack ?? goBack} />
      {center ?? null}
      <View style={{ width: 38 }} />
    </View>
  );
}

export function CancelBar({ onCancel, right }: { onCancel?: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
      <PressScale hitSlop={10} scale={0.94} onPress={onCancel ?? goBack}>
        <Txt size={15} color={tokens.sub}>{tx('Abbrechen', 'Cancel')}</Txt>
      </PressScale>
      {right ?? <View />}
    </View>
  );
}

export function StepDots({ i, n = 8 }: { i: number; n?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: n }).map((_, j) => (
        <View key={j} style={{ width: j === i ? 18 : 6, height: 6, borderRadius: 999, backgroundColor: j <= i ? tokens.ink : tokens.dotOff }} />
      ))}
    </View>
  );
}

/**
 * Segmented control on a grey track; the white pill slides to the tapped
 * item on a spring instead of jumping.
 */
export function Seg<T extends string>({ items, value, onChange, height = 34 }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void; height?: number }) {
  const idx = Math.max(0, items.findIndex((it) => it.key === value));
  const [w, setW] = useState(0);
  // Julian 31.10. 18:20: on the phone a fresh switch (each Kalender view draws its own header) showed the pill at the
  // OLD tab for a frame: a position shared across mounts is stale on the JS side. Each switch now owns its position and
  // starts right on its tab; the tap glides the old one first (140 ms) before the new view takes over.
  const x = useSharedValue(idx);
  useEffect(() => { if (Math.abs(x.value - idx) > 0.001) x.value = withSpring(idx, springs.smooth); }, [idx]);
  // The pill glides on the tap itself; the new view comes once the glide is mostly done, so building it never holds the glide (Julian 31.10.: "lag").
  const pick = (k: T, i: number) => { x.value = withSpring(i, springs.smooth); setTimeout(() => onChange(k), 140); };
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * w }] }));
  const onLayout = (e: LayoutChangeEvent) => setW((e.nativeEvent.layout.width - 8) / items.length);
  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: tokens.segBg }}>
      {w ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, top: 4, width: w, height, borderRadius: 999 }, glass.sm, pill]} /> : null}
      {items.map((it) => {
        const on = it.key === value;
        return (
          <PressScale
            key={it.key}
            accessibilityRole="tab"
            accessibilityLabel={it.label}
            accessibilityState={{ selected: on }}
            scale={0.95}
            onPress={() => { if (!on) { haptics.select(); pick(it.key, items.indexOf(it)); } }}
            style={{
              flex: 1, height, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              backgroundColor: !w && on ? tokens.segOn : 'transparent',
            }}
          >
            <Txt size={14} weight={on ? 600 : 500} color={on ? tokens.ink : tokens.sub}>{it.label}</Txt>
          </PressScale>
        );
      })}
    </View>
  );
}

/**
 * The view switch as words on a hairline, as in the klar draft Julian approved: the chosen word is ink and
 * semibold, and a short ink line under it glides to the tapped word (transform only) before the new view comes.
 */
const TAB_LINE = 100;
export function Tabs<T extends string>({ items, value, onChange, bleed = 0 }: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void; /** How far the hairline reaches past both sides, into the screen's gutter. */ bleed?: number }) {
  const [at, setAt] = useState<Record<string, { x: number; w: number }>>({});
  const cur = at[value];
  const x = useSharedValue(0), w = useSharedValue(0);
  const placed = useRef(false);
  const glide = (p: { x: number; w: number }) => {
    x.value = withTiming(p.x, { duration: motion.base, easing: easing.out });
    w.value = withTiming(p.w, { duration: motion.base, easing: easing.out });
  };
  useEffect(() => {
    if (!cur) return;
    if (!placed.current) { placed.current = true; x.value = cur.x; w.value = cur.w; } else glide(cur);
  }, [cur?.x, cur?.w]);
  const line = useAnimatedStyle(() => ({ opacity: w.value > 0 ? 1 : 0, transform: [{ translateX: x.value }, { scaleX: w.value / TAB_LINE }] as const }));
  return (
    <View style={{ marginHorizontal: -bleed, paddingHorizontal: bleed, borderBottomWidth: 1, borderBottomColor: tokens.hair }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 20 }}>
        {items.map((it) => {
          const on = it.key === value;
          return (
            <View key={it.key} onLayout={(e) => { const { x: lx, width } = e.nativeEvent.layout; setAt((m) => (m[it.key]?.x === lx && m[it.key]?.w === width ? m : { ...m, [it.key]: { x: lx, w: width } })); }}>
              <PressScale accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }} scale={0.96} hitSlop={{ top: 8, bottom: 6, left: 9, right: 9 }}
                onPress={() => { if (on) return; haptics.select(); const p = at[it.key]; if (p) glide(p); setTimeout(() => onChange(it.key), 140); }}
                style={{ paddingTop: 4, paddingBottom: 9 }}>
                <Txt size={16.5} line={21} weight={on ? 600 : 400} color={on ? tokens.ink : tokens.sub}>{it.label}</Txt>
              </PressScale>
            </View>
          );
        })}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, bottom: -1, width: TAB_LINE, height: 2, borderRadius: 1, backgroundColor: tokens.ink, transformOrigin: '0% 50%' } as any, line]} />
      </View>
    </View>
  );
}

export const shadowSm: ViewStyle = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(0,0,0,.06)' } as any,
  default: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => { x.value = withSpring(value ? 1 : 0, springs.snappy); }, [value]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(x.value, [0, 1], [tokens.dotOff, tokens.done]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }));
  return (
    <PressScale accessibilityRole="switch" accessibilityState={{ checked: value }} hitSlop={8} scale={0.94} onPress={() => { haptics.select(); onChange(!value); }}>
      <Animated.View style={[{ width: 48, height: 28, borderRadius: 999, padding: 3 }, track]}>
        <Animated.View style={[{ width: 22, height: 22, borderRadius: 999, backgroundColor: '#FFFFFF' }, shadowSm, knob]} />
      </Animated.View>
    </PressScale>
  );
}

export function Chip({ children, bg = tokens.chipBg, color = tokens.ink, onPress, icon, height = 30 }: { children?: React.ReactNode; bg?: string; color?: string; onPress?: () => void; icon?: React.ReactNode; height?: number }) {
  const body = (
    <>
      {icon}
      {typeof children === 'string' ? <Txt size={13} weight={600} color={color}>{children}</Txt> : children}
    </>
  );
  // A chosen chip (doneSoft) also gets a teal ring, so it reads as chosen in the dark too (Julian 28.10.).
  const chosen = bg === tokens.doneSoft;
  const st: ViewStyle = { height, paddingHorizontal: chosen ? 10.5 : 12, borderRadius: 999, backgroundColor: bg, borderWidth: chosen ? 1.5 : 0, borderColor: tokens.done, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' };
  // Klar look: a plain chip you can press is glass; one that only tells something stays a flat grey fill.
  return onPress ? <PressScale onPress={onPress} style={[st, bg === tokens.chipBg ? glass.sm : null]}>{body}</PressScale> : <View style={st}>{body}</View>;
}

/**
 * The check circle. "Erledigt nur per Tipp auf den Haken" (Julian): this is
 * the only way to complete something. Completing is a rare moment, so the
 * fill gets one short spring.
 */
export function Check({ done, onPress, size = 24, color = tokens.done }: { done: boolean; onPress?: () => void; size?: number; color?: string }) {
  const v = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    // Calm, not playful (Julian 28.10.): the fill settles in once, no bounce.
    v.value = withTiming(done ? 1 : 0, { duration: done ? motion.micro : 120, easing: easing.out });
  }, [done]);
  const fill = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.8 + 0.2 * v.value }] }));
  const inner = (
    <Animated.View style={[{ width: size, height: size, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[{ position: 'absolute', top: -1.5, left: -1.5, width: size, height: size, borderRadius: 999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }, fill]}>
        <LineIcon name="check" size={size * 0.62} color="#FFFFFF" stroke={2.4} />
      </Animated.View>
    </Animated.View>
  );
  if (!onPress) return inner;
  return (
    <PressScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      hitSlop={10}
      scale={0.92}
      onPress={() => {
        if (!done) haptics.success(); else haptics.tap();
        onPress();
      }}
    >
      {inner}
    </PressScale>
  );
}

// ─── Rows ──────────────────────────────────────────────────────────────────

type RowProps = {
  icon: ClayName;
  title: string;
  sub?: string;
  subColor?: string;
  right?: React.ReactNode;
  time?: string;
  strike?: boolean;
  onPress?: () => void;
  /** 'clay' = bare icon (wrow), 'tile' = tinted tile (row/lrow) */
  lead?: 'clay' | 'tile';
  tileSize?: number;
};

/**
 * A flat, dense row (klar look): optional person bar and time, a small clay icon inline, title with its
 * meta behind it, owner or anything else on the right.
 */
export function Row({ icon, title, sub, subColor, right, time, strike, onPress, bar }: RowProps & { bar?: string }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 8, paddingHorizontal: 2 }}>
      {bar ? <View style={{ width: 2.5, alignSelf: 'stretch', marginVertical: 3, borderRadius: 2, backgroundColor: bar }} /> : null}
      {time !== undefined ? <Txt size={13} weight={500} color={bar ?? tokens.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ width: 42, fontVariant: ['tabular-nums'] }}>{time}</Txt> : null}
      <ClayIcon name={icon} size={26} celebrate={strike} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15.5} line={20} weight={500} strike={strike} color={strike ? tokens.mute : tokens.ink} numberOfLines={2}>{title}</Txt>
        {sub ? <Txt size={13} line={17} color={subColor ?? tokens.sub} numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <PressScale onPress={onPress} scale={0.98}>{body}</PressScale> : body;
}

/** Standalone rounded row (canvas `row()`), e.g. calendar sources, templates. */
export function CardRow({ icon, title, sub, right, onPress, selected, empty }: { icon?: ClayName; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; selected?: boolean; empty?: boolean }) {
  return (
    <PressScale
      onPress={onPress}
      disabled={!onPress}
      scale={0.985}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 14, borderRadius: 16, backgroundColor: tokens.row,
        borderWidth: selected ? 1.5 : 1, borderColor: selected ? tokens.ink : tokens.hair,
      }}
    >
      {empty || !icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="plus" size={18} color={tokens.sub} />
        </View>
      ) : (
        <Tile name={icon} bg="transparent" size={40} radius={12} />
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Txt size={15.5} line={20} weight={600}>{title}</Txt>
        {sub ? <Meta>{sub}</Meta> : null}
      </View>
      {right ?? (selected ? <LineIcon name="check" size={18} stroke={2.2} /> : null)}
    </PressScale>
  );
}

/** Plain line row inside a Group: line icon, value, right (meta + chevron). */
export function LineRow({ icon, value, right, onPress, weight = 600, color = tokens.ink, lead }: { icon?: LineName; value: string; right?: React.ReactNode; onPress?: () => void; weight?: 400 | 500 | 600; color?: string; lead?: React.ReactNode }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingVertical: 11, paddingHorizontal: 2 }}>
      {lead ?? (icon ? <LineIcon name={icon} size={19} color={tokens.sub} /> : null)}
      <Txt size={15.5} weight={weight === 600 ? 500 : weight} color={color} style={{ flex: 1 }}>{value}</Txt>
      {right}
    </View>
  );
  return onPress ? <PressScale onPress={onPress} scale={0.98}>{body}</PressScale> : body;
}

export function Chevron() {
  return <LineIcon name="chev" size={18} color={tokens.mute} />;
}

export function AddRow({ label, onPress, mic }: { label: string; onPress?: () => void; mic?: boolean }) {
  return (
    <PressScale onPress={onPress} scale={0.985} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: tokens.row, borderWidth: 1, borderColor: tokens.hair }}>
      <LineIcon name="plus" size={18} color={tokens.sub} />
      <Txt size={15.5} color={tokens.mute} style={{ flex: 1 }}>{label}</Txt>
      {mic ? <LineIcon name="mic" size={20} color={tokens.sub} /> : null}
    </PressScale>
  );
}

export function SheetHandle() {
  return <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tokens.dotOff }} />;
}
