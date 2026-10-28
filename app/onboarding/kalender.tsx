/**
 * Eure Kalender. Nothing is connected on a first launch (Julian 26.10.).
 * In the app this reads the phone's own calendars (iCloud, Google, Outlook
 * are already there); the family picks which ones show and whose they are.
 * The web link has no device calendars, so there the sign-in is simulated.
 */
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/lib/nav';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint, TextLink, Toggle, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import PressScale from '../../src/components/ui/PressScale';
import { Avatar } from '../../src/components/ui/Person';
import { tokens, fonts, persons, rise, rowIn, rowOut } from '../../src/theme';
import { useStore, actions, toast } from '../../src/state/store';
import { PROVIDERS, Provider, FoundCal, found, importEvents } from '../../src/data/calendars';
import { hasDeviceCalendars, askAccess, listCalendars, importDeviceEvents, moveIn, DeviceCal } from '../../src/lib/deviceCalendars';
import { LIVE } from '../../src/lib/live';
import { haptics } from '../../src/lib/haptics';
import type { PersonId } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

type Step = 'login' | 'pick';

export default function Kalender() {
  const connected = useStore((s) => s.calendars);
  // Opened from Einstellungen: Weiter goes back there instead of on.
  const { zurueck } = useLocalSearchParams<{ zurueck?: string }>();
  const next = () => (zurueck ? goBack() : router.push('/onboarding/partner'));
  return (
    <Screen footer={<><Btn label={tx('Weiter', 'Next')} onPress={next} />{zurueck ? null : <TextLink label={tx('Später', 'Later')} weight={400} onPress={next} />}</>}>
      <BackBar center={zurueck ? undefined : <StepDots i={1} n={3} />} />
      <H1>{tx('Eure Kalender', 'Your calendars')}</H1>
      <Lead>{tx('Damit nichts doppelt ist. Ihr wählt, welche Kalender hier erscheinen, der Rest bleibt privat.', 'So nothing is double booked. You choose which calendars show up here, the rest stays private.')}</Lead>
      <View style={{ gap: 8 }}>
        {hasDeviceCalendars
          ? <DeviceCard conn={connected.find((c) => c.provider === 'device')} />
          : PROVIDERS.map((p) => <ProviderCard key={p.key} p={p} conn={connected.find((c) => c.provider === p.key)} />)}
      </View>
      <Hint icon="lock">{tx('Arbeitstermine erscheinen nur als gestreifter Block „Arbeit“.', 'Work events only show as a striped “Work” block.')}</Hint>
    </Screen>
  );
}

