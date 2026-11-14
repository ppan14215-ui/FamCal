/**
 * Einstellungen, built after the klar draft Julian approved (14.11. 09:33, the look before the Recordings style):
 * the title, then "Du" with your bubble colour, Memo's colour, a small preview and how you talk; then the family,
 * then the account. Rows are plain words on the ground with hairlines, no icons.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, BackBar, H1, H2, Group, Chevron, Seg } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import PressScale from '../src/components/ui/PressScale';
import Pin from '../src/components/buddy/Pin';
import { tokens } from '../src/theme';
import { actions, toast, useStore } from '../src/state/store';
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
import { haptics } from '../src/lib/haptics';
import { countryName, regionName } from '../src/lib/holidays';
import { HIDDEN } from '../src/lib/core';
import { startPreview } from '../src/lib/vorschau';
import { THEMES } from '../src/theme/tokens';
import { usePalette } from '../src/theme/mode';
import { navStyle, setNavStyle } from '../src/lib/navStyle';
import { BUBBLES, useBubble, setBubble, useMemoChoice, setMemoColor } from '../src/lib/look';

/** A plain row: name left, value right, like Apple's settings (Julian 03.11.). Flat on the ground, hairlines only. */
function SRow({ t, v, right, onPress }: { t: string; v?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <PressScale scale={0.985} onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingVertical: 8, paddingHorizontal: 2, backgroundColor: tokens.bg }}>
      <Txt size={17} line={22} numberOfLines={1} style={{ flexShrink: 0 }}>{t}</Txt>
      <View style={{ flex: 1 }} />
      {v ? <Txt size={16} line={22} color={tokens.sub} numberOfLines={1} style={{ flexShrink: 1 }}>{v}</Txt> : null}
      {right === undefined ? <Chevron /> : right}
    </PressScale>
  );
}
/** A row of "Du": the grey name left, its control right. */
function Pick({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 54, paddingVertical: 8, paddingHorizontal: 2 }}>
      <Txt size={16.5} line={22} color={tokens.sub}>{t}</Txt>
      {children}
    </View>
  );
}
/** What is connected, as one word behind "Kalender verbinden" (klar draft: "Google"). */
const CAL_SHORT: Record<string, string> = {
  device: tx('Handy', 'Phone'),
  google: 'Google',
  icloud: 'iCloud',
  outlook: 'Outlook',
};

