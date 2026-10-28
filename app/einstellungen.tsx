/** Einstellungen: family code or address, calendar sync, hints, language, export, Plus, sign out. */
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
import { LIVE } from '../src/lib/live';
import { getFamily, stopSync } from '../src/lib/sync';
import { signOut } from '../src/lib/auth';
import { tx } from '../src/i18n/lang';
import { speechLang, setSpeechLang } from '../src/lib/speechLang';
import * as Updates from 'expo-updates';

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
  device: { t: tx('Kalender auf diesem Handy', 'Calendars on this phone'), icon: 'kalender' },
  google: { t: tx('Google Kalender', 'Google Calendar'), icon: 'sync' },
  icloud: { t: tx('iCloud-Kalender', 'iCloud Calendar'), icon: 'kalender' },
  outlook: { t: 'Outlook', icon: 'telefon' },
};

export default function Einstellungen() {
  const [sl, setSl] = React.useState(speechLang());
  const cals = useStore((s) => s.calendars);
  const demo = useStore((s) => s.demo);
  const names = useStore((s) => s.names);
  const code = getFamily()?.invite_code;
  const openCals = () => router.push({ pathname: '/onboarding/kalender', params: { zurueck: '1' } });
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{demo ? 'Familie Huber' : [names.J, names.T].filter(Boolean).join(tx(' und ', ' and ')) || tx('Eure Familie', 'Your family')}</H1>
      <Group>
        {LIVE ? (
          code ? <SRow icon="eingang" t={code} s={tx('Familiencode · damit tritt dein Partner bei', 'Family code · your partner joins with it')} right={<LineIcon name="copy" size={18} color={tokens.sub} />} onPress={async () => { await Clipboard.setStringAsync(code).catch(() => {}); toast(tx('Code kopiert', 'Code copied')); }} /> : null
        ) : (
          <SRow icon="eingang" t="huber-7q2@familie.app" s="Familienadresse · weiterleiten oder hinterlegen" right={<LineIcon name="copy" size={18} color={tokens.sub} />} onPress={async () => { await Clipboard.setStringAsync('huber-7q2@familie.app').catch(() => {}); toast('Adresse kopiert'); }} />
        )}
        {cals.map((c) => (
          <SRow key={c.provider} icon={CAL_NAME[c.provider]?.icon ?? 'kalender'} t={CAL_NAME[c.provider]?.t ?? c.provider} s={`${c.ids.length} ${tx('Kalender', c.ids.length === 1 ? 'calendar' : 'calendars')} · ${c.account}`} right={<Dot />} onPress={openCals} />
        ))}
        <SRow icon="sync" t={cals.length ? tx('Weitere Kalender', 'More calendars') : tx('Kalender verbinden', 'Connect calendars')} s={cals.length ? tx('Auswahl ändern oder hinzufügen', 'Change or add') : tx('Damit nichts doppelt ist', 'So nothing is in two places')} onPress={openCals} />
      </Group>
      <Group>
        <SRow icon="glocke" t={tx('Hinweise', 'Notifications')} s={tx('Nur Wichtiges · Ruhe 21–7 Uhr', 'Only what matters · quiet 9pm to 7am')} onPress={() => router.push('/demo/sperrbildschirm')} />
        <SRow icon="chat" t={tx('Ich spreche', 'I speak')} s={sl === 'de' ? tx('Deutsch · tippen für Englisch', 'German · tap for English') : tx('Englisch · tippen für Deutsch', 'English · tap for German')} onPress={() => { const v = sl === 'de' ? 'en' : 'de'; setSpeechLang(v); setSl(v); toast(v === 'de' ? tx('Ich höre jetzt auf Deutsch', 'Listening in German now') : tx('Ich höre jetzt auf Englisch', 'Listening in English now')); }} />
        <SRow icon="chat" t={tx('Sprache', 'Language')} s={tx('Deutsch · folgt der Sprache des Handys', 'English · follows the phone language')} onPress={() => toast(tx('Ändern in den Einstellungen des Handys', 'Change it in the phone settings'))} />
        <SRow icon="paket" t="Export" s={tx('Kalender (ICS) und alle Daten (JSON)', 'Calendar (ICS) and all data (JSON)')} onPress={() => toast(tx('Export kommt bald', 'Export is coming soon'))} />
      </Group>
      <PressScale scale={0.985} onPress={() => router.push('/plus')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: tokens.row }}>
        <ClayIcon name="hand-nimmt" size={44} />
        <View style={{ flex: 1 }}>
          <Txt size={15.5} weight={600}>{tx('Plus testen', 'Try Plus')}</Txt>
          <Meta>{LIVE ? tx('Claude versteht jeden Satz, auch lange', 'Claude understands every sentence, even long ones') : '7 von 10 Erfassungen diesen Monat genutzt'}</Meta>
        </View>
        <Chevron />
      </PressScale>

      {LIVE ? (
        <PressScale onPress={async () => { stopSync(); await signOut(); router.dismissAll(); router.replace('/anmelden'); }} style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Txt size={15} weight={600} color={tokens.danger}>{tx('Abmelden', 'Sign out')}</Txt>
        </PressScale>
      ) : <>
      <H2>Prototyp</H2>
      <Group>
        <SRow icon="glocke" t="Hinweise · Sperrbildschirm" s="So sehen Push-Hinweise aus" onPress={() => router.push('/demo/sperrbildschirm')} />
        <SRow icon="chat" t="Teilen aus einem Chat" s="Nachricht aus WhatsApp übernehmen" onPress={() => router.push('/demo/teilen')} />
        <SRow icon="kalender" t="Widgets" s="Homescreen, klein und mittel" onPress={() => router.push('/demo/widgets')} />
        <SRow icon="u-heft" t="Beispielfamilie laden" s="Julia, Tom und Ben mit vollem Kalender" onPress={() => { actions.loadDemo(); router.dismissAll(); router.replace('/kalender'); }} />
        <SRow icon="zuhause" t="Onboarding neu starten" s="Alles leeren, wie beim ersten Öffnen" onPress={() => { actions.reset(); router.dismissAll(); router.replace('/onboarding'); }} />
      </Group>
      <Txt size={12.5} line={17} color={tokens.mute} center>Prototyp ohne Login und ohne echte KI. Alles bleibt auf diesem Gerät und ist nach dem Neuladen wieder wie am Anfang.</Txt>
      </>}
      <Txt size={12} line={16} color={tokens.mute} center selectable>{versionLine()}</Txt>
    </Screen>
  );
}

/**
 * Which app and which update this phone runs (Julian 28.10.: an old APK
 * looked like missing updates). The build is named by its runtime
 * fingerprint, which changes with every new native build.
 */
function versionLine(): string {
  if (!Updates.updateId || !Updates.runtimeVersion) return tx('Vorschau', 'Preview');
  const when = Updates.createdAt ? Updates.createdAt.toLocaleString(tx('de-DE', 'en-US'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const update = Updates.isEmbeddedLaunch ? tx('ohne Update', 'no update yet') : `Update ${Updates.updateId.slice(0, 8)}`;
  return `Build ${Updates.runtimeVersion.slice(0, 8)} · ${update}${when ? ` · ${when}` : ''}${Updates.channel ? ` · ${Updates.channel}` : ''}`;
}
