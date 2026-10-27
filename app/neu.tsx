/** Neu: the "+" sheet. Foto, Termin, Aufgabe, Entwurf; ask the assistant; or forward by mail. */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import * as Clipboard from 'expo-clipboard';
import Sheet from '../src/components/Sheet';
import Txt, { Dot } from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import PressScale from '../src/components/ui/PressScale';
import { Meta } from '../src/components/ui/kit';
import { tokens } from '../src/theme';
import { actions, toast } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';
import { tx } from '../src/i18n/lang';

const MAIL = 'huber-7q2@familie.app';

export default function Neu() {
  const go = (fn: () => void) => { goBack(); setTimeout(fn, 30); };
  const opts: { icon: ClayName; t: string; s: string; onPress: () => void }[] = [
    { icon: 'kamera-scan', t: tx('Foto', 'Photo'), s: tx('Brief, Zettel, Bescheid', 'Letter, note, notice'), onPress: () => go(() => router.push('/foto-kamera')) },
    { icon: 'kalender', t: tx('Termin', 'Event'), s: tx('für euch oder Ben', 'for you or the kids'), onPress: () => go(() => router.push('/termin-neu')) },
    { icon: 'erledigt', t: tx('Aufgabe', 'Task'), s: tx('mit oder ohne Datum', 'with or without a date'), onPress: () => go(() => { actions.setActiveList('aufgaben'); router.navigate('/listen'); }) },
    { icon: 'papier-stift', t: tx('Entwurf', 'Draft'), s: tx('Antwort schreiben lassen', 'Have a reply written'), onPress: () => go(() => router.push('/entwurf')) },
  ];
  return (
    <Sheet>
      <Txt size={24} weight={700} tracking={-0.5}>{tx('Was kommt dazu', 'What\'s new')}<Dot char="?" /></Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o) => (
          <PressScale key={o.t} onPress={o.onPress} style={{ width: '48.5%', flexGrow: 1, gap: 8, padding: 14, borderRadius: 22, backgroundColor: tokens.row }}>
            <ClayIcon name={o.icon} size={58} />
            <Txt size={16} weight={600}>{o.t}</Txt>
            <Meta>{o.s}</Meta>
          </PressScale>
        ))}
      </View>
      <PressScale scale={0.985} onPress={() => go(() => router.push('/chat'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, borderRadius: 20, backgroundColor: tokens.row }}>
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
