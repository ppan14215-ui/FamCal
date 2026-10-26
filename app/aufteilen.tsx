/** Aufgaben aufteilen: the unassigned stack. What you decide later stays in the stack. */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, BackBar, Meta, Hint, Btn } from '../src/components/ui/kit';
import Txt, { Dot } from '../src/components/ui/Txt';
import { persons } from '../src/theme';
import SwipeDeck from '../src/components/SwipeDeck';
import { useStore, actions, toast } from '../src/state/store';

export default function Aufteilen() {
  const tasks = useStore((s) => s.tasks);
  const open = useMemo(() => tasks.filter((t) => !t.who && !t.done), [tasks]);
  const start = useRef(open.length).current;
  const pos = Math.min(start - open.length + 1, start);
  return (
    <Screen gap={16}>
      <BackBar center={<Meta>{open.length ? `${pos} von ${start}` : 'fertig'}</Meta>} />
      <Txt size={24} weight={700} tracking={-0.5}>Wer kümmert sich<Dot char="?" /></Txt>
      {open.length ? (
        <SwipeDeck
          cards={open}
          onDecide={(id, d) => {
            if (d === 'later') return actions.laterTask(id);
            actions.assignTask(id, d);
            toast(`${persons[d].name} übernimmt`);
          }}
        />
      ) : (
        <View style={{ height: 430, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Txt size={22} weight={700}>Alles verteilt.</Txt>
          <Btn label="Zu den Aufgaben" onPress={() => goBack()} style={{ alignSelf: 'stretch' }} />
        </View>
      )}
      <Hint center>Wischen oder tippen. Was ihr später entscheidet, bleibt im Stapel.</Hint>
    </Screen>
  );
}
