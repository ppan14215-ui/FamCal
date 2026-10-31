/** Widgets (V1-Widgets): homescreen small and medium, filled from the live sample data. */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Txt, { Dot } from '../../src/components/ui/Txt';
import { ClayIcon, Tile } from '../../src/components/ui/Clay';
import { BackBar, Hint } from '../../src/components/ui/kit';
import { tokens, tint } from '../../src/theme';
import { useStore } from '../../src/state/store';
import { eventsOn, nextEvent } from '../../src/lib/selectors';
import { TODAY, WD_SHORT, weekday, dayNum, hm, soon, until } from '../../src/lib/dates';
import type { ClayName } from '../../src/lib/clayIcons';
import PressScale from '../../src/components/ui/PressScale';

const SMALL = 160;

function Small({ icon, kicker, kickerColor, title, sub, onPress }: { icon: ClayName; kicker: string; kickerColor: string; title: string; sub?: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ width: SMALL, height: SMALL, borderRadius: 26, backgroundColor: tint(icon), padding: 14, justifyContent: 'space-between' }}>
      <ClayIcon name={icon} size={54} />
      <View>
        <Txt size={11} weight={700} color={kickerColor}>{kicker}</Txt>
        <Txt size={16} line={20} weight={700} numberOfLines={2}>{title}</Txt>
        {sub ? <Txt size={12} color={tokens.sub} numberOfLines={1}>{sub}</Txt> : null}
      </View>
    </PressScale>
  );
}

export default function Widgets() {
  const insets = useSafeAreaInsets();
  const events = useStore((s) => s.events);
  const docs = useStore((s) => s.docs);
  const next = useMemo(() => nextEvent(events), [events]);
  const today = useMemo(() => eventsOn(events, TODAY, false).slice(0, 3), [events]);
  const eg = docs.find((d) => d.id === 'd-eg');

  return (
    <View style={{ flex: 1, backgroundColor: '#DDE3E6' }}>
      <View style={{ flex: 1, paddingHorizontal: 18 }}>
        <View style={{ paddingTop: insets.top + 8 }} />
        <BackBar />
        <Txt size={28} weight={700} tracking={-0.8} style={{ marginTop: 14, marginBottom: 18 }}>Widgets<Dot /></Txt>
        <View style={{ gap: 18, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            {next ? (
              <Small icon={next.icon} kicker={soon(next.date, next.start).split(' · ')[0]} kickerColor={tokens.done} title={next.title} sub={next.sub} onPress={() => router.push(`/termin/${next.id}`)} />
            ) : null}
            {eg?.frist ? (
              <Small icon={eg.icon} kicker={`Frist · ${until(eg.frist)}`} kickerColor={tokens.frist} title="Elterngeld" sub="Bescheinigung fehlt" onPress={() => router.push('/infozettel')} />
            ) : null}
          </View>
          <PressScale onPress={() => router.dismissTo('/kalender')} style={{ width: SMALL * 2 + 18, height: SMALL, borderRadius: 26, backgroundColor: tokens.row, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
            <Txt size={13} weight={700}>
              Heute<Dot /> <Txt size={13} weight={500} color={tokens.sub}>{WD_SHORT[weekday(TODAY)]} {dayNum(TODAY)}.</Txt>
            </Txt>
            {today.map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Tile name={e.icon} size={30} radius={9} />
                <Txt size={14} weight={600} style={{ flex: 1 }} numberOfLines={1}>{e.title}</Txt>
                <Txt size={12.5} color={tokens.sub}>{hm(e.start)}</Txt>
              </View>
            ))}
          </PressScale>
        </View>
        <View style={{ marginTop: 24 }}>
          <Hint center>Im Prototyp nur zum Anschauen. Tippen öffnet die passende Stelle in der App.</Hint>
        </View>
      </View>
    </View>
  );
}
