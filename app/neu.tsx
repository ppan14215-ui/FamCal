/**
 * Neu: the "+" menu. Like Claude (Julian 29.10.): first what you bring along,
 * Kamera, Fotos, Datei; then entering by hand, Termin, Listeneintrag, Aufgabe,
 * Entwurf; or forward by mail. Fotos and Datei need the next app build.
 *
 * Klar look (Julian 14.11.2026: "das plus menu und hinzufügen schaut komisch aus"): no sheet any more. A small dark
 * card grows out of the plus itself, the plus stays where it is and turns into a cross. The older nav styles keep
 * the sheet.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Keyboard, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import * as Clipboard from 'expo-clipboard';
import Sheet from '../src/components/Sheet';
import Txt, { Dot } from '../src/components/ui/Txt';
import LineIcon, { type LineName } from '../src/components/ui/LineIcon';
import { ClayIcon } from '../src/components/ui/Clay';
import PressScale from '../src/components/ui/PressScale';
import { Meta } from '../src/components/ui/kit';
import { tokens, blend } from '../src/theme';
import { navStyle } from '../src/lib/navStyle';
import { navH, klarFoot } from '../src/components/NavBar';
import { takePlusFrom } from '../src/lib/plusFrom';
import { HEAD_SHADOW } from '../src/components/ui/HeaderRight';
import { haptics } from '../src/lib/haptics';
import { actions, toast } from '../src/state/store';
import type { ClayName } from '../src/lib/clayIcons';
import { tx } from '../src/i18n/lang';
import { canRead, pickImage, readLines } from '../src/lib/screenshot';
import { addPic } from '../src/lib/attach';
import { sayInApp } from '../src/lib/shared';
import Animated, { FadeInDown, Easing, useAnimatedStyle, useSharedValue, withTiming, interpolate, Extrapolation, useReducedMotion } from 'react-native-reanimated';
import { HIDDEN } from '../src/lib/core';
import { ohneKi } from '../src/lib/privat';

// Quick and calm (Julian 30.10.: the falling, tilted cards were too playful and too slow).
const fall = (i: number) => FadeInDown.duration(160).delay(i * 20);

const MAIL = 'huber-7q2@familie.app';

type Opt = { icon: ClayName; line: LineName; t: string; s: string; onPress: () => void; extra?: boolean };
type Attach = { icon: LineName; t: string; onPress: () => void };

const OUT = Easing.bezier(0.23, 1, 0.32, 1);
const CARD_W = 272;

/**
 * The plus menu of the klar look: a dark card that grows out of the plus. The plus itself is drawn again on top, in
 * the same place, and turns 45 degrees into the cross that closes. The screen behind washes out a little, a tap
 * there closes. Without a known plus (opened from the input or from Memo) the card rises above the nav.
 */
