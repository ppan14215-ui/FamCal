/**
 * First-launch intro (Julian 26.10.: "ein einzigartiger Moment, den Nutzer
 * über den Value zu überzeugen"). Five short scenes, one idea each, the way
 * Apple keynotes sell: a pain everyone knows, then the moment it goes away.
 * Big words carry the message, the stage underneath proves it with real UI.
 *
 * 1  Post vom Amt.         A letter lands, the deadline hides in the text.
 * 2  Foto. Fertig.         The letter turns into one row with the deadline.
 * 3  Für euch beide.       Tom takes the U5. Mental load, shared.
 * 4  Weiß, was bei euch gilt.  City facts arrive, each with its source.
 * 5  The promise.          The calm page with everything on it. Holds.
 *
 * Plays once, never loops. Tapping the stage jumps to the next scene, the
 * bars on top show where you are. Reduced motion shows the last scene.
 * Contrast to TimeTree and Co. (docs/research): no ads, nothing disappears,
 * both parents, the assistant does the paperwork.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withTiming, Easing, useReducedMotion, cancelAnimation } from 'react-native-reanimated';
import Txt, { Dot } from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { ClayIcon, Tile } from './ui/Clay';
import { Avatar } from './ui/Person';
import Letter from './Letter';
import { tokens } from '../theme';
import { haptics } from '../lib/haptics';
import type { ClayName } from '../lib/clayIcons';

type Scene = { title: string; sub: string; ms: number };
const SCENES: Scene[] = [
  { title: 'Post vom Amt', sub: 'Irgendwo im dritten Absatz steht eine Frist.', ms: 2600 },
  { title: 'Foto. Fertig', sub: 'Der Assistent liest mit, trägt die Frist ein und sagt euch, was zu tun ist.', ms: 2900 },
  { title: 'Für euch beide', sub: 'Nicht nur für den, der zufällig dran denkt.', ms: 2700 },
  { title: 'Weiß, was bei euch gilt', sub: 'Feiertage, Kita-Portal, Bürgeramt. Immer mit Quelle.', ms: 2900 },
  { title: 'Euer Familienkalender, der mitdenkt', sub: 'Ohne Werbung, nichts verschwindet. Termine, Fristen und Einkauf an einem ruhigen Ort.', ms: 0 },
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
      <Pressable accessibilityLabel={i < LAST ? 'Weiter im Intro' : undefined} onPress={next} style={{ height: STAGE, justifyContent: 'center' }}>
        <Animated.View key={i} entering={FadeIn.duration(200)} exiting={leave} style={{ flex: 1, justifyContent: 'center' }}>
          {i === 0 ? <Post /> : i === 1 ? <Scanned /> : i === 2 ? <Both /> : i === 3 ? <Local /> : <Calm />}
        </Animated.View>
      </Pressable>
      <Animated.View key={`t${i}`} entering={enter()} style={{ gap: 8, minHeight: 112 }}>
        <Txt size={36} line={42} weight={700} tracking={-1.2}>{s.title}<Dot /></Txt>
        <Txt size={17} line={25} color={tokens.sub}>{s.sub}</Txt>
      </Animated.View>
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

/** 1 · The letter lands slightly crooked, the deadline line gets a marker. */
function Post() {
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View entering={FadeInDown.duration(520)} style={{ width: 236, height: 290, transform: [{ rotate: '-4deg' }] }}>
        <Letter scale={0.82} />
        <Animated.View entering={FadeIn.duration(260).delay(1100)} style={{ position: 'absolute', left: 14, right: 14, top: 148, height: 34, borderRadius: 8, borderWidth: 2, borderColor: tokens.frist }} />
      </Animated.View>
    </View>
  );
}

