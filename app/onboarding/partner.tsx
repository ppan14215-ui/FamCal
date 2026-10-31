/** 5 · Zu zweit (Partner einladen, Farbe oder Profilbild) */
import React, { useState } from 'react';
import { View, Share } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, BackBar, StepDots, H1, Lead, Btn, Card, Chip, Meta, TextLink } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon from '../../src/components/ui/LineIcon';
import { Avatar, Pair } from '../../src/components/ui/Person';
import { tokens, personPalette, shade } from '../../src/theme';
import ColorPicker from '../../src/components/ColorPicker';
import { toast, useStore, actions } from '../../src/state/store';
import { haptics } from '../../src/lib/haptics';
import type { PersonId } from '../../src/theme';
import PressScale from '../../src/components/ui/PressScale';
import { getFamily } from '../../src/lib/sync';
import { tx } from '../../src/i18n/lang';

const LINK = 'familie.app/j/huber-7Q2';
/** The real app invites with the family's six letter code (Julian 27.10.); the test link keeps the sample link. */
const invite = () => {
  const code = getFamily()?.invite_code;
  return code
    ? { shown: `Code ${code}`, copy: code, message: (from: string) => tx(`${from} lädt dich in euren Familienkalender ein. Lade FamCal, melde dich an und gib den Code ${code} ein.`, `${from} invites you to your family calendar. Get FamCal, sign in and enter the code ${code}.`) }
    : { shown: LINK, copy: `https://${LINK}`, message: (from: string) => tx(`${from} lädt dich in euren Familienkalender ein: https://${LINK}`, `${from} invites you to your family calendar: https://${LINK}`) };
};

export default function Partner() {
  const names = useStore((s) => s.names);
  const sel = useStore((s) => s.colors);
  // The screen takes on the partner's colour as soon as it is picked (Julian 26.10.).
  const partner = shade(personPalette[sel.T]);
  return (
    <Screen
      bg={partner.bg}
      footer={<>
        <Btn
          label={tx('Einladung senden', 'Send invite')}
          icon="send"
          onPress={async () => {
            await Share.share({ message: invite().message(names.J) }).catch(() => {});
            router.replace('/chat');
          }}
        />
        <TextLink label={tx('Später einladen', 'Invite later')} weight={400} onPress={() => router.replace('/chat')} />
      </>}
    >
      <BackBar center={<StepDots i={2} n={3} />} />
      <H1 dot={partner.fg}>{tx('Zu zweit', 'The two of you')}</H1>
      <Lead>{tx(`${names.T || 'Dein Partner'} bekommt einen Link. Ein iPhone ist nicht nötig, die App läuft auch auf Android.`, `${names.T || 'Your partner'} gets a link. No iPhone needed, the app runs on Android too.`)}</Lead>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pair size={44} ring={tokens.row} />
          <View style={{ flex: 1 }}>
            <Txt size={17} weight={600}>{tx(`${names.J || 'Du'} und ${names.T || 'dein Partner'}`, `${names.J || 'You'} and ${names.T || 'your partner'}`)}</Txt>
            <Meta>{tx('Ein Haushalt, eine Familie', 'One household, one family')}</Meta>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: tokens.hair }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt size={15} color={tokens.sub} style={{ flex: 1 }}>{invite().shown}</Txt>
          <Chip icon={<LineIcon name="copy" size={16} />} onPress={async () => { await Clipboard.setStringAsync(invite().copy).catch(() => {}); toast(getFamily() ? tx('Code kopiert', 'Code copied') : tx('Link kopiert', 'Link copied')); }}>{tx('Kopieren', 'Copy')}</Chip>
        </View>
      </Card>
      <Card pad={14}>
        <Txt size={13} weight={600} color={tokens.sub}>{tx('Profilbild oder Farbe', 'Photo or colour')}</Txt>
        <ColorPicker p="J" name={names.J || 'Du'} sel={sel.J} taken={sel.T} onSel={(i) => actions.setColor('J', i)} />
        <View style={{ height: 1, backgroundColor: tokens.hair }} />
        <ColorPicker p="T" name={names.T || 'Partner'} sel={sel.T} taken={sel.J} onSel={(i) => actions.setColor('T', i)} />
        <Meta>{tx(`Profilbild oder eine Farbe aus der Palette. Jeder wählt selbst und kann es später ändern.`, `A photo or a colour from the palette. Everyone picks their own and can change it later.`)}</Meta>
      </Card>
    </Screen>
  );
}
