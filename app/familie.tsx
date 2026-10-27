/**
 * Familie (Julian 27.10.): right after the first sign-in. Either start your
 * own family (onboarding follows, then you invite your partner with the
 * code) or type the code your partner sent you and share their calendar.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, H1, Lead, Btn, TextLink, Meta, Hint } from '../src/components/ui/kit';
import { Field } from '../src/components/Field';
import { joinFamily } from '../src/lib/sync';
import { get } from '../src/state/store';
import { tokens } from '../src/theme';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

export default function Familie() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = code.replace(/\s/g, '').toUpperCase();

  const join = async () => {
    if (busy || clean.length !== 6) return;
    haptics.tap();
    setBusy(true);
    setError(null);
    const r = await joinFamily(clean, get().names.J || undefined);
    setBusy(false);
    if (r.error) return setError(/unbekannt/i.test(r.error) ? tx('Diesen Code kennen wir nicht. Bitte noch einmal prüfen.', 'We do not know this code. Please check it again.') : /vollständig/i.test(r.error) ? tx('In dieser Familie sind schon zwei.', 'This family already has two members.') : tx('Das hat nicht geklappt. Bitte noch einmal.', 'That did not work. Please try again.'));
    haptics.success();
    router.replace('/kalender');
  };

  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          <Btn label={busy ? tx('Einen Moment …', 'One moment …') : tx('Beitreten', 'Join')} disabled={clean.length !== 6} onPress={join} />
          <TextLink label={tx('Ich starte unsere Familie', 'I am starting our family')} onPress={() => router.replace('/onboarding/eltern')} />
        </View>
      }
    >
      <H1>{tx('Habt ihr schon einen Kalender?', 'Already have a shared calendar?')}</H1>
      <Lead>{tx('Wenn dein Partner FamCal schon nutzt, gib den Code aus der Einladung ein. Dann seht ihr beide denselben Kalender.', 'If your partner already uses FamCal, enter the code from the invite. Then you both see the same calendar.')}</Lead>
      <Field label={tx('Code', 'Code')} value={code} onChangeText={setCode} placeholder={tx('Sechs Zeichen', 'Six characters')} />
      {error ? <Meta color={tokens.danger}>{error}</Meta> : <Hint>{tx('Den Code findet dein Partner unter Einstellungen bei „Partner einladen“.', 'Your partner finds the code in Settings under “Invite partner”.')}</Hint>}
    </Screen>
  );
}
