/**
 * Memo, flat (Julian 13.11.2026: direction "Punkt": one solid round shape in one colour, two eyes, no shading).
 * He is the period after every headline, come alive. Pure vector, sharp at every size, no rendered assets.
 *
 * Klar look (Julian 13.11. to 14.11.): no hops, no salto. The body is exactly round at rest and almost still;
 * the eyes carry the feeling. Every state flows into the next, looking aside slides the eyes over ("3D", but
 * strictly flat), thinking and night are slow, and on a real result he melts into a small object and back.
 * The motion itself lives in rig.ts (states, events) and morphs.ts (objects); this file only draws the pose.
 *
 * Frames only run while something moves: at rest he costs nothing.
 *
 *   mood     what the app does right now (lib/buddy)
 *   joy      bumps when something landed: ^^ and the smallest squash; with joyKind he becomes that thing
 *   poke     bumps when something wants his attention: a blink, eyes a touch wider
 *   tap      bumps when he is tapped: a squint
 *   wink, sad   bump for a wink, and for "klappt nicht"
 *   heard    bumps when new words came in while listening: a small nod
 *   glance   eyes go where you touched, then drift back
 *   gaze     where the eyes rest (reading along); typeAt where they look while you type
 *   pose     for the onboarding: 'peek' looks up with a slow sway, 'wave' tips his head hello, 'jump' is one long ^^
 *   color    his body colour (default: ink, or your bubble colour if you chose that); ground is what lies behind him
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useFrameCallback, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import type { Mood } from '../../lib/buddy';
import { useMemoColor } from '../../lib/look';
import { tokens } from '../../theme';
import { frame, firstIn, firstRt, sync, cl, lerp, ST, RUN, type Frame, type In } from './rig';
import { morph, MORPH, PARTS, type MorphKind, type Part } from './morphs';

/** Colours of Memo, for anything drawn next to him (the intro drip). Read live, so dark mode follows. */
export const PIN = {
  get rim() { return tokens.ink; },
  get rimDeep() { return tokens.ink; },
  get face() { return tokens.onInk; },
  get ink() { return tokens.onInk; },
};

/** The body circle as a share of the box. He sits a little low in it, as before, so every caller's layout holds. */
const BODY_D = 0.8;
const BODY_TOP = 0.14;

export type PinPose = 'peek' | 'wave' | 'jump';

