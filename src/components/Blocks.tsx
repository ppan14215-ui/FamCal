/**
 * The building blocks a list row shows when its list has a blueprint
 * (Julian 27.10.: "Listen, die sich anpassen"): cover, stars, the seen pill
 * and short facts. Each block reads one field of Item.data and shows nothing
 * when it is empty, so a blueprint can name blocks a row does not fill yet.
 */
import React, { useEffect } from 'react';
import { View, Image, Linking } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { Chip } from './ui/kit';
import { tokens, personPalette, shade } from '../theme';
import { haptics } from '../lib/haptics';
import type { Block, Blueprint, ItemData } from '../state/types';
import { tx } from '../i18n/lang';

const W = 48;
const H = 68;

/** A soft colour per title, so placeholders differ but stay calm. */
const paletteOf = (title: string) => shade(personPalette[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % personPalette.length]);

/** Poster or book cover. While the server looks, it breathes; without one, the first letter on a tinted card. */
export function Cover({ title, data }: { title: string; data?: ItemData }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = data?.looking ? withRepeat(withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true) : withTiming(1, { duration: 200 });
  }, [data?.looking]);
  const breathe = useAnimatedStyle(() => ({ opacity: o.value }));
  const p = paletteOf(title);
  const box = { width: W, height: H, borderRadius: 10, overflow: 'hidden' as const };
  if (data?.cover) return <Image source={{ uri: data.cover }} style={[box, { backgroundColor: tokens.chipBg }]} resizeMode="cover" accessibilityIgnoresInvertColors />;
  return (
    <Animated.View style={[box, { backgroundColor: data?.looking ? tokens.chipBg : p.bg, alignItems: 'center', justifyContent: 'center' }, breathe]}>
      {data?.looking ? null : <Txt size={22} weight={700} color={p.fg}>{(title.trim()[0] ?? '?').toUpperCase()}</Txt>}
    </Animated.View>
  );
}

const STAR = 'M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z';

/** Five small stars; tapping the set star again clears it. */
export function Stars({ value = 0, onChange }: { value?: number; onChange: (n: number | undefined) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={tx(`${value} von 5 Sternen`, `${value} of 5 stars`)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <PressScale key={n} hitSlop={4} scale={0.85} accessibilityLabel={tx(`${n} Sterne`, `${n} stars`)} onPress={() => { haptics.select(); onChange(n === value ? undefined : n); }}>
          <Svg width={17} height={17} viewBox="0 0 24 24">
            <Path d={STAR} fill={n <= value ? '#E0A526' : 'none'} stroke={n <= value ? '#E0A526' : tokens.circleLine} strokeWidth={1.6} strokeLinejoin="round" />
          </Svg>
        </PressScale>
      ))}
    </View>
  );
}

/** "Gesehen", "Gelesen": the row stays where it is and only dims. */
export function SeenPill({ label, seen, onToggle }: { label: string; seen?: boolean; onToggle: () => void }) {
  return (
    <PressScale
      accessibilityRole="switch"
      accessibilityState={{ checked: !!seen }}
      hitSlop={8}
      onPress={() => { haptics.select(); onToggle(); }}
      style={{ height: 28, paddingHorizontal: 11, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: seen ? tokens.doneSoft : 'transparent', borderWidth: 1, borderColor: seen ? tokens.doneSoft : tokens.hair }}
    >
      <Txt size={12.5} weight={600} color={seen ? tokens.done : tokens.sub}>{seen ? `✓ ${label}` : label}</Txt>
    </PressScale>
  );
}

/** "2019 · Greta Gerwig" in the order the blueprint names them. */
export function factLine(bp: Blueprint, data?: ItemData): string | undefined {
  const parts = bp.blocks.map((b) => (b === 'year' ? data?.year : b === 'by' ? data?.by : undefined)).filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

const has = (bp: Blueprint, b: Block) => bp.blocks.includes(b);

/** Price, place, date, link and note as short chips; the link opens. */
export function FactChips({ bp, data, note }: { bp: Blueprint; data?: ItemData; note?: string }) {
  const chips: React.ReactNode[] = [];
  if (has(bp, 'price') && data?.price) chips.push(<Chip key="price" height={24}>{data.price}</Chip>);
  if (has(bp, 'place') && data?.place) chips.push(<Chip key="place" height={24}>{data.place}</Chip>);
  if (has(bp, 'date') && data?.date) chips.push(<Chip key="date" height={24}>{data.date}</Chip>);
  if (has(bp, 'link') && data?.link) {
    const host = data.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    chips.push(<Chip key="link" height={24} onPress={() => Linking.openURL(data.link!).catch(() => {})}>{`↗ ${host}`}</Chip>);
  }
  if (has(bp, 'note') && note) chips.push(<Chip key="note" height={24} color={tokens.sub}>{note}</Chip>);
  return chips.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{chips}</View> : null;
}

export { has as hasBlock };
