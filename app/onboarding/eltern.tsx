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
    actions.setCity(typed, place?.land);
    router.push('/onboarding/stadt');
  };
  return (
    <Screen footer={<Btn label="Weiter" disabled={!j.trim() || !city.trim()} onPress={next} />}>
      <BackBar center={<StepDots i={1} />} />
      <H1>Über euch</H1>
      <Lead>Wie ihr heißt und wo ihr wohnt. Daraus sucht der Assistent zusammen, was in eurer Stadt gilt.</Lead>
      <View style={{ gap: 8 }}>
        <Field label="Dein Name" value={j} onChangeText={setJ} placeholder="Zum Beispiel Julia" right={<Avatar p="J" letter={j.trim()[0]?.toUpperCase() || 'J'} size={30} />} />
        <Field label="Name deines Partners" value={t} onChangeText={setT} placeholder="Zum Beispiel Tom" right={<Avatar p="T" letter={t.trim()[0]?.toUpperCase() || 'T'} size={30} />} />
        <Field label="Wo wohnt ihr?" value={city} onChangeText={setCity} placeholder="Stadt oder Gemeinde" />
      </View>
      {place ? (
        <View style={{ gap: 6, marginTop: -4, paddingHorizontal: 4 }}>
          <Meta color={tokens.done}>{`${place.name} liegt in ${place.land}. Das Bundesland übernehmen wir für Feiertage und Fristen.`}</Meta>
          {others.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {others.slice(0, 3).map((o) => <PlaceChip key={o.land} label={`Nein, ${o.name} in ${o.land}`} onPress={() => pick(o)} />)}
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
      <Hint>{`${t.trim() || 'Deinen Partner'} lädst du gleich ein. Den Namen kann ${t.trim() ? 'er oder sie' : 'die Person'} selbst ändern.`}</Hint>
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
