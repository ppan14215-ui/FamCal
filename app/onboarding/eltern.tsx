/** 1 · Über euch: names and city. The city is what the assistant builds on. */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Field } from '../../src/components/Field';
import { Avatar } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import { actions } from '../../src/state/store';
import { CITIES } from '../../src/data/cities';
import { findPlace, suggestPlaces, namesakes, Place } from '../../src/lib/places';
import { tokens } from '../../src/theme';
import { haptics } from '../../src/lib/haptics';
import { setMyName } from '../../src/lib/sync';
import { tx } from '../../src/i18n/lang';

export default function Eltern() {
  const [j, setJ] = useState('');
  const [t, setT] = useState('');
  const [city, setCity] = useState('');
  // Picked from the suggestions, or the most likely place for what was typed.
  const [picked, setPicked] = useState<Place | null>(null);
  const place = picked && picked.name === city ? picked : findPlace(city);
  const others = place ? namesakes(place) : [];
  const typed = city.trim();
  const sugg = typed && !place ? suggestPlaces(typed) : [];
  const pick = (p: Place) => { haptics.select(); setPicked(p); setCity(p.name); };
  const next = () => {
    actions.setNames({ J: j.trim(), T: t.trim() });
    setMyName(j.trim());
    actions.setCity(typed, place?.land);
    router.push('/onboarding/stadt');
  };
  return (
    <Screen footer={<Btn label={tx('Weiter', 'Next')} disabled={!j.trim() || !city.trim()} onPress={next} />}>
      <BackBar center={<StepDots i={1} />} />
      <H1>{tx('Über euch', 'About you')}</H1>
      <Lead>{tx('Wie ihr heißt und wo ihr wohnt. Daraus sucht der Assistent zusammen, was in eurer Stadt gilt.', 'Your names and where you live. The assistant uses it to look up what applies in your city.')}</Lead>
      <View style={{ gap: 8 }}>
        <Field label={tx('Dein Name', 'Your name')} value={j} onChangeText={setJ} placeholder={tx('Zum Beispiel Julia', 'For example Julia')} right={<Avatar p="J" letter={j.trim()[0]?.toUpperCase() || 'J'} size={30} />} />
        <Field label={tx('Name deines Partners', 'Your partner’s name')} value={t} onChangeText={setT} placeholder={tx('Zum Beispiel Tom', 'For example Tom')} right={<Avatar p="T" letter={t.trim()[0]?.toUpperCase() || 'T'} size={30} />} />
        <Field label={tx('Wo wohnt ihr?', 'Where do you live?')} value={city} onChangeText={setCity} placeholder={tx('Stadt oder Gemeinde', 'City or town')} />
      </View>
      {place ? (
        <View style={{ gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
          <Meta color={tokens.done}>{tx(`${place.name} liegt in ${place.land}. Das Bundesland übernehmen wir für Feiertage und Fristen.`, `${place.name} is in ${place.land}. We use the state for public holidays and deadlines.`)}</Meta>
          {others.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {others.slice(0, 3).map((o) => <PlaceChip key={o.land} label={tx(`Nein, ${o.name} in ${o.land}`, `No, ${o.name} in ${o.land}`)} onPress={() => pick(o)} />)}
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }} style={{ marginTop: -6, marginHorizontal: -18 }}>
          <View style={{ width: 12 }} />
          {(sugg.length ? sugg : typed ? [] : CITIES.map((c) => findPlace(c.name)!).filter(Boolean)).map((p) => (
            <PlaceChip key={`${p.name}-${p.land}`} label={typed ? `${p.name} · ${p.land}` : p.name} onPress={() => pick(p)} />
          ))}
          <View style={{ width: 12 }} />
        </ScrollView>
      )}
      <Hint>{tx(`${t.trim() || 'Deinen Partner'} lädst du gleich ein. Den Namen kann ${t.trim() ? 'er oder sie' : 'die Person'} selbst ändern.`, `You will invite ${t.trim() || 'your partner'} in a moment. They can change their name themselves.`)}</Hint>
    </Screen>
  );
}

function PlaceChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale scale={0.94} onPress={onPress} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: '#EFEFEC' }}>
      <Txt size={13.5} weight={600}>{label}</Txt>
    </PressScale>
  );
}
