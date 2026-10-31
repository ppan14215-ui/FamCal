/**
 * Julian 31.10.: "Welcher Kinderarzt ist das?" The first time, the card asks, looks the place up and shows
 * it on a small map: "Ist er das?" Ja / Anderer. Next time the app fills it in by itself and says so.
 * It says "eingetragen", never "gebucht": the app only writes the calendar, it books nothing.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, TextInput, Platform, Linking } from 'react-native';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import LineIcon from './ui/LineIcon';
import { Dots } from './Veil';
import { tokens, fonts } from '../theme';
import { useStore, actions } from '../state/store';
import { haptics } from '../lib/haptics';
import { placeKind, lastPlace, placeName, looksVerified, findPlace, foundText, tileXY, mapsLink, type Found } from '../lib/orte';
import type { EventSnap } from '../lib/feed';

/** Termine whose place question is finished on this phone (answered, skipped or filled in). */
const handled = new Set<string>();

type Step =
  | { s: 'off' }
  | { s: 'auto'; place: string }
  | { s: 'ask' }
  | { s: 'search'; what: string }
  | { s: 'pick'; what: string; found: Found[]; i: number }
  | { s: 'none'; what: string }
  | { s: 'saved'; place: string };

export default function PlaceAsk({ e }: { e: EventSnap }) {
  const events = useStore((s) => s.events);
  const kind = placeKind(e.title);
  const L = (de: string, en: string) => (kind?.de === false ? en : de);
  const [step, setStep] = useState<Step>({ s: 'off' });
  const [text, setText] = useState('');

  const search = async (what: string) => {
    setStep({ s: 'search', what });
    const found = await findPlace(what, kind?.de === false ? 'en' : 'de');
    setStep(found.length ? { s: 'pick', what, found, i: 0 } : { s: 'none', what });
  };

  useEffect(() => {
    if (!kind || handled.has(e.id)) return;
    const last = lastPlace(events, kind.key, e.id);
    const cur = e.place?.trim();
    // Known from last time: fill it in. Also when the assistant wrote just the name of that same place.
    if (last && (!cur || (!looksVerified(cur) && placeName(last).toLowerCase().includes(cur.toLowerCase())))) {
      handled.add(e.id);
      actions.updateEvent(e.id, { place: last });
      setStep({ s: 'auto', place: last });
      return;
    }
    if (!cur) { setStep({ s: 'ask' }); return; }
    // "Dr. Müller" from a spoken answer: look it up so the Termin gets the real address.
    if (!looksVerified(cur)) { search(cur); return; }
    handled.add(e.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!kind || step.s === 'off') return null;

  const done = (place?: string) => {
    handled.add(e.id);
    if (place) { actions.updateEvent(e.id, { place }); haptics.commit(); setStep({ s: 'saved', place }); }
    else setStep({ s: 'off' });
  };
  const chip = (label: string, on: () => void, strong = false) => (
    <PressScale key={label} onPress={() => { haptics.select(); on(); }} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: strong ? tokens.doneSoft : tokens.chipBg }}>
      <Txt size={13.5} weight={strong ? 600 : 400} color={strong ? tokens.done : tokens.ink}>{label}</Txt>
    </PressScale>
  );
  const wrap = (children: React.ReactNode) => <View style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>{children}</View>;

  if (step.s === 'auto' || step.s === 'saved') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>
        <LineIcon name="pin" size={16} color={tokens.done} />
        <Txt size={13.5} line={18} color={tokens.sub} style={{ flex: 1 }}>
          {step.s === 'auto' ? kind.again(placeName(step.place)) : L(`Gemerkt. Nächstes Mal trage ich ${placeName(step.place)} direkt ein.`, `Saved. Next time I'll add ${placeName(step.place)} right away.`)}
        </Txt>
        {step.s === 'auto' ? (
          <PressScale hitSlop={8} onPress={() => { actions.updateEvent(e.id, { place: undefined }); setText(''); setStep({ s: 'ask' }); }}>
            <Txt size={13.5} weight={600} color={tokens.done}>{L('Anderer', 'Other')}</Txt>
          </PressScale>
        ) : null}
      </View>
    );
  }

  if (step.s === 'ask') {
    const go = () => { const t = text.trim(); if (t) search(t); };
    return wrap(<>
      <Txt size={14} line={19} weight={600}>{kind.q}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingLeft: 12, paddingRight: 6, borderRadius: 14, backgroundColor: tokens.chipBg }}>
        <LineIcon name="pin" size={17} color={tokens.sub} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={go}
          returnKeyType="search"
          placeholder={L('Name, z. B. Dr. Müller', 'Name, e.g. Dr. Miller')}
          placeholderTextColor={tokens.mute}
          selectionColor={tokens.select} cursorColor={tokens.ink}
          style={[{ flex: 1, fontFamily: fonts[500], fontSize: 15, color: tokens.ink, paddingVertical: 9 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
        {text.trim() ? (
          <PressScale onPress={go} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.ink }}>
            <Txt size={13.5} weight={600} color={tokens.row}>{L('Suchen', 'Search')}</Txt>
          </PressScale>
        ) : null}
      </View>
      <PressScale hitSlop={8} onPress={() => done()} style={{ alignSelf: 'flex-start' }}>
        <Txt size={13} color={tokens.mute}>{L('Später', 'Later')}</Txt>
      </PressScale>
    </>);
  }

  if (step.s === 'search') {
    return wrap(<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Txt size={13.5} color={tokens.sub}>{L(`Suche ${step.what} …`, `Looking up ${step.what} …`)}</Txt>
      <Dots />
    </View>);
  }

  if (step.s === 'none') {
    return wrap(<>
      <Txt size={14} line={19} weight={600}>{L(`${step.what} habe ich auf der Karte nicht gefunden.`, `I couldn't find ${step.what} on the map.`)}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {chip(L('So eintragen', 'Use as is'), () => done(step.what), true)}
        {chip(L('Anders schreiben', 'Try again'), () => { setText(step.what); setStep({ s: 'ask' }); })}
      </View>
    </>);
  }

  const f = step.found[step.i];
  const last = step.i === step.found.length - 1;
  return wrap(<>
    <Txt size={14} line={19} weight={600}>{L(kind.key === 'hebamme' || kind.key === 'frauenarzt' || kind.key === 'physio' ? 'Ist sie das?' : 'Ist er das?', 'Is this the one?')}</Txt>
    <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: tokens.chipBg }}>
      <MiniMap lat={f.lat} lon={f.lon} />
      <PressScale scale={0.99} onPress={() => Linking.openURL(mapsLink(foundText(f))).catch(() => {})} style={{ padding: 10, gap: 2 }}>
        <Txt size={15} weight={600} numberOfLines={1}>{f.name}</Txt>
        <Txt size={13} color={tokens.sub} numberOfLines={2}>{[f.street, f.city].filter(Boolean).join(', ')}</Txt>
      </PressScale>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {chip(L('Ja, genau', 'Yes, that one'), () => done(foundText(f)), true)}
      {chip(L('Anderer', 'Other'), () => (last ? (setText(step.what), setStep({ s: 'ask' })) : setStep({ ...step, i: step.i + 1 })))}
    </View>
  </>);
}

