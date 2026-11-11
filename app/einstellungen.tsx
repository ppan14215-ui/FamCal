/** Einstellungen: family code or address, calendar sync, hints, language, export, Plus, sign out. */
import React, { useState } from 'react';
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
import { getFamily, forgetLocal } from '../src/lib/sync';
import { signOut, canTestSignIn, useAuth } from '../src/lib/auth';
import { analyticsOff, setAnalyticsOff } from '../src/lib/analytics';
import { chooseNav } from '../src/lib/funnel';
import { runQualityTest, CASES } from '../src/lib/qualitaet';
import { tx } from '../src/i18n/lang';
import { speechLang, setSpeechLang } from '../src/lib/speechLang';
import * as Updates from 'expo-updates';
import { useMicStyle, setMicStyle } from '../src/lib/micStyle';
import { useMascot, setMascot } from '../src/lib/mascot';
import { useSimple, setSimple } from '../src/lib/simple';
import { useAgent, setAgent } from '../src/lib/assistent';
import { usePrivat } from '../src/lib/privat';
import { Seg } from '../src/components/ui/kit';
import { haptics } from '../src/lib/haptics';
import { countryName, regionName } from '../src/lib/holidays';
import { HIDDEN } from '../src/lib/core';
import { startPreview } from '../src/lib/vorschau';
import { THEMES } from '../src/theme/tokens';
import { usePalette } from '../src/theme/mode';
import { navStyle, setNavStyle } from '../src/lib/navStyle';

