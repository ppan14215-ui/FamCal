/**
 * Was die App kann, in sechs echten Sätzen (Julian 30.10.: "Kein Mensch wüsste,
 * dass ich Rommé spielen eingeben kann"). A tap puts the sentence in the field,
 * so only what is different needs changing. Shown on the plus sheet and in an
 * empty chat of the Einfache Version.
 */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { ClayIcon } from './ui/Clay';
import { tokens, persons } from '../theme';
import { haptics } from '../lib/haptics';
import { fillField } from '../lib/simple';
import type { ClayName } from '../lib/clayIcons';
import { tx } from '../i18n/lang';

export const examples = (): { icon: ClayName; t: string; say: string }[] => [
  { icon: 'kalender', t: tx('Termin', 'Event'), say: tx('Freitag 15 Uhr Zahnarzt mit Ben', 'Dentist with Ben on Friday at 3 pm') },
  { icon: 'einkauf', t: tx('Einkauf', 'Shopping'), say: tx('Wir brauchen Milch und Windeln', 'We need milk and nappies') },
  { icon: 'kochtopf', t: tx('Kochen', 'Cooking'), say: tx('Heute Abend koche ich Bolognese', "I'm cooking Bolognese tonight") },
  { icon: 'gesellschaftsspiel', t: tx('Spiel zählen', 'Keep score'), say: tx(`Rommé: ${persons.J.name} 40, ${persons.T.name} 25`, `Rummy: ${persons.J.name} 40, ${persons.T.name} 25`) },
  { icon: 'chat', t: tx(`${persons.T.name} fragen`, `Ask ${persons.T.name}`), say: tx(`Frag ${persons.T.name}, ob Samstag passt`, `Ask ${persons.T.name} if Saturday works`) },
  { icon: 'erledigt', t: tx('Erinnerung', 'Reminder'), say: tx('Erinnere mich, die Kita Anmeldung bis Freitag abzugeben', 'Remind me to hand in the nursery form by Friday') },
];

export default function ExampleCards({ onPick }: { onPick?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {examples().map((x) => (
        <PressScale key={x.t} scale={0.97} accessibilityLabel={`${x.t}: ${x.say}`} onPress={() => { haptics.select(); onPick?.(); fillField(x.say); }} style={{ width: '48.5%', flexGrow: 1, gap: 6, padding: 12, borderRadius: 18, backgroundColor: tokens.row }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClayIcon name={x.icon} size={30} />
            <Txt size={14.5} weight={700}>{x.t}</Txt>
          </View>
          <Txt size={13.5} line={18} color={tokens.sub}>„{x.say}“</Txt>
        </PressScale>
      ))}
    </View>
  );
}
