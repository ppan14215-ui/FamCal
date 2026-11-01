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
import { tx } from '../../src/i18n/lang';

const event = (): CalEvent => ({
  id: 'e-laterne', title: tx('Laternenbasteln', 'Lantern crafts'), sub: tx('Krabbelgruppe Südstadt', 'Toddler group Southside'), icon: 'geburtstag',
  date: '2026-11-14', start: '10:00', end: '12:00', who: null, place: tx('Gemeindehaus', 'Community hall'),
  bring: [{ id: 'b-glas', t: tx('Ein Glas', 'A jar'), done: false }],
  source: tx('Geteilt aus dem Chat „Krabbelgruppe Südstadt“', 'Shared from the chat “Toddler group Southside”'),
});

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
  const other = (n: string) => () => toast(tx(`${n} ist im Prototyp nur Kulisse`, `${n} is only a backdrop in the prototype`));
  const line = (n: LineName) => <LineIcon name={n} size={26} />;

  const eintragen = () => {
    const EVENT = event();
    haptics.success();
    actions.addEvent(EVENT);
    actions.setCalDay(EVENT.date);
    actions.setCalView('monat');
    toast(tx('Laternenbasteln eingetragen', 'Lantern crafts added'));
    router.dismissTo('/kalender');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E9E4DC' }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundButton icon="x" label={tx('Schließen', 'Close')} onPress={() => goBack()} />
          <Txt size={13} color={tokens.sub}>{tx('Chat „Krabbelgruppe Südstadt“', 'Chat “Toddler group Southside”')}</Txt>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ alignSelf: 'flex-start', maxWidth: 270, marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: tokens.row, borderWidth: 3, borderColor: tokens.done }}>
          <Txt size={15} line={21}>{tx('Liebe Eltern, am Sa 14. Nov ist Laternenbasteln, 10–12 Uhr im Gemeindehaus. Bitte ein Glas mitbringen.', 'Dear parents, lantern crafts are on Sat Nov 14, 10 to 12 at the community hall. Please bring a jar.')}</Txt>
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 34 + insets.bottom, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: tokens.bg, gap: 16 }}>
        <SheetHandle />
        <Txt size={15} weight={600}>{tx('Teilen mit', 'Share with')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <App label={tx('Familien-\nassistent', 'Family\nassistant')} on onPress={() => { haptics.select(); setPicked(true); }}>
            <ClayIcon name="kalender" size={46} />
          </App>
          <App label={tx('Nachricht', 'Message')} onPress={other(tx('Nachricht', 'Message'))}>{line('send')}</App>
          <App label={tx('Kopieren', 'Copy')} onPress={other(tx('Kopieren', 'Copy'))}>{line('copy')}</App>
          <App label="Mail" onPress={other('Mail')}>{line('inbox')}</App>
        </View>
        {picked ? (
          <Animated.View entering={FadeInDown.duration(240)}>
            <Card pad={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Tile name="geburtstag" size={44} radius={14} />
                <View style={{ flex: 1 }}>
                  <Meta>{tx('Erkannt, noch nicht eingetragen', 'Recognised, not added yet')}</Meta>
                  <Txt size={16} weight={600}>{tx('Laternenbasteln · Sa 14. Nov, 10–12', 'Lantern crafts · Sat Nov 14, 10 to 12')}</Txt>
                  <Meta>{tx('Mitbringen: ein Glas', 'Bring: a jar')}</Meta>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={tx('Ändern', 'Edit')} primary={false} style={{ flex: 1 }} onPress={() => router.push('/termin-neu')} />
                <Btn label={tx('Eintragen', 'Add')} style={{ flex: 2 }} onPress={eintragen} />
              </View>
            </Card>
          </Animated.View>
        ) : (
          <Txt size={13.5} color={tokens.sub} center>{tx('Tippe auf Familienassistent.', 'Tap Family assistant.')}</Txt>
        )}
      </View>
    </View>
  );
}
