/** 7 · Wer kümmert sich? (and 7b, the leftward drag, is the same screen live) */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, Meta, TextLink, Hint } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import SwipeDeck from '../../src/components/SwipeDeck';
import { useStore, actions } from '../../src/state/store';
import { persons } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

export default function Karten() {
  const cards = useStore((s) => s.onboardingCards);
  const open = useMemo(() => cards.filter((c) => !c.who), [cards]);
  const total = cards.length;
  const decided = total - open.length;
  return (
    <Screen gap={16}>
      <BackBar center={<StepDots i={7} />} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt size={22} weight={700} tracking={-0.5}>{tx('Wer kümmert sich', 'Who takes care of it')}<Dot char="?" /></Txt>
        <Meta>{open.length ? tx(`${Math.min(decided + 1, total)} von ${total}`, `${Math.min(decided + 1, total)} of ${total}`) : 'fertig'}</Meta>
      </View>
      {open.length ? (
        <SwipeDeck cards={open} onDecide={(id, d) => (d === 'later' ? actions.laterCard(id) : actions.assignCard(id, d))} />
      ) : (
        <View style={{ height: 430, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Txt size={22} weight={700}>{tx('Alles verteilt.', 'All shared out.')}</Txt>
          <Meta>{tx('Ihr könnt es jederzeit in Listen ändern.', 'You can change it any time in Lists.')}</Meta>
        </View>
      )}
      <Hint center>{tx(`Links zu ${persons.J.name}, rechts zu ${persons.T.name}. Ihr entscheidet, die App schlägt niemanden vor.`, `Left for ${persons.J.name}, right for ${persons.T.name}. You decide, the app never suggests anyone.`)}</Hint>
      <TextLink label={tx('Fertig, zum Kalender', 'Done, to the calendar')} color="#16232A" onPress={() => { actions.cardsToTasks(); router.replace('/kalender'); }} />
    </Screen>
  );
}
