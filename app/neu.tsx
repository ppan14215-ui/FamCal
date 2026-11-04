/**
 * Neu: the "+" sheet. Like Claude (Julian 29.10.): first what you bring along,
 * Kamera, Fotos, Datei; then entering by hand, Termin, Listeneintrag, Aufgabe,
 * Entwurf; or forward by mail. Fotos and Datei need the next app build.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import * as Clipboard from 'expo-clipboard';
import Sheet from '../src/components/Sheet';
import Txt, { Dot } from '../src/components/ui/Txt';
import LineIcon, { type LineName } from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import PressScale from '../src/components/ui/PressScale';
import { Meta } from '../src/components/ui/kit';
import { tokens } from '../src/theme';
import { actions, toast } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';
import { tx } from '../src/i18n/lang';
import { canRead, pickImage, readLines } from '../src/lib/screenshot';
import { sayInApp } from '../src/lib/shared';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HIDDEN } from '../src/lib/core';

// Quick and calm (Julian 30.10.: the falling, tilted cards were too playful and too slow).
const fall = (i: number) => FadeInDown.duration(160).delay(i * 20);

const MAIL = 'huber-7q2@familie.app';

export default function Neu() {
  const go = (fn: () => void) => { goBack(); setTimeout(fn, 30); };
  const soon = () => toast(tx('Kommt mit dem nächsten App Update', 'Coming with the next app update'));
  const attach: { icon: LineName; t: string; onPress: () => void }[] = [
    { icon: 'camera', t: tx('Kamera', 'Camera'), onPress: () => go(() => (canRead() ? router.push({ pathname: '/bild-liste', params: { from: 'camera' } }) : router.push('/foto-kamera'))) },
    { icon: 'image', t: tx('Fotos', 'Photos'), onPress: canRead() ? () => go(() => router.push({ pathname: '/bild-liste', params: { from: 'gallery' } })) : soon },
    { icon: 'file', t: tx('Datei', 'File'), onPress: soon },
  ];
  const all: { icon: ClayName; t: string; s: string; onPress: () => void; extra?: boolean }[] = [
    { icon: 'kalender', t: tx('Termin', 'Event'), s: tx('für euch oder Ben', 'for you or the kids'), onPress: () => go(() => router.push('/termin-neu')) },
    // One tile for lists (Julian 30.10.: "zwei mal ... Listen versteht man auch nicht"); a new list starts from there.
    { icon: 'einkauf', t: tx('Auf die Liste', 'To a list'), s: tx('Einkauf oder eure Listen', 'Shopping or your lists'), onPress: () => go(() => router.push('/einkauf-neu')) },
    // A photo of a letter, invitation or note: the phone reads it, the assistant enters what is in it (Julian 30.10.).
    { icon: 'kamera-scan', t: tx('Foto', 'Photo'), s: tx('Brief, Einladung, Zettel', 'Letter, invite, note'), onPress: () => go(() => void fromPhoto()) },
    { icon: 'erledigt', extra: HIDDEN.tasks, t: tx('Aufgabe', 'Task'), s: tx('mit oder ohne Datum', 'with or without a date'), onPress: () => go(() => { actions.setActiveList('aufgaben'); router.navigate('/listen'); }) },
    { icon: 'papier-stift', extra: true, t: tx('Entwurf', 'Draft'), s: tx('Antwort schreiben lassen', 'Have a reply written'), onPress: () => go(() => router.push('/entwurf')) },
  ];
  // Julian 30.10. 21:52 "super simpel": only entering by hand stays.
  const fromPhoto = async () => {
    if (!canRead()) return soon();
    const uri = await pickImage('camera');
    if (!uri) return;
    // Read on the phone; numbers like IBAN or tax id are already scrubbed and never leave it.
    const lines = await readLines(uri).catch(() => [] as string[]);
    if (!lines.length) return toast(tx('Auf dem Foto konnte ich keinen Text lesen.', "I couldn't read any text on the photo."));
    router.navigate('/chat');
    // A letter is longer than a sentence; the server allows photo text up to 2500 characters.
    sayInApp(`${tx('Vom Foto', 'From a photo')}: ${lines.join(' / ')}`.slice(0, 2500));
  };
  const opts = all.filter((o) => !(HIDDEN.extras && o.extra));
  return (
    <Sheet>
      <Txt size={24} weight={700} tracking={-0.5}>{tx('Was kommt dazu', 'What\'s new')}<Dot char="?" /></Txt>
      {HIDDEN.extras ? null : <View style={{ flexDirection: 'row', gap: 8 }}>
        {attach.map((a, i) => (
          <Animated.View key={a.t} entering={fall(i)} style={{ flex: 1 }}>
            <PressScale accessibilityLabel={a.t} onPress={a.onPress} style={{ alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 20, backgroundColor: tokens.row }}>
              <LineIcon name={a.icon} size={26} color={tokens.ink} />
              <Txt size={14} weight={600}>{a.t}</Txt>
            </PressScale>
          </Animated.View>
        ))}
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o, i) => (
          <Animated.View key={o.t} entering={fall((HIDDEN.extras ? 0 : 3) + i)} style={{ width: '48.5%', flexGrow: 1 }}>
            <PressScale onPress={o.onPress} style={{ gap: 8, padding: 14, borderRadius: 22, backgroundColor: tokens.row, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
              <ClayIcon name={o.icon} size={58} />
              <Txt size={16} weight={600}>{o.t}</Txt>
              <Meta>{o.s}</Meta>
            </PressScale>
          </Animated.View>
        ))}
      </View>
      {HIDDEN.extras ? null : <>
      <PressScale scale={0.985} onPress={() => go(() => router.push('/assistent'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, borderRadius: 20, backgroundColor: tokens.row }}>
        <ClayIcon name="chat" size={48} />
        <Txt size={15.5} weight={600} style={{ flex: 1 }}>{tx('Frag den Assistenten', 'Ask the assistant')}</Txt>
        <LineIcon name="mic" size={20} color={tokens.sub} />
      </PressScale>
      <PressScale
        onPress={async () => { await Clipboard.setStringAsync(MAIL).catch(() => {}); toast(tx('Adresse kopiert', 'Address copied')); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: tokens.row }}
      >
        <LineIcon name="inbox" size={20} color={tokens.sub} />
        <Txt size={14} color={tokens.sub} style={{ flex: 1 }}>{tx('Oder weiterleiten an', 'Or forward to')} <Txt size={14} weight={700}>{MAIL}</Txt></Txt>
        <LineIcon name="copy" size={18} color={tokens.sub} />
      </PressScale>
      </>}
    </Sheet>
  );
}