/** Name left, value right, like Apple's settings (Julian 03.11.): no second line under every row. */
function SRow({ icon, t, v, right, onPress }: { icon: ClayName; t: string; v?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: tokens.row }}>
      <Tile name={icon} size={32} radius={10} bg="transparent" />
      <Txt size={15.5} weight={500} numberOfLines={1} style={{ flexShrink: 0 }}>{t}</Txt>
      <View style={{ flex: 1 }} />
      {v ? <Txt size={15} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1 }}>{v}</Txt> : null}
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
  const [noStats, setNoStats] = React.useState(analyticsOff());
  const mic = useMicStyle();
  const masc = useMascot();
  const pal = usePalette();
  const themeName = (() => { const t = THEMES.find((x) => x.id === pal); return t ? tx(t.de, t.en) : ''; })();
  const simple = useSimple();
  const agent = useAgent();
  const ohneKiNow = usePrivat().ohneKi;
  const cals = useStore((s) => s.calendars);
  const demo = useStore((s) => s.demo);
  const names = useStore((s) => s.names);
  const vac = useStore((s) => s.vacation);
  const land = useStore((s) => s.land);
  const country = useStore((s) => s.country);
  const code = getFamily()?.invite_code;
  const openCals = () => router.push({ pathname: '/onboarding/kalender', params: { zurueck: '1' } });
  return (
    <Screen gap={12}>
      <BackBar />
      <H1>{demo ? 'Familie Huber' : [names.J, names.T].filter(Boolean).join(tx(' und ', ' and ')) || tx('Eure Familie', 'Your family')}</H1>
      <Group>
        {LIVE ? (
          code ? <SRow icon="eingang" t={tx('Familiencode', 'Family code')} v={code} right={<LineIcon name="copy" size={18} color={tokens.sub} />} onPress={async () => { await Clipboard.setStringAsync(code).catch(() => {}); toast(tx('Code kopiert', 'Code copied')); }} /> : null
        ) : (
          <SRow icon="eingang" t={tx('Familienadresse', 'Family address')} v="huber-7q2@familie.app" right={<LineIcon name="copy" size={18} color={tokens.sub} />} onPress={async () => { await Clipboard.setStringAsync('huber-7q2@familie.app').catch(() => {}); toast(tx('Adresse kopiert', 'Address copied')); }} />
        )}
        {cals.map((c) => (
          <SRow key={c.provider} icon={CAL_NAME[c.provider]?.icon ?? 'kalender'} t={CAL_NAME[c.provider]?.t ?? c.provider} v={c.account} right={<Dot />} onPress={openCals} />
        ))}
        <SRow icon="sync" t={cals.length ? tx('Weitere Kalender', 'More calendars') : tx('Kalender verbinden', 'Connect calendars')} onPress={openCals} />
      </Group>
      {HIDDEN.toggles ? null : <>
      <View style={{ gap: 8 }}>
        {/* Julian 30.10.: both versions side by side, to compare. */}
        <Txt size={13} weight={600} color={tokens.sub} style={{ paddingHorizontal: 4 }}>{tx('Version zum Testen', 'Version to test')}</Txt>
        <Seg items={[{ key: 'jetzt', label: tx('Wie bisher', 'As before') }, { key: 'einfach', label: tx('Einfache Version', 'Simple version') }]} value={simple ? 'einfach' : 'jetzt'} onChange={(k) => { haptics.select(); setSimple(k === 'einfach'); toast(k === 'einfach' ? tx('Einfache Version ist an', 'Simple version is on') : tx('Wieder wie bisher', 'Back to before')); }} />
        <Txt size={12.5} line={17} color={tokens.mute} style={{ paddingHorizontal: 4 }}>{tx('Einfach (Standard): Kalender mit allen Ansichten immer sichtbar, ohne Personenfilter. Im Chat keine Sprungknöpfe oben und kein Umschalter Eintragen/Nachricht („Sag Sophia, …“ wird von selbst eine Nachricht). Leerer Chat zeigt Beispielsätze.', 'Simple (default): every calendar view always in sight, no person filter. In the chat no jump buttons on top and no Add/Message switch ("Tell Sophia …" becomes a message by itself). An empty chat shows example sentences.')}</Txt>
      </View>
      <View style={{ gap: 8 }}>
        {/* Julian 30.10.: the assistant that knows every function of the app, next to the old way. */}
        <Txt size={13} weight={600} color={tokens.sub} style={{ paddingHorizontal: 4 }}>{tx('Assistent zum Testen', 'Assistant to test')}</Txt>
        <Seg items={[{ key: 'alt', label: tx('Wie bisher', 'As before') }, { key: 'neu', label: tx('Neuer Assistent', 'New assistant') }]} value={agent ? 'neu' : 'alt'} onChange={(k) => { haptics.select(); setAgent(k === 'neu'); toast(k === 'neu' ? tx('Neuer Assistent ist an', 'New assistant is on') : tx('Wieder wie bisher', 'Back to before')); }} />
        <Txt size={12.5} line={17} color={tokens.mute} style={{ paddingHorizontal: 4 }}>{tx('Neu: Claude kennt alles, was die App kann. Er ändert und löscht Termine, hakt ab, beantwortet Fragen und fragt nach, wenn etwas unklar ist.', 'New: Claude knows everything the app can do. It changes and deletes events, ticks things off, answers questions and asks when something is unclear.')}</Txt>
      </View>
      </>}
      <Group>
        <SRow icon="notizblock" t={tx('Was ich weiß', 'What I know')} onPress={() => router.push('/wissen')} />
        <SRow icon="zuhause" t={tx('Eure Familie', 'Your family')} onPress={() => router.push('/personen')} />
        <SRow icon="malen" t={tx('Farbthema', 'Colour theme')} v={themeName} onPress={() => router.push('/design')} />
        <SRow icon="reise" t={tx('Urlaub und Feiertage', 'Vacation and holidays')} v={(land && (country === 'DE' ? land : regionName(country, land))) || countryName(country)} onPress={() => router.push('/urlaub')} />
        {HIDDEN.extras ? null : <SRow icon="glocke" t={tx('Hinweise', 'Notifications')} onPress={() => router.push('/demo/sperrbildschirm')} />}
        <SRow icon="chat" t={tx('Sprache', 'Language')} v={sl === 'de' ? tx('Deutsch', 'German') : tx('Englisch', 'English')} onPress={() => { const v = sl === 'de' ? 'en' : 'de'; setSpeechLang(v); setSl(v); toast(v === 'de' ? tx('Ich höre jetzt auf Deutsch', 'Listening in German now') : tx('Ich höre jetzt auf Englisch', 'Listening in English now')); }} />
        {/* Julian 11.11.: Pin, the clay magnet, or a minimal mic with record and stop. */}
        <SRow icon="chat" t={tx('Sprechen', 'Talking')} v={masc === 'minimal' ? tx('Minimal', 'Minimal') : tx('Mit Memo', 'With Memo')} onPress={() => { const v = masc === 'minimal' ? 'pin' : 'minimal'; setMascot(v); haptics.select(); toast(v === 'minimal' ? tx('Nur Mikro und Stopp, ohne Memo', 'Just mic and stop, no Memo') : tx('Memo ist wieder da', 'Memo is back')); }} />
        {HIDDEN.toggles ? null : <SRow icon="chat" t={tx('Mikro Anzeige', 'Mic display')} v={mic === 'ring' ? tx('Ring', 'Ring') : tx('Balken', 'Bars')} onPress={() => { const v = mic === 'ring' ? 'balken' : 'ring'; setMicStyle(v); haptics.select(); toast(v === 'ring' ? tx('Mikro zeigt jetzt den Ring', 'Mic now shows the ring') : tx('Mikro zeigt jetzt die Balken', 'Mic now shows the bars')); }} />}
        <SRow icon="kalender" t={tx('Kalender Abo und Export', 'Calendar feed and export')} onPress={() => router.push('/kalender-abo')} />
        {/* Julian 05.11.: Ohne KI, Sprache nur auf dem Handy, Alle Daten löschen. */}
        <SRow icon="schloss" t={tx('Datenschutz', 'Privacy')} v={ohneKiNow ? tx('Ohne KI', 'Without AI') : undefined} onPress={() => router.push('/datenschutz')} />
      </Group>
      {/* Julian 04.11.: the real settings apart from what is only there to try things out. */}
      <H2>{tx('Zum Testen', 'For testing')}</H2>
      <Group>
        <SRow icon="sync" t={tx('Navigation', 'Navigation')} v={navStyle() === 'bar' ? tx('Ein Balken', 'One bar') : tx('Unter der Eingabe', 'Under the field')} onPress={() => { haptics.select(); const prev = navStyle(); const next = prev === 'bar' ? 'strip' : 'bar'; setNavStyle(next); chooseNav(next, 'settings', prev); toast(tx('Navigation geändert', 'Navigation changed')); }} />
        <SRow icon="zuhause" t={tx('Neues Onboarding ansehen', 'View new onboarding')} onPress={() => router.push('/onboarding/flow')} />
        <SRow icon="zuhause" t={tx('Onboarding ansehen', 'View onboarding')} onPress={() => { startPreview(); router.push('/onboarding/story'); }} />
      </Group>
      <PressScale scale={0.985} onPress={() => router.push('/plus')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: tokens.row }}>
        <ClayIcon name="hand-nimmt" size={44} />
        <View style={{ flex: 1 }}>
          <Txt size={15.5} weight={600}>{tx('Plus testen', 'Try Plus')}</Txt>
          {LIVE ? null : <Meta>7 von 10 Erfassungen diesen Monat genutzt</Meta>}
        </View>
        <Chevron />
      </PressScale>

      {LIVE ? (
        <>
        <Group>
          <SRow icon="sync" t={tx('Nutzungsdaten teilen', 'Share usage data')} v={noStats ? tx('Aus', 'Off') : tx('An', 'On')} onPress={() => { haptics.select(); const off = !noStats; setAnalyticsOff(off); setNoStats(off); }} />
        </Group>
        <PressScale onPress={async () => { await forgetLocal(); await signOut(); router.dismissAll(); router.replace('/anmelden'); }} style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Txt size={15} weight={600} color={tokens.danger}>{tx('Abmelden', 'Sign out')}</Txt>
        </PressScale>
        </>
      ) : <>
      <H2>{tx('Prototyp', 'Prototype')}</H2>
      <Group>
        <SRow icon="glocke" t={tx('Hinweise · Sperrbildschirm', 'Notifications · lock screen')} onPress={() => router.push('/demo/sperrbildschirm')} />
        <SRow icon="chat" t={tx('Teilen aus einem Chat', 'Share from a chat')} onPress={() => router.push('/demo/teilen')} />
        <SRow icon="kalender" t="Widgets" onPress={() => router.push('/demo/widgets')} />
        <SRow icon="u-heft" t={tx('Beispielfamilie laden', 'Load sample family')} onPress={() => { actions.loadDemo(); router.dismissAll(); router.replace('/chat'); }} />
        <SRow icon="zuhause" t={tx('Onboarding neu starten', 'Restart onboarding')} onPress={() => { actions.reset(); router.dismissAll(); router.replace('/onboarding'); }} />
      </Group>
      <Txt size={12.5} line={17} color={tokens.mute} center>{tx('Prototyp ohne Login und ohne echte KI. Alles bleibt auf diesem Gerät und ist nach dem Neuladen wieder wie am Anfang.', 'Prototype without login and without real AI. Everything stays on this device and resets when you reload.')}</Txt>
      </>}
      {HIDDEN.toggles ? null : <QualityTest />}
      <Txt size={12} line={16} color={tokens.mute} center selectable>{versionLine()}</Txt>
    </Screen>
  );
}

