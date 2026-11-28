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
 * 22.11.2026 (Julian's Go for the MVP, ideas from Deepstash, all honest under UWG): yearly preselected, price per
 * day, the founder price struck through ONLY when the store really sells a cheaper first year (dealOf in
 * purchases.ts reads it from the store), a short list of what Plus does, and a cancel FAQ. No countdown, no
 * invented discount. Google Pay and Apple Pay come with the store's own sheet, the app cannot place them.
 * A money back promise (30 days) is Julian's call: switch GELD_ZURUECK on only after his OK.
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
import { getOffering, buy, restore, dealOf } from '../src/lib/purchases';
import LineIcon from '../src/components/ui/LineIcon';
import { trackOnce } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { toast } from '../src/state/store';
import { tx, EN } from '../src/i18n/lang';
import PlusPreview from '../src/components/PlusPreview';
import { HOME } from '../src/lib/home';

type Plan = 'year' | 'month';

const MOCK = {
  annual: { product: { identifier: 'plus_year', price: 79, priceString: '79,00 €', currencyCode: 'EUR', defaultOption: { pricingPhases: [
    { price: { amountMicros: 0, formatted: '0,00 €' }, billingPeriod: { iso8601: 'P14D' } },
    { price: { amountMicros: 49000000, formatted: '49,00 €' }, billingPeriod: { iso8601: 'P1Y' } },
    { price: { amountMicros: 79000000, formatted: '79,00 €' }, billingPeriod: { iso8601: 'P1Y' } },
  ] } } },
  monthly: { product: { identifier: 'plus_month', price: 8.99, priceString: '8,99 €', currencyCode: 'EUR', defaultOption: { pricingPhases: [
    { price: { amountMicros: 0, formatted: '0,00 €' }, billingPeriod: { iso8601: 'P14D' } },
    { price: { amountMicros: 8990000, formatted: '8,99 €' }, billingPeriod: { iso8601: 'P1M' } },
  ] } } },
};

/** 30 days money back. Off until Julian decides (gate); the refund itself is done in the Play Console / via Apple. */
const GELD_ZURUECK = false;

export default function Plus() {
  const q = useLocalSearchParams<{ trigger?: string; mock?: string }>();
  const trigger = q.trigger || 'settings';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [offering, setOffering] = useState<any>(undefined);
  const [plan, setPlan] = useState<Plan>('year');
  const [busy, setBusy] = useState(false);
  const [none, setNone] = useState(false);

  const leave = () => { if (trigger === 'onboarding') router.replace(HOME); else if (router.canGoBack()) router.back(); else router.replace(HOME); };

  useEffect(() => {
    let live = true;
    // Development only: /plus?mock=1 shows a store-like offering (79 € with a 49 € first year and 14 free days) for screenshots.
    (__DEV__ && q.mock ? Promise.resolve(MOCK) : getOffering()).then((o) => {
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
  const locale = EN ? 'en-US' : 'de-DE';
  const deal = (p: Plan) => dealOf(p === 'year' ? offering.annual : offering.monthly, p === 'year', locale);
  const d = deal(plan);
  const trial = d?.trialDays ?? 0;
  const thenPrice = d?.first ?? d?.full ?? '';

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
    [tx('Der Kopf wird leiser.', 'Your head gets quieter.'), tx('Termine, Einkauf, Arzt, Geschenke: ParentButler denkt mit, damit ihr es nicht müsst.', 'Appointments, shopping, doctors, gifts: ParentButler keeps track so you don’t have to.')],
    [tx('Mehr Abende ohne Orga.', 'More evenings without planning.'), tx('Weniger Absprachen, mehr Zeit füreinander.', 'Less coordinating, more time together.')],
  ];

  return (
    <Screen
      padTop={28}
      footer={
        <>
          <Btn label={busy ? tx('Einen Moment …', 'One moment …') : trial ? tx(`${trial} Tage gratis testen`, `Try ${trial} days free`) : tx('Plus starten', 'Start Plus')} onPress={start} disabled={busy} />
          <Txt size={13} line={18} color={tokens.sub} style={{ textAlign: 'center' }}>
            {(() => {
              const per = plan === 'year' ? (d?.first ? tx(`im ersten Jahr, danach ${d.full} im Jahr`, `for the first year, then ${d.full} a year`) : tx('im Jahr', 'a year')) : tx('im Monat', 'a month');
              return trial
                ? tx(`Danach ${thenPrice} ${per}, für die ganze Familie. Kündigst du in den ${trial} Tagen, zahlst du nichts.`, `Then ${thenPrice} ${per}, for the whole family. Cancel within the ${trial} days and you pay nothing.`)
                : tx(`${thenPrice} ${per}, für die ganze Familie. Jederzeit im Store kündbar.`, `${thenPrice} ${per}, for the whole family. Cancel anytime in the store.`);
            })()}
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, paddingTop: 2 }}>
            <TextLink label={trigger === 'onboarding' ? tx('Erst mal ohne', 'Not now') : tx('Schließen', 'Close')} onPress={leave} />
            <TextLink label={tx('Kauf wiederherstellen', 'Restore purchase')} onPress={again} />
          </View>
        </>
      }
    >
      <Txt size={34} weight={700} line={38} tracking={-0.6}>{tx('Euer Familienleben, endlich gemeinsam im Kopf.', 'Your family life, finally shared.')}</Txt>
      <View style={{ gap: 16, paddingVertical: 8 }}>
        {feel.map(([a, b]) => (
          <View key={a} style={{ gap: 2 }}>
            <Txt size={17} weight={600}>{a}</Txt>
            <Txt size={15} line={21} color={tokens.sub}>{b}</Txt>
          </View>
        ))}
      </View>
      {/* Brand (28.11.): what Plus brings as one grey group, like every list in the app. */}
      <View style={{ backgroundColor: tokens.group, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
        {[
          tx('Sagen statt tippen: Memo trägt ein, was ihr erzählt', 'Say it instead of typing: Memo adds what you tell it'),
          tx('Genaue Spracherkennung, auch bei Deutsch und Englisch gemischt', 'Accurate speech recognition, even mixing German and English'),
          tx('Ein Preis für die ganze Familie, alle Eingeladenen inklusive', 'One price for the whole family, everyone you invite included'),
          tx('Der Kalender selbst bleibt immer gratis', 'The calendar itself always stays free'),
        ].map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <LineIcon name="check" size={18} color={tokens.done} stroke={2.2} />
            <Txt size={15} line={21} style={{ flex: 1 }}>{t}</Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        {(['year', 'month'] as Plan[]).filter((p) => (p === 'year' ? offering.annual : offering.monthly)).map((p) => {
          const on = plan === p;
          const dp = deal(p);
          return (
            <Pressable key={p} onPress={() => { setPlan(p); haptics.tap(); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ padding: 16, borderRadius: 16, borderWidth: 2, borderColor: on ? tokens.ink : 'transparent', backgroundColor: tokens.group, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 2, flex: 1 }}>
                <Txt size={16} weight={600}>{p === 'year' ? tx('Jährlich', 'Yearly') : tx('Monatlich', 'Monthly')}</Txt>
                {dp?.perDay ? <Txt size={13} color={tokens.sub}>{tx(`${dp.perDay} am Tag`, `${dp.perDay} a day`)}{p === 'year' && dp.first ? tx(' · Gründerpreis im ersten Jahr', ' · founder price for the first year') : ''}</Txt> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 1 }}>
                {dp?.first ? <Txt size={13} color={tokens.sub} style={{ textDecorationLine: 'line-through' }}>{dp.full}</Txt> : null}
                <Txt size={16} weight={600}>{dp?.first ?? dp?.full ?? ''}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 12, paddingTop: 10, paddingBottom: 6 }}>
        {[
          [tx('Wie kündige ich?', 'How do I cancel?'), tx('Im Play Store unter Abos oder in den iPhone Einstellungen unter Abonnements, mit zwei Tipps. Plus läuft dann bis zum Ende der bezahlten Zeit.', 'In the Play Store under Subscriptions, or in iPhone Settings under Subscriptions, in two taps. Plus runs until the end of the paid time.')],
          [tx('Was passiert nach dem Kündigen?', 'What happens after cancelling?'), tx('Alle Termine, Listen und die Familie bleiben. Nur Memo versteht euch dann mit einfachen Regeln statt mit Claude.', 'All events, lists and the family stay. Memo then understands you with simple rules instead of Claude.')],
          ...(GELD_ZURUECK ? [[tx('Und wenn es nicht passt?', 'And if it isn’t for us?'), tx('Schreib uns in den ersten 30 Tagen nach dem ersten Bezahlen, du bekommst dein Geld zurück.', 'Write to us within 30 days of the first payment and you get your money back.')]] : []),
        ].map(([a, b]) => (
          <View key={a} style={{ gap: 2 }}>
            <Txt size={15} weight={600}>{a}</Txt>
            <Txt size={14} line={20} color={tokens.sub}>{b}</Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}
