/** Plus: organising stays free; Plus takes work off you. Prices from the business plan (Julian 27.10.: Premium, 79 € a year, Gründerjahr 49 €). */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { Screen, BackBar, H1, Lead, Btn, Meta } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import LineIcon from '../src/components/ui/LineIcon';
import { tokens } from '../src/theme';
import { useStore, actions, toast } from '../src/state/store';
import PressScale from '../src/components/ui/PressScale';
import { tx } from '../src/i18n/lang';

const PLANS = [
  { key: 'gruender', t: tx('Gründerjahr', 'Founder year'), price: tx('49 €', '$49'), sub: tx('danach 79 € im Jahr', 'then $79.99 a year'), badge: tx('NUR ERSTE 1.000 FAMILIEN', 'FIRST 1,000 FAMILIES ONLY') },
  { key: 'jahr', t: tx('Jährlich', 'Yearly'), price: tx('79 €', '$79.99'), sub: tx('pro Familie, für euch beide', 'per family, for both of you') },
  { key: 'monat', t: tx('Monatlich', 'Monthly'), price: tx('8,99 €', '$8.99'), sub: tx('jederzeit kündbar', 'cancel any time') },
] as const;

export default function Plus() {
  const plan = useStore((s) => s.plan);
  return (
    <Screen
      footer={
        <>
          <Btn label={tx('14 Tage gratis testen', 'Try 14 days free')} onPress={() => { goBack(); toast(tx('Im Prototyp ohne Kauf', 'No purchase in the prototype')); }} />
          <Txt size={13} color={tokens.sub} center>{tx('Kündigen mit einem Tipp. Was gratis ist, bleibt gratis. Eingeladene sind immer gratis.', 'Cancel with one tap. What is free stays free. Invited family members are always free.')}</Txt>
        </>
      }
    >
      <BackBar />
      <H1>Plus</H1>
      <Lead>{tx('Organisieren bleibt gratis, für immer. Plus nimmt euch Arbeit ab.', 'Organising stays free, forever. Plus takes work off your hands.')}</Lead>
      <View style={{ gap: 8 }}>
        {[tx('Claude versteht jeden Satz, auch lange und verschachtelte', 'Claude understands every sentence, even long and tangled ones'), tx('Unbegrenzt erfassen: Mails, Fotos, Geteiltes', 'Capture without limits: mails, photos, shared links'), tx('Entwürfe für Absagen, Anträge, Antworten', 'Drafts for cancellations, forms and replies')].map((t) => (
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
            <PressScale key={p.key} onPress={() => actions.setPlan(p.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: tokens.row, borderWidth: 2, borderColor: on ? tokens.ink : 'transparent', marginTop: 'badge' in p ? 8 : 0 }}>
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
            </PressScale>
          );
        })}
      </View>
    </Screen>
  );
}
