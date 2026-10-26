/** Einstellungen: family address, calendar sync, hints, language, export, Plus. */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, BackBar, H1, H2, Group, Meta, Chevron } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { Tile, ClayIcon } from '../src/components/ui/Clay';
import PressScale from '../src/components/ui/PressScale';
import { tokens } from '../src/theme';
import { actions, toast, useStore } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';

function SRow({ icon, t, s, right, onPress }: { icon: ClayName; t: string; s: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: tokens.row }}>
      <Tile name={icon} size={38} radius={12} />
      <View style={{ flex: 1 }}>
        <Txt size={15.5} weight={600}>{t}</Txt>
        <Meta>{s}</Meta>
      </View>
      {right ?? <Chevron />}
    </PressScale>
  );
}
const Dot = () => <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: tokens.ok }} />;

const CAL_NAME: Record<string, { t: string; icon: ClayName }> = {
  device: { t: 'Kalender auf diesem Handy', icon: 'kalender' },
  google: { t: 'Google Kalender', icon: 'sync' },
  icloud: { t: 'iCloud-Kalender', icon: 'kalender' },
  outlook: { t: 'Outlook', icon: 'telefon' },
};

export default function Einstellungen() {
  const cals = useStore((s) => s.calendars);
  const demo = useStore((s) => s.demo);
  const names = useStore((s) => s.names);
  const openCals = () => router.push({ pathname: '/onboarding/kalender', params: { zurueck: '1' } });
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{demo ? 'Familie Huber' : [names.J, names.T].filter(Boolean).join(' und ') || 'Eure Familie'}</H1>
      <Group>
        <SRow icon="eingang" t="huber-7q2@familie.app" s="Familienadresse · weiterleiten oder hinterlegen" right={<LineIcon name="copy" size={18} color={tokens.sub} />} onPress={async () => { await Clipboard.setStringAsync('huber-7q2@familie.app').catch(() => {}); toast('Adresse kopiert'); }} />
        {cals.map((c) => (
          <SRow key={c.provider} icon={CAL_NAME[c.provider]?.icon ?? 'kalender'} t={CAL_NAME[c.provider]?.t ?? c.provider} s={`${c.ids.length} Kalender · ${c.account}`} right={<Dot />} onPress={openCals} />
        ))}
        <SRow icon="sync" t={cals.length ? 'Weitere Kalender' : 'Kalender verbinden'} s={cals.length ? 'Auswahl ändern oder hinzufügen' : 'Damit nichts doppelt ist'} onPress={openCals} />
      </Group>
      <Group>
        <SRow icon="glocke" t="Hinweise" s="Nur Wichtiges · Ruhe 21–7 Uhr" onPress={() => router.push('/demo/sperrbildschirm')} />
        <SRow icon="chat" t="Sprache" s="Julia Deutsch · Tom English" onPress={() => toast('Englisch kommt nach dem Prototyp')} />
        <SRow icon="paket" t="Export" s="Kalender (ICS) und alle Daten (JSON)" onPress={() => toast('Export kommt mit dem Backend')} />
      </Group>
      <PressScale scale={0.985} onPress={() => router.push('/plus')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: tokens.row }}>
        <ClayIcon name="hand-nimmt" size={44} />
        <View style={{ flex: 1 }}>
          <Txt size={15.5} weight={600}>Plus testen</Txt>
          <Meta>7 von 10 Erfassungen diesen Monat genutzt</Meta>
        </View>
        <Chevron />
      </PressScale>

      <H2>Prototyp</H2>
      <Group>
        <SRow icon="glocke" t="Hinweise · Sperrbildschirm" s="So sehen Push-Hinweise aus" onPress={() => router.push('/demo/sperrbildschirm')} />
        <SRow icon="chat" t="Teilen aus einem Chat" s="Nachricht aus WhatsApp übernehmen" onPress={() => router.push('/demo/teilen')} />
        <SRow icon="kalender" t="Widgets" s="Homescreen, klein und mittel" onPress={() => router.push('/demo/widgets')} />
        <SRow icon="u-heft" t="Beispielfamilie laden" s="Julia, Tom und Ben mit vollem Kalender" onPress={() => { actions.loadDemo(); router.dismissAll(); router.replace('/heute'); }} />
        <SRow icon="zuhause" t="Onboarding neu starten" s="Alles leeren, wie beim ersten Öffnen" onPress={() => { actions.reset(); router.dismissAll(); router.replace('/onboarding'); }} />
      </Group>
      <Txt size={12.5} line={17} color={tokens.mute} center>Prototyp ohne Login und ohne echte KI. Alles bleibt auf diesem Gerät und ist nach dem Neuladen wieder wie am Anfang.</Txt>
    </Screen>
  );
}
