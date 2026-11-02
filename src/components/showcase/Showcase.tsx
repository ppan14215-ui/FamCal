/**
 * The onboarding showcase player (Onboarding v3, decisions 02.11.2026). The real app, played for a
 * demo family, one chapter at a time. Storyboard of one chat chapter (ms from chapter start):
 *     0  headline and line rise in above the stage (text first, pattern 5)
 *   700  the sentence types into the field, 45 ms a character
 *  +380  the arrow is pressed, the sentence becomes a bubble, Memo thinks under it
 *  +900  the card lands in place of the thinking card (haptic: success)
 *        then a readable hold. No auto advance: "Weiter" moves on.
 * Chapter 1 starts typing at t=0 (no logo, no intro), swells the arrow once and waits up to 3 s for
 * a tap before it sends by itself.
 *
 * The grid is the same on every chapter (pattern 1): progress and chapter label on top, headline and
 * one line, the stage in the middle, and a footer whose space is always reserved.
 * - A tap on the stage plays the chapter to its end at once (in chapter 1, while the arrow waits, it sends).
 * - Reduced motion: every chapter opens at its end state (built before the first frame).
 * - The footer takes taps only once it has faded in (T_NEXT).
 * - All timers die with the chapter (it remounts per chapter) and on unmount.
 *
 * Each chapter gets a new demo store (StoreContext), built by playing the chapters before it
 * instantly. Nothing here can reach the app's store: see DemoStage and chapters.ts.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion, useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, TextLink, RoundButton } from '../ui/kit';
import Txt, { Dot } from '../ui/Txt';
import Memo from '../onboarding/Memo';
import Intro, { INTRO_BEATS, introCopy } from '../onboarding/Intro';
import { StoryBar } from '../onboarding/Step';
import DemoStage from './DemoStage';
import Stage, { type Box } from './Phone';
import { buildChapters, prepare, type Beat, type Chapter, type Scene } from './chapters';
import { createStore } from '../../state/store';
import { buildDemoState } from '../../data/demoFamily';
import { haptics } from '../../lib/haptics';
import { TODAY } from '../../lib/dates';
import { tokens, rise, motion, easing, personPalette } from '../../theme';
import { shade } from '../../theme/tokens';
import { tx } from '../../i18n/lang';

/** Marks a film caption line whose feature is not built yet. */
const SOON = '\u0001';
/** Weiter is there by about one second in (decisions), and its place is held from the start. */
const T_NEXT = 900;
/** Below this window height (iPhone SE, small Android) the text and buttons get a little tighter. */
const COMPACT_H = 740;
const useCompact = () => useWindowDimensions().height < COMPACT_H;

