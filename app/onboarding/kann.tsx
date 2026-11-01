/**
 * Was Memo noch kann (storyboard 01.11.2026, step 6): a showcase of what the
 * app already does, one swipeable card each, every card a short live demo
 * that plays when it comes into view. Only things that work today: say it
 * once, letter photo to events, recipe to shopping list, free times, the
 * Sunday "Eure Woche" and Mitdenken by age.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ZoomIn, FadeIn } from 'react-native-reanimated';
import { Btn, TextLink } from '../../src/components/ui/kit';
import Txt from '../../src/components/ui/Txt';
import LineIcon, { type LineName } from '../../src/components/ui/LineIcon';
import { ClayIcon, Tile } from '../../src/components/ui/Clay';
import { Avatar } from '../../src/components/ui/Person';
import PressScale from '../../src/components/ui/PressScale';
import Step from '../../src/components/onboarding/Step';
import { useStore } from '../../src/state/store';
import { haptics } from '../../src/lib/haptics';
import type { ClayName } from '../../src/lib/clayIcons';
import { tokens } from '../../src/theme';
import { tx } from '../../src/i18n/lang';

const enter = (i = 0) => FadeInDown.springify().damping(18).stiffness(200).delay(i * 120);
const STAGE = 268;

export default function Kann() {
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520);
  const names = useStore((s) => s.names);
  const people = useStore((s) => s.people);
  const kids = people.filter((p) => p.kind === 'kind');
  const kid = kids[0]?.name.split(' ')[0] || tx('Mia', 'Mia');
  const me = names.J || tx('Julia', 'Julia');
  const you = names.T || tx('Tom', 'Tom');
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);

  const cards: { title: string; sub: string; stage: React.ReactNode }[] = [
    { title: tx('Einmal sagen', 'Say it once'), sub: tx(`Sprecht oder tippt, in jeder Sprache. Ich trage es ein, und ${you} weiß es sofort.`, `Speak or type, in any language. I add it, and ${you} knows right away.`), stage: <Say kid={kid} you={you} /> },
    { title: tx('Brief oder Foto rein', 'Snap a letter'), sub: tx('Kita-Zettel, Einladung, Elternbrief. Ich lese heraus, was ansteht.', 'Daycare note, invitation, school letter. I pull out what matters.'), stage: <Letter kid={kid} /> },
    { title: tx('„Ich koche Bolognese“', '“I’m making bolognese”'), sub: tx('Gericht oder Rezept-Link genügt. Die Zutaten landen auf eurer Einkaufsliste.', 'A dish or a recipe link is enough. The ingredients land on your shopping list.'), stage: <Recipe /> },
    { title: tx('Fragt einfach', 'Just ask'), sub: tx('Ich kenne eure Termine und finde die Lücke, Arbeit schon abgezogen.', 'I know your plans and find the gap, work already left out.'), stage: <Free /> },
    { title: tx('Eure Woche', 'Your week'), sub: tx('Sonntagabend ein kurzer Blick auf die Woche: wer wann wo, was zu besorgen ist.', 'Sunday evening, one look at the week: who is where, what to get.'), stage: <Week me={me} you={you} kid={kid} /> },
    { title: tx('Ich denke mit', 'I think ahead'), sub: tx('Vorsorge, Impfungen, Schulanmeldung. Ich sage rechtzeitig Bescheid, nie von selbst eingetragen.', 'Check-ups, vaccinations, school sign-up. I remind you in time and never add things on my own.'), stage: <Ahead kid={kid} /> },
  ];
  const last = cards.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / W);
    if (p !== page && p >= 0 && p <= last) { setPage(p); haptics.select(); }
  };
  const go = (p: number) => { ref.current?.scrollTo({ x: p * W, animated: true }); setPage(p); };
  const next = () => (page < last ? go(page + 1) : router.push('/onboarding/partner'));

  return (
    <Step
      step={2}
      memo="blink"
      memoBeat={page}
      title={tx('Was ich noch kann', 'What else I can do')}
      footer={
        <>
          <Btn label={page < last ? tx('Weiter', 'Next') : tx('Verstanden', 'Got it')} onPress={next} />
          <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => router.push('/onboarding/partner')} />
        </>
      }
    >
      <View style={{ marginHorizontal: -18 }}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          decelerationRate="fast"
          snapToInterval={W}
          style={{ width: W }}
        >
          {cards.map((c, k) => (
            <View key={k} style={{ width: W, paddingHorizontal: 18 }}>
              <View style={{ borderRadius: 28, backgroundColor: tokens.row, padding: 16, gap: 14 }}>
                <View style={{ height: STAGE, justifyContent: 'center' }}>
                  {/* Plays on arrival; leaving and coming back plays it again. */}
                  {page === k ? <Animated.View entering={FadeIn.duration(180)} key={`s${k}`}>{c.stage}</Animated.View> : null}
                </View>
                <View style={{ gap: 6, paddingHorizontal: 4, minHeight: 92 }}>
                  <Txt size={22} line={27} weight={700} tracking={-0.5}>{c.title}</Txt>
                  <Txt size={15.5} line={22} color={tokens.sub}>{c.sub}</Txt>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityLabel={tx(`Karte ${page + 1} von ${cards.length}`, `Card ${page + 1} of ${cards.length}`)}>
        {cards.map((_, k) => (
          <PressScale key={k} onPress={() => go(k)} hitSlop={6}>
            <View style={{ width: k === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === page ? tokens.ink : tokens.dotOff }} />
          </PressScale>
        ))}
      </View>
    </Step>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────

