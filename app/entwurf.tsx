/** Entwurf · Anlass. The assistant only writes drafts; the parents send them themselves. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, H1, Btn, CardRow, Meta } from '../src/components/ui/kit';
import { TextArea } from '../src/components/Field';
import type { ClayName } from '../src/lib/clayIcons';

const KINDS: { key: string; icon: ClayName; t: string; s: string; text: string }[] = [
  { key: 'brief', icon: 'brief-gelesen', t: 'Antwort auf einen Brief', s: 'Vermieter: Nebenkosten 2025', text: 'Bitte um Belege für die Hausmeisterkosten, die sind doppelt so hoch wie letztes Jahr.' },
  { key: 'absage', icon: 'telefon', t: 'Absage oder Verschiebung', s: 'Termin, Kurs, Besuch', text: 'Rückbildung am Donnerstag absagen, Ben ist erkältet. Nächste Woche wieder.' },
  { key: 'antrag', icon: 'vertrag', t: 'Antrag oder Kündigung', s: 'Versicherung, Abo, Vertrag', text: 'Toms Handyvertrag zum 31. Januar kündigen.' },
];

export default function Entwurf() {
  const [sel, setSel] = useState('brief');
  const [text, setText] = useState(KINDS[0].text);
  return (
    <Screen footer={<Btn label="Entwurf schreiben" icon="sparkle" onPress={() => router.push({ pathname: '/entwurf-text', params: { art: sel } })} />}>
      <BackBar center={<Meta>Neuer Entwurf</Meta>} />
      <H1>Worum geht’s</H1>
      <View style={{ gap: 8 }}>
        {KINDS.map((k) => (
          <CardRow key={k.key} icon={k.icon} title={k.t} sub={k.s} selected={sel === k.key} onPress={() => { setSel(k.key); setText(k.text); }} />
        ))}
      </View>
      <TextArea label="Was soll drinstehen?" value={text} onChangeText={setText} />
    </Screen>
  );
}
