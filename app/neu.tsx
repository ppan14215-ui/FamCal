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
import { canRead } from '../src/lib/screenshot';
import Animated, { FadeInDown } from 'react-native-reanimated';

// The cards fall in one after the other with a little tilt, like cards laid on a table (Julian 30.10., mymind).
const fall = (i: number) => FadeInDown.springify().damping(14).stiffness(180).delay(60 + i * 45);
const TILT = ['-2deg', '1.5deg', '-1deg', '2deg'];

const MAIL = 'huber-7q2@familie.app';

export default function Neu() {
  const go = (fn: () => void) => { goBack(); setTimeout(fn, 30); };
  const soon = () => toast(tx('Kommt mit dem nächsten App Update', 'Coming with the next app update'));
  const attach: { icon: LineName; t: string; onPress: () => void }[] = [
    { icon: 'camera', t: tx('Kamera', 'Camera'), onPress: () => go(() => (canRead() ? router.push({ pathname: '/bild-liste', params: { from: 'camera' } }) : router.push('/foto-kamera'))) },
    { icon: 'image', t: tx('Fotos', 'Photos'), onPress: canRead() ? () => go(() => router.push({ pathname: '/bild-liste', params: { from: 'gallery' } })) : soon },
    { icon: 'file', t: tx('Datei', 'File'), onPress: soon },
  ];
  const opts: { icon: ClayName; t: string; s: string; onPress: () => void }[] = [
    { icon: 'kalender', t: tx('Termin', 'Event'), s: tx('für euch oder Ben', 'for you or the kids'), onPress: () => go(() => router.push('/termin-neu')) },
    { icon: 'einkauf', t: tx('Listeneintrag', 'List item'), s: tx('Einkauf und eure Listen', 'Shopping and your lists'), onPress: () => go(() => router.push('/einkauf-neu')) },
    { icon: 'erledigt', t: tx('Aufgabe', 'Task'), s: tx('mit oder ohne Datum', 'with or without a date'), onPress: () => go(() => { actions.setActiveList('aufgaben'); router.navigate('/listen'); }) },
    { icon: 'papier-stift', t: tx('Entwurf', 'Draft'), s: tx('Antwort schreiben lassen', 'Have a reply written'), onPress: () => go(() => router.push('/entwurf')) },
  ];
  return (
    <Sheet>
      <Txt size={24} weight={700} tracking={-0.5}>{tx('Was kommt dazu', 'What\'s new')}<Dot char="?" /></Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {attach.map((a, i) => (
          <Animated.View key={a.t} entering={fall(i)} style={{ flex: 1 }}>
            <PressScale accessibilityLabel={a.t} onPress={a.onPress} style={{ alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 20, backgroundColor: tokens.row }}>
              <LineIcon name={a.icon} size={26} color={tokens.ink} />
              <Txt size={14} weight={600}>{a.t}</Txt>
            </PressScale>
          </Animated.View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o, i) => (
          <Animated.View key={o.t} entering={fall(3 + i)} style={{ width: '48.5%', flexGrow: 1, transform: [{ rotate: TILT[i % 4] }] }}>
            <PressScale onPress={o.onPress} style={{ gap: 8, padding: 14, borderRadius: 22, backgroundColor: tokens.row, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
              <ClayIcon name={o.icon} size={58} />
              <Txt size={16} weight={600}>{o.t}</Txt>
              <Meta>{o.s}</Meta>
            </PressScale>
          </Animated.View>
        ))}
      </View>
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
    </Sheet>
  );
}