/** Your colour: eight deep tones in a row, the chosen one wears a ring. */
function Swatches() {
  const me = useBubble();
  return (
    <View style={{ gap: 10, paddingTop: 12, paddingBottom: 14, paddingHorizontal: 2 }}>
      <Txt size={16.5} line={22} color={tokens.sub}>{tx('Deine Blasenfarbe', 'Your bubble colour')}</Txt>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {BUBBLES.map((b) => {
          const on = b.id === me.id;
          return (
            <PressScale key={b.id} scale={0.9} hitSlop={4} accessibilityRole="radio" accessibilityLabel={tx(b.de, b.en)} accessibilityState={{ selected: on }} onPress={() => { haptics.select(); setBubble(b.id); }}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? tokens.ink : 'transparent' }}>
              <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: b.c }} />
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

/** How your words and Memo's answer look with what you chose. */
function Preview() {
  const me = useBubble();
  const minimal = useMascot() === 'minimal';
  return (
    <View style={{ gap: 10, paddingTop: 12, paddingBottom: 14, paddingHorizontal: 2 }}>
      <Txt size={16.5} line={22} color={tokens.sub}>{tx('Vorschau', 'Preview')}</Txt>
      <View style={{ gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: tokens.hair, backgroundColor: tokens.row }}>
        <View style={{ alignSelf: 'flex-end', maxWidth: '84%', borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: me.soft }}>
          <Txt size={17} line={24}>{tx('Mia hat Samstag um zehn Fußball', 'Mia has football on Saturday at ten')}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          {minimal ? null : <View style={{ marginTop: -1 }}><Pin mood="idle" size={26} shadow={false} still /></View>}
          <Txt size={17} line={24} style={{ flex: 1 }}>{tx('Steht drin, Samstag 10:00.', 'Done, Saturday 10am.')}</Txt>
        </View>
      </View>
    </View>
  );
}

export default function Einstellungen() {
  const [sl, setSl] = React.useState(speechLang());
  const [noStats, setNoStats] = React.useState(analyticsOff());
  const mic = useMicStyle();
  const masc = useMascot();
  const memo = useMemoChoice();
  const pal = usePalette();
  const themeName = (() => { const t = THEMES.find((x) => x.id === pal); return t ? tx(t.de, t.en) : ''; })();
  const simple = useSimple();
  const agent = useAgent();
  const ohneKiNow = usePrivat().ohneKi;
  const cals = useStore((s) => s.calendars);
  const people = useStore((s) => s.people.length);
  const land = useStore((s) => s.land);
  const country = useStore((s) => s.country);
  const code = getFamily()?.invite_code;
  const openCals = () => router.push({ pathname: '/onboarding/kalender', params: { zurueck: '1' } });
  const copy = <LineIcon name="copy" size={18} color={tokens.sub} />;
  return (
    <Screen gap={10}>
      <BackBar />
      <H1>{tx('Einstellungen', 'Settings')}</H1>

      <H2>{tx('Du', 'You')}</H2>
      <Group>
        <Swatches key="farbe" />
        <Pick key="memo" t="Memo">
          <View style={{ width: 216 }}>
            <Seg items={[{ key: 'ink', label: tx('Schwarz', 'Black') }, { key: 'me', label: tx('Meine Farbe', 'My colour') }]} value={memo} onChange={(k) => { setMemoColor(k); }} />
          </View>
        </Pick>
        <Preview key="vorschau" />
        {/* Julian 11.11.: Memo, or a minimal mic with record and stop. */}
        <Pick key="sprechen" t={tx('Sprechen', 'Talking')}>
          <View style={{ width: 216 }}>
            <Seg items={[{ key: 'pin', label: tx('Mit Memo', 'With Memo') }, { key: 'minimal', label: 'Minimal' }]} value={masc} onChange={(k) => { setMascot(k); toast(k === 'minimal' ? tx('Nur Mikro und Stopp, ohne Memo', 'Just mic and stop, no Memo') : tx('Memo ist wieder da', 'Memo is back')); }} />
          </View>
        </Pick>
        <SRow key="sprache" t={tx('Sprache beim Sprechen', 'Speech language')} v={sl === 'de' ? tx('Deutsch', 'German') : tx('Englisch', 'English')} onPress={() => { const v = sl === 'de' ? 'en' : 'de'; setSpeechLang(v); setSl(v); toast(v === 'de' ? tx('Ich höre jetzt auf Deutsch', 'Listening in German now') : tx('Ich höre jetzt auf Englisch', 'Listening in English now')); }} />
      </Group>

      <H2>{tx('Familie', 'Family')}</H2>
      <Group>
        <SRow key="mitglieder" t={tx('Mitglieder', 'Members')} v={String(2 + people)} onPress={() => router.push('/personen')} />
        <SRow key="kalender" t={tx('Kalender verbinden', 'Connect calendars')} v={cals.map((c) => CAL_SHORT[c.provider] ?? c.provider).join(', ') || undefined} onPress={openCals} />
        {HIDDEN.extras ? null : <SRow key="hinweise" t={tx('Benachrichtigungen', 'Notifications')} onPress={() => router.push('/demo/sperrbildschirm')} />}
        {LIVE ? (
          code ? <SRow key="code" t={tx('Familiencode', 'Family code')} v={code} right={copy} onPress={async () => { await Clipboard.setStringAsync(code).catch(() => {}); toast(tx('Code kopiert', 'Code copied')); }} /> : null
        ) : (
          <SRow key="adresse" t={tx('Familienadresse', 'Family address')} v="huber-7q2@familie.app" right={copy} onPress={async () => { await Clipboard.setStringAsync('huber-7q2@familie.app').catch(() => {}); toast(tx('Adresse kopiert', 'Address copied')); }} />
        )}
        <SRow key="urlaub" t={tx('Urlaub und Feiertage', 'Vacation and holidays')} v={(land && (country === 'DE' ? land : regionName(country, land))) || countryName(country)} onPress={() => router.push('/urlaub')} />
        <SRow key="wissen" t={tx('Was ich weiß', 'What I know')} onPress={() => router.push('/wissen')} />
      </Group>

      <H2>{tx('Konto', 'Account')}</H2>
      <Group>
        {/* Julian 05.11.: Ohne KI, Sprache nur auf dem Handy, Alle Daten löschen. */}
        <SRow key="datenschutz" t={tx('Datenschutz', 'Privacy')} v={ohneKiNow ? tx('Ohne KI', 'Without AI') : undefined} onPress={() => router.push('/datenschutz')} />
        <SRow key="export" t={tx('Kalender Abo und Export', 'Calendar feed and export')} onPress={() => router.push('/kalender-abo')} />
        <SRow key="plus" t={tx('Plus testen', 'Try Plus')} v={LIVE ? undefined : '7 von 10'} onPress={() => router.push('/plus')} />
        {LIVE ? <SRow key="daten" t={tx('Nutzungsdaten teilen', 'Share usage data')} v={noStats ? tx('Aus', 'Off') : tx('An', 'On')} right={null} onPress={() => { haptics.select(); const off = !noStats; setAnalyticsOff(off); setNoStats(off); }} /> : null}
        {LIVE ? (
          <PressScale key="ab" scale={0.985} onPress={async () => { await forgetLocal(); await signOut(); router.dismissAll(); router.replace('/anmelden'); }} style={{ minHeight: 50, justifyContent: 'center', paddingHorizontal: 2 }}>
            <Txt size={17} line={22} color={tokens.danger}>{tx('Abmelden', 'Sign out')}</Txt>
          </PressScale>
        ) : null}
      </Group>

      {/* Julian 04.11.: the real settings apart from what is only there to try things out. */}
      <H2>{tx('Zum Testen', 'For testing')}</H2>
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
        <SRow key="nav" t={tx('Navigation', 'Navigation')} v={navStyle() === 'klar' ? tx('Glas Pille mit Memo', 'Glass pill with Memo') : navStyle() === 'bar' ? tx('Ein Balken', 'One bar') : tx('Unter der Eingabe', 'Under the field')} onPress={() => { haptics.select(); const prev = navStyle(); const next = prev === 'klar' ? 'strip' : prev === 'strip' ? 'bar' : 'klar'; setNavStyle(next); chooseNav(next, 'settings', prev); toast(tx('Navigation geändert', 'Navigation changed')); }} />
        {HIDDEN.toggles ? null : <SRow key="mikro" t={tx('Mikro Anzeige', 'Mic display')} v={mic === 'ring' ? tx('Ring', 'Ring') : tx('Balken', 'Bars')} onPress={() => { const v = mic === 'ring' ? 'balken' : 'ring'; setMicStyle(v); haptics.select(); toast(v === 'ring' ? tx('Mikro zeigt jetzt den Ring', 'Mic now shows the ring') : tx('Mikro zeigt jetzt die Balken', 'Mic now shows the bars')); }} />}
        <SRow key="thema" t={tx('Farbthema', 'Colour theme')} v={themeName} onPress={() => router.push('/design')} />
        <SRow key="memo" t={tx('Memo, alle Zustände', 'Memo, every state')} onPress={() => router.push('/memo')} />
        <SRow key="onb" t={tx('Neues Onboarding ansehen', 'View new onboarding')} onPress={() => { startPreview(); router.push('/onboarding/story'); }} />
        {LIVE ? null : <SRow key="p1" t={tx('Hinweise · Sperrbildschirm', 'Notifications · lock screen')} onPress={() => router.push('/demo/sperrbildschirm')} />}
        {LIVE ? null : <SRow key="p2" t={tx('Teilen aus einem Chat', 'Share from a chat')} onPress={() => router.push('/demo/teilen')} />}
        {LIVE ? null : <SRow key="p3" t="Widgets" onPress={() => router.push('/demo/widgets')} />}
        {LIVE ? null : <SRow key="p4" t={tx('Beispielfamilie laden', 'Load sample family')} onPress={() => { actions.loadDemo(); router.dismissAll(); router.replace('/chat'); }} />}
        {LIVE ? null : <SRow key="p5" t={tx('Onboarding neu starten', 'Restart onboarding')} onPress={() => { actions.reset(); router.dismissAll(); router.replace('/onboarding'); }} />}
      </Group>
      {LIVE ? null : <Txt size={12.5} line={17} color={tokens.mute} center>{tx('Prototyp ohne Login und ohne echte KI. Alles bleibt auf diesem Gerät und ist nach dem Neuladen wieder wie am Anfang.', 'Prototype without login and without real AI. Everything stays on this device and resets when you reload.')}</Txt>}
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