/** A small static map from free OpenStreetMap tiles, pin in the middle. */
const Z = 16;
function MiniMap({ lat, lon, h = 120 }: { lat: number; lon: number; h?: number }) {
  const [w, setW] = useState(0);
  const { x, y } = tileXY(lat, lon, Z);
  const cx = x * 256, cy = y * 256;
  const tiles: { tx: number; ty: number }[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) tiles.push({ tx: Math.floor(x) + dx, ty: Math.floor(y) + dy });
  return (
    <View onLayout={(ev) => setW(ev.nativeEvent.layout.width)} style={{ height: h, overflow: 'hidden', backgroundColor: tokens.hair }}>
      {w ? tiles.map(({ tx, ty }) => (
        <Image
          key={`${tx}-${ty}`}
          // CARTO now wants a key (31.10. 13:46 "KEY REQUIRED" on Julian's phone). OpenStreetMap's own tiles need none,
          // only a real app name in the User-Agent. Fine for testing; before launch host tiles ourselves or pay a provider.
          source={{ uri: `https://tile.openstreetmap.org/${Z}/${tx}/${ty}.png`, headers: { 'User-Agent': 'FamCal/0.1 (famcal.app family calendar)' } }}
          style={{ position: 'absolute', width: 256, height: 256, left: tx * 256 - cx + w / 2, top: ty * 256 - cy + h / 2 }}
        />
      )) : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: w / 2 - 9, top: h / 2 - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: tokens.done, borderWidth: 3, borderColor: '#FFFFFF' }} />
      <Txt size={9} color="#5B6166" style={{ position: 'absolute', right: 6, bottom: 3 }}>© OpenStreetMap</Txt>
    </View>
  );
}

/** The small pin on the Termin row: opens the place in Google Maps. */
export function PinChip({ place }: { place: string }) {
  return (
    <PressScale hitSlop={6} accessibilityLabel={place} onPress={() => { haptics.select(); Linking.openURL(mapsLink(place)).catch(() => {}); }} style={{ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.chipBg }}>
      <LineIcon name="pin" size={16} color={tokens.ink} />
    </PressScale>
  );
}
