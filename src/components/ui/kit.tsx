/**
 * Layout and control primitives. Each maps 1:1 to a helper in design/gen.py
 * (h1, h2, meta, group, card, btn, back, seg, toggle, chip, note, row, wrow).
 */
import { useSimple } from '../../lib/simple';
import { useDockSpace } from '../../lib/dockSpace';
import { useScroller } from '../../lib/landing';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleProp, View, ViewStyle, Platform, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import Txt, { Dot } from './Txt';
import LineIcon, { LineName } from './LineIcon';
import PressScale from './PressScale';
import { Tile, ClayIcon } from './Clay';
import { ClayName } from '../../lib/clayIcons';
import { tokens, springs, rise, rowIn, rowOut, rowLayout, motion, easing } from '../../theme';
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
};

export function Screen({ children, tab, footer, bg = tokens.bg, gap = 14, scroll = true, padTop = 8, padBottom = 0, scrollRef, onScrollY }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // The talk dock floats over the end of every screen (Julian 27.10.), so leave room for it.
  const dock = useDockSpace();
  // Einfache Version: no floating tab bar, the dock already holds the tabs.
  const simple = useSimple();
  const own = useRef<ScrollView>(null);
  const ref = scrollRef ?? own;
  const track = useScroller(ref);
  const bottom = (tab && !simple ? 110 + insets.bottom : tab ? 24 + insets.bottom : footer ? 16 : 34 + insets.bottom) + padBottom + (footer ? 0 : dock);
  // Content arrives instead of appearing (docs/MOTION.md).
  const content = (
    <Animated.View entering={rise()} style={{ gap, paddingHorizontal: 18, paddingTop: padTop, paddingBottom: bottom, flexGrow: 1 }}>{children}</Animated.View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
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

export function H1({ children, sub, right, size = 34, dot }: { children: React.ReactNode; sub?: string; right?: React.ReactNode; size?: number; dot?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {sub ? <Txt size={15} color={tokens.sub}>{sub}</Txt> : null}
        <Txt size={size} line={Math.round(size * 1.18)} weight={700} tracking={-1}>
          {children}<Dot color={dot} />
        </Txt>
      </View>
      {right}
    </View>
  );
}

export function H2({ children, right }: { children: React.ReactNode; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Txt size={19} line={26} weight={600} tracking={-0.3}>{children}</Txt>
      {right ? <Txt size={14} color={tokens.sub}>{right}</Txt> : null}
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
 * White rows separated by 1px hairlines inside one rounded block. Rows rise
 * in one stagger apart on first show; later rows fade in or out and their
 * neighbours slide into place. Give rows a key so the right one leaves.
 */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  return (
    <Animated.View layout={rowLayout} style={[{ borderRadius: 20, overflow: 'hidden', backgroundColor: tokens.row }, style]}>
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

export function Card({ children, pad = 16, gap = 12, style, radius = 22 }: { children: React.ReactNode; pad?: number; gap?: number; style?: StyleProp<ViewStyle>; radius?: number }) {
  return <View style={[{ padding: pad, borderRadius: radius, backgroundColor: tokens.row, gap }, style]}>{children}</View>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: tokens.noteBg }}>
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

/** Primary = the one dark element on the screen. Secondary = white with hairline. */
export function Btn({ label, onPress, primary = true, icon, style, height = 54, disabled }: BtnProps) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        {
          height, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
          backgroundColor: primary ? tokens.ink : tokens.row,
          borderWidth: primary ? 0 : 1, borderColor: tokens.hair, opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon ? <LineIcon name={icon} size={20} color={primary ? tokens.onInk : tokens.ink} /> : null}
      <Txt size={16} weight={600} color={primary ? tokens.onInk : tokens.ink}>{label}</Txt>
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

export function RoundButton({ icon, onPress, label, bg = tokens.row, size = 40, color = tokens.ink }: { icon: LineName; onPress?: () => void; label: string; bg?: string; size?: number; color?: string }) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={label} hitSlop={6} style={{ width: size, height: size, borderRadius: 999, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <LineIcon name={icon} size={20} color={color} />
    </PressScale>
  );
}

/** Back button left, optional centre content (dots, meta), spacer right. */
export function BackBar({ center, onBack }: { center?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
      <RoundButton icon="back" label={tx('Zurück', 'Back')} onPress={onBack ?? goBack} />
      {center ?? null}
      <View style={{ width: 40 }} />
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
  const x = useSharedValue(idx);
  useEffect(() => { x.value = withSpring(idx, springs.smooth); }, [idx]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * w }] }));
  const onLayout = (e: LayoutChangeEvent) => setW((e.nativeEvent.layout.width - 8) / items.length);
  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: tokens.segBg }}>
      {w ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, top: 4, width: w, height, borderRadius: 999, backgroundColor: tokens.segOn }, shadowSm, pill]} /> : null}
      {items.map((it) => {
        const on = it.key === value;
        return (
          <PressScale
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            scale={0.95}
            onPress={() => { if (!on) { haptics.select(); onChange(it.key); } }}
            style={{
              flex: 1, height, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              backgroundColor: !w && on ? tokens.segOn : 'transparent',
            }}
          >
            <Txt size={14.5} weight={on ? 600 : 400} color={on ? tokens.ink : tokens.sub}>{it.label}</Txt>
          </PressScale>
        );
      })}
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
  return onPress ? <PressScale onPress={onPress} style={st}>{body}</PressScale> : <View style={st}>{body}</View>;
}

