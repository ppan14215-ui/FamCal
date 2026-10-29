/** 1 · Über euch: two names. Since "Sprechen zuerst" (Julian 27.10.) no city step; the calendar is the product. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint } from '../../src/components/ui/kit';
import { Field } from '../../src/components/Field';
import { Avatar } from '../../src/components/ui/Person';
import { actions, useStore } from '../../src/state/store';
import Txt from '../../src/components/ui/Txt';
import PressScale from '../../src/components/ui/PressScale';
import { tokens } from '../../src/theme';
import { countryName, regionName } from '../../src/lib/holidays';
import { setMyName, saveVacation } from '../../src/lib/sync';
import { tx } from '../../src/i18n/lang';

export default function Eltern() {
  const [j, setJ] = useState('');
  const [t, setT] = useState('');
  const [days, setDays] = useState('');
  const country = useStore((s) => s.country);
  const land = useStore((s) => s.land);
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
      <PressScale onPress={() => router.push('/urlaub')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tokens.row }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={13} color={tokens.sub}>{tx('Feiertage', 'Public holidays')}</Txt>
          <Txt size={16} weight={600}>{[countryName(country), land && (country === 'DE' ? land : regionName(country, land))].filter(Boolean).join(', ') || tx('Land wählen', 'Pick a country')}</Txt>
        </View>
        <Txt size={14} color={tokens.sub}>{land ? tx('Ändern', 'Change') : tx('Region wählen', 'Pick region')}</Txt>
      </PressScale>
      <Hint>{tx(`${t.trim() || 'Deinen Partner'} lädst du gleich ein. Den Namen kann ${t.trim() ? 'er oder sie' : 'die Person'} selbst ändern.`, `You will invite ${t.trim() || 'your partner'} in a moment. They can change their name themselves.`)}</Hint>
    </Screen>
  );
}
