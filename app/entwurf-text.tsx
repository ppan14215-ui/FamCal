/** Entwurf · Text. "Senden über …" opens the share menu: you pick the recipient and send. */
import React, { useState } from 'react';
import { View, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen, BackBar, Btn, Chip, Meta, Hint } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { Tile } from '../src/components/ui/Clay';
import { tokens } from '../src/theme';
import { toast } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';

type Tone = 'normal' | 'kurz' | 'freundlich' | 'bestimmt';

const DRAFTS: Record<string, { to: string; re: string; icon: ClayName; text: Record<Tone, string[]> }> = {
  brief: {
    to: 'An Hausverwaltung Berger', re: 'Re: Nebenkostenabrechnung 2025', icon: 'papier-stift',
    text: {
      normal: ['Sehr geehrte Frau Berger,', 'vielen Dank für die Nebenkostenabrechnung 2025. Die Position Hausmeister ist mit 612 € etwa doppelt so hoch wie im Vorjahr.', 'Bitte senden Sie uns die Belege dazu, damit wir die Abrechnung prüfen können. Bis dahin behalten wir uns die Zahlung des Nachbetrags vor.', 'Mit freundlichen Grüßen\nJulia und Tom Huber'],
      kurz: ['Sehr geehrte Frau Berger,', 'die Hausmeisterkosten 2025 (612 €) sind etwa doppelt so hoch wie im Vorjahr. Bitte senden Sie uns die Belege.', 'Viele Grüße\nJulia und Tom Huber'],
      freundlich: ['Liebe Frau Berger,', 'danke für die Nebenkostenabrechnung 2025! Uns ist aufgefallen, dass die Position Hausmeister mit 612 € etwa doppelt so hoch ist wie im letzten Jahr.', 'Könnten Sie uns die Belege dazu schicken? Dann schauen wir sie uns in Ruhe an.', 'Herzliche Grüße\nJulia und Tom Huber'],
      bestimmt: ['Sehr geehrte Frau Berger,', 'die Position Hausmeister in der Nebenkostenabrechnung 2025 ist mit 612 € etwa doppelt so hoch wie im Vorjahr und für uns nicht nachvollziehbar.', 'Wir bitten um Einsicht in die Belege innerhalb von zwei Wochen. Bis dahin zahlen wir den Nachbetrag nicht.', 'Mit freundlichen Grüßen\nJulia und Tom Huber'],
    },
  },
  absage: {
    to: 'An Hebammenpraxis Lind', re: 'Rückbildung am Donnerstag', icon: 'telefon',
    text: {
      normal: ['Liebe Sarah,', 'Julia kann am Donnerstag leider nicht zur Rückbildung kommen, Ben ist erkältet.', 'Nächste Woche ist sie wieder dabei.', 'Viele Grüße\nJulia und Tom'],
      kurz: ['Liebe Sarah,', 'Julia muss Donnerstag absagen, Ben ist krank. Nächste Woche wieder.', 'Viele Grüße\nJulia'],
      freundlich: ['Liebe Sarah,', 'leider müssen wir für Donnerstag absagen, der Kleine hat sich erkältet. Wir freuen uns auf nächste Woche!', 'Liebe Grüße\nJulia und Tom'],
      bestimmt: ['Liebe Sarah,', 'Julia sagt den Termin am Donnerstag ab. Bitte merk sie für nächste Woche vor.', 'Viele Grüße\nJulia'],
    },
  },
  antrag: {
    to: 'An Mobilfunk Kundenservice', re: 'Kündigung Vertrag Tom Huber', icon: 'vertrag',
    text: {
      normal: ['Sehr geehrte Damen und Herren,', 'hiermit kündige ich meinen Mobilfunkvertrag fristgerecht zum 31. Januar 2027.', 'Bitte bestätigen Sie mir die Kündigung schriftlich.', 'Mit freundlichen Grüßen\nTom Huber'],
      kurz: ['Sehr geehrte Damen und Herren,', 'ich kündige meinen Vertrag zum 31.01.2027 und bitte um Bestätigung.', 'Tom Huber'],
      freundlich: ['Hallo,', 'ich möchte meinen Mobilfunkvertrag zum 31. Januar 2027 kündigen. Danke für die Bestätigung!', 'Viele Grüße\nTom Huber'],
      bestimmt: ['Sehr geehrte Damen und Herren,', 'hiermit kündige ich meinen Vertrag zum 31. Januar 2027. Rückgewinnungsangebote bitte nicht zusenden. Ich erwarte eine schriftliche Bestätigung.', 'Tom Huber'],
    },
  },
};

export default function EntwurfText() {
  const { art } = useLocalSearchParams<{ art?: string }>();
  const d = DRAFTS[art ?? 'brief'] ?? DRAFTS.brief;
  const [tone, setTone] = useState<Tone>('normal');
  const body = d.text[tone];
  const plain = body.join('\n\n');
  const toneChip = (t: Tone, label: string) => (
    <Chip key={t} bg={tone === t ? tokens.doneSoft : tokens.chipBg} color={tone === t ? tokens.done : tokens.ink} onPress={() => setTone(tone === t ? 'normal' : t)}>{label}</Chip>
  );
  return (
    <Screen
      gap={12}
      footer={
        <>
          <Btn label="Senden über …" icon="send" onPress={() => Share.share({ message: plain }).catch(() => {})} />
          <Btn label="Text kopieren" icon="copy" primary={false} onPress={async () => { await Clipboard.setStringAsync(plain).catch(() => {}); toast('Text kopiert'); }} />
          <Txt size={13} color={tokens.sub} center>WhatsApp, Mail oder SMS: Ihr wählt Empfänger und schickt selbst ab.</Txt>
        </>
      }
    >
      <BackBar center={<Meta>Entwurf</Meta>} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Tile name={d.icon} size={52} radius={16} />
        <View style={{ flex: 1 }}>
          <Txt size={17} weight={600}>{d.to}</Txt>
          <Meta>{d.re}</Meta>
        </View>
      </View>
      <Animated.View key={tone} entering={FadeIn.duration(180)} style={{ padding: 18, borderRadius: 24, backgroundColor: tokens.row, gap: 12 }}>
        {body.map((p, i) => <Txt key={i} size={15.5} line={24}>{p}</Txt>)}
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {toneChip('kurz', 'Kürzer')}
        {toneChip('freundlich', 'Freundlicher')}
        {toneChip('bestimmt', 'Bestimmter')}
      </View>
      <Hint icon="sparkle">Entwurf vom Assistenten. Im Prototyp sind die Texte vorbereitet, keine echte KI.</Hint>
    </Screen>
  );
}
