/**
 * 4 · Eure Kalender. Nothing is connected on a first launch (Julian 26.10.).
 * "Verbinden" signs in right under the row, then lists the calendars that
 * account has; the family picks which ones show. The sign-in itself is
 * simulated in the prototype.
 */
import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Hint, TextLink, Toggle, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import PressScale from '../../src/components/ui/PressScale';
import { Avatar } from '../../src/components/ui/Person';
import { tokens, fonts, persons, rise, rowIn, rowOut } from '../../src/theme';
import { useStore, actions, toast } from '../../src/state/store';
import { PROVIDERS, Provider, FoundCal, found, importEvents } from '../../src/data/calendars';
import { haptics } from '../../src/lib/haptics';
import type { PersonId } from '../../src/theme';

type Step = 'login' | 'pick';

export default function Kalender() {
  const connected = useStore((s) => s.calendars);
  const next = () => router.push('/onboarding/partner');
  return (
    <Screen footer={<><Btn label="Weiter" onPress={next} /><TextLink label="Später" weight={400} onPress={next} /></>}>
      <BackBar center={<StepDots i={3} />} />
      <H1>Eure Kalender</H1>
      <Lead>Damit nichts doppelt ist. Ihr wählt, welche Kalender hier erscheinen, der Rest bleibt privat.</Lead>
      <View style={{ gap: 8 }}>
        {PROVIDERS.map((p) => <ProviderCard key={p.key} p={p} conn={connected.find((c) => c.provider === p.key)} />)}
      </View>
      <Hint icon="lock">Arbeitstermine erscheinen nur als gestreifter Block „Arbeit“.</Hint>
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
    if (!/.+@.+\..+/.test(mail.trim())) { haptics.warning(); toast('Bitte eine E-Mail-Adresse eingeben'); return; }
    haptics.select();
    setCals(found(p.key));
    setStep('pick');
  };
  const save = () => {
    const ids = cals.filter((c) => c.on).map((c) => c.id);
    actions.connectCalendar(p.key, mail.trim(), ids, importEvents(p.key as Provider, ids, owner, kid?.land));
    haptics.success();
    toast(ids.length ? `${ids.length} ${ids.length === 1 ? 'Kalender' : 'Kalender'} verbunden` : `${p.title} getrennt`);
    setStep(null);
  };

  const sub = conn ? `${conn.ids.length} Kalender · ${conn.account}` : 'nicht verbunden';
  return (
    <View style={{ borderRadius: 20, backgroundColor: tokens.row, overflow: 'hidden' }}>
      <PressScale scale={0.985} onPress={step ? () => setStep(null) : start} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14 }}>
        <Tile name={p.icon} size={48} radius={14} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt size={16} line={21} weight={600}>{p.title}</Txt>
          <Meta color={conn ? tokens.done : tokens.sub}>{sub}</Meta>
        </View>
        {step ? <Txt size={15} color={tokens.sub}>Schließen</Txt> : <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: conn ? tokens.chipBg : tokens.ink, alignItems: 'center', justifyContent: 'center' }}><Txt size={13.5} weight={600} color={conn ? tokens.ink : '#FFFFFF'}>{conn ? 'Ändern' : 'Verbinden'}</Txt></View>}
      </PressScale>

      {step === 'login' ? (
        <Animated.View key="login" entering={rowIn} exiting={rowOut} style={{ gap: 10, paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ gap: 2, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: tokens.bg }}>
            <Txt size={13} color={tokens.sub}>{`Bei ${p.title.replace('-Kalender', '').replace(' Kalender', '')} anmelden`}</Txt>
            <TextInput
              value={mail}
              onChangeText={setMail}
              autoFocus
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={p.hint}
              placeholderTextColor={tokens.mute}
              selectionColor={tokens.ink}
              onSubmitEditing={login}
              style={[{ fontFamily: fonts[600], fontSize: 17, color: tokens.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
            />
          </View>
          <Btn label="Weiter" height={46} onPress={login} />
          <Txt size={12.5} color={tokens.mute} center>Im Prototyp ohne echte Anmeldung.</Txt>
        </Animated.View>
      ) : null}

      {step === 'pick' ? (
        <Animated.View key="pick" entering={rowIn} exiting={rowOut} style={{ gap: 4, paddingHorizontal: 14, paddingBottom: 14 }}>
          <Txt size={13} color={tokens.sub} style={{ paddingVertical: 4 }}>{`Gefunden in ${mail.trim()}`}</Txt>
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
            <Txt size={14} color={tokens.sub} style={{ flex: 1 }}>Wem gehört der Kalender?</Txt>
            {(['J', 'T'] as PersonId[]).map((w) => (
              <PressScale key={w} scale={0.92} onPress={() => { haptics.select(); setOwner(w); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 999, backgroundColor: owner === w ? persons[w].tint : tokens.chipBg }}>
                <Avatar p={w} size={26} ring={owner === w ? '#FFFFFF' : undefined} />
                <Txt size={14} weight={600} color={owner === w ? persons[w].ink : tokens.sub}>{persons[w].name}</Txt>
              </PressScale>
            ))}
          </View>
          <Btn label="Übernehmen" height={46} onPress={save} />
        </Animated.View>
      ) : null}
    </View>
  );
}
