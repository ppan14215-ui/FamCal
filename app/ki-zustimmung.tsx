/**
 * Before the first sentence goes to the assistant (Julian 05.11.): a clear
 * choice, Mit KI or Ohne KI. With KI the sentence that brought you here is
 * sent right after; without, it is dropped and the talk field goes away.
 */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, BackBar, H1 } from '../src/components/ui/kit';
import KiWahl from '../src/components/KiWahl';
import { sayInApp } from '../src/lib/shared';
import { goBack } from '../src/lib/nav';
import { toast } from '../src/state/store';
import { tx } from '../src/i18n/lang';

export default function KiZustimmung() {
  const { said } = useLocalSearchParams<{ said?: string }>();
  return (
    <Screen gap={16}>
      <BackBar />
      <H1 size={30}>{tx('Mit KI oder ohne?', 'With AI or without?')}</H1>
      <KiWahl
        source="zustimmung"
        onMore={() => router.push('/datenschutz')}
        onDone={(mitKi) => {
          goBack();
          if (mitKi && said) setTimeout(() => sayInApp(String(said)), 250);
          if (!mitKi) toast(tx('Ohne KI: ihr tragt alles von Hand ein, mit dem Plus.', 'Without AI: add everything by hand with the plus.'));
        }}
      />
    </Screen>
  );
}