export type PinProps = {
  size?: number;
  mood?: Mood;
  joy?: number;
  /** With a kind, a joy plays that morph (only for real results). */
  joyKind?: MorphKind | null;
  /** How long the ^^ of a plain joy stays, in ms. */
  joyLong?: number;
  poke?: number;
  tap?: number;
  wink?: number;
  sad?: number;
  glance?: { x: number; y: number; n: number };
  level?: SharedValue<number>;
  still?: boolean;
  typeAt?: { x: number; y: number };
  gaze?: { x: number; y: number } | null;
  /** Kept for callers; he is flat and casts no shadow. */
  shadow?: boolean;
  heard?: number;
  pose?: PinPose;
  /** Breathes while at rest (1 %, evenly). Only for a big Memo: it keeps the frames running. */
  breathe?: boolean;
  color?: string;
  ground?: string;
  /** The loading bubble (klar): the eyes are three dots in a line that take turns, whatever the mood. */
  load?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TYPE_AT = { x: -0.55, y: 0.75 };
const REST = { x: 0, y: 0 };

export default function Pin(props: PinProps) {
  const reduced = useReducedMotion();
  const own = useMemoColor();
  const color = props.color ?? own;
  // On ink the eyes take the page colour (so dark mode flips); on a bubble colour they are white.
  const eye = color === tokens.ink ? tokens.onInk : '#FFFFFF';
  if (props.still || reduced) return <Still size={props.size ?? 40} mood={props.mood ?? 'idle'} color={color} eye={eye} gaze={props.gaze} style={props.style} />;
  return <Live {...props} color={color} eye={eye} ground={props.ground ?? tokens.row} />;
}

/** One settled picture: for reduced motion, and for the small Memo next to old answers. */
function Still({ size: S, mood, color, eye, gaze, style }: { size: number; mood: Mood; color: string; eye: string; gaze?: { x: number; y: number } | null; style?: StyleProp<ViewStyle> }) {
  const D = S * BODY_D, u = D / 34, c = D / 2;
  const ew = 4 * u, eh = 7 * u, aw = 7 * u, at = Math.max(1.4, 2 * u);
  const gx = (gaze?.x ?? 0) * 3 * u, gy = (mood === 'think' ? -0.6 : (gaze?.y ?? 0)) * 3 * u;
  return (
    <View pointerEvents="none" style={[{ width: S, height: S }, style]}>
      <View style={{ position: 'absolute', left: (S - D) / 2, top: S * BODY_TOP, width: D, height: D, borderRadius: c, backgroundColor: color }}>
        {[-1, 1].map((side) => mood === 'happy' ? (
          <View key={side} style={{ position: 'absolute', left: c + side * 4 * u - aw / 2, top: c - aw / 4 - at / 4, width: aw, height: aw / 2 + at / 2, overflow: 'hidden' }}>
            <View style={{ width: aw, height: aw, borderRadius: aw / 2, borderWidth: at, borderColor: eye }} />
          </View>
        ) : (
          <View key={side} style={{ position: 'absolute', left: c + side * 4 * u - ew / 2, top: c - eh / 2, width: ew, height: eh, borderRadius: ew / 2, backgroundColor: eye,
            transform: [{ translateX: gx }, { translateY: gy }, { scaleX: mood === 'sleep' ? 1.5 : 1 }, { scaleY: mood === 'sleep' ? 0.28 : 1 }] }} />
        ))}
      </View>
    </View>
  );
}

type LiveProps = PinProps & { color: string; eye: string; ground: string };

function Live({ size: S = 40, mood = 'idle', joy = 0, joyKind, joyLong, poke = 0, tap = 0, wink = 0, sad = 0, glance, level, typeAt, gaze, heard = 0, pose, breathe, color, eye, ground, load, style }: LiveProps) {
  const D = S * BODY_D, u = D / 34;
  const st = load ? ST.load : ST[mood];
  const rest = gaze ?? REST, ty = typeAt ?? TYPE_AT;
  const poseId = pose === 'peek' ? 1 : pose === 'wave' ? 2 : 0;
  const kindId = joyKind ? MORPH[joyKind] : 0;

  // The first picture is worked out here once, with the same functions the frames use.
  const start = useRef<{ i: In; f: Frame } | null>(null);
  if (!start.current) {
    const i = firstIn({ st, pose: poseId, breathe: breathe ? 1 : 0, restX: rest.x, restY: rest.y, typeX: ty.x, typeY: ty.y });
    start.current = { i, f: frame(0, i, firstRt(i), 0, st === 1 ? ty.x : rest.x, st === 1 ? ty.y : rest.y) };
  }
  const cur = useRef(start.current.i);
  const now = useSharedValue(0);
  const inp = useSharedValue(start.current.i);
  const rt = useSharedValue(firstRt(start.current.i));
  const P = useSharedValue(start.current.f);
  const vs = useSharedValue(0);
  const gzx = useSharedValue(st === 1 ? ty.x : rest.x);
  const gzy = useSharedValue(st === 1 ? ty.y : rest.y);
  const quiet = useSharedValue(0);
  const lv = level ?? quiet;

  const fc = useFrameCallback((f) => {
    const dt = Math.min(50, f.timeSincePreviousFrame ?? 16);
    const t = now.value + dt;
    now.value = t;
    const i = inp.value, r0 = rt.value;
    const r = sync(i, r0, t, P.value.b);
    if (r !== r0) rt.value = r;
    const k = dt / 1000;
    // The voice and the resting gaze are smoothed, so he bobs along and his eyes travel instead of jumping.
    vs.value += ((i.st === 2 ? lv.value : 0) - vs.value) * Math.min(1, k * 14);
    gzx.value += ((i.st === 1 ? i.typeX : i.restX) - gzx.value) * Math.min(1, k * 10);
    gzy.value += ((i.st === 1 ? i.typeY : i.restY) - gzy.value) * Math.min(1, k * 10);
    P.value = frame(t, i, r, vs.value, gzx.value, gzy.value);
  }, false);

  // Frames run only while something moves. These states never rest: he listens, thinks, breathes or sways.
  const always = st === ST.listen || st === ST.think || st === ST.load || !!breathe || poseId > 0;
  const alwaysRef = useRef(always); alwaysRef.current = always;
  const until = useRef(0);
  const off = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = (ms: number) => {
    fc.setActive(true);
    const end = Date.now() + ms;
    if (end <= until.current) return;
    until.current = end;
    if (off.current) clearTimeout(off.current);
    off.current = setTimeout(() => { until.current = 0; if (!alwaysRef.current) fc.setActive(false); }, ms + 80);
  };
  const push = (patch: Partial<In>, ms: number) => { cur.current = { ...cur.current, ...patch }; inp.value = cur.current; wake(ms); };
  useEffect(() => () => { if (off.current) clearTimeout(off.current); fc.setActive(false); }, []);

  const first = useRef(true);
  useEffect(() => { if (always) fc.setActive(true); else if (!first.current) wake(RUN.state); }, [always]);
  useEffect(() => { if (!first.current) push({ st, pose: poseId, breathe: breathe ? 1 : 0 }, st === ST.sleep ? RUN.sleep : RUN.state); }, [st, poseId, !!breathe]);
  useEffect(() => { if (!first.current) push({ restX: rest.x, restY: rest.y, typeX: ty.x, typeY: ty.y }, RUN.gaze); }, [rest.x, rest.y, ty.x, ty.y]);
  useEffect(() => { if (!first.current) push({ joyN: cur.current.joyN + 1, joyKind: kindId, joyLong: joyLong ?? 900 }, kindId ? RUN.morph : (joyLong ?? 900) + 500); }, [joy]);
  useEffect(() => { if (!first.current) push({ pokeN: cur.current.pokeN + 1 }, RUN.poke); }, [poke]);
  useEffect(() => { if (!first.current) push({ tapN: cur.current.tapN + 1 }, RUN.tap); }, [tap]);
  useEffect(() => { if (!first.current) push({ winkN: cur.current.winkN + 1 }, RUN.wink); }, [wink]);
  useEffect(() => { if (!first.current) push({ sadN: cur.current.sadN + 1 }, RUN.sad); }, [sad]);
  useEffect(() => { if (!first.current && heard) push({ nodN: cur.current.nodN + 1 }, RUN.nod); }, [heard]);
  useEffect(() => {
    if (first.current || !glance || (st !== ST.idle && st !== ST.type)) return;
    push({ glN: cur.current.glN + 1, glX: glance.x, glY: glance.y, glHold: 1300 }, 2100);
  }, [glance?.n]);
  // Blinks come at uneven gaps (2.6 to 5 s), now and then twice. Not while he thinks or sleeps.
  useEffect(() => {
    if (st === ST.sleep || st === ST.think || st === ST.load) return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => { id = setTimeout(() => { push({ blinkN: cur.current.blinkN + 1, blink2: Math.random() < 0.3 ? 1 : 0 }, RUN.blink); next(); }, 2600 + Math.random() * 2400); };
    next();
    return () => clearTimeout(id);
  }, [st]);
  // At rest he glances to one side at most every 12 s, sometimes a slow look up.
  useEffect(() => {
    if (st !== ST.idle || gaze || poseId) return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => { id = setTimeout(() => { push({ glN: cur.current.glN + 1, glX: (Math.random() * 2 - 1) * 0.7, glY: Math.random() > 0.75 ? -0.55 : -0.1, glHold: 1000 }, 1800); next(); }, 12000 + Math.random() * 8000); };
    next();
    return () => clearTimeout(id);
  }, [st, !!gaze, poseId]);
  // 'jump' (the onboarding's happy moment): no hop any more, one long ^^.
  useEffect(() => {
    if (pose !== 'jump') return;
    const id = setTimeout(() => push({ joyN: cur.current.joyN + 1, joyKind: 0, joyLong: 1600 }, 2200), 60);
    return () => clearTimeout(id);
  }, [pose]);
  useEffect(() => { first.current = false; }, []);

  const body = useAnimatedStyle(() => {
    const p = P.value, m = p.m, r = D / 2;
    if (!m) return {
      borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: r,
      transform: [{ translateX: p.tx * u }, { translateY: p.ty * u }, { rotate: `${p.rot}deg` }, { scaleX: p.sx }, { scaleY: p.sy }] as any,
    };
    return {
      borderTopLeftRadius: m.tl * D, borderTopRightRadius: m.tr * D, borderBottomRightRadius: m.br * D, borderBottomLeftRadius: m.bl * D,
      transform: [{ translateX: (p.tx + m.bx) * u }, { translateY: (p.ty + m.by) * u }, { rotate: `${p.rot}deg` }, { scaleX: p.sx * m.bsx }, { scaleY: p.sy * m.bsy }] as any,
    };
  });

  // The parts of the current morph: their shapes are fixed, so they are laid out here; the frames only move them.
  const geo = useMemo(() => (kindId ? morph(kindId, 1, 600).parts : []), [kindId]);

  return (
    <View pointerEvents="none" style={[{ width: S, height: S }, style]}>
      <Animated.View style={[{ position: 'absolute', left: (S - D) / 2, top: S * BODY_TOP, width: D, height: D, borderRadius: D / 2, backgroundColor: color }, body]}>
        <Eye P={P} k={0} u={u} D={D} color={eye} />
        <Eye P={P} k={1} u={u} D={D} color={eye} />
        <Dot P={P} k={0} u={u} D={D} color={eye} />
        <Dot P={P} k={1} u={u} D={D} color={eye} />
        <Dot P={P} k={2} u={u} D={D} color={eye} />
        {Array.from({ length: PARTS }, (_, i) => <Piece key={i} P={P} i={i} u={u} D={D} g={geo[i] ?? null} ink={color} cut={ground} eye={eye} />)}
      </Animated.View>
    </View>
  );
}

/** One eye: a pill that slides, blinks and squints, and the ^^ arch it swaps to when he is glad. */
function Eye({ P, k, u, D, color }: { P: SharedValue<Frame>; k: 0 | 1; u: number; D: number; color: string }) {
  const ew = 4 * u, eh = 7 * u, aw = 7 * u, at = Math.max(1.4, 2 * u);
  const cx = D / 2 + (k ? 4 : -4) * u, cy = D / 2;
  const pill = useAnimatedStyle(() => {
    const p = P.value, tn = p.turn, a = Math.abs(tn), edge = (tn > 0) === (k === 1), h = p.happy;
    // Looking aside: both eyes slide over, they move closer, and the outer one gets narrower (a turn, in 2D).
    const x = (tn * 8.5 + (k ? -1 : 1) * 1.4 * a * (edge ? 1.4 : 1) + p.gx * 3) * u;
    if (h >= 0.5) return { opacity: 0, transform: [{ translateX: x }, { translateY: p.gy * 3 * u }, { scaleX: 1 }, { scaleY: 0.02 }] as any };
    const d = cl(k === 1 ? p.dash * (1 - 0.7 * p.peek) : p.dash);
    let sy = p.blink * (k === 0 ? p.wl : p.wr) * p.wide * lerp(1, 0.28, d) * (1 - (edge ? 0.08 : 0) * a) * (1 - 2 * h);
    if (p.tho > 0) sy *= lerp(1, 0.57, cl(p.tho * 2));
    const sx = p.wide * (1 + 0.5 * d) * (1 - (edge ? 0.42 : 0.1) * a);
    let o = 1 - p.tho;
    if (p.m) o *= 1 - p.m.hide;
    return { opacity: o, transform: [{ translateX: x }, { translateY: p.gy * 3 * u }, { scaleX: sx }, { scaleY: Math.max(0.02, sy) }] as any };
  });
  const arch = useAnimatedStyle(() => {
    const p = P.value, tn = p.turn, a = Math.abs(tn), edge = (tn > 0) === (k === 1), h = p.happy;
    const x = (tn * 8.5 + (k ? -1 : 1) * 1.4 * a * (edge ? 1.4 : 1)) * u;
    if (h < 0.5) return { opacity: 0, transform: [{ translateX: x }, { scaleX: 1 }, { scaleY: 0.02 }] as any };
    return { opacity: p.m ? 1 - p.m.hide : 1, transform: [{ translateX: x }, { scaleX: 1 - (edge ? 0.3 : 0.08) * a }, { scaleY: Math.max(0.02, cl((h - 0.5) * 2)) }] as any };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: cx - ew / 2, top: cy - eh / 2, width: ew, height: eh, borderRadius: ew / 2, backgroundColor: color }, pill]} />
      <Animated.View style={[{ position: 'absolute', left: cx - aw / 2, top: cy - aw / 4 - at / 4, width: aw, height: aw / 2 + at / 2, overflow: 'hidden' }, arch]}>
        <View style={{ width: aw, height: aw, borderRadius: aw / 2, borderWidth: at, borderColor: color }} />
      </Animated.View>
    </>
  );
}

