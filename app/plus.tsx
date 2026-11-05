/**
 * FamCal Plus paywall (Julian 05.11.2026 22:05 "1-5 machen": paywall with the 14 day trial from day one, as the
 * last step of onboarding; no A/B tests). Pricing (decided 27.10.): 79 € a year or 8,99 € a month per family,
 * founder price 49 € in the first year. The trial is the store's introductory offer on both products, so
 * "14 Tage gratis" is what the store really does; the price shown always comes from the store.
 *
 * Sells the feeling, not a feature list (Julian 22:06, point 1).
 *
 * Open with /plus?trigger=onboarding (end of first run) or /plus?trigger=settings. When the store is not set up
 * yet (no RevenueCat key or no offering), onboarding goes straight on to the chat and settings shows the old
 * prototype screen (src/components/PlusPreview.tsx), so nothing breaks before the store products exist.
 *
 * Tracking: paywall_shown {trigger} when it is really visible, purchase_started / purchase_failed from
 * purchases.ts, trial_started and purchase_completed from the RevenueCat webhook on the server.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Btn, TextLink } from '../src/components/ui/kit';
import Txt from '../src/components/ui/Txt';
import { tokens } from '../src/theme';
import { getOffering, buy, restore } from '../src/lib/purchases';
import { trackOnce } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { toast } from '../src/state/store';
import { tx } from '../src/i18n/lang';
import PlusPreview from '../src/components/PlusPreview';

type Plan = 'year' | 'month';

export default function Plus() {
  const q = useLocalSearchParams<{ trigger?: string }>();
  const trigger = q.trigger || 'settings';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [offering, setOffering] = useState<any>(undefined);
  const [plan, setPlan] = useState<Plan>('year');
  const [busy, setBusy] = useState(false);
  const [none, setNone] = useState(false);

  const leave = () => { if (trigger === 'onboarding') router.replace('/chat'); else if (router.canGoBack()) router.back(); else router.replace('/chat'); };

  useEffect(() => {
    let live = true;
    getOffering().then((o) => {
      if (!live) return;
      if (!o || (!o.annual && !o.monthly)) { if (trigger === 'onboarding') leave(); else setNone(true); return; }
      setOffering(o);
      trackOnce(trigger, 'paywall_shown', { trigger });
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (none) return <PlusPreview />;
  if (!offering) {
    return <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={tokens.sub} /></View>;
  }

  const pkg = plan === 'year' ? offering.annual ?? offering.monthly : offering.monthly ?? offering.annual;
  const price = (p: Plan) => (p === 'year' ? offering.annual : offering.monthly)?.product?.priceString ?? '';

  const start = async () => {
    if (busy || !pkg) return;
    setBusy(true);
    const r = await buy(pkg, trigger);
    setBusy(false);
    if (r === 'ok') { haptics.success(); toast(tx('Plus ist an. Danke!', 'Plus is on. Thank you!')); leave(); }
    else if (r === 'failed') toast(tx('Hat nicht geklappt. Versuch es gleich noch mal.', 'That didn’t work. Try again in a moment.'));
  };
  const again = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    toast(ok ? tx('Plus ist wieder da.', 'Plus is back.') : tx('Kein Kauf gefunden.', 'No purchase found.'));
    if (ok) leave();
  };

  const feel: [string, string][] = [
    [tx('Einmal sagen, beide wissen es.', 'Say it once, you both know.'), tx('Kein Hinterhertelefonieren, wer was wann macht.', 'No more chasing who does what, when.')],
    [tx('Der Kopf wird leiser.', 'Your head gets quieter.'), tx('Termine, Einkauf, Arzt, Geschenke: FamCal denkt mit, damit ihr es nicht müsst.', 'Appointments, shopping, doctors, gifts: FamCal keeps track so you don’t have to.')],
    [tx('Mehr Abende ohne Orga.', 'More evenings without planning.'), tx('Weniger Absprachen, mehr Zeit füreinander.', 'Less coordinating, more time together.')],
  ];

  return (
    <Screen
      padTop={28}
      footer={
        <>
          <Btn label={busy ? tx('Einen Moment …', 'One moment …') : tx('14 Tage gratis testen', 'Try 14 days free')} onPress={start} disabled={busy} />
          <Txt size={13} line={18} color={tokens.sub} style={{ textAlign: 'center' }}>
            {tx(`Danach ${price(plan)} ${plan === 'year' ? 'im Jahr' : 'im Monat'} für die ganze Familie. Jederzeit im Store kündbar, vor Ablauf der 14 Tage kostet nichts.`, `Then ${price(plan)} per ${plan === 'year' ? 'year' : 'month'} for the whole family. Cancel anytime in the store, nothing is charged within the 14 days.`)}
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, paddingTop: 2 }}>
            <TextLink label={trigger === 'onboarding' ? tx('Erst mal ohne', 'Not now') : tx('Schließen', 'Close')} onPress={leave} />
            <TextLink label={tx('Kauf wiederherstellen', 'Restore purchase')} onPress={again} />
          </View>
        </>
      }
    >
      <Txt size={32} weight={700} line={38}>{tx('Euer Familienleben, endlich gemeinsam im Kopf.', 'Your family life, finally shared.')}</Txt>
      <View style={{ gap: 16, paddingVertical: 8 }}>
        {feel.map(([a, b]) => (
          <View key={a} style={{ gap: 2 }}>
            <Txt size={17} weight={600}>{a}</Txt>
            <Txt size={15} line={21} color={tokens.sub}>{b}</Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        {(['year', 'month'] as Plan[]).filter((p) => (p === 'year' ? offering.annual : offering.monthly)).map((p) => {
          const on = plan === p;
          return (
            <Pressable key={p} onPress={() => { setPlan(p); haptics.tap(); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ padding: 16, borderRadius: 18, borderWidth: on ? 2 : 1, borderColor: on ? tokens.ink : tokens.hair, backgroundColor: tokens.row, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 2 }}>
                <Txt size={16} weight={600}>{p === 'year' ? tx('Jährlich', 'Yearly') : tx('Monatlich', 'Monthly')}</Txt>
                {p === 'year' ? <Txt size={13} color={tokens.sub}>{tx('Gründerpreis für die ersten Familien', 'Founder price for the first families')}</Txt> : null}
              </View>
              <Txt size={16} weight={600}>{price(p)}</Txt>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
