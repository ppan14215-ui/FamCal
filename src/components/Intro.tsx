/**
 * First-launch intro (Julian 26.10.: "ein einzigartiger Moment, den Nutzer
 * über den Value zu überzeugen"). Since the pivot (Julian 27.10.: "Sprechen
 * zuerst") every scene is about talking to one shared calendar:
 *
 * 1  Sag es einfach.        A spoken sentence becomes Tom's Termin.
 * 2  Bei euch beiden.       The same Termin lands on both phones.
 * 3  Ändern, wie ihr redet. "Eine Stunde später" moves it.
 * 4  Fragt einfach.         "Wann haben wir beide frei?" finds the gap.
 * 5  Alles zieht mit um.    Google, iCloud and Outlook come along.
 * 6  The promise.           The calm page with everything on it. Holds.
 *
 * Plays once, never loops. Tapping the stage jumps to the next scene, the
 * bars on top show where you are. Reduced motion shows the last scene.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withTiming, Easing, useReducedMotion, cancelAnimation } from 'react-native-reanimated';
import Txt, { Dot } from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { ClayIcon, Tile } from './ui/Clay';
import { Avatar } from './ui/Person';
import { tokens } from '../theme';
import { haptics } from '../lib/haptics';
import type { ClayName } from '../lib/clayIcons';
import { tx } from '../i18n/lang';

type Scene = { title: string; sub: string; ms: number };
const SCENES: Scene[] = [
  { title: tx('Sag es einfach', 'Just say it'), sub: tx('Ein Satz reicht. Der Kalender trägt ein, für wen es ist, und sagt, wenn es sich beißt.', 'One sentence is enough. The calendar adds it, notes who it is for, and tells you when it clashes.'), ms: 3600 },
  { title: tx('Bei euch beiden', 'On both phones'), sub: tx('Was einer sagt, sieht der andere sofort. Kein Weiterleiten, kein Screenshot.', 'What one of you says, the other sees right away. No forwarding, no screenshots.'), ms: 2800 },
  { title: tx('Ändern, wie ihr redet', 'Change it like you talk'), sub: tx('„Eine Stunde später“, „Julia geht“, „Impfpass mitnehmen“. Der Kalender baut sich vor euren Augen um.', '“An hour later”, “Julia goes”, “bring the vaccination card”. The calendar rebuilds itself as you watch.'), ms: 3200 },
  { title: tx('Fragt einfach', 'Just ask'), sub: tx('Er kennt eure Termine und eure Arbeit und findet die Lücke.', 'It knows your plans and your work hours and finds the gap.'), ms: 3200 },
  { title: tx('Alles zieht mit um', 'Bring everything along'), sub: tx('Termine aus Google, iCloud und Outlook kommen in einem Schritt mit. Arbeit bleibt privat.', 'Events from Google, iCloud and Outlook come along in one step. Work stays private.'), ms: 3000 },
  { title: tx('Euer Kalender, mit dem ihr redet', 'The calendar you talk to'), sub: tx('Für euch beide, ohne Werbung, nichts verschwindet. Termine, Aufgaben und Einkauf an einem ruhigen Ort.', 'For both of you, no ads, nothing gets lost. Plans, tasks and shopping in one calm place.'), ms: 0 },
];
const LAST = SCENES.length - 1;
const STAGE = 300;

const enter = (i = 0) => FadeInDown.duration(420).delay(i * 140);
const leave = FadeOut.duration(160);

export default function Intro() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(reduced ? LAST : 0);

  useEffect(() => {
    if (i >= LAST) return;
    const id = setTimeout(() => setI(i + 1), SCENES[i].ms);
    return () => clearTimeout(id);
  }, [i]);

  const next = () => { if (i < LAST) { haptics.select(); setI(i + 1); } };
  const s = SCENES[i];

  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {SCENES.map((x, k) => <Bar key={k} state={k < i ? 'done' : k === i ? 'now' : 'next'} ms={x.ms} />)}
      </View>
      <Pressable accessibilityLabel={i < LAST ? tx('Weiter im Intro', 'Next in intro') : undefined} onPress={next} style={{ height: STAGE, justifyContent: 'center' }}>
        <Animated.View key={i} entering={FadeIn.duration(200)} exiting={leave} style={{ flex: 1, justifyContent: 'center' }}>
          {i === 0 ? <Talk /> : i === 1 ? <BothPhones /> : i === 2 ? <Change /> : i === 3 ? <Ask /> : i === 4 ? <Move /> : <Calm />}
        </Animated.View>
      </Pressable>
      <Animated.View key={`t${i}`} entering={enter()} style={{ gap: 8, minHeight: 112 }}>
        <Txt size={36} line={42} weight={700} tracking={-1.2}>{s.title}<Dot /></Txt>
        <Txt size={17} line={25} color={tokens.sub}>{s.sub}</Txt>
      </Animated.View>
    </View>
  );
}

/** Types a sentence as if spoken; `onDone` once it is all there. */
function useTyped(text: string, delay = 500) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) { const id = setTimeout(haptics.success, 250); return () => clearTimeout(id); }
    const id = setTimeout(() => setN(n + 2), n ? 38 : delay);
    return () => clearTimeout(id);
  }, [n]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function SayBar({ text, done }: { text: string; done: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingLeft: 16, borderRadius: 26, backgroundColor: tokens.row, borderWidth: 1, borderColor: done ? tokens.hair : tokens.ink }}>
      <Txt size={16} line={22} style={{ flex: 1 }}>{text || ' '}</Txt>
      <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: tokens.ink, alignItems: 'center', justifyContent: 'center' }}>
        <LineIcon name="mic" size={21} color="#FFFFFF" />
      </View>
    </View>
  );
}

