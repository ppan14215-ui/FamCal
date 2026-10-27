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
    if (r.error) return setError(/unbekannt/i.test(r.error) ? 'Diesen Code kennen wir nicht. Bitte noch einmal prüfen.' : /vollständig/i.test(r.error) ? 'In dieser Familie sind schon zwei.' : 'Das hat nicht geklappt. Bitte noch einmal.');
    haptics.success();
    router.replace('/kalender');
  };

  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          <Btn label={busy ? 'Einen Moment …' : 'Beitreten'} disabled={clean.length !== 6} onPress={join} />
          <TextLink label="Ich starte unsere Familie" onPress={() => router.replace('/onboarding/eltern')} />
        </View>
      }
    >
      <H1>Habt ihr schon einen Kalender?</H1>
      <Lead>Wenn dein Partner FamCal schon nutzt, gib den Code aus der Einladung ein. Dann seht ihr beide denselben Kalender.</Lead>
      <Field label="Code" value={code} onChangeText={setCode} placeholder="Sechs Zeichen" />
      {error ? <Meta color={tokens.danger}>{error}</Meta> : <Hint>Den Code findet dein Partner unter Einstellungen bei „Partner einladen“.</Hint>}
    </Screen>
  );
}
