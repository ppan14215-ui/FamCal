/**
 * The building blocks a list row shows when its list has a blueprint
 * (Julian 27.10.: "Listen, die sich anpassen"): cover, stars, the seen pill
 * and short facts. Each block reads one field of Item.data and shows nothing
 * when it is empty, so a blueprint can name blocks a row does not fill yet.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, Linking } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { Chip } from './ui/kit';
import { tokens, personPalette, shade, persons, type PersonId } from '../theme';
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

/** 7,8 the German way, 7.8 the English way. */
export const scoreText = (n: number) => tx(n.toFixed(1).replace('.', ','), n.toFixed(1));

/**
 * Score out of 10 for films and series (Julian 29.10.: "mit 7,8/10 bewertbar, wie bei
 * Rotten Tomatoes"). Each parent rates on their own; the chip shows yours and the
 * partner's. Tap opens a bar: drag or tap sets the score in steps of 0.1.
 */
export function Score({ scores, me, onChange }: { scores?: Partial<Record<PersonId, number>>; me: PersonId; onChange: (n: number | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [w, setW] = useState(0);
  const mine = scores?.[me];
  const other: PersonId = me === 'J' ? 'T' : 'J';
  const theirs = scores?.[other];
  const [draft, setDraft] = useState<number | undefined>(mine);
  useEffect(() => { if (!open) setDraft(mine); }, [mine, open]);
  const at = (x: number) => { if (!w) return; const v = Math.round(Math.min(10, Math.max(0, (x / w) * 10)) * 10) / 10; setDraft(v); };
  const tick = () => haptics.select();
  const pan = Gesture.Pan().minDistance(0)
    .onBegin((e) => { scheduleOnRN(at, e.x); scheduleOnRN(tick); })
    .onUpdate((e) => { scheduleOnRN(at, e.x); });
  const chip = (p: PersonId, v: number) => (
    <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 999, backgroundColor: persons[p].tint }}>
      <Txt size={13} weight={700} color={persons[p].ink}>{scoreText(v)}</Txt>
      <Txt size={11.5} color={persons[p].ink}>{p === me ? tx('du', 'you') : persons[p].name}</Txt>
    </View>
  );
  if (!open) {
    return (
      <PressScale onPress={() => { haptics.select(); setOpen(true); }} accessibilityLabel={tx('Bewerten, von 0 bis 10', 'Rate from 0 to 10')} style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-start' }}>
        {mine != null ? chip(me, mine) : <Chip height={26}>{tx('Bewerten · /10', 'Rate · /10')}</Chip>}
        {theirs != null ? chip(other, theirs) : null}
      </PressScale>
    );
  }
  const v = draft ?? 5;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Txt size={22} weight={700} color={persons[me].ink}>{draft == null ? '–' : scoreText(v)}</Txt>
        <Txt size={13} color={tokens.sub}>/10</Txt>
      </View>
      <GestureDetector gesture={pan}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 32, justifyContent: 'center' }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: tokens.chipBg, overflow: 'hidden' }}>
            <View style={{ width: `${v * 10}%`, height: 8, backgroundColor: persons[me].ink }} />
          </View>
          <View style={{ position: 'absolute', left: Math.max(0, (v / 10) * w - 11), width: 22, height: 22, borderRadius: 11, backgroundColor: tokens.bg, borderWidth: 2, borderColor: persons[me].ink }} />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip height={28} bg={tokens.doneSoft} onPress={() => { haptics.success(); onChange(draft ?? 5); setOpen(false); }}>{tx('Fertig', 'Done')}</Chip>
        {mine != null ? <Chip height={28} onPress={() => { haptics.select(); onChange(undefined); setOpen(false); }}>{tx('Entfernen', 'Remove')}</Chip> : null}
        <Chip height={28} onPress={() => { setDraft(mine); setOpen(false); }}>{tx('Abbrechen', 'Cancel')}</Chip>
      </View>
    </View>
  );
}
