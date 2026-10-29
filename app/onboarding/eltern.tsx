/** 1 · Über euch: two names. Since "Sprechen zuerst" (Julian 27.10.) no city step; the calendar is the product. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint } from '../../src/components/ui/kit';
import { Field } from '../../src/components/Field';
import { Avatar } from '../../src/components/ui/Person';
import { actions } from '../../src/state/store';
import { setMyName, saveVacation } from '../../src/lib/sync';
import { tx } from '../../src/i18n/lang';

export default function Eltern() {
  const [j, setJ] = useState('');
  const [t, setT] = useState('');
  const [days, setDays] = useState('');
  const next = () => {
    actions.setNames({ J: j.trim(), T: t.trim() });
    // Urlaubstage are optional here; each one sets their own, also later in Einstellungen.
    const n = parseInt(days, 10);
    if (n > 0) { actions.setVacation('J', n); void saveVacation(); }
    setMyName(j.trim());
    router.push('/onboarding/kalender');
  };
  return (
    <Screen footer={<Btn label={tx('Weiter', 'Next')} disabled={!j.trim()} onPress={next} />}>
      <BackBar center={<StepDots i={0} n={3} />} />
      <H1>{tx('Über euch', 'About you')}</H1>
      <Lead>{tx('Damit der Kalender weiß, wer gemeint ist, wenn ihr „Tom geht“ oder „ich“ sagt.', 'So the calendar knows who you mean when you say “Tom goes” or “me”.')}</Lead>
      <View style={{ gap: 8 }}>
        <Field label={tx('Dein Name', 'Your name')} value={j} onChangeText={setJ} placeholder={tx('Zum Beispiel Julia', 'For example Julia')} right={<Avatar p="J" letter={j.trim()[0]?.toUpperCase() || 'J'} size={30} />} />
        <Field label={tx('Name deines Partners', 'Your partner’s name')} value={t} onChangeText={setT} placeholder={tx('Zum Beispiel Tom', 'For example Tom')} right={<Avatar p="T" letter={t.trim()[0]?.toUpperCase() || 'T'} size={30} />} />
        <Field label={tx('Deine Urlaubstage im Jahr (optional)', 'Your vacation days per year (optional)')} value={days} onChangeText={(v) => setDays(v.replace(/\D/g, '').slice(0, 2))} placeholder="30" numeric />
      </View>
      <Hint>{tx(`${t.trim() || 'Deinen Partner'} lädst du gleich ein. Den Namen kann ${t.trim() ? 'er oder sie' : 'die Person'} selbst ändern.`, `You will invite ${t.trim() || 'your partner'} in a moment. They can change their name themselves.`)}</Hint>
    </Screen>
  );
}
