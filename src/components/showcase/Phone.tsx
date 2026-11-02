/**
 * The showcase stage (Onboarding v3, 02.11.2026): the real chat as it will look at launch, inside a
 * phone frame that runs off the bottom edge (like the Me+ and Cal AI frames in Julian's collection).
 * The header is the chat's own ("Chat", "Familie · 4 Personen"), the page is tokens.bg, the day pill
 * and every card are the app's own components, drawn from the demo store. The field at the bottom is
 * FakeComposer. The lock screen (chapter 4) and the montage (chapter 7) use the same place.
 *
 * Everything here sits inside DemoStage: no tap reaches it, nothing in it writes.
 * Honest: a small "Beispielfamilie" label stays on the stage while the demo family is in it.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Txt from '../ui/Txt';
import { H1 } from '../ui/kit';
import { Avatar, usePersons } from '../ui/Person';
import { Entry } from '../ChatCards';
import Memo from '../onboarding/Memo';
import ShowThinking, { Turn } from './ShowThinking';
import FakeComposer from './FakeComposer';
import WeekStrip, { CRIT } from './WeekStrip';
import Montage from './Montage';
import AgendaCard, { agendaDays } from './cards/AgendaCard';
import RecipePick from './cards/RecipePick';
import LockNotif from './cards/LockNotif';
import type { Scene, StageItem } from './chapters';
import { useStore } from '../../state/store';
import { long } from '../../lib/dates';
import { tokens, rise, rowOut, rowLayout, motion, easing } from '../../theme';
import type { PersonId } from '../../theme';
import { tx, isEn } from '../../i18n/lang';

/** How far the frame runs past the bottom of the stage. */
const CROP = 30;
const BEZEL = 7;
const WHITE = '#FFFFFF';

/** The stage's size, measured once by the player (it outlives the chapters), so no chapter starts with a blank frame. */
export type Box = { w: number; h: number };

export default function Stage({ scene, today, start, box, onBox }: {
  scene: Scene;
  today: string;
  /** The chapter's opening picture: what is in it is already there, so only what comes after moves in. */
  start: Scene;
  box: Box | null;
  onBox: (b: Box) => void;
}) {
  if (scene.screen === 'montage') {
    return (
      <View style={{ flex: 1, paddingHorizontal: 18 }}>
        <SampleLabel />
        <Montage beat={scene.montage} />
      </View>
    );
  }
  const lock = scene.screen === 'lock';
  // A change of screen inside a chapter (chat to lock screen) cross fades; the chapter's own first screen is simply there.
  const swapped = scene.screen !== start.screen;
  return (
    <View style={{ flex: 1, overflow: 'hidden', paddingHorizontal: 18 }}>
      <View style={{ position: 'absolute', top: 0, left: 18, right: 18, bottom: -CROP, borderTopLeftRadius: 44, borderTopRightRadius: 44, borderWidth: BEZEL, borderColor: tokens.segBg, overflow: 'hidden', backgroundColor: tokens.bg }}>
        <Scaled box={box} onBox={onBox}>
          <Animated.View key={scene.screen} entering={swapped ? FadeIn.duration(motion.base).easing(easing.out) : undefined} style={{ flex: 1 }}>
            {lock ? <LockScreen scene={scene} today={today} /> : <ChatScreen scene={scene} start={start} today={today} />}
          </Animated.View>
        </Scaled>
      </View>
    </View>
  );
}

/**
 * The screen at phone proportions: when the stage is shorter than a phone's chat, everything inside
 * the frame is drawn at full size and scaled down as one picture (never below 72 %), so a small phone
 * shows the same chat, only smaller, instead of a cut off card.
 */
const PHONE_H = 600;
const MIN_SCALE = 0.72;
function Scaled({ children, box, onBox }: { children: React.ReactNode; box: Box | null; onBox: (b: Box) => void }) {
  const k = box ? Math.max(MIN_SCALE, Math.min(1, box.h / PHONE_H)) : 1;
  return (
    <View style={{ flex: 1 }} onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; if (!box || box.w !== w || box.h !== h) onBox({ w, h }); }}>
      {box ? <View style={{ width: box.w / k, height: box.h / k, transform: [{ scale: k }], transformOrigin: 'top left' }}>{children}</View> : null}
    </View>
  );
}