function ProviderCard({ p, conn }: { p: (typeof PROVIDERS)[number]; conn?: { account: string; ids: string[] } }) {
  const kid = useStore((s) => s.kid);
  const [step, setStep] = useState<Step | null>(null);
  const [mail, setMail] = useState('');
  const [cals, setCals] = useState<FoundCal[]>([]);
  const [owner, setOwner] = useState<PersonId>('J');

  const start = () => { haptics.select(); setStep(conn ? 'pick' : 'login'); if (conn) { setMail(conn.account); setCals(found(p.key).map((c) => ({ ...c, on: conn.ids.includes(c.id) }))); } };
  const login = () => {
    if (!/.+@.+\..+/.test(mail.trim())) { haptics.warning(); toast(tx('Bitte eine E-Mail-Adresse eingeben', 'Please enter an email address')); return; }
    haptics.select();
    setCals(found(p.key));
    setStep('pick');
  };
  const save = () => {
    const ids = cals.filter((c) => c.on).map((c) => c.id);
    actions.connectCalendar(p.key, mail.trim(), ids, importEvents(p.key as Provider, ids, owner, kid?.land));
    haptics.success();
    toast(ids.length ? tx(`${ids.length} Kalender verbunden`, `${ids.length} ${ids.length === 1 ? 'calendar' : 'calendars'} connected`) : tx(`${p.title} getrennt`, `${p.title} disconnected`));
    setStep(null);
  };

  const sub = conn ? tx(`${conn.ids.length} Kalender · ${conn.account}`, `${conn.ids.length} calendars · ${conn.account}`) : 'nicht verbunden';
  return (
    <View style={{ borderRadius: 20, backgroundColor: tokens.row, overflow: 'hidden' }}>
      <PressScale scale={0.985} onPress={step ? () => setStep(null) : start} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14 }}>
        <Tile name={p.icon} size={48} radius={14} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt size={16} line={21} weight={600}>{p.title}</Txt>
          <Meta color={conn ? tokens.done : tokens.sub}>{sub}</Meta>
        </View>
        {step ? <Txt size={15} color={tokens.sub}>{tx('Schließen', 'Close')}</Txt> : <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: conn ? tokens.chipBg : tokens.ink, alignItems: 'center', justifyContent: 'center' }}><Txt size={13.5} weight={600} color={conn ? tokens.ink : tokens.onInk}>{conn ? tx('Ändern', 'Change') : 'Verbinden'}</Txt></View>}
      </PressScale>

      {step === 'login' ? (
        <Animated.View key="login" entering={rowIn} exiting={rowOut} style={{ gap: 10, paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ gap: 2, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: tokens.bg }}>
            <Txt size={13} color={tokens.sub}>{tx(`Bei ${p.title.replace('-Kalender', '').replace(' Kalender', '')} anmelden`, `Sign in to ${p.title.replace('-Kalender', '').replace(' Kalender', '')}`)}</Txt>
            <TextInput
              value={mail}
              onChangeText={setMail}
              autoFocus
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={p.hint}
              placeholderTextColor={tokens.mute}
              selectionColor={tokens.select} cursorColor={tokens.ink}
              onSubmitEditing={login}
              style={[{ fontFamily: fonts[600], fontSize: 17, color: tokens.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
            />
          </View>
          <Btn label={tx('Weiter', 'Next')} height={46} onPress={login} />
          <Txt size={12.5} color={tokens.mute} center>{tx('Im Prototyp ohne echte Anmeldung.', 'No real sign-in in the prototype.')}</Txt>
        </Animated.View>
      ) : null}

      {step === 'pick' ? (
        <Animated.View key="pick" entering={rowIn} exiting={rowOut} style={{ gap: 4, paddingHorizontal: 14, paddingBottom: 14 }}>
          <Txt size={13} color={tokens.sub} style={{ paddingVertical: 4 }}>{tx(`Gefunden in ${mail.trim()}`, `Found in ${mail.trim()}`)}</Txt>
          {cals.map((c, i) => (
            <Animated.View key={c.id} entering={rise(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt size={15.5} weight={600}>{c.name}</Txt>
                <Meta>{c.sub}</Meta>
              </View>
              <Toggle value={c.on} onChange={(v) => setCals(cals.map((x) => (x.id === c.id ? { ...x, on: v } : x)))} />
            </Animated.View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Txt size={14} color={tokens.sub} style={{ flex: 1 }}>{tx('Wem gehört der Kalender?', 'Whose calendar is it?')}</Txt>
            {(['J', 'T'] as PersonId[]).map((w) => (
              <PressScale key={w} scale={0.92} onPress={() => { haptics.select(); setOwner(w); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 999, backgroundColor: owner === w ? persons[w].tint : tokens.chipBg }}>
                <Avatar p={w} size={26} ring={owner === w ? tokens.onInk : undefined} />
                <Txt size={14} weight={600} color={owner === w ? persons[w].ink : tokens.sub}>{persons[w].name}</Txt>
              </PressScale>
            ))}
          </View>
          <Btn label={tx('Übernehmen', 'Add')} height={46} onPress={save} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The phone's calendars: ask once, list them by account, pick, import. */
function DeviceCard({ conn }: { conn?: { account: string; ids: string[] } }) {
  const kid = useStore((s) => s.kid);
  const [state, setState] = useState<'idle' | 'denied' | 'pick'>('idle');
  const [cals, setCals] = useState<DeviceCal[]>([]);
  const [owner, setOwner] = useState<PersonId>('J');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    haptics.select();
    if (state !== 'idle') return setState('idle');
    if (!(await askAccess())) { haptics.warning(); return setState('denied'); }
    const list = await listCalendars();
    setCals(conn ? list.map((c) => ({ ...c, on: conn.ids.includes(c.id) })) : list);
    setState('pick');
  };
  const save = async () => {
    setBusy(true);
    try {
      const events = await importDeviceEvents(cals, owner, LIVE ? 365 : 92);
      const holidays = importEvents('icloud', ['feiertage'], owner, kid?.land);
      const ids = cals.filter((c) => c.on).map((c) => c.id);
      if (LIVE) {
        // Real app: the family's Termine move into the shared calendar, work stays a private block here.
        const { copy, keep } = moveIn(events);
        actions.connectCalendar('device', tx('Dieses Handy', 'This phone'), ids, [...keep, ...holidays]);
        actions.addEvents(copy);
        haptics.success();
        toast(ids.length ? tx(`${copy.length} Termine übernommen, für euch beide sichtbar`, `${copy.length} events moved in, visible to both of you`) : tx('Kalender getrennt', 'Calendars disconnected'));
      } else {
        actions.connectCalendar('device', tx('Dieses Handy', 'This phone'), ids, [...events, ...holidays]);
        haptics.success();
        toast(ids.length ? tx(`${ids.length} Kalender verbunden, ${events.length} Termine`, `${ids.length} calendars connected, ${events.length} events`) : tx('Kalender getrennt', 'Calendars disconnected'));
      }
      setState('idle');
    } catch {
      haptics.warning();
      toast(tx('Kalender konnten nicht gelesen werden', 'Could not read the calendars'));
    } finally { setBusy(false); }
  };

  const accounts = cals.map((c) => c.account).filter((a, i, l) => l.indexOf(a) === i);
  const sub = conn ? tx(`${conn.ids.length} Kalender verbunden`, `${conn.ids.length} calendars connected`) : tx('iCloud, Google und Outlook vom Handy', 'iCloud, Google and Outlook from your phone');
  return (
    <View style={{ borderRadius: 20, backgroundColor: tokens.row, overflow: 'hidden' }}>
      <PressScale scale={0.985} onPress={start} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14 }}>
        <Tile name="kalender" size={48} radius={14} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt size={16} line={21} weight={600}>{tx('Kalender auf diesem Handy', 'Calendars on this phone')}</Txt>
          <Meta color={conn ? tokens.done : tokens.sub}>{sub}</Meta>
        </View>
        {state !== 'idle' ? <Txt size={15} color={tokens.sub}>{tx('Schließen', 'Close')}</Txt> : <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: conn ? tokens.chipBg : tokens.ink, alignItems: 'center', justifyContent: 'center' }}><Txt size={13.5} weight={600} color={conn ? tokens.ink : tokens.onInk}>{conn ? tx('Ändern', 'Change') : 'Verbinden'}</Txt></View>}
      </PressScale>

      {state === 'denied' ? (
        <Animated.View entering={rowIn} exiting={rowOut} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Txt size={14} line={20} color={tokens.sub}>{tx('Ohne Zugriff bleibt euer Kalender hier leer. Ihr könnt ihn jederzeit in den Einstellungen des Handys unter FamCal freigeben.', 'Without access your calendar stays empty here. You can allow it any time in your phone’s settings under FamCal.')}</Txt>
        </Animated.View>
      ) : null}

      {state === 'pick' ? (
        <Animated.View entering={rowIn} exiting={rowOut} style={{ gap: 4, paddingHorizontal: 14, paddingBottom: 14 }}>
          {!cals.length ? <Txt size={14} color={tokens.sub}>{tx('Auf diesem Handy ist noch kein Kalender eingerichtet.', 'There is no calendar set up on this phone yet.')}</Txt> : null}
          {accounts.map((a) => (
            <View key={a} style={{ gap: 2 }}>
              <Txt size={13} color={tokens.sub} style={{ paddingTop: 6 }}>{a}</Txt>
              {cals.filter((c) => c.account === a).map((c, i) => (
                <Animated.View key={c.id} entering={rise(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: c.color }} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt size={15.5} weight={600}>{c.title}</Txt>
                    {c.work ? <Meta>{tx('nur als gestreifter Block', 'only as a striped block')}</Meta> : null}
                  </View>
                  <Toggle value={c.on} onChange={(v) => setCals(cals.map((x) => (x.id === c.id ? { ...x, on: v } : x)))} />
                </Animated.View>
              ))}
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Txt size={14} color={tokens.sub} style={{ flex: 1 }}>{tx('Wem gehören die Kalender?', 'Whose calendars are these?')}</Txt>
            {(['J', 'T'] as PersonId[]).map((w) => (
              <PressScale key={w} scale={0.92} onPress={() => { haptics.select(); setOwner(w); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 999, backgroundColor: owner === w ? persons[w].tint : tokens.chipBg }}>
                <Avatar p={w} size={26} ring={owner === w ? tokens.onInk : undefined} />
                <Txt size={14} weight={600} color={owner === w ? persons[w].ink : tokens.sub}>{persons[w].name}</Txt>
              </PressScale>
            ))}
          </View>
          <Btn label={busy ? tx('Liest Termine …', 'Reading events …') : tx('Übernehmen', 'Add')} height={46} disabled={busy} onPress={save} />
          <Txt size={12.5} color={tokens.mute} center>{tx('Bleibt auf dem Handy. FamCal liest nur, schreibt nichts zurück.', 'Stays on the phone. FamCal only reads, it never writes back.')}</Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}