export default function Showcase({ onStart, onInvited }: { onStart: () => void; onInvited: () => void }) {
  const insets = useSafeAreaInsets();
  const today = TODAY;
  const chapters = useMemo(() => buildChapters(today), [today]);
  const [i, setI] = useState(0);
  // The opening film runs first (Julian 02.11.: "Zurück holen und verbessern"); null once the chapters play.
  const [film, setFilm] = useState<number | null>(0);
  const last = film === null && i === chapters.length - 1;
  const toChapters = () => { haptics.select(); setFilm(null); setI(0); };
  // The film may use a tap itself (a checkpoint inside a beat) before it moves on.
  const filmTap = useRef<(() => boolean) | null>(null);
  const nextFilm = () => { if (film === null) return; if (filmTap.current?.()) { haptics.select(); return; } if (film >= INTRO_BEATS - 1) toChapters(); else { haptics.select(); setFilm(film + 1); } };
  const go = (n: number) => { haptics.select(); setI(Math.max(0, Math.min(chapters.length - 1, n))); };
  const compact = useCompact();
  const btnH = compact ? 48 : 54;
  const footerH = btnH + 10 + 30 + (compact ? 12 : 18) + insets.bottom;
  // The stage's size outlives the chapters (ChapterRun remounts per chapter), so no chapter opens on a blank stage.
  const [box, setBox] = useState<Box | null>(null);
  // The footer fades in over T_NEXT; until then it is invisible, so it takes no taps.
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(reduced);
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), T_NEXT);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 40 }}>
          {film !== null
            ? (film ? <RoundButton icon="back" label={tx('Zurück', 'Back')} onPress={() => setFilm(film - 1)} /> : <View style={{ width: 40 }} />)
            : <RoundButton icon="back" label={tx('Zurück', 'Back')} onPress={() => (i ? go(i - 1) : setFilm(INTRO_BEATS - 1))} />}
          <StoryBar i={film ?? i} n={film !== null ? INTRO_BEATS : chapters.length} />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Memo act="idle" size={18} shadow={false} alive={false} />
          <Txt size={13} weight={600} color={tokens.sub}>{film !== null ? tx('Memo stellt sich vor', 'Meet Memo') : tx(`${i + 1} von ${chapters.length} · ${chapters[i].label}`, `${i + 1} of ${chapters.length} · ${chapters[i].label}`)}</Txt>
        </View>
      </View>
      {film !== null
        ? <FilmRun beat={film} onNext={nextFilm} tap={filmTap} />
        : <ChapterRun key={i} chapters={chapters} i={i} today={today} box={box} onBox={setBox} />}
      <Animated.View entering={FadeIn.duration(motion.base).delay(T_NEXT)} style={{ pointerEvents: ready ? 'auto' : 'none', height: footerH + 8, paddingHorizontal: 18, paddingTop: 8, paddingBottom: (compact ? 12 : 18) + insets.bottom, gap: 10 }}>
        {last ? (
          <>
            <Btn height={btnH} label={tx('Los geht’s', 'Let’s go')} onPress={onStart} />
            <TextLink label={tx('Ich habe eine Einladung', 'I was invited')} weight={400} onPress={onInvited} />
          </>
        ) : (
          <>
            {/* The send arrow in the stage is the screen's one dark element, so Weiter stays light until the end. */}
            <Btn height={btnH} primary={false} label={tx('Weiter', 'Next')} onPress={() => (film !== null ? nextFilm() : go(i + 1))} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
              <TextLink label={tx('Ich habe eine Einladung', 'I was invited')} weight={400} onPress={onInvited} />
              {/* Skip goes to the last chapter, where Los geht’s sits. It never starts (and never resets) from here. */}
              {/* In the film, Skip goes to the first chapter (the app at work); in the chapters, to the last. */}
              <TextLink label={tx('Überspringen', 'Skip')} weight={400} onPress={() => (film !== null ? toChapters() : go(chapters.length - 1))} />
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * The opening film, in the same grid as the chapters: headline and line first, then the stage plays
 * (src/components/onboarding/Intro.tsx). A tap on the stage moves on, like Weiter. The stage scales
 * down on short screens so the film never collides with the footer.
 */
function FilmRun({ beat, onNext, tap }: { beat: number; onNext: () => void; tap: React.MutableRefObject<(() => boolean) | null> }) {
  const compact = useCompact();
  const [ts, tl, ls, ll] = compact ? [22, 27, 15, 20] : [26, 31, 16, 22];
  const copy = introCopy(beat);
  // The "Bald" tag: warm ink on a warm tint (Sand), read at render time so it follows dark mode.
  const soonTint = shade(personPalette.find((p) => p.name === 'Sand')!);
  // A long title, or one that carries the "Bald" tag on its line, sets a little smaller.
  const tsz = copy.title.length > 44 ? Math.round(ts * 0.84) : copy.soon ? Math.round(ts * 0.88) : ts;
  const [h, setH] = useState(0);
  const scale = h ? Math.min(1, (h - 20) / 390) : 1;
  return (
    <>
      <View style={{ height: tl * 2 + ll * 2 + (compact ? 6 : 8) + (compact ? 20 : 28), paddingHorizontal: 18, paddingTop: compact ? 10 : 14, paddingBottom: compact ? 10 : 14, gap: compact ? 6 : 8 }}>
        {/* A feature that is not built yet says so after its title, in a warm tag that follows the title by 120 ms.
            The mark travels in the swapped text, so it never sits beside the old title. */}
        <Swap text={(copy.soon ? SOON : '') + copy.title} i={0}>{(raw) => { const soon = raw.startsWith(SOON); const t = soon ? raw.slice(1) : raw; return soon ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10 }}>
            <Txt size={tsz} line={tl} weight={700} tracking={-0.8} numberOfLines={2} style={{ flexShrink: 1 }}>{t}<Dot /></Txt>
            <Animated.View entering={rise(0).delay(120)} style={{ paddingHorizontal: 9, height: Math.round(tsz * 0.82), borderRadius: 7, backgroundColor: soonTint.bg, justifyContent: 'center' }}>
              <Txt size={Math.round(tsz * 0.5)} line={Math.round(tsz * 0.62)} weight={700} color={soonTint.fg}>{tx('Bald', 'Soon')}</Txt>
            </Animated.View>
          </View>
        ) : <Txt size={tsz} line={tl} weight={700} tracking={-0.8} numberOfLines={2}>{t}<Dot /></Txt>; }}</Swap>
        {/* Title first, the line 120 ms later (motion-skill §6). */}
        <Swap text={copy.lead} i={1} lag={120}>{(t) => <Txt size={ls} line={ll} color={tokens.sub} numberOfLines={2}>{t}</Txt>}</Swap>
      </View>
      <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={tx('Weiter', 'Next')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
        <View style={{ transform: [{ scale }] }}>
          <Intro beat={beat} tap={tap} />
        </View>
      </Pressable>
    </>
  );
}

