/**
 * Eingang · Teilen aus Chat (V1-Teilen). A message from a group chat is shared
 * to the app; it recognises the date and only enters it after "Eintragen".
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Txt from '../../src/components/ui/Txt';
import LineIcon, { LineName } from '../../src/components/ui/LineIcon';
import { ClayIcon, Tile } from '../../src/components/ui/Clay';
import { Btn, Card, Meta, RoundButton, SheetHandle } from '../../src/components/ui/kit';
import { tokens } from '../../src/theme';
import { actions, toast } from '../../src/state/store';
import { haptics } from '../../src/lib/haptics';
import type { CalEvent } from '../../src/state/types';
import PressScale from '../../src/components/ui/PressScale';

const EVENT: CalEvent = {
  id: 'e-laterne', title: 'Laternenbasteln', sub: 'Krabbelgruppe Südstadt', icon: 'geburtstag',
  date: '2026-11-14', start: '10:00', end: '12:00', who: null, place: 'Gemeindehaus',
  bring: [{ id: 'b-glas', t: 'Ein Glas', done: false }],
  source: 'Geteilt aus dem Chat „Krabbelgruppe Südstadt“',
};

function App({ children, label, on, onPress }: { children: React.ReactNode; label: string; on?: boolean; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ width: 70, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 3 : 0, borderColor: tokens.done }}>
        {children}
      </View>
      <Txt size={12} line={15} center>{label}</Txt>
    </PressScale>
  );
}

export default function Teilen() {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState(false);
  const other = (n: string) => () => toast(`${n} ist im Prototyp nur Kulisse`);
  const line = (n: LineName) => <LineIcon name={n} size={26} />;

  const eintragen = () => {
    haptics.success();
    actions.addEvent(EVENT);
    actions.setCalDay(EVENT.date);
    actions.setCalView('monat');
    toast('Laternenbasteln eingetragen');
    router.dismissTo('/kalender');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E9E4DC' }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundButton icon="x" label="Schließen" onPress={() => goBack()} />
          <Txt size={13} color={tokens.sub}>Chat „Krabbelgruppe Südstadt“</Txt>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ alignSelf: 'flex-start', maxWidth: 270, marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: tokens.row, borderWidth: 3, borderColor: tokens.done }}>
          <Txt size={15} line={21}>Liebe Eltern, am Sa 14. Nov ist Laternenbasteln, 10–12 Uhr im Gemeindehaus. Bitte ein Glas mitbringen.</Txt>
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 34 + insets.bottom, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: tokens.bg, gap: 16 }}>
        <SheetHandle />
        <Txt size={15} weight={600}>Teilen mit</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <App label={'Familien-\nassistent'} on onPress={() => { haptics.select(); setPicked(true); }}>
            <ClayIcon name="kalender" size={46} />
          </App>
          <App label="Nachricht" onPress={other('Nachricht')}>{line('send')}</App>
          <App label="Kopieren" onPress={other('Kopieren')}>{line('copy')}</App>
          <App label="Mail" onPress={other('Mail')}>{line('inbox')}</App>
        </View>
        {picked ? (
          <Animated.View entering={FadeInDown.duration(240)}>
            <Card pad={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Tile name="geburtstag" size={44} radius={14} />
                <View style={{ flex: 1 }}>
                  <Meta>Erkannt, noch nicht eingetragen</Meta>
                  <Txt size={16} weight={600}>Laternenbasteln · Sa 14. Nov, 10–12</Txt>
                  <Meta>Mitbringen: ein Glas</Meta>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="Ändern" primary={false} style={{ flex: 1 }} onPress={() => router.push('/termin-neu')} />
                <Btn label="Eintragen" style={{ flex: 2 }} onPress={eintragen} />
              </View>
            </Card>
          </Animated.View>
        ) : (
          <Txt size={13.5} color={tokens.sub} center>Tippe auf Familienassistent.</Txt>
        )}
      </View>
    </View>
  );
}
