/** 5 · Zu zweit (Partner einladen, Farbe oder Profilbild) */
import React, { useState } from 'react';
import { View, Pressable, Share } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Card, Chip, Meta } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Avatar, Pair } from '../../src/components/ui/Person';
import { tokens, personPalette } from '../../src/theme';
import { toast, useStore } from '../../src/state/store';
import type { PersonId } from '../../src/theme';

const LINK = 'familie.app/j/huber-7Q2';

export default function Partner() {
  const names = useStore((s) => s.names);
  const [sel, setSel] = useState<Record<PersonId, number>>({ J: 0, T: 1 });
  return (
    <Screen
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
      <BackBar center={<StepDots i={4} />} />
      <H1>Zu zweit</H1>
      <Lead>{`${names.T} bekommt einen Link. Er braucht kein iPhone, die App läuft auch auf Android.`}</Lead>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pair size={44} ring={tokens.row} />
          <View style={{ flex: 1 }}>
            <Txt size={17} weight={600}>{`${names.J} und ${names.T}`}</Txt>
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
        <Picker p="J" name={names.J} sel={sel.J} onSel={(i) => setSel({ ...sel, J: i })} />
        <View style={{ height: 1, backgroundColor: tokens.hair }} />
        <Picker p="T" name={names.T} sel={sel.T} onSel={(i) => setSel({ ...sel, T: i })} />
        <Meta>{`Profilbild oder eine Farbe aus der Palette. Jeder wählt selbst, ${names.T} kann seins später ändern.`}</Meta>
      </Card>
    </Screen>
  );
}

function Picker({ p, name, sel, onSel }: { p: PersonId; name: string; sel: number; onSel: (i: number) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar p={p} size={28} />
        <Txt size={15} weight={600} style={{ flex: 1 }}>{name}</Txt>
        <Meta>{personPalette[sel].name}</Meta>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingLeft: 2, flexWrap: 'wrap' }}>
        <Pressable onPress={() => toast('Fotoauswahl kommt später')} style={{ width: 30, height: 30, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="camera" size={16} color={tokens.sub} />
        </Pressable>
        {personPalette.map((c, i) => (
          <Pressable
            key={c.name}
            accessibilityLabel={c.name}
            onPress={() => onSel(i)}
            style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: c.bg, borderWidth: i === sel ? 2 : 0, borderColor: c.fg, padding: 2 }}
          />
        ))}
      </View>
    </View>
  );
}