/** "Beispielfamilie": the demo is named as one (decisions: ehrlich). */
function SampleLabel({ light }: { light?: boolean }) {
  return (
    <View style={{ alignSelf: 'flex-end', height: 22, paddingHorizontal: 9, borderRadius: 999, justifyContent: 'center', backgroundColor: light ? 'rgba(255,255,255,0.18)' : tokens.chipBg }}>
      <Txt size={11.5} weight={600} color={light ? WHITE : tokens.sub}>{tx('Beispielfamilie', 'Sample family')}</Txt>
    </View>
  );
}

/** Whose phone this is, and the sample label. */
function StatusRow({ owner, light, sample = true }: { owner: PersonId; light?: boolean; /** false once the demo family has gone: the phone is nobody's yet. */ sample?: boolean }) {
  const p = usePersons()[owner];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 16, paddingTop: 6 }}>
      {sample ? <Avatar p={owner} size={18} /> : null}
      <Txt size={12.5} weight={600} color={light ? WHITE : tokens.sub} style={{ flex: 1 }} numberOfLines={1}>{sample ? tx(`${p.name}s Handy`, `${p.name}’s phone`) : ''}</Txt>
      {sample ? <SampleLabel light={light} /> : null}
    </View>
  );
}

function ChatScreen({ scene, start, today }: { scene: Scene; start: Scene; today: string }) {
  const people = useStore((s) => s.people.length);
  const empty = scene.screen === 'empty';
  // Carried over from the chapter before: already in place, no entrance (one moving thing at a time).
  const startIds = useMemo(() => new Set(start.items.map((x) => x.id)), [start]);
  return (
    <View style={{ flex: 1, paddingBottom: CROP }}>
      <StatusRow owner={scene.owner} sample={!empty} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <H1 size={28} sub={empty ? tx('Eure Familie', 'Your family') : tx(`Familie · ${2 + people} Personen`, `Family · ${2 + people} people`)}>Chat</H1>
      </View>
      {scene.strip ? <WeekStrip today={today} tile={scene.strip.tile} icon="zahnarzt" skip="ev_zahn" /> : null}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {empty ? <EmptyChat /> : (
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 10, gap: 12 }}>
            {scene.items.length ? (
              <View style={{ alignSelf: 'center', backgroundColor: tokens.segBg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}>
                <Txt size={12.5} color={tokens.sub}>{tx('Heute', 'Today')}</Txt>
              </View>
            ) : null}
            {scene.items.map((it) => (
              <Animated.View key={it.id} entering={startIds.has(it.id) ? undefined : rise()} exiting={rowOut} layout={rowLayout}>
                <Landing it={it} owner={scene.owner} today={today} />
              </Animated.View>
            ))}
          </View>
        )}
        <TopFade />
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        <FakeComposer text={scene.draft} pulse={scene.pulse} press={scene.press} />
      </View>
    </View>
  );
}

/** Older messages slide under the header, as in the chat. */
function TopFade() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 22 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="stagefade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tokens.bg} stopOpacity={1} />
            <Stop offset="1" stopColor={tokens.bg} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#stagefade)" />
      </Svg>
    </View>
  );
}

/**
 * An item whose kind changes in place (Memo thinking, then the answer card) rises again, so the answer
 * lands instead of popping in. The row keeps its key, so nothing overlaps; its first kind has no entrance
 * of its own (the row's rise covers it).
 */
function Landing({ it, owner, today }: { it: StageItem; owner: PersonId; today: string }) {
  const firstType = useRef(it.type);
  return (
    <Animated.View key={it.type} entering={it.type !== firstType.current ? rise(0) : undefined}>
      <ItemView it={it} owner={owner} today={today} />
    </Animated.View>
  );
}

