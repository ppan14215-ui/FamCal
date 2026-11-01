/**
 * Probier's: einen Termin (concept + Julian's onboarding collection, 01.11.2026). The core moment for real,
 * before calendar, account or invite: tap an example or type, Memo thinks, the card lands. Runs on the
 * phone's own rules, so it is instant, free and nobody unsigned can reach the AI. The Termin stays.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { Btn, TextLink } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import Step from '../../src/components/onboarding/Step';
import TryField from '../../src/components/onboarding/TryField';
import type { MemoAct } from '../../src/components/onboarding/Memo';
import { actions, useStore, get } from '../../src/state/store';
import { understand } from '../../src/lib/talk';
import { short, TODAY, addDays } from '../../src/lib/dates';
import { isPreview } from '../../src/lib/vorschau';
import { previewNames } from '../../src/lib/vorschau';
import { setTriedEvent } from '../../src/lib/onboardingTry';
import { haptics } from '../../src/lib/haptics';
import type { CalEvent } from '../../src/state/types';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

const dayWord = (d: string) => (d === TODAY ? tx('Heute', 'Today') : d === addDays(TODAY, 1) ? tx('Morgen', 'Tomorrow') : short(d));

export default function Termin() {
  const stored = useStore((s) => s.names);
  const people = useStore((s) => s.people);
  const names = isPreview() ? previewNames() : stored;
  const kid = people.find((p) => p.kind === 'kind')?.name.split(' ')[0];
  const You = names.T || tx('Dein Partner', 'Your partner');
  const [used, setUsed] = useState<string[]>([]);
  const [memo, setMemo] = useState<MemoAct>('idle');
  const [beat, setBeat] = useState(0);
  const [made, setMade] = useState<CalEvent | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<{ title: string; who: any } | null>(null);
  const busy = memo === 'wobble';

  const examples = [
    tx(`Freitag 15 Uhr Zahnarzt${kid ? ` mit ${kid}` : ''}`, `Friday 3pm dentist${kid ? ` with ${kid}` : ''}`),
    tx('Samstag 10 Uhr Schwimmen', 'Saturday 10am swimming'),
    tx('Morgen 19 Uhr Elternabend', 'Tomorrow 7pm parents evening'),
  ];

  const send = (said: string) => {
    setUsed((u) => [...u, said]);
    setNote(null);
    setMemo('wobble');
    // A short think, so the card is seen to come from what was said.
    setTimeout(() => {
      const r = understand(said, get().events, pending);
      if (r.kind === 'added') {
        const e = r.event;
        if (made && !isPreview()) actions.removeEvent(made.id);
        if (!isPreview()) actions.addEvent(e);
        setTriedEvent(e);
        setMade(e);
        setPending(null);
        setMemo('blink'); setBeat((b) => b + 1);
        haptics.success();
      } else if (r.kind === 'ask') {
        setPending({ title: r.title, who: r.who });
        setNote(r.text);
        setMemo('peek'); setBeat((b) => b + 1);
      } else {
        setNote(r.text);
        setMemo('idle');
      }
    }, 650);
  };

  return (
    <Step
      step={1}
      memo={memo}
      memoBeat={beat}
      title={made ? tx('Steht drin', 'It’s in') : tx('Sag mir einen Termin', 'Tell me a plan')}
      lead={made ? tx(`${You} sieht ihn jetzt auch. Du kannst noch einen probieren.`, `${You} sees it now too. Try another if you like.`) : tx('Tippe ein Beispiel an oder schreib deinen eigenen.', 'Tap an example or write your own.')}
      footer={<>
        <Btn label={made ? tx('Weiter', 'Next') : tx('Weiter ohne Termin', 'Next without a plan')} onPress={() => router.push('/onboarding/einkauf')} />
        {made ? null : <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => router.push('/onboarding/einkauf')} />}
      </>}
    >
      {made ? (
        <Animated.View key={made.id} entering={ZoomIn.springify().damping(14).stiffness(180)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: tokens.row }}>
          <Tile name={made.icon} size={46} radius={14} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={17} weight={700} numberOfLines={1}>{made.title}</Txt>
            <Txt size={14} color={tokens.sub}>{`${dayWord(made.date)}${made.allDay ? '' : ` · ${made.start}`}`}</Txt>
          </View>
          <Txt size={13} weight={600} color={tokens.done}>✓ {tx('Im Kalender', 'In the calendar')}</Txt>
        </Animated.View>
      ) : null}
      {note ? <Animated.View entering={FadeIn.duration(200)}><Txt size={15.5} line={22}>{note}</Txt></Animated.View> : null}
      <TryField examples={examples.filter((e) => !used.includes(e))} placeholder={pending ? tx('Zum Beispiel „um 15 Uhr“', 'For example “at 3pm”') : tx('Schreib einen Termin …', 'Write a plan …')} onSend={send} busy={busy} />
    </Step>
  );
}
