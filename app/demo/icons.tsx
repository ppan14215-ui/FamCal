/**
 * Dev only, not linked anywhere: the icon motion gallery (02.11.2026).
 * /demo/icons                 every whole-moving icon as a Tile; each plays once on appear, again on tap
 * /demo/icons?set=wait        the icons that wait for their parts (tap gives the small press)
 * /demo/icons?set=all         every clay icon
 * /demo/icons?set=parts       Icons v1 (03.11.): every icon with moving parts; ?set=layered only those with 3+ layers
 * /demo/icons?strip=1         contact sheet: one row per icon, frames of its motion side by side,
 *                             drawn from the same curves as the app (a frame is a pure function of time)
 *   &n=14                     frames per row,   &only=bus,taxi   just these icons,   &kind=arrive   just one kind
 * /demo/icons?set=codex&still=1  all 107 Codex icons (02.11.) as still Tiles: the contact sheet
 * /demo/icons?film=1           review film: the whole Codex icons in a 6-column grid, each plays in turn.
 *                             Time is set from outside (window.__filmT(ms)), so every frame is a pure function of t.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import Txt from '../../src/components/ui/Txt';
import { Tile } from '../../src/components/ui/Clay';
import { clayIcons, ClayName } from '../../src/lib/clayIcons';
import { clayWhole, WAITING_FOR_PARTS } from '../../src/lib/clayWhole';
import { clayMotion } from '../../src/lib/clayMotion';
import { calmDur, durOf, toRN, wholeF } from '../../src/lib/clayCurves';
import { tokens, tint } from '../../src/theme';

/** The Codex icons (02.11.) that move as a whole: every icon on a calm kind except the ones waiting for parts. */
const CODEX_WHOLE = (Object.keys(clayWhole) as ClayName[]).filter((n) => { const k = clayWhole[n]!.kind; return k !== 'wait' && calmDur(k) > 0; });

/** The film's order and timing: each icon starts STEP ms after the one before. */
const STEP = 650, LEAD = 500;
const filmLength = () => LEAD + STEP * (CODEX_WHOLE.length - 1) + 1300;

function Film() {
  const [t, setT] = useState(0);
  useEffect(() => { (globalThis as any).__filmT = (ms: number) => setT(ms); (globalThis as any).__filmLen = filmLength(); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, padding: 24, paddingTop: 28 }}>
      <Txt size={18} weight={700}>Codex Icons · Bewegung als Ganzes</Txt>
      <Txt size={11} color={tokens.sub} style={{ marginBottom: 14 }}>{CODEX_WHOLE.length} Icons, je einmal nacheinander, Echtzeit</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 6 * 104 }}>
        {CODEX_WHOLE.map((name, i) => {
          const D = durOf(clayWhole[name]!.kind), local = t - LEAD - i * STEP, x = local <= 0 ? 0 : Math.min(1, local / D);
          const on = local > 0 && local < D;
          return (
            <View key={name} style={{ width: 104, alignItems: 'center', marginBottom: 12 }}>
              <Frame name={name} x={x} />
              <Txt size={10} weight={on ? 700 : 500} color={on ? tokens.ink : tokens.sub} numberOfLines={1} style={{ marginTop: 5 }}>{name}</Txt>
              <Txt size={8} color={tokens.sub} numberOfLines={1}>{clayWhole[name]!.kind}</Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function LiveCell({ name, delay, still }: { name: ClayName; delay: number; still?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { if (still) return; const id = setTimeout(() => setOn(true), delay); return () => clearTimeout(id); }, []);
  const replay = () => { setOn(false); setTimeout(() => setOn(true), 30); };
  const kind = clayMotion[name]?.kind ?? clayWhole[name]?.kind ?? 'press';
  return (
    <Pressable onPress={replay} style={{ width: 96, alignItems: 'center', marginBottom: 14 }}>
      <Tile name={name} size={64} celebrate={on} />
      <Txt size={10} weight={600} numberOfLines={1} style={{ marginTop: 6 }}>{name}</Txt>
      <Txt size={9} color={tokens.sub} numberOfLines={1}>{kind}</Txt>
    </Pressable>
  );
}

/** One frame of a whole icon at time x, drawn like the app's Tile (size 64, ratio 0.9, FILL 1.35). */
function Frame({ name, x }: { name: ClayName; x: number }) {
  const spec = clayWhole[name]!;
  const big = Math.round(64 * 0.9 * 1.35);
  const f = wholeF(spec.kind, x, big, spec.variant);
  return (
    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: tint(name), alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[{ width: big, height: big, transformOrigin: spec.origin ?? '50% 90%' } as any, toRN(f)]}>
          <Image source={clayIcons[name]} style={{ width: big, height: big }} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
}

export default function IconGallery() {
  const q = useLocalSearchParams<{ set?: string; strip?: string; n?: string; only?: string; kind?: string; film?: string; still?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  if (q.film) return <Film />;
  const only = q.only ? (q.only.split(',') as ClayName[]) : null;
  if (q.strip) {
    const n = Math.max(2, Number(q.n) || 14);
    const names = (only ?? CODEX_WHOLE).filter((x) => clayWhole[x] && (!q.kind || clayWhole[x]!.kind === q.kind));
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ padding: 16 }}>
        {names.map((name) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 120 }}>
              <Txt size={11} weight={700}>{name}</Txt>
              <Txt size={9} color={tokens.sub}>{clayWhole[name]!.kind} · {durOf(clayWhole[name]!.kind)} ms</Txt>
            </View>
            {Array.from({ length: n }, (_, i) => (
              <View key={i} style={{ marginRight: 10, alignItems: 'center' }}>
                <Frame name={name} x={i / (n - 1)} />
                <Txt size={8} color={tokens.sub}>{Math.round((i / (n - 1)) * durOf(clayWhole[name]!.kind))}</Txt>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }
  const names = only ?? (q.set === 'wait' ? [...WAITING_FOR_PARTS] : q.set === 'codex' ? [...CODEX_WHOLE, ...WAITING_FOR_PARTS].sort() : q.set === 'layered' ? (Object.keys(clayMotion).filter((k) => (clayMotion as any)[k].layers?.length > 2) as ClayName[]) : q.set === 'parts' ? (Object.keys(clayMotion) as ClayName[]) : q.set === 'emoji' ? (Object.keys(clayIcons).filter((k) => /^[a-z]+(-[a-z]+)*$/.test(k) && !k.includes('__') && !clayWhole[k as ClayName] && !clayMotion[k as ClayName]) as ClayName[]) : q.set === 'all' ? (Object.keys(clayIcons).filter((k) => !k.includes('__')) as ClayName[]) : CODEX_WHOLE);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <Txt size={20} weight={700}>Icons · Bewegung</Txt>
      <Txt size={12} color={tokens.sub} style={{ marginBottom: 16 }}>{names.length} Icons. Antippen spielt die Bewegung noch einmal.</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {names.map((name, i) => <LiveCell key={name} name={name} still={!!q.still} delay={300 + 60 * Math.min(i, 20)} />)}
      </View>
    </ScrollView>
  );
}
