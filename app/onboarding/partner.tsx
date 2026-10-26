/** 5 · Zu zweit (Partner einladen, Farbe oder Profilbild) */
import React, { useState } from 'react';
import { View, Share } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Card, Chip, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Avatar, Pair } from '../../src/components/ui/Person';
import { tokens, personPalette } from '../../src/theme';
import { toast, useStore, actions } from '../../src/state/store';
import { haptics } from '../../src/lib/haptics';
import type { PersonId } from '../../src/theme';
import PressScale from '../../src/components/ui/PressScale';

const LINK = 'familie.app/j/huber-7Q2';

export default function Partner() {
  const names = useStore((s) => s.names);
  const sel = useStore((s) => s.colors);
  // The screen takes on the partner's colour as soon as it is picked (Julian 26.10.).
  const partner = personPalette[sel.T];
  return (
    <Screen
      bg={partner.bg}
      footer={
        <Btn
          label="Einladung senden"
          icon="send"
          onPress={async () => {
            await Share.share({ message: `${names.J} lädt dich in euren Familienkalender ein: https://${LINK}` }).catch(() => {});
            router.push('/onboarding/jahr');
          }}
        />
      }
    >
      <BackBar center={<StepDots i={5} />} />
      <H1 dot={partner.fg}>Zu zweit</H1>
      <Lead>{`${names.T || 'Dein Partner'} bekommt einen Link. Ein iPhone ist nicht nötig, die App läuft auch auf Android.`}</Lead>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pair size={44} ring={tokens.row} />
          <View style={{ flex: 1 }}>
            <Txt size={17} weight={600}>{`${names.J || 'Du'} und ${names.T || 'dein Partner'}`}</Txt>
            <Meta>Ein Haushalt, eine Familie</Meta>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: tokens.hair }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt size={15} color={tokens.sub} style={{ flex: 1 }}>{LINK}</Txt>
          <Chip icon={<LineIcon name="copy" size={16} />} onPress={async () => { await Clipboard.setStringAsync(`https://${LINK}`).catch(() => {}); toast('Link kopiert'); }}>Kopieren</Chip>
        </View>
      </Card>
      <Card pad={14}>
        <Txt size={13} weight={600} color={tokens.sub}>Profilbild oder Farbe</Txt>
        <Picker p="J" name={names.J || 'Du'} sel={sel.J} taken={sel.T} onSel={(i) => actions.setColor('J', i)} />
        <View style={{ height: 1, backgroundColor: tokens.hair }} />
        <Picker p="T" name={names.T || 'Partner'} sel={sel.T} taken={sel.J} onSel={(i) => actions.setColor('T', i)} />
        <Meta>{`Profilbild oder eine Farbe aus der Palette. Jeder wählt selbst und kann es später ändern.`}</Meta>
      </Card>
    </Screen>
  );
}

function Picker({ p, name, sel, taken, onSel }: { p: PersonId; name: string; sel: number; taken: number; onSel: (i: number) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar p={p} size={28} />
        <Txt size={15} weight={600} style={{ flex: 1 }}>{name}</Txt>
        <Meta>{personPalette[sel].name}</Meta>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingLeft: 2, flexWrap: 'wrap' }}>
        <PressScale onPress={() => toast('Fotoauswahl kommt später')} style={{ width: 30, height: 30, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="camera" size={16} color={tokens.sub} />
        </PressScale>
        {personPalette.map((c, i) => (
          <PressScale
            key={c.name}
            accessibilityLabel={c.name}
            accessibilityState={{ selected: i === sel, disabled: i === taken }}
            disabled={i === taken}
            scale={0.88}
            onPress={() => { haptics.select(); onSel(i); }}
            style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: c.bg, borderWidth: i === sel ? 2 : 0, borderColor: c.fg, opacity: i === taken ? 0.3 : 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {i === sel ? <LineIcon name="check" size={14} color={c.fg} stroke={2.4} /> : null}
          </PressScale>
        ))}
      </View>
    </View>
  );
}