/** One chapter: its headline, the stage, and the timeline that drives both. */
function ChapterRun({ chapters, i, today, box, onBox }: { chapters: Chapter[]; i: number; today: string; box: Box | null; onBox: (b: Box) => void }) {
  const reduced = useReducedMotion();
  const chapter = chapters[i];
  const beats = chapter.beats;
  const next = useRef(0);
  // A new demo store per chapter, played up to this chapter's start.
  const demo = useMemo(() => createStore(buildDemoState(today)), []);
  const start = useMemo(() => prepare(chapters, i, demo, today), []);
  // Reduced motion: the chapter's end state is the first frame, so the start never flashes.
  const first = useMemo(() => {
    if (!reduced) return start;
    let s = start;
    for (const b of beats) { b.store?.(demo); if (b.scene) s = b.scene(s, demo); }
    next.current = beats.length;
    return s;
  }, []);
  const sceneRef = useRef<Scene>(first);
  const [scene, setScene] = useState<Scene>(first);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gate = useRef<(() => void) | null>(null);
  // Mirrors `gate` for the stage's accessibility label, which a ref cannot update.
  const [gated, setGated] = useState(false);

  const apply = (b: Beat) => {
    b.store?.(demo);
    if (b.scene) sceneRef.current = b.scene(sceneRef.current, demo);
  };
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; gate.current = null; setGated(false); };
  const fire = () => {
    stop();
    const b = beats[next.current++];
    if (!b) return;
    apply(b);
    setScene(sceneRef.current);
    if (b.haptic) haptics[b.haptic]();
    schedule();
  };
  const schedule = () => {
    const b = beats[next.current];
    if (!b) return;
    timer.current = setTimeout(fire, b.after);
    if (b.gate) { gate.current = () => { haptics.tap(); fire(); }; setGated(true); }
  };
  /** The rest of the chapter at once: no waits, no haptics. */
  const finish = () => {
    stop();
    while (next.current < beats.length) apply(beats[next.current++]);
    setScene(sceneRef.current);
  };

  useEffect(() => {
    if (next.current < beats.length) schedule();
    return stop;
  }, []);

  const tap = () => { if (gate.current) gate.current(); else if (next.current < beats.length) finish(); };
  const compact = useCompact();
  const [ts, tl, ls, ll] = compact ? [22, 27, 15, 20] : [26, 31, 16, 22];
  const title = scene.head?.title ?? chapter.title;
  const line = scene.head?.line ?? chapter.line;
  // Julian's long claim keeps its words and gets a smaller size, so it still fits the two line grid.
  const tsz = title.length > 44 ? Math.round(ts * 0.84) : ts;
  return (
    <>
      {/* Exactly two lines of headline and two of text, so the stage never jumps, between chapters or inside one. */}
      <View style={{ height: tl * 2 + ll * 2 + (compact ? 6 : 8) + (compact ? 20 : 28), paddingHorizontal: 18, paddingTop: compact ? 10 : 14, paddingBottom: compact ? 10 : 14, gap: compact ? 6 : 8 }}>
        <Swap text={title} i={0}>{(t) => <Txt size={tsz} line={tl} weight={700} tracking={-0.8} numberOfLines={2}>{t}<Dot /></Txt>}</Swap>
        <Swap text={line} i={1}>{(t) => <Txt size={ls} line={ll} color={tokens.sub} numberOfLines={2}>{t}</Txt>}</Swap>
      </View>
      <Pressable
        onPress={tap}
        accessibilityRole="button"
        accessibilityLabel={gated ? tx('Senden', 'Send') : tx('Kapitel zu Ende zeigen', 'Show the end of this chapter')}
        style={{ flex: 1 }}
      >
        <DemoStage store={demo} style={{ flex: 1 }}>
          <Stage scene={scene} start={start} today={today} box={box} onBox={onBox} />
        </DemoStage>
      </Pressable>
    </>
  );
}

/**
 * Text that can change in place (chapter 8: the claim turns into "Jetzt ihr"): the old text fades out
 * (motion.micro), then the new one rises in. On the chapter's first frame it simply rises in.
 */
function Swap({ text, i, lag, children }: { text: string; i: number; lag?: number; children: (t: string) => React.ReactNode }) {
  const [shown, setShown] = useState(text);
  const o = useSharedValue(1);
  useEffect(() => {
    if (text === shown) return;
    o.value = withTiming(0, { duration: motion.micro, easing: easing.out }, () => { runOnJS(setShown)(text); });
  }, [text]);
  useEffect(() => { o.value = 1; }, [shown]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={st}>
      <Animated.View key={shown} entering={lag != null ? rise(0).delay(lag) : rise(i)}>{children(shown)}</Animated.View>
    </Animated.View>
  );
}