/** 2 · The same letter, now a row: deadline, task, who added it. */
function Scanned() {
  useEffect(() => { const id = setTimeout(haptics.success, 700); return () => clearTimeout(id); }, []);
  return (
    <View style={{ gap: 10 }}>
      <Animated.View entering={ZoomIn.duration(420)} style={{ alignSelf: 'center' }}>
        <Tile name="umschlag-euro" size={104} radius={30} />
      </Animated.View>
      <Animated.View entering={enter(2)}>
        <Row icon="umschlag-euro" title="Arbeitgeberbescheinigung nachreichen" meta="Frist 12. Dez · Elterngeld" metaColor={tokens.frist} />
      </Animated.View>
      <Animated.View entering={enter(3)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 }}>
        <LineIcon name="sparkle" size={13} color={tokens.done} />
        <Txt size={13.5} weight={600} color={tokens.done}>Vom Assistenten eingetragen, mit Erinnerung 2 Wochen vorher</Txt>
      </Animated.View>
    </View>
  );
}

/** 3 · A task finds its person. */
function Both() {
  const [taken, setTaken] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setTaken(true); haptics.tap(); }, 1000); return () => clearTimeout(id); }, []);
  return (
    <View style={{ gap: 10 }}>
      <Animated.View entering={enter(0)}>
        <Row icon="stethoskop" title="U5 bei Dr. Weber" meta="Do 12. Nov · 9:30" right={
          <View style={{ flexDirection: 'row' }}>
            <View style={{ opacity: taken ? 0.35 : 1 }}><Avatar p="J" letter="J" size={30} ring={tokens.row} /></View>
            <View style={{ marginLeft: -8 }}><Avatar p="T" letter="T" size={30} ring={tokens.row} /></View>
          </View>
        } />
      </Animated.View>
      {taken ? (
        <Animated.View entering={ZoomIn.duration(320)} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 6, paddingRight: 14, borderRadius: 999, backgroundColor: tokens.row }}>
          <Avatar p="T" letter="T" size={26} />
          <Txt size={14.5} weight={600}>Tom übernimmt</Txt>
          <LineIcon name="check" size={16} color={tokens.done} stroke={2.4} />
        </Animated.View>
      ) : null}
      <Animated.View entering={enter(2)}>
        <Row icon="einkauf" title="Windeln Gr. 2" meta="Einkauf · Julia hat es auf dem Zettel" />
      </Animated.View>
    </View>
  );
}

/** 4 · What the city means for you, each fact with where it comes from. */
function Local() {
  const facts: { icon: ClayName; title: string; src: string }[] = [
    { icon: 'kalender', title: 'Feiertage für euer Bundesland', src: 'Gemeindeverzeichnis' },
    { icon: 'kita', title: 'Kita-Platz über das Portal der Stadt', src: 'Seite der Stadt' },
    { icon: 'reisepass', title: 'Pass fürs Baby: was mit muss', src: 'Bürgeramt' },
  ];
  return (
    <View style={{ gap: 8 }}>
      {facts.map((f, k) => (
        <Animated.View key={f.icon} entering={enter(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: tokens.row }}>
          <Tile name={f.icon} size={48} radius={14} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Txt size={15.5} line={20} weight={600} numberOfLines={1}>{f.title}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <LineIcon name="sparkle" size={11} color={tokens.done} />
              <Txt size={12.5} color={tokens.done}>{`Quelle: ${f.src}`}</Txt>
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/** 5 · The calm page. Everything from before, in one place, no banner. */
function Calm() {
  const [done, setDone] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setDone(true); haptics.success(); }, 1100); return () => clearTimeout(id); }, []);
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={{ borderRadius: 28, backgroundColor: tokens.row, paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={21} weight={700} tracking={-0.6}>Heute</Txt>
        <Txt size={13.5} color={tokens.sub}>Do 29. Oktober</Txt>
      </View>
      <Row flat icon="umschlag-euro" title="Arbeitgeberbescheinigung" meta="Frist 12. Dez" metaColor={tokens.frist} />
      <Row flat icon="stethoskop" title="U5 bei Dr. Weber" meta="Do 12. Nov · Tom" right={<Avatar p="T" letter="T" size={26} />} />
      <Row flat icon="einkauf" title="Windeln Gr. 2" meta={done ? 'erledigt von Julia' : 'Einkauf'} strike={done} right={
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