/** One of the three thinking dots: first "…" where the eyes were, then a slow orbit. */
function Dot({ P, k, u, D, color }: { P: SharedValue<Frame>; k: number; u: number; D: number; color: string }) {
  const s = 3.6 * u;
  const st = useAnimatedStyle(() => {
    const p = P.value;
    if (p.tho <= 0.001) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] as any };
    const ca = p.tha + k * 2.0944;
    // Loading (thw): the line stands wider and bigger, and each dot rises and brightens a little after the one before.
    const wv = p.thw > 0 ? (0.5 - 0.5 * Math.cos(p.tha * 2.4 - k * 1.1)) * p.thw : 0;
    const lx = (k - 1) * 5.6 * (1 + 0.6 * p.thw) + p.thx, ly = -p.thx * 0.5 - 1.5 * wv;
    const ox = Math.cos(ca) * 4.4 + p.thx * 0.6, oy = Math.sin(ca) * 4.4 - p.thx * 0.3;
    const sc = (k === 1 ? lerp(0.5, 1, cl(p.tho * 1.6 - 0.4)) : 1) * (1 + 0.4 * p.thw);
    return { opacity: p.tho * (1 - 0.5 * (p.thw - wv)), transform: [{ translateX: lerp(lx, ox, p.thm) * u }, { translateY: lerp(ly, oy, p.thm) * u }, { scale: lerp(sc, 1 - k * 0.18, p.thm) }] as any };
  });
  return <Animated.View style={[{ position: 'absolute', left: D / 2 - s / 2, top: D / 2 - s / 2, width: s, height: s, borderRadius: s / 2, backgroundColor: color }, st]} />;
}

