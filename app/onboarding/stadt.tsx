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
import { tx } from '../../src/i18n/lang';

export default function Stadt() {
  const name = useStore((s) => s.city);
  const land = useStore((s) => s.land);
  const city = findCity(name);
  const facts: { icon: ClayName; title: string; body: string; src?: Source }[] = city
    ? [
        { icon: 'kita', title: tx(`Kita-Platz über ${city.kita.name}`, `Daycare spot via ${city.kita.name}`), body: city.kita.how, src: city.kita.src },
        { icon: 'reisepass', title: tx(`Pass und Ausweis im ${city.amt}`, `Passport and ID at the ${city.amt}`), body: [city.amtNote, tx('Für einen Termin dort schreibe ich euch die Mitbringliste dazu.', 'For an appointment there I add the list of what to bring.')].filter(Boolean).join(' '), src: city.pass },
        { icon: 'kalender', title: tx(`Feiertage für ${city.land}`, `Public holidays for ${city.land}`), body: tx('Kommen von selbst in euren Kalender, sobald ihr einen verbindet.', 'Show up in your calendar on their own once you connect one.') },
      ]
    : [];
  return (
    <Screen
      footer={
        <>
          <Txt size={20} line={26} weight={700} tracking={-0.4} center style={{ marginBottom: 8 }}>{tx('Habt ihr Kinder, oder ist eins unterwegs', 'Do you have children, or is one on the way')}<Dot char="?" /></Txt>
          <Btn label="Ja" onPress={() => router.push('/onboarding/kinder')} />
          <Btn label={tx('Noch nicht', 'Not yet')} primary={false} onPress={() => router.push('/onboarding/kalender')} />
        </>
      }
    >
      <BackBar center={<StepDots i={2} />} />
      <H1>{city ? tx(`Das gilt in ${city.name}`, `What applies in ${city.name}`) : land ? `${name}, ${land}` : tx(`${name || 'Eure Stadt'}, notiert`, `${name || 'Your city'}, noted`)}</H1>
      <Lead>{city ? tx('Hat der Assistent auf den Seiten eurer Stadt nachgeschlagen. Ihr müsst davon nichts eintragen.', 'The assistant looked this up on your city’s pages. You do not need to enter any of it.') : tx('Der Assistent schlägt nach, was in eurer Stadt gilt: Kita-Portal, Bürgeramt, Feiertage.', 'The assistant looks up what applies in your city: daycare portal, local office, public holidays.')}</Lead>
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
                <Txt size={16} line={21} weight={600}>{tx(`Feiertage für ${land}`, `Public holidays for ${land}`)}</Txt>
                <Txt size={14} line={20} color={tokens.sub}>{tx('Kommen von selbst in euren Kalender, sobald ihr einen verbindet.', 'Show up in your calendar on their own once you connect one.')}</Txt>
                <Txt size={12.5} color={tokens.mute}>{tx('Bundesland laut Gemeindeverzeichnis des Statistischen Bundesamts', 'State according to the official German register of municipalities')}</Txt>
              </View>
            </Animated.View>
          ) : null}
        <View style={{ padding: 16, borderRadius: 20, backgroundColor: tokens.row, gap: 6 }}>
          <Txt size={16} weight={600}>{land ? tx('Der Rest folgt', 'The rest follows') : tx('Im Prototyp noch nicht nachgeschlagen', 'Not looked up yet in the prototype')}</Txt>
          <Txt size={14} line={20} color={tokens.sub}>{tx(`Kita-Portal und Bürgeramt sind im Prototyp nur für ${CITIES.map((c) => c.name).join(', ')} geprüft. In der App liest der Assistent das auf der Seite eurer Stadt nach und zeigt die Quelle dazu.`, `Daycare portal and local office are only checked for ${CITIES.map((c) => c.name).join(', ')} in the prototype. In the app the assistant reads it on your city’s site and shows the source.`)}</Txt>
        </View>
        </View>
      )}
      {city ? <Hint icon="sparkle">{tx(`So nutze ich das: Der Kita-Platz steht mit Link zu ${city.kita.name} in eurem Plan, und bei einem Termin im ${city.amt} steht darunter, was mit muss. Alles mit Quelle, alles änderbar.`, `How I use it: the daycare spot is in your plan with a link to ${city.kita.name}, and an appointment at the ${city.amt} lists what to bring. Always with a source, always editable.`)}</Hint> : null}
    </Screen>
  );
}