const isFresh = (iso: string) => Date.now() - Date.parse(iso) < 60000;

function ItemView({ it, owner, today }: { it: StageItem; owner: PersonId; today: string }) {
  switch (it.type) {
    case 'entry':
      return <Entry f={it.f} mine={it.side === 'right'} me={owner} side={it.side} showcase />;
    case 'think':
      return <ShowThinking by={it.by} said={it.said} side={it.side} when={it.at} />;
    case 'agenda':
      return <Turn by={it.by} said={it.said} when={it.at} side={it.side}><LiveAgenda say={it.say} fresh={isFresh(it.at)} today={today} /></Turn>;
    case 'recipe':
      return <Turn by={it.by} said={it.said} when={it.at} side={it.side}><RecipePick {...it.recipe} /></Turn>;
    case 'status':
      return <StatusLine by={it.by} text={it.text} />;
  }
}

/** The next three days, live from the demo calendar. */
function LiveAgenda({ say, fresh, today }: { say: string; fresh: boolean; today: string }) {
  const events = useStore((s) => s.events);
  const days = useMemo(() => agendaDays(events, 3, today), [events, today]);
  return <AgendaCard say={say} days={days} fresh={fresh} today={today} />;
}

/** "Tom hat Milch abgehakt", quiet in the middle, Memo cheering once beside it. */
function StatusLine({ by, text }: { by: PersonId; text: string }) {
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 6, paddingRight: 12, borderRadius: 999, backgroundColor: tokens.row }}>
      <Memo act="cheer" beat={1} size={24} shadow={false} alive={false} />
      <Avatar p={by} size={20} />
      <Txt size={13} weight={600} color={tokens.sub}>{text}</Txt>
    </View>
  );
}

/** The chat after the sample family has cleared out: Memo waits for the first sentence. */
function EmptyChat() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
      <Animated.View entering={rise(0)}><Memo act="blink" beat={1} size={60} style={{ marginLeft: -6 }} /></Animated.View>
      <Animated.View entering={rise(1)}><Txt size={21} line={27} weight={700} tracking={-0.5}>{tx('Einmal sagen. Beide wissen’s.', 'Say it once. You both know.')}</Txt></Animated.View>
      <Animated.View entering={rise(2)}><Txt size={15} line={21} color={tokens.sub}>{tx('Hier steht gleich, was ihr sagt.', 'What you say will show up here.')}</Txt></Animated.View>
    </View>
  );
}

/** Julia's phone, locked: the date, the time, and Tom's change coming down from the top. */
function LockScreen({ scene, today }: { scene: Scene; today: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="stagelock" x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor="#5E7B86" />
            <Stop offset="0.55" stopColor="#2E4650" />
            <Stop offset="1" stopColor="#1E2E35" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#stagelock)" />
      </Svg>
      <Animated.View entering={rise(0)} style={{ flex: 1 }}>
        <StatusRow owner={scene.owner} light />
        <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 18 }}>
          <Txt size={15} weight={600} color={WHITE} style={{ opacity: 0.9 }}>{long(today)}</Txt>
          {/* Lock screens show no am/pm. */}
          <Txt size={64} line={72} weight={600} tracking={-2.5} color={WHITE}>{isEn() ? '6:02' : '18:02'}</Txt>
        </View>
        <View style={{ paddingHorizontal: 10 }}>
          {scene.notif ? <Drop {...scene.notif} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

/** The notification slides down from the top edge and settles, no overshoot. */
function Drop({ title, body, when }: { title: string; body: string; when: string }) {
  const y = useSharedValue(-60);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withSpring(0, CRIT);
    o.value = withTiming(1, { duration: motion.base, easing: easing.out });
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={st}>
      {/* Partner push is not built yet (notify.ts is local only), so the notification is marked as a preview. */}
      <LockNotif title={title} body={body} when={when} tag={tx('Vorschau', 'Preview')} />
    </Animated.View>
  );
}