/** One flat part of a morph. Its shape comes from g (fixed), its place and visibility from the frames. */
function Piece({ P, i, u, D, g, ink, cut, eye }: { P: SharedValue<Frame>; i: number; u: number; D: number; g: Part | null; ink: string; cut: string; eye: string }) {
  const st = useAnimatedStyle(() => {
    const m = P.value.m;
    const q = m && i < m.parts.length ? m.parts[i] : null;
    if (!q) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }, { scaleX: 1 }, { scaleY: 1 }] as any };
    return { opacity: q.o, transform: [{ translateX: q.x * u }, { translateY: q.y * u }, { rotate: `${q.rot}deg` }, { scaleX: Math.max(0.02, q.sx) }, { scaleY: Math.max(0.02, q.sy) }] as any };
  });
  if (!g) return <Animated.View style={[{ position: 'absolute', left: D / 2, top: D / 2, width: 0, height: 0, opacity: 0 }, st]} />;
  const w = g.w * u, h = g.h * u;
  const col = g.col === 0 ? ink : g.col === 1 ? cut : eye;
  const box = { position: 'absolute' as const, left: D / 2 - w / 2, top: D / 2 - h / 2, width: w, height: h, opacity: 0 };
  const line = g.line ? ({ boxShadow: `0 0 0 ${g.line * u}px ${cut}` } as any) : null;
  if (g.kind === 3) return (
    <Animated.View style={[box, st]}>
      <View style={{ width: 0, height: 0, borderLeftWidth: w, borderLeftColor: col, borderTopWidth: h / 2, borderBottomWidth: h / 2, borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
    </Animated.View>
  );
  if (g.kind === 2) return (
    <Animated.View style={[box, { overflow: 'hidden' }, st]}>
      <View style={{ width: w, height: h * 2, borderRadius: g.rad * u, borderWidth: g.bw * u, borderColor: col }} />
    </Animated.View>
  );
  if (g.kind === 1) return <Animated.View style={[box, { borderRadius: g.rad * u, borderWidth: g.bw * u, borderColor: col }, line, st]} />;
  return <Animated.View style={[box, { borderRadius: g.rad * u, backgroundColor: col }, line, st]} />;
}
