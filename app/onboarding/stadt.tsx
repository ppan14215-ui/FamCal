/**
 * 2 · Was der Assistent über eure Stadt weiß (Julian 26.10.). Right after
 * names and city the app shows what it pulled from the city's own pages and
 * how it will use it. Every fact names its source.
 */
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint } from '../../src/components/ui/kit';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import SourceLink from '../../src/components/SourceLink';
import { useStore } from '../../src/state/store';
import { findCity, CITIES, Source } from '../../src/data/cities';
import { tokens, rise } from '../../src/theme';
import type { ClayName } from '../../src/lib/clayIcons';

export default function Stadt() {
  const name = useStore((s) => s.city);
  const land = useStore((s) => s.land);
  const city = findCity(name);
  const facts: { icon: ClayName; title: string; body: string; src?: Source }[] = city
    ? [
        { icon: 'kita', title: `Kita-Platz über ${city.kita.name}`, body: city.kita.how, src: city.kita.src },
        { icon: 'reisepass', title: `Pass und Ausweis im ${city.amt}`, body: [city.amtNote, 'Für einen Termin dort schreibe ich euch die Mitbringliste dazu.'].filter(Boolean).join(' '), src: city.pass },
        { icon: 'kalender', title: `Feiertage für ${city.land}`, body: 'Kommen von selbst in euren Kalender, sobald ihr einen verbindet.' },
      ]
    : [];
  return (
    <Screen
      footer={
        <>
          <Txt size={20} line={26} weight={700} tracking={-0.4} center style={{ marginBottom: 8 }}>Habt ihr Kinder, oder ist eins unterwegs<Dot char="?" /></Txt>
          <Btn label="Ja" onPress={() => router.push('/onboarding/kinder')} />
          <Btn label="Noch nicht" primary={false} onPress={() => router.push('/onboarding/kalender')} />
        </>
      }
    >
      <BackBar center={<StepDots i={2} />} />
      <H1>{city ? `Das gilt in ${city.name}` : land ? `${name}, ${land}` : `${name || 'Eure Stadt'}, notiert`}</H1>
      <Lead>{city ? 'Hat der Assistent auf den Seiten eurer Stadt nachgeschlagen. Ihr müsst davon nichts eintragen.' : 'Der Assistent schlägt nach, was in eurer Stadt gilt: Kita-Portal, Bürgeramt, Feiertage.'}</Lead>
      {city ? (
        <View style={{ gap: 8 }}>
          {facts.map((f, i) => (
            <Animated.View key={f.title} entering={rise(i + 1)} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, backgroundColor: tokens.row }}>
              <Tile name={f.icon} size={48} radius={14} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={16} line={21} weight={600}>{f.title}</Txt>
                <Txt size={14} line={20} color={tokens.sub}>{f.body}</Txt>
                {f.src ? <SourceLink s={f.src} /> : null}
              </View>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {land ? (
            <Animated.View entering={rise(1)} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, backgroundColor: tokens.row }}>
              <Tile name="kalender" size={48} radius={14} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={16} line={21} weight={600}>{`Feiertage für ${land}`}</Txt>
                <Txt size={14} line={20} color={tokens.sub}>Kommen von selbst in euren Kalender, sobald ihr einen verbindet.</Txt>
                <Txt size={12.5} color={tokens.mute}>Bundesland laut Gemeindeverzeichnis des Statistischen Bundesamts</Txt>
              </View>
            </Animated.View>
          ) : null}
        <View style={{ padding: 16, borderRadius: 20, backgroundColor: tokens.row, gap: 6 }}>
          <Txt size={16} weight={600}>{land ? 'Der Rest folgt' : 'Im Prototyp noch nicht nachgeschlagen'}</Txt>
          <Txt size={14} line={20} color={tokens.sub}>{`Kita-Portal und Bürgeramt sind im Prototyp nur für ${CITIES.map((c) => c.name).join(', ')} geprüft. In der App liest der Assistent das auf der Seite eurer Stadt nach und zeigt die Quelle dazu.`}</Txt>
        </View>
        </View>
      )}
      {city ? <Hint icon="sparkle">{`So nutze ich das: Der Kita-Platz steht mit Link zu ${city.kita.name} in eurem Plan, und bei einem Termin im ${city.amt} steht darunter, was mit muss. Alles mit Quelle, alles änderbar.`}</Hint> : null}
    </Screen>
  );
}