function useTyped(text: string, delay = 400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const id = setTimeout(() => setN(n + 2), n ? 34 : delay);
    return () => clearTimeout(id);
  }, [n]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function useAfter(ms: number) {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setOn(true); haptics.success(); }, ms); return () => clearTimeout(id); }, []);
  return on;
}

function SayBar({ text, done }: { text: string; done: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 5, paddingLeft: 14, borderRadius: 24, backgroundColor: tokens.bg, borderWidth: 1, borderColor: done ? tokens.hair : tokens.ink }}>
      <Txt size={15} line={21} style={{ flex: 1 }}>{text || ' '}</Txt>
      <View style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
        <LineIcon name={done ? 'send' : 'mic'} size={18} color={tokens.onInk} />
      </View>
    </View>
  );
}

function Row({ icon, title, meta, right, strike }: { icon: ClayName; title: string; meta?: string; right?: React.ReactNode; strike?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 18, backgroundColor: tokens.bg }}>
      <Tile name={icon} size={42} radius={13} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt size={15.5} line={20} weight={600} numberOfLines={1} strike={strike} color={strike ? tokens.mute : tokens.ink}>{title}</Txt>
        {meta ? <Txt size={12.5} line={17} color={tokens.sub} numberOfLines={1}>{meta}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

function Said({ icon = 'check', children }: { icon?: LineName; children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
      <LineIcon name={icon} size={14} color={tokens.done} stroke={2.4} />
      <Txt size={13.5} weight={600} color={tokens.done}>{children}</Txt>
    </View>
  );
}

// ─── Stages ────────────────────────────────────────────────────────────────

function Say({ kid, you }: { kid: string; you: string }) {
  const { shown, done } = useTyped(tx(`${kid} hat Donnerstag um 10 Kinderarzt`, `${kid} has the pediatrician Thursday at 10`));
  return (
    <View style={{ gap: 12 }}>
      <SayBar text={shown} done={done} />
      {done ? (
        <>
          <Animated.View entering={enter(0)}>
            <Row icon="stethoskop" title={tx('Kinderarzt', 'Pediatrician')} meta={tx(`Do · 10:00 · ${kid}`, `Thu · 10am · ${kid}`)} right={<Avatar p="J" size={26} />} />
          </Animated.View>
          <Animated.View entering={enter(1)}>
            <Said icon="sync">{tx(`Eingetragen. ${you} sieht es auch.`, `Added. ${you} sees it too.`)}</Said>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

function Letter({ kid }: { kid: string }) {
  const read = useAfter(1100);
  return (
    <View style={{ gap: 10 }}>
      <Animated.View entering={enter(0)} style={{ alignSelf: 'center', width: 168, padding: 14, gap: 7, borderRadius: 6, backgroundColor: '#FFFDF8', transform: [{ rotate: '-3deg' }], shadowColor: '#16232A', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, opacity: read ? 0.55 : 1 }}>
        <Txt size={12} weight={700}>{tx('Kita Sonnenschein', 'Sunshine Daycare')}</Txt>
        {[0.95, 0.8, 0.9, 0.6].map((w, k) => <View key={k} style={{ height: 5, width: `${w * 100}%`, borderRadius: 3, backgroundColor: tokens.hair }} />)}
        <Txt size={10.5} color={tokens.sub}>{tx('Laternenfest 11.11. · Fototag 14.11.', 'Lantern walk 11/11 · Photo day 11/14')}</Txt>
      </Animated.View>
      {read ? (
        <>
          <Animated.View entering={enter(0)}><Row icon="kita" title={tx('Laternenfest', 'Lantern walk')} meta={tx(`Mi 11. Nov · 17:00 · ${kid}`, `Wed Nov 11 · 5pm · ${kid}`)} /></Animated.View>
          <Animated.View entering={enter(1)}><Row icon="foto" title={tx('Fototag Kita', 'Daycare photo day')} meta={tx(`Sa 14. Nov · ${kid}`, `Sat Nov 14 · ${kid}`)} /></Animated.View>
        </>
      ) : null}
    </View>
  );
}

function Recipe() {
  const { shown, done } = useTyped(tx('Ich koche heute Bolognese', 'I’m making bolognese tonight'), 300);
  const items = [tx('Spaghetti', 'Spaghetti'), tx('Hackfleisch 500 g', 'Ground beef 1 lb'), tx('Passierte Tomaten', 'Tomato passata'), tx('Parmesan', 'Parmesan')];
  return (
    <View style={{ gap: 10 }}>
      <SayBar text={shown} done={done} />
      {done ? (
        <View style={{ borderRadius: 18, backgroundColor: tokens.bg, padding: 12, gap: 8 }}>
          <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClayIcon name="einkauf" size={26} />
            <Txt size={14} weight={700}>{tx('Einkauf', 'Shopping')}</Txt>
            <Txt size={13} color={tokens.sub} style={{ marginLeft: 'auto' }}>{tx('+4', '+4')}</Txt>
          </Animated.View>
          {items.map((t, k) => (
            <Animated.View key={t} entering={enter(k + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: 999, borderWidth: 1.5, borderColor: tokens.circleLine }} />
              <Txt size={15} weight={500}>{t}</Txt>
            </Animated.View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Free() {
  const { shown, done } = useTyped(tx('Wann haben wir beide frei?', 'When are we both free?'), 300);
  const slots = [tx('Sa · ganzer Tag', 'Sat · all day'), tx('So · ab 15:00', 'Sun · from 3pm'), tx('Mi · 17:30 bis 21:00', 'Wed · 5:30 to 9pm')];
  return (
    <View style={{ gap: 12 }}>
      <SayBar text={shown} done={done} />
      {done ? (
        <>
          <Animated.View entering={enter(0)}><Txt size={14.5} line={20} weight={600}>{tx('Ihr habt beide Zeit:', 'You are both free:')}</Txt></Animated.View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {slots.map((t, k) => (
              <Animated.View key={t} entering={enter(k + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.doneSoft }}>
                <LineIcon name="clock" size={14} color={tokens.done} />
                <Txt size={13.5} weight={600} color={tokens.done}>{t}</Txt>
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Week({ me, you, kid }: { me: string; you: string; kid: string }) {
  const lines: { icon: ClayName; t: string }[] = [
    { icon: 'kalender', t: tx('9 Termine, Dienstag ist voll', '9 events, Tuesday is busy') },
    { icon: 'kita', t: tx(`${you} holt ${kid} Mo und Do`, `${you} picks up ${kid} Mon and Thu`) },
    { icon: 'geschenk', t: tx('Sa Lenas Party, Geschenk fehlt', 'Sat Lena’s party, gift missing') },
    { icon: 'einkauf', t: tx('6 Dinge auf der Einkaufsliste', '6 things on the shopping list') },
  ];
  return (
    <View style={{ gap: 10 }}>
      <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: tokens.ink }}>
        <ClayIcon name="wochenplan" size={30} />
        <View style={{ flex: 1 }}>
          <Txt size={13} color={tokens.onInk} style={{ opacity: 0.7 }}>{tx('So 18:00', 'Sun 6pm')}</Txt>
          <Txt size={15.5} weight={700} color={tokens.onInk}>{tx(`Eure Woche, ${me} und ${you}`, `Your week, ${me} and ${you}`)}</Txt>
        </View>
      </Animated.View>
      {lines.map((l, k) => (
        <Animated.View key={l.t} entering={enter(k + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 }}>
          <ClayIcon name={l.icon} size={26} />
          <Txt size={14.5} weight={500} style={{ flex: 1 }} numberOfLines={1}>{l.t}</Txt>
        </Animated.View>
      ))}
    </View>
  );
}

function Ahead({ kid }: { kid: string }) {
  const put = useAfter(1700);
  return (
    <View style={{ gap: 10 }}>
      <Animated.View entering={enter(0)} style={{ borderRadius: 18, backgroundColor: tokens.bg, padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tile name="u-heft" size={42} radius={13} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt size={15.5} weight={600}>{tx(`U9 für ${kid}`, `U9 check-up for ${kid}`)}</Txt>
            <Txt size={12.5} color={tokens.sub}>{tx('60. bis 64. Monat · rechtzeitig Bescheid', 'month 60 to 64 · reminder in time')}</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: put ? tokens.done : tokens.ink }}>
            {put ? (
              <Animated.View entering={ZoomIn.duration(240)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LineIcon name="check" size={14} color={tokens.onInk} stroke={2.4} />
                <Txt size={13.5} weight={600} color={tokens.onInk}>{tx('Auf Zu erledigen', 'On To do')}</Txt>
              </Animated.View>
            ) : <Txt size={13.5} weight={600} color={tokens.onInk}>{tx('Auf die Liste', 'Add to list')}</Txt>}
          </View>
          <View style={{ flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
            <Txt size={13.5} weight={600}>{tx('Schon erledigt', 'Done already')}</Txt>
          </View>
        </View>
      </Animated.View>
      <Animated.View entering={enter(2)}>
        <Row icon="impfung" title={tx('Auffrischung mit 5 bis 6', 'Booster at 5 to 6')} meta={tx('kommt im Frühjahr', 'coming in spring')} />
      </Animated.View>
      <Animated.View entering={enter(3)}>
        <Row icon="schule" title={tx(`Schulanmeldung ${kid}`, `School sign-up ${kid}`)} meta={tx('meist im Herbst davor', 'usually the autumn before')} />
      </Animated.View>
    </View>
  );
}