const DOC = { icon: 'stethoskop' as ClayName, title: tx('Kinderarzt', 'Pediatrician') };
const AT = tx('Do 29. Okt · 9:30', 'Thu Oct 29 · 9:30am');

/** 1 · A sentence is typed as if spoken, then lands as Tom's Termin. */
const SAID = tx('Tom bringt Ben Donnerstag 9:30 zum Kinderarzt', 'Tom takes Ben to the pediatrician Thursday 9:30am');
function Talk() {
  const { shown, done } = useTyped(SAID);
  return (
    <View style={{ gap: 12 }}>
      <SayBar text={shown} done={done} />
      {done ? (
        <>
          <Animated.View entering={enter(0)}>
            <Row icon={DOC.icon} title={DOC.title} meta={tx(`${AT} · Tom bringt Ben`, `${AT} · Tom takes Ben`)} right={<Avatar p="T" letter="T" size={30} />} />
          </Animated.View>
          <Animated.View entering={enter(1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 }}>
            <LineIcon name="clock" size={14} color={tokens.frist} />
            <Txt size={13.5} weight={600} color={tokens.frist}>{tx('Tom arbeitet da. Soll Julia gehen?', 'Tom is at work then. Should Julia go?')}</Txt>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/** One segment of the progress bar on top, like a story. */
function Bar({ state, ms }: { state: 'done' | 'now' | 'next'; ms: number }) {
  const v = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    cancelAnimation(v);
    if (state === 'now') { v.value = 0; v.value = ms ? withTiming(1, { duration: ms, easing: Easing.linear }) : 1; }
    else v.value = state === 'done' ? 1 : 0;
  }, [state]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` as any }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 999, backgroundColor: tokens.hair, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: tokens.ink, borderRadius: 999 }, fill]} />
    </View>
  );
}

// ─── Scenes ────────────────────────────────────────────────────────────────

/** 2 · Two phones, one calendar: the Termin lands on Tom's phone, then on Julia's. */
function BothPhones() {
  const [second, setSecond] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setSecond(true); haptics.tap(); }, 900); return () => clearTimeout(id); }, []);
  const phone = (p: 'J' | 'T', on: boolean, k: number) => (
    <Animated.View entering={enter(k)} style={{ flex: 1, height: 250, borderRadius: 30, borderWidth: 6, borderColor: tokens.ink, backgroundColor: tokens.bg, padding: 10, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={15} weight={700}>{tx('Heute', 'Today')}</Txt>
        <Avatar p={p} letter={p} size={22} />
      </View>
      {on ? (
        <Animated.View entering={ZoomIn.duration(320)} style={{ padding: 8, borderRadius: 14, backgroundColor: tokens.row, gap: 6 }}>
          <ClayIcon name={DOC.icon} size={34} />
          <Txt size={13} line={16} weight={600} numberOfLines={1}>{DOC.title}</Txt>
          <Txt size={11} line={14} color={tokens.sub} numberOfLines={1}>{tx('9:30 · Tom', '9:30am · Tom')}</Txt>
        </Animated.View>
      ) : <View style={{ height: 84, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: tokens.hair }} />}
      <View style={{ height: 10, width: '70%', borderRadius: 999, backgroundColor: tokens.hair }} />
      <View style={{ height: 10, width: '45%', borderRadius: 999, backgroundColor: tokens.hair }} />
    </Animated.View>
  );
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 18 }}>
        {phone('T', true, 0)}
        {phone('J', second, 1)}
      </View>
      {second ? (
        <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <LineIcon name="check" size={15} color={tokens.done} stroke={2.4} />
          <Txt size={13.5} weight={600} color={tokens.done}>{tx('Julia sieht es sofort', 'Julia sees it right away')}</Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** 3 · "Eine Stunde später": the time on the row turns over. */
function Change() {
  const { shown, done } = useTyped(tx('Eine Stunde später', 'An hour later'), 300);
  return (
    <View style={{ gap: 12 }}>
      <Row icon={DOC.icon} title={DOC.title} meta={done ? tx('Do 29. Okt · 10:30 · Tom', 'Thu Oct 29 · 10:30am · Tom') : `${AT} · Tom`} metaColor={done ? tokens.done : undefined} right={<Avatar p="T" letter="T" size={30} />} />
      {done ? (
        <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 }}>
          <LineIcon name="sparkle" size={13} color={tokens.done} />
          <Txt size={13.5} weight={600} color={tokens.done}>{tx('Später: 10:30 statt 9:30. Tom hat da frei.', 'Later: 10:30am instead of 9:30am. Tom is free then.')}</Txt>
        </Animated.View>
      ) : <View style={{ height: 20 }} />}
      <SayBar text={shown} done={done} />
    </View>
  );
}

/** 4 · A question gets the free stretches, work already left out. */
function Ask() {
  const { shown, done } = useTyped(tx('Wann haben wir beide frei?', 'When are we both free?'), 300);
  const slots = [tx('Sa 31. · ganzer Tag', 'Sat 31 · all day'), tx('So 1. · ab 15:00', 'Sun 1 · from 3pm'), tx('Mi 4. · 17:30 bis 21:00', 'Wed 4 · 5:30pm to 9pm')];
  return (
    <View style={{ gap: 12 }}>
      <SayBar text={shown} done={done} />
      {done ? (
        <>
          <Animated.View entering={enter(0)}>
            <Txt size={15} line={21} weight={600}>{tx('Ihr habt beide Zeit, Arbeit schon abgezogen:', 'You are both free, work already left out:')}</Txt>
          </Animated.View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {slots.map((t, k) => (
              <Animated.View key={t} entering={enter(k + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.doneSoft }}>
                <LineIcon name="clock" size={14} color={tokens.done} />
                <Txt size={14} weight={600} color={tokens.done}>{t}</Txt>
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** 5 · The old calendars hand their Termine over, work stays a private block. */
function Move() {
  const [moved, setMoved] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setMoved(true); haptics.success(); }, 1300); return () => clearTimeout(id); }, []);
  const from = [
    { t: 'Google', n: 86 },
    { t: 'iCloud', n: 41 },
    { t: 'Outlook', n: 15 },
  ];
  return (
    <View style={{ gap: 10 }}>
      {from.map((f, k) => (
        <Animated.View key={f.t} entering={enter(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: tokens.row, opacity: moved ? 0.45 : 1 }}>
          <Tile name="kalender" size={40} radius={12} />
          <Txt size={15.5} weight={600} style={{ flex: 1 }}>{f.t}</Txt>
          <Txt size={13.5} color={tokens.sub}>{tx(`${f.n} Termine`, `${f.n} events`)}</Txt>
          {moved ? <LineIcon name="check" size={16} color={tokens.done} stroke={2.4} /> : null}
        </Animated.View>
      ))}
      {moved ? (
        <Animated.View entering={ZoomIn.duration(320)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, backgroundColor: tokens.doneSoft }}>
          <LineIcon name="sync" size={18} color={tokens.done} />
          <Txt size={15} weight={600} color={tokens.done} style={{ flex: 1 }}>{tx('142 Termine bei euch, nichts doppelt', '142 events in, nothing twice')}</Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** 6 · The calm page. Everything from before, in one place, no banner. */
function Calm() {
  const [done, setDone] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setDone(true); haptics.success(); }, 1100); return () => clearTimeout(id); }, []);
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={{ borderRadius: 28, backgroundColor: tokens.row, paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={21} weight={700} tracking={-0.6}>{tx('Heute', 'Today')}</Txt>
        <Txt size={13.5} color={tokens.sub}>{tx('Do 29. Oktober', 'Thu October 29')}</Txt>
      </View>
      <Row flat icon={DOC.icon} title={DOC.title} meta={tx('9:30 · Tom bringt Ben', '9:30am · Tom takes Ben')} right={<Avatar p="T" letter="T" size={26} />} />
      <Row flat icon="kita" title={tx('Elternabend Kita', 'Daycare parents’ evening')} meta={tx('Di 3. Nov · 19:00 · ihr beide', 'Tue Nov 3 · 7pm · both of you')} />
      <Row flat icon="einkauf" title={tx('Windeln Gr. 2', 'Diapers size 2')} meta={done ? tx('erledigt von Julia', 'done by Julia') : tx('Einkauf', 'Shopping')} strike={done} right={
        <View style={{ width: 26, height: 26, borderRadius: 999, borderWidth: done ? 0 : 1.5, borderColor: tokens.circleLine, backgroundColor: done ? tokens.done : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Animated.View entering={ZoomIn.duration(260)}><LineIcon name="check" size={16} color="#FFFFFF" stroke={2.4} /></Animated.View> : null}
        </View>
      } />
    </Animated.View>
  );
}

function Row({ icon, title, meta, metaColor, right, flat, strike }: { icon: ClayName; title: string; meta: string; metaColor?: string; right?: React.ReactNode; flat?: boolean; strike?: boolean }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, flat ? { height: 62, borderTopWidth: 1, borderTopColor: tokens.hair } : { padding: 10, borderRadius: 20, backgroundColor: tokens.row }]}>
      {flat ? <ClayIcon name={icon} size={40} /> : <Tile name={icon} size={48} radius={14} />}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt size={16} line={21} weight={600} numberOfLines={1} strike={strike} color={strike ? tokens.mute : tokens.ink}>{title}</Txt>
        <Txt size={13} line={18} color={metaColor ?? tokens.sub} numberOfLines={1}>{meta}</Txt>
      </View>
      {right}
    </View>
  );
}
