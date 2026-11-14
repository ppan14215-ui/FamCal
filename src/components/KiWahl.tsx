/**
 * Mit KI oder ohne (Julian 05.11.: "es braucht ein Opt-out, wo einfach der
 * Input wegfällt und nur noch manuell geht"). One block, used before the first
 * sentence (app/ki-zustimmung.tsx), in the onboarding and in Datenschutz.
 * Says plainly what goes where; the choice holds for the whole family.
 */
import React from 'react';
import { View } from 'react-native';
import { Btn, TextLink } from './ui/kit';
import Txt from './ui/Txt';
import { tokens } from '../theme';
import { tx } from '../i18n/lang';
import { stimmeZu, setOhneKi } from '../lib/privat';
import { track } from '../lib/analytics';
import { haptics } from '../lib/haptics';

export const KI_TEXT = () => [
  tx('Was du sagst oder schreibst, versteht Claude von Anthropic. Dafür geht dein Satz mit einem kleinen Ausschnitt eures Kalenders und eurer Listen raus: die nächsten zwei Wochen und was zum Satz passt.',
    'What you say or type is understood by Claude from Anthropic. For that, your sentence goes out with a small part of your calendar and lists: the next two weeks and whatever fits the sentence.'),
  tx('Eure Namen ersetzt die App vorher durch Platzhalter. Private Kalender gehen nur als „belegt“ raus. Gesprochenes schreibt ElevenLabs mit.',
    'The app replaces your names with placeholders first. Private calendars only go out as "busy". Speech is transcribed by ElevenLabs.'),
  tx('Dazu können Arzttermine und Termine eurer Kinder gehören. Anthropic trainiert nicht mit euren Daten. Beide Dienste sitzen in den USA.',
    'This can include doctor appointments and your kids\' events. Anthropic doesn\'t train on your data. Both services are based in the US.'),
];

export default function KiWahl({ source, onDone, onMore }: { source: 'zustimmung' | 'onboarding' | 'settings'; onDone: (mitKi: boolean) => void; onMore?: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      {KI_TEXT().map((t, i) => <Txt key={i} size={15.5} line={22} color={i ? tokens.sub : tokens.ink}>{t}</Txt>)}
      <Txt size={14} line={20} color={tokens.sub}>{tx('Ohne KI tragt ihr alles von Hand ein, das Sprechen fällt weg. Das gilt für die ganze Familie und lässt sich in den Einstellungen ändern.', 'Without AI you add everything by hand and talking goes away. This holds for the whole family and can be changed in settings.')}</Txt>
      <View style={{ gap: 10, marginTop: 6 }}>
        <Btn label={tx('Mit KI, einverstanden', 'With AI, I agree')} onPress={() => { haptics.success(); stimmeZu(); void setOhneKi(false); track('ai_choice', { choice: 'mit_ki', source }); onDone(true); }} />
        <Btn primary={false} label={tx('Ohne KI, nur von Hand', 'Without AI, by hand only')} onPress={() => { haptics.select(); void setOhneKi(true); track('ai_choice', { choice: 'ohne_ki', source }); onDone(false); }} />
        {onMore ? <View style={{ alignItems: 'center', paddingTop: 4 }}><TextLink label={tx('Mehr zum Datenschutz', 'More about privacy')} onPress={onMore} /></View> : null}
      </View>
    </View>
  );
}
