/** Plus: organising stays free; Plus takes work off you. Prices from HANDOFF (Gründerjahr 29 €). */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, BackBar, H1, Lead, Btn, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { tokens } from '../src/theme';
import { useStore, actions, toast } from '../src/state/store';

const PLANS = [
  { key: 'gruender', t: 'Gründerjahr', price: '29 €', sub: 'danach 39,99 € im Jahr', badge: 'NUR ERSTE 200 FAMILIEN' },
  { key: 'jahr', t: 'Jährlich', price: '39,99 €', sub: 'pro Haushalt, für euch beide' },
  { key: 'monat', t: 'Monatlich', price: '4,99 €', sub: 'jederzeit kündbar' },
] as const;

export default function Plus() {
  const plan = useStore((s) => s.plan);
  return (
    <Screen
      footer={
        <>
          <Btn label="14 Tage gratis testen" onPress={() => { router.back(); toast('Im Prototyp ohne Kauf'); }} />
          <Txt size={13} color={tokens.sub} center>Kündigen mit einem Tipp. Was gratis ist, bleibt gratis.</Txt>
        </>
      }
    >
      <BackBar />
      <H1>Plus</H1>
      <Lead>Organisieren bleibt gratis, für immer. Plus nimmt euch Arbeit ab.</Lead>
      <View style={{ gap: 8 }}>
        {['Unbegrenzt erfassen: Mails, Fotos, Geteiltes', 'Dokumente und Fristen mit Vorausschau', 'Entwürfe für Absagen, Anträge, Antworten'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LineIcon name="check" size={18} color={tokens.done} stroke={2.2} />
            <Txt size={15}>{t}</Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 6 }}>
        {PLANS.map((p) => {
          const on = plan === p.key;
          return (
            <Pressable key={p.key} onPress={() => actions.setPlan(p.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: tokens.row, borderWidth: 2, borderColor: on ? tokens.ink : 'transparent', marginTop: 'badge' in p ? 8 : 0 }}>
              {'badge' in p ? (
                <View style={{ position: 'absolute', top: -11, left: 14, height: 22, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tokens.done, justifyContent: 'center' }}>
                  <Txt size={11.5} weight={700} color="#FFFFFF">{p.badge}</Txt>
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Txt size={16} weight={600}>{p.t}</Txt>
                <Meta>{p.sub}</Meta>
              </View>
              <Txt size={18} weight={700}>{p.price}</Txt>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