function PlusCard({ opts, attach, ask, mail }: { opts: Opt[]; attach: Attach[]; ask?: () => void; mail?: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const from = useRef(takePlusFrom()).current;
  // The plus was measured in the window; this screen may start a little lower or higher than the window.
  const root = useRef<View>(null);
  const [off, setOff] = useState<{ x: number; y: number } | null>(from ? null : { x: 0, y: 0 });
  const place = () => {
    if (off) return;
    const v = root.current as any;
    if (v?.measureInWindow) v.measureInWindow((x: number, y: number) => setOff({ x: x || 0, y: y || 0 }));
    else setOff({ x: 0, y: 0 });
  };
  const p = useSharedValue(0);
  // Opened from the typing card, the keyboard would lie over the menu.
  useEffect(() => { Keyboard.dismiss(); }, []);
  useEffect(() => { if (off) p.value = withTiming(1, { duration: reduced ? 0 : 240, easing: OUT }); }, [!!off]);
  const shut = () => { p.value = withTiming(0, { duration: reduced ? 0 : 150, easing: OUT }, (f) => { if (f) scheduleOnRN(goBack); }); };

  const fx = from && off ? from.x - off.x : 0, fy = from && off ? from.y - off.y : 0, fs = from?.size ?? 38;
  const down = !!from && fy < H / 2;
  const w = Math.min(CARD_W, W - 36);
  const box = !from ? { left: (W - w) / 2, bottom: klarFoot(insets.bottom) + navH() + 12, transformOrigin: '50% 100%' }
    : down ? { right: Math.max(14, W - (fx + fs / 2)), top: fy + fs / 2 + 10, transformOrigin: '100% 0%' }
    : { left: Math.max(14, Math.min(W - w - 14, fx - fs / 2)), bottom: H - (fy - fs / 2 - 10), transformOrigin: '0% 100%' };
  const veil = useAnimatedStyle(() => ({ opacity: 0.62 * p.value }));
  const card = useAnimatedStyle((): any => ({ opacity: interpolate(p.value, [0, 0.25], [0, 1], Extrapolation.CLAMP), transform: [{ scale: 0.5 + 0.5 * p.value }] }));
  const inner = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.35, 0.85], [0, 1], Extrapolation.CLAMP) }));
  const cross = useAnimatedStyle((): any => ({ transform: [{ rotate: `${45 * p.value}deg` }] }));
  const ON = tokens.onInk;
  const dim = (a: number) => blend(tokens.ink, tokens.onInk, a);

  return (
    <View ref={root} onLayout={place} collapsable={false} style={{ flex: 1 }}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: tokens.bg }, veil]} />
      <Pressable accessibilityLabel={tx('Schließen', 'Close')} onPress={shut} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {off ? (
        <Animated.View accessibilityRole="menu" style={[{ position: 'absolute', width: w, borderRadius: 22, padding: 8, backgroundColor: tokens.ink, boxShadow: '0 12px 28px rgba(17,20,23,0.24)' } as any, box as any, card]}>
          <Animated.View style={inner}>
            <Txt size={12.5} weight={600} color={dim(0.55)} style={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 }}>{tx('Neu', 'New')}</Txt>
            {opts.map((o) => (
              <PressScale key={o.t} scale={0.98} accessibilityRole="menuitem" accessibilityLabel={o.t} onPress={() => { haptics.select(); o.onPress(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: dim(0.14) }}>
                  <LineIcon name={o.line} size={19} color={ON} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16} line={21} weight={600} color={ON} numberOfLines={1}>{o.t}</Txt>
                  <Txt size={13} line={17} color={dim(0.6)} numberOfLines={1}>{o.s}</Txt>
                </View>
              </PressScale>
            ))}
            {ask ? (
              <PressScale scale={0.98} accessibilityRole="menuitem" onPress={() => { haptics.select(); ask(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: dim(0.14) }}>
                  <LineIcon name="mic" size={19} color={ON} />
                </View>
                <Txt size={16} line={21} weight={600} color={ON} numberOfLines={1} style={{ flex: 1 }}>{tx('Frag den Assistenten', 'Ask the assistant')}</Txt>
              </PressScale>
            ) : null}
            {attach.length ? (
              <>
                <View style={{ height: 1, marginVertical: 6, marginHorizontal: 8, backgroundColor: dim(0.16) }} />
                <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4, paddingBottom: 2 }}>
                  {attach.map((a) => (
                    <PressScale key={a.t} accessibilityLabel={a.t} onPress={() => { haptics.select(); a.onPress(); }} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 9, borderRadius: 14, backgroundColor: dim(0.1) }}>
                      <LineIcon name={a.icon} size={20} color={ON} />
                      <Txt size={12.5} weight={500} color={dim(0.75)}>{a.t}</Txt>
                    </PressScale>
                  ))}
                </View>
              </>
            ) : null}
            {mail ? (
              <PressScale scale={0.98} onPress={mail} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 14 }}>
                <LineIcon name="inbox" size={17} color={dim(0.6)} />
                <Txt size={12.5} color={dim(0.6)} numberOfLines={1} style={{ flex: 1 }}>{tx('Oder weiterleiten an', 'Or forward to')} <Txt size={12.5} weight={600} color={ON}>{MAIL}</Txt></Txt>
                <LineIcon name="copy" size={15} color={dim(0.6)} />
              </PressScale>
            ) : null}
          </Animated.View>
        </Animated.View>
      ) : null}
      {from && off ? (
        // The plus again, exactly on the real one: it turns into the cross and closes.
        <Pressable accessibilityRole="button" accessibilityLabel={tx('Schließen', 'Close')} onPress={shut} hitSlop={6}
          style={{ position: 'absolute', left: fx - fs / 2, top: fy - fs / 2, width: fs, height: fs, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', boxShadow: HEAD_SHADOW } as any}>
          <Animated.View style={cross}><LineIcon name="plus" size={21} color={tokens.ink} stroke={2} /></Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Neu() {
  const go = (fn: () => void) => { goBack(); setTimeout(fn, 30); };
  const soon = () => toast(tx('Kommt mit dem nächsten App Update', 'Coming with the next app update'));
  const attach: { icon: LineName; t: string; onPress: () => void }[] = [
    // Julian 11.11.: like the Claude app, the picture lands in the field as a preview; you add words and send both.
    { icon: 'camera', t: tx('Kamera', 'Camera'), onPress: canRead() ? () => go(() => void pickImage('camera').then((u) => { if (u) addPic(u); })) : () => go(() => router.push('/foto-kamera')) },
    { icon: 'image', t: tx('Fotos', 'Photos'), onPress: canRead() ? () => go(() => void pickImage('gallery').then((u) => { if (u) addPic(u); })) : soon },
    { icon: 'file', t: tx('Datei', 'File'), onPress: soon },
  ];
  const all: Opt[] = [
    { icon: 'kalender', line: 'cal', t: tx('Termin', 'Event'), s: tx('für euch oder Ben', 'for you or the kids'), onPress: () => go(() => router.push('/termin-neu')) },
    // One tile for lists (Julian 30.10.: "zwei mal ... Listen versteht man auch nicht"); a new list starts from there.
    { icon: 'einkauf', line: 'list', t: tx('Auf die Liste', 'To a list'), s: tx('Einkauf oder eure Listen', 'Shopping or your lists'), onPress: () => go(() => router.push('/einkauf-neu')) },
    // A photo of a letter, invitation or note: the phone reads it, the assistant enters what is in it (Julian 30.10.).
    { icon: 'kamera-scan', line: 'camera', t: tx('Foto lesen', 'Read a photo'), s: tx('Brief, Einladung, Zettel', 'Letter, invite, note'), onPress: () => go(() => void fromPhoto()) },
    { icon: 'erledigt', line: 'check', extra: HIDDEN.tasks, t: tx('Aufgabe', 'Task'), s: tx('mit oder ohne Datum', 'with or without a date'), onPress: () => go(() => { actions.setActiveList('aufgaben'); router.navigate('/listen'); }) },
    { icon: 'papier-stift', line: 'papier', extra: true, t: tx('Entwurf', 'Draft'), s: tx('Antwort schreiben lassen', 'Have a reply written'), onPress: () => go(() => router.push('/entwurf')) },
  ];
  // Julian 30.10. 21:52 "super simpel": only entering by hand stays.
  const fromPhoto = async () => {
    if (!canRead()) return soon();
    const uri = await pickImage('camera');
    if (!uri) return;
    // Read on the phone; numbers like IBAN or tax id are already scrubbed and never leave it.
    const lines = await readLines(uri).catch(() => [] as string[]);
    if (!lines.length) return toast(tx('Auf dem Foto konnte ich keinen Text lesen.', "I couldn't read any text on the photo."));
    router.navigate('/chat');
    // A letter is longer than a sentence; the server allows photo text up to 2500 characters.
    sayInApp(`${tx('Vom Foto', 'From a photo')}: ${lines.join(' / ')}`.slice(0, 2500));
  };
  // Ohne KI (Julian 05.11.): only what works by hand; the photo of a letter needs the assistant.
  const ohne = ohneKi();
  const opts = all.filter((o) => !(HIDDEN.extras && o.extra) && !(ohne && (o.icon === 'kamera-scan' || o.icon === 'papier-stift')));
  const extras = !(HIDDEN.extras || ohne);
  if (navStyle() === 'klar') return (
    <PlusCard opts={opts} attach={extras ? attach : []}
      ask={extras ? () => go(() => router.push('/assistent')) : undefined}
      mail={extras ? async () => { await Clipboard.setStringAsync(MAIL).catch(() => {}); toast(tx('Adresse kopiert', 'Address copied')); } : undefined} />
  );
  return (
    <Sheet>
      <Txt size={24} weight={700} tracking={-0.5}>{tx('Was kommt dazu', 'What\'s new')}<Dot char="?" /></Txt>
      {HIDDEN.extras || ohne ? null : <View style={{ flexDirection: 'row', gap: 8 }}>
        {attach.map((a, i) => (
          <Animated.View key={a.t} entering={fall(i)} style={{ flex: 1 }}>
            <PressScale accessibilityLabel={a.t} onPress={a.onPress} style={{ alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 20, backgroundColor: tokens.row }}>
              <LineIcon name={a.icon} size={26} color={tokens.ink} />
              <Txt size={14} weight={600}>{a.t}</Txt>
            </PressScale>
          </Animated.View>
        ))}
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o, i) => (
          <Animated.View key={o.t} entering={fall((HIDDEN.extras ? 0 : 3) + i)} style={{ width: '48.5%', flexGrow: 1 }}>
            <PressScale onPress={o.onPress} style={{ gap: 8, padding: 14, borderRadius: 22, backgroundColor: tokens.row, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
              <ClayIcon name={o.icon} size={58} />
              <Txt size={16} weight={600}>{o.t}</Txt>
              <Meta>{o.s}</Meta>
            </PressScale>
          </Animated.View>
        ))}
      </View>
      {HIDDEN.extras || ohne ? null : <>
      <PressScale scale={0.985} onPress={() => go(() => router.push('/assistent'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, borderRadius: 20, backgroundColor: tokens.row }}>
        <ClayIcon name="chat" size={48} />
        <Txt size={15.5} weight={600} style={{ flex: 1 }}>{tx('Frag den Assistenten', 'Ask the assistant')}</Txt>
        <LineIcon name="mic" size={20} color={tokens.sub} />
      </PressScale>
      <PressScale
        onPress={async () => { await Clipboard.setStringAsync(MAIL).catch(() => {}); toast(tx('Adresse kopiert', 'Address copied')); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: tokens.row }}
      >
        <LineIcon name="inbox" size={20} color={tokens.sub} />
        <Txt size={14} color={tokens.sub} style={{ flex: 1 }}>{tx('Oder weiterleiten an', 'Or forward to')} <Txt size={14} weight={700}>{MAIL}</Txt></Txt>
        <LineIcon name="copy" size={18} color={tokens.sub} />
      </PressScale>
      </>}
    </Sheet>
  );
}