/**
 * Which app and which update this phone runs (Julian 28.10.: an old APK
 * looked like missing updates). The build is named by its runtime
 * fingerprint, which changes with every new native build.
 */
function vacLine(vac: Partial<Record<'J' | 'T', number>>, names: { J: string; T: string }, land: string): string {
  const parts = (['J', 'T'] as const).filter((p) => vac[p]).map((p) => `${names[p] || (p === 'J' ? tx('Du', 'You') : 'Partner')} ${vac[p]}`);
  const days = parts.length ? tx(`${parts.join(', ')} Tage`, `${parts.join(', ')} days`) : tx('Urlaubstage pro Person einstellen', 'Set vacation days per person');
  return land ? `${days} · ${land}` : days;
}

function versionLine(): string {
  if (!Updates.updateId || !Updates.runtimeVersion) return tx('Vorschau', 'Preview');
  const when = Updates.createdAt ? Updates.createdAt.toLocaleString(tx('de-DE', 'en-US'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const update = Updates.isEmbeddedLaunch ? tx('ohne Update', 'no update yet') : `Update ${Updates.updateId.slice(0, 8)}`;
  return `Build ${Updates.runtimeVersion.slice(0, 8)} · ${update}${when ? ` · ${when}` : ''}${Updates.channel ? ` · ${Updates.channel}` : ''}`;
}

/**
 * Qualitätstest, nur in Testbuilds mit Testkonto (Julian 28.10.): 30 feste
 * Sätze gehen an Claude, die Zeile zeigt, wie viele richtig herauskommen.
 */
function QualityTest() {
  const { session } = useAuth();
  const [state, setState] = useState<{ busy: boolean; done: number; ok: number | null; total: number; limit?: boolean; bad?: string[] }>({ busy: false, done: 0, ok: null, total: 0 });
  if (!canTestSignIn || !session) return null;
  const s = state.busy
    ? `Läuft … ${state.done} von ${state.total}`
    : state.limit ? `Tageslimit erreicht nach ${state.done} Sätzen · morgen wieder`
    : state.ok !== null ? `${state.ok} von ${state.total} richtig · nochmal antippen` : `${CASES.length} Sätze an Claude, etwa 3 Cent`;
  return (
    <Group>
      <SRow
        icon="checkliste"
        t="Qualitätstest"
        v={s}
        onPress={state.busy ? undefined : async () => {
          setState({ busy: true, done: 0, ok: null, total: CASES.length });
          const { results, limit } = await runQualityTest((done, total) => setState((x) => ({ ...x, done, total })));
          setState({ busy: false, done: results.length, ok: results.filter((r) => r.ok).length, total: results.length, limit, bad: results.filter((r) => !r.ok).map((r) => `${r.id}: ${r.failed.join(', ')}`) });
        }}
      />
      {/* What failed, so a screenshot is enough to fix it. */}
      {state.bad?.length ? <Txt size={12.5} line={18} color={tokens.sub} style={{ paddingHorizontal: 16, paddingBottom: 12 }} selectable>{state.bad.join('\n')}</Txt> : null}
    </Group>
  );
}
