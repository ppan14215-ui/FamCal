/**
 * A sentence with what Memo understood shown in it (Julian 24.11.2026: names, Termine and places recognized "like
 * text within the text message, just like in the video"). Names wear the person's colour, times paper grey, the
 * Termin word warm, places green. Only for showing text: a TextInput cannot colour parts of itself, so the input
 * line stays as it is.
 *
 * Motion (docs/MOTION.md, Allo film trick 4 "birth from a dot"): a fresh tag's ground grows out of a dot at the
 * word's left edge, first round, then wide, in 280 ms, critically damped, no overshoot; tags after each other start
 * 80 ms apart. Transform only. Old messages and reduced motion show the end state at once.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, useReducedMotion, Easing } from 'react-native-reanimated';
import Txt from './ui/Txt';
import { allColors, personPalette, shade, Weight } from '../theme';
import { usePersons } from './ui/Person';
import { useStore } from '../state/store';
import { tagSegments, hasTags, Seg, TagKind, TagNames } from '../lib/tags';

// One quiet chip for every kind (Julian 24.11. 21:43: the coloured tags mixed with the coloured bubbles, "zu bunt").
// White on the light bubbles like the chip on white in the film, a soft light veil on dark ground. The bubble keeps
// the only colour: who wrote it.
const CHIP = { bg: '#FFFFFF', ring: '0 0 0 1px rgba(25,25,25,0.07), 0 1px 2px rgba(25,25,25,0.06)' };
const CHIP_DARK = { bg: 'rgba(255,255,255,0.16)', ring: undefined };
const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** Everyone the family has, with their colours: the two parents and every child or grandparent. */
export function useTagNames(): TagNames {
  const ps = usePersons();
  const people = useStore((s) => s.people);
  return useMemo(() => {
    const out: TagNames = [];
    for (const p of Object.values(ps) as { name: string; tint: string; ink: string }[]) if (p?.name) out.push({ name: p.name, bg: p.tint, fg: p.ink });
    for (const p of people) {
      if (!p.name || out.some((o) => o.name === p.name)) continue;
      const c = shade(allColors.find((x) => x.name === p.color) ?? personPalette[2]);
      out.push({ name: p.name, bg: c.bg, fg: c.fg });
    }
    return out;
  }, [ps, people]);
}

function Pill({ seg, size, line, weight, born, delay, steady, dark, color }: { seg: Seg; size: number; line: number; weight: Weight; born: boolean; delay: number; steady?: boolean; dark?: boolean; color?: string }) {
  const still = useReducedMotion();
  const c = dark ? CHIP_DARK : CHIP;
  const grow = useSharedValue(born && !still ? 0 : 1);
  useEffect(() => {
    if (grow.value < 1) grow.value = withDelay(delay, withTiming(1, { duration: 280, easing: EASE }));
  }, []);
  // Round first (height leads), then wide: the dot becomes a circle, the circle a pill.
  const ground = useAnimatedStyle((): any => {
    const g = grow.value;
    return { opacity: g > 0 ? 1 : 0, transform: [{ scaleX: 0.12 + 0.88 * Math.min(1, Math.max(0, (g - 0.25) / 0.75)) }, { scaleY: 0.35 + 0.65 * Math.min(1, g / 0.45) }] };
  });
  return (
    <View style={steady ? undefined : { marginHorizontal: 1, paddingHorizontal: 5 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: steady ? -4 : 0, right: steady ? -4 : 0, top: 0, bottom: 0, borderRadius: 8, backgroundColor: c.bg, boxShadow: c.ring, transformOrigin: 'left center' } as any, ground]} />
      <Txt size={size} line={line} weight={weight} color={color}>{seg.text}</Txt>
    </View>
  );
}

/**
 * The text with its tags. `titles`: the Termin titles Memo made of it. `tail`: words still being heard, shown muted
 * and never tagged. `animate`: the tags are new (a fresh message, or live speech), so they are born; else they just stand.
 */
export default function TagText({ text, tail, size = 16, line, weight = 400, color, tailColor, titles, animate, steady, dark }: { text: string; tail?: string; size?: number; line?: number; weight?: Weight; color?: string; tailColor?: string; titles?: string[]; animate?: boolean; /** Live text: the tag's ground sits behind the word without taking room, so no word moves when a tag appears. */ steady?: boolean; /** Dark ground (my ink bubble, the speaking card): the chip is a light veil instead of white. */ dark?: boolean }) {
  const names = useTagNames();
  const segs = useMemo(() => tagSegments(text, { names, titles }), [text, names, titles?.join('|')]);
  const lh = line ?? Math.round(size * 1.38);
  // Tags in a message that arrives together start one after another; a tag heard later while speaking starts at once.
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  if (!hasTags(segs)) {
    return (
      <Txt size={size} line={line} weight={weight} color={color}>
        {text}
        {tail ? <Txt size={size} line={line} weight={weight} color={tailColor}>{text ? ' ' : ''}{tail}</Txt> : null}
      </Txt>
    );
  }
  // Plain words one by one, so the line still breaks between words; a tag stays whole.
  const parts: React.ReactNode[] = [];
  const count: Partial<Record<TagKind, number>> = {};
  let born = 0;
  segs.forEach((s, i) => {
    if (!s.kind) {
      for (const [j, w] of (s.text.match(/\S+\s*|\s+/g) ?? []).entries()) parts.push(<Txt key={`w${i}.${j}`} size={size} line={lh} weight={weight} color={color}>{w}</Txt>);
      return;
    }
    // Keyed by kind and order, not by the words: a time that grows while you speak ("Dienstag" > "Dienstag um 16") stays the same tag.
    count[s.kind] = (count[s.kind] ?? 0) + 1;
    parts.push(<Pill key={`${s.kind}${count[s.kind]}`} seg={s} size={size} line={lh} weight={weight} born={!!animate} delay={animate && first.current ? 80 * born++ : 0} steady={steady} dark={dark} color={color} />);
  });
  if (tail) for (const [j, w] of (` ${tail}`.match(/\S+\s*|\s+/g) ?? []).entries()) parts.push(<Txt key={`t${j}`} size={size} line={lh} weight={weight} color={tailColor}>{w}</Txt>);
  return <View accessible accessibilityLabel={tail ? `${text} ${tail}` : text} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginHorizontal: steady ? 0 : -1 }}>{parts}</View>;
}

/** The titles of the Termine Memo made from a message, so the Termin word in the sentence can be shown. */
export function useMadeTitles(ids?: string[], snap?: { id: string; title: string }[]): string[] | undefined {
  const events = useStore((s) => s.events);
  return useMemo(() => {
    if (!ids?.length) return undefined;
    return ids.map((id) => (events.find((e) => e.id === id) ?? snap?.find((e) => e.id === id))?.title).filter((t): t is string => !!t);
  }, [ids?.join('|'), events, snap]);
}