/**
 * The check circle. "Erledigt nur per Tipp auf den Haken" (Julian): this is
 * the only way to complete something. Completing is a rare moment, so the
 * fill gets one short spring.
 */
export function Check({ done, onPress, size = 26 }: { done: boolean; onPress?: () => void; size?: number }) {
  const v = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    // Calm, not playful (Julian 28.10.): the fill settles in once, no bounce.
    v.value = withTiming(done ? 1 : 0, { duration: done ? motion.micro : 120, easing: easing.out });
  }, [done]);
  const fill = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.8 + 0.2 * v.value }] }));
  const inner = (
    <Animated.View style={[{ width: size, height: size, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[{ position: 'absolute', top: -1.5, left: -1.5, width: size, height: size, borderRadius: 999, backgroundColor: tokens.done, alignItems: 'center', justifyContent: 'center' }, fill]}>
        <LineIcon name="check" size={size * 0.62} color={tokens.onInk} stroke={2.4} />
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

/** A white row: optional time, clay icon or tile, title + meta, owner/right. */
export function Row({ icon, title, sub, subColor, right, time, strike, onPress, lead = 'clay', tileSize = 48 }: RowProps) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: lead === 'tile' ? 10 : 12, paddingHorizontal: 14, paddingLeft: lead === 'tile' ? 10 : 14, backgroundColor: tokens.row }}>
      {time !== undefined ? <Txt size={13.5} weight={600} style={{ width: 44 }}>{time}</Txt> : null}
      {lead === 'clay' ? <ClayIcon name={icon} size={46} celebrate={strike} /> : <Tile name={icon} size={tileSize} radius={tileSize >= 48 ? 16 : 14} celebrate={strike} />}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt size={16} line={21} weight={600} strike={strike} color={strike ? tokens.mute : tokens.ink} numberOfLines={2}>{title}</Txt>
        {sub ? <Meta color={subColor}>{sub}</Meta> : null}
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
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderRadius: 20, backgroundColor: tokens.row,
        borderWidth: selected ? 1.5 : 0, borderColor: tokens.ink, margin: selected ? 0 : 0,
      }}
    >
      {empty || !icon ? (
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tokens.chipBg, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="plus" size={20} color={tokens.sub} />
        </View>
      ) : (
        <Tile name={icon} size={48} radius={14} />
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Txt size={16} line={21} weight={600}>{title}</Txt>
        {sub ? <Meta>{sub}</Meta> : null}
      </View>
      {right ?? (selected ? <LineIcon name="check" size={18} stroke={2.2} /> : null)}
    </PressScale>
  );
}

/** Plain line row inside a Group: line icon, value, right (meta + chevron). */
export function LineRow({ icon, value, right, onPress, weight = 600, color = tokens.ink, lead }: { icon?: LineName; value: string; right?: React.ReactNode; onPress?: () => void; weight?: 400 | 500 | 600; color?: string; lead?: React.ReactNode }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: tokens.row }}>
      {lead ?? (icon ? <LineIcon name={icon} size={20} color={tokens.sub} /> : null)}
      <Txt size={16} weight={weight} color={color} style={{ flex: 1 }}>{value}</Txt>
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
    <PressScale onPress={onPress} scale={0.985} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: tokens.row }}>
      <LineIcon name="plus" size={20} color={tokens.sub} />
      <Txt size={16} color={tokens.mute} style={{ flex: 1 }}>{label}</Txt>
      {mic ? <LineIcon name="mic" size={20} color={tokens.sub} /> : null}
    </PressScale>
  );
}

export function SheetHandle() {
  return <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tokens.dotOff }} />;
}
