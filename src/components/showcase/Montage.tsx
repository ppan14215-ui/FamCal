/**
 * Chapter 7, "Und noch mehr" (pattern 8 from Julian's collection): one big word and one real card per
 * beat, read from the demo store. Arzt-Adresse gemerkt (with the Termin row's PinChip), the Rommé
 * scoreboard, and the film watchlist with our own designed covers (never studio posters).
 * The word comes first, the card follows; the next beat replaces both in place (no exit, so the old beat
 * never overlaps the new one rising into the same spot).
 */
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Txt, { Dot } from '../ui/Txt';
import { Tile } from '../ui/Clay';
import { Check } from '../ui/kit';
import { Reply, cardFrame } from '../ChatCards';
import { PinChip } from '../PlaceAsk';
import { CoverArt } from '../Blocks';
import Scoreboard from './cards/Scoreboard';
import { useStore } from '../../state/store';
import { DEMO } from '../../data/demoFamily';
import { tokens, rise } from '../../theme';
import type { MontageCard } from './chapters';
import { tx } from '../../i18n/lang';

export default function Montage({ beat }: { beat: { word: string; card: MontageCard } | null }) {
  if (!beat) return <View style={{ flex: 1 }} />;
  return (
    <View key={beat.word} style={{ flex: 1, gap: 18, paddingTop: 12 }}>
      <Animated.View entering={rise(0)}>
        <Txt size={44} line={50} weight={700} tracking={-1.5}>{beat.word}<Dot /></Txt>
      </Animated.View>
      <Animated.View entering={rise(3)}>
        {beat.card === 'memory' ? <MemoryCard /> : beat.card === 'score' ? <ScoreCard /> : <WatchCard />}
      </Animated.View>
    </View>
  );
}

function Footer({ children }: { children: string }) {
  return (
    <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: tokens.hair }}>
      <Txt size={13} weight={600} color={tokens.done}>{`✓ ${children}`}</Txt>
    </View>
  );
}

/** "Merk dir: Kinderarzt Dr. Weber …": what the family memory now holds, with the place pin. */
function MemoryCard() {
  const fact = useStore((s) => s.lists.find((l) => l.id === DEMO.wissen)?.sections[0]?.items.find((i) => i.id === 'w1'));
  if (!fact) return null;
  const [name, ...rest] = fact.name.split(', ');
  return (
    <View style={cardFrame}>
      <Reply text={tx('Gemerkt. Beim nächsten Termin trage ich Dr. Weber direkt ein.', 'Saved. Next time I’ll add Dr. Weber right away.')} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 12 }}>
        <Tile bg="transparent" name="stethoskop" size={48} radius={14} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Txt size={16} line={21} weight={600} numberOfLines={1}>{name}</Txt>
          <Txt size={13.5} color={tokens.sub} numberOfLines={1}>{[rest.join(', '), fact.note].filter(Boolean).join(' · ')}</Txt>
        </View>
        <PinChip place={fact.name} still />
      </View>
      <Footer>{tx('Im Familiengedächtnis', 'In the family memory')}</Footer>
    </View>
  );
}

/** The running Rommé game after round three: Mia leads (fewest points win). */
function ScoreCard() {
  const list = useStore((s) => s.lists.find((l) => l.id === DEMO.romme));
  if (!list) return null;
  return (
    <View style={{ gap: 8 }}>
      <Txt size={15} weight={600}>{list.name}</Txt>
      <Scoreboard list={list} hint={false} />
    </View>
  );
}

/** The watchlist: newest first, each with a designed cover, year and director; seen ones say so. */
function WatchCard() {
  const list = useStore((s) => s.lists.find((l) => l.id === DEMO.filme));
  if (!list) return null;
  const items = [...list.sections.flatMap((s) => s.items)].reverse();
  return (
    <View style={cardFrame}>
      <Txt size={15} weight={600} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>{list.name}</Txt>
      {items.map((i) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 }}>
          <CoverArt title={i.name} data={i.data} w={40} h={58} radius={8} fallback="designed" />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Txt size={16} weight={600} numberOfLines={1} color={i.data?.seen ? tokens.sub : tokens.ink}>{i.name}</Txt>
            <Txt size={13.5} color={tokens.sub} numberOfLines={1}>{[i.data?.year, i.data?.by].filter(Boolean).join(' · ')}</Txt>
          </View>
          {i.data?.seen ? (
            <View style={{ height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tokens.doneSoft, justifyContent: 'center' }}>
              <Txt size={12.5} weight={600} color={tokens.done}>{tx('Gesehen', 'Seen')}</Txt>
            </View>
          ) : <Check size={22} done={false} />}
        </View>
      ))}
      <View style={{ height: 6 }} />
      <Footer>{tx('Auf der Liste', 'On the list')}</Footer>
    </View>
  );
}
