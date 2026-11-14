/** Owner initials in the person colour, and the J/T pair from the headers. */
import React, { createContext, useContext } from 'react';
import { View, Image } from 'react-native';
import Txt from './Txt';
import { persons, PersonId, tokens, personPalette, allColors, shade, shadows, vivid } from '../../theme';
import { useStore } from '../../state/store';
import { usePhoto, usePhotos } from '../../lib/photos';

export type Persons = typeof persons;
/**
 * Who J and T are (name, tint, ink). The real app mounts no provider, so this is the global
 * `persons` (kept in step by applyNames and setColor). The onboarding showcase provides its
 * demo parents here, so the real names and colours are never touched.
 */
export const PersonsContext = createContext<Persons>(persons);
export const usePersons = () => useContext(PersonsContext);

/**
 * A person's photo in the circle (Julian 14.11.: "people bubbles like this but with outline of user profile"): the
 * ring in the person's own colour, a thin gap in the colour of the ground, then the picture. The colour stays the
 * person's sign everywhere, the photo only fills the circle.
 */
function Photo({ uri, size, ring, cut }: { uri: string; size: number; ring: string; /** Stack of faces: cuts the circle out of the one beneath. */ cut?: string }) {
  const w = size >= 28 ? 2 : 1.5;
  const inner = size - 2 * (w + (size >= 28 ? 1.5 : 1));
  return (
    <View style={{ width: size, height: size, borderRadius: 999, borderWidth: w, borderColor: ring, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', boxShadow: cut ? `0 0 0 2px ${cut}` : undefined } as any}>
      <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: inner, height: inner, borderRadius: 999 }} />
    </View>
  );
}

export function Avatar({ p, size = 28, ring, letter }: { p: PersonId; size?: number; ring?: string; letter?: string }) {
  const pp = usePersons();
  const c = pp[p];
  // The showcase's demo parents never wear the real family's photos.
  const photo = usePhoto(pp === persons ? p : undefined);
  if (photo) return <Photo uri={photo} size={size} ring={vivid(c.ink)} />;
  // The initial follows the name the family typed in, J/T only as a fallback.
  const l = letter ?? (c.name.trim()[0]?.toUpperCase() || p);
  return (
    <View
      style={{
        width: size, height: size, borderRadius: 999, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center',
        borderWidth: ring ? 2 : 0, borderColor: ring,
      }}
    >
      <Txt size={Math.round(size * 0.42)} line={Math.round(size * 0.5)} weight={600} color={c.ink}>{l}</Txt>
    </View>
  );
}

export function Pair({ size = 28, ring = tokens.bg }: { size?: number; ring?: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <Avatar p="J" size={size} />
      <View style={{ marginLeft: -8, marginVertical: -2, borderRadius: 999, borderWidth: 2, borderColor: ring }}>
        <Avatar p="T" size={size} />
      </View>
    </View>
  );
}

/** Owner slot: a person, both, or an empty dashed circle ("niemand"). */
export function Owner({ who, size = 24 }: { who: PersonId | 'both' | null; size?: number }) {
  if (who === 'both') return <Pair size={size - 2} ring={tokens.row} />;
  if (who) return <Avatar p={who} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: tokens.circleLine }} />;
}

/** A family member besides the parents: initial in their palette colour (Kinder, Großeltern). */
export function PersonDot({ name, color, size = 24, id }: { name: string; color: string; size?: number; /** The person, to show their photo. */ id?: string }) {
  const c = shade(allColors.find((x) => x.name === color) ?? personPalette[2]);
  const photo = usePhoto(id);
  if (photo) return <Photo uri={photo} size={size} ring={vivid(c.fg)} />;
  return (
    <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={Math.round(size * 0.42)} line={Math.round(size * 0.5)} weight={600} color={c.fg}>{name.trim()[0]?.toUpperCase() ?? '?'}</Txt>
    </View>
  );
}

/**
 * One face of the stack, as in Wabi's facepile (Julian 14.11.: "people bubbles like this but with outline of user
 * profile"): the initial on the person's light tone, a ring in the person's own colour around it, and a second ring
 * in the colour of the ground that cuts it out of the face beneath.
 */
function Face({ size, bg, ink, letter, cut, photo }: { size: number; bg: string; ink: string; letter: string; cut: string; photo?: string }) {
  if (photo) return <Photo uri={photo} size={size} ring={vivid(ink)} cut={cut} />;
  return (
    <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: bg, borderWidth: 2, borderColor: vivid(ink), alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px ${cut}` } as any}>
      <Txt size={Math.round(size * 0.4)} line={Math.round(size * 0.5)} weight={600} color={ink}>{letter}</Txt>
    </View>
  );
}

/**
 * The whole family on top of every tab (Julian 05.11.): the parents and every child or
 * grandparent, each in exactly the colour their Termine have in the calendar.
 * Overlapping like Wabi's stack of faces; from five people on the rest shows as +N.
 */
export function Family({ size = 28, ring = tokens.bg, max = 4 }: { size?: number; ring?: string; max?: number }) {
  const stored = useStore((s) => s.people);
  const pp = usePersons();
  // In the onboarding showcase the parents are demo people; the real children stay out of it.
  const people = pp === persons ? stored : [];
  const photos = usePhotos();
  const all: { key: string; bg: string; ink: string; letter: string }[] = [
    ...(['J', 'T'] as const).map((p) => ({ key: p, bg: pp[p].tint, ink: pp[p].ink, letter: pp[p].name.trim()[0]?.toUpperCase() || p })),
    ...people.map((p) => { const c = shade(allColors.find((x) => x.name === p.color) ?? personPalette[2]); return { key: p.id, bg: c.bg, ink: c.fg, letter: p.name.trim()[0]?.toUpperCase() ?? '?' }; }),
  ];
  const shown = all.length > max ? all.slice(0, max - 1) : all;
  const rest = all.length - shown.length;
  const lap = -Math.round(size * 0.26);
  return (
    <View style={{ flexDirection: 'row', borderRadius: 999, boxShadow: shadows.face } as any}>
      {shown.map((f, i) => (
        <View key={f.key} style={i ? { marginLeft: lap } : undefined}><Face size={size} bg={f.bg} ink={f.ink} letter={f.letter} cut={ring} photo={pp === persons ? photos[f.key] : undefined} /></View>
      ))}
      {rest > 0 ? (
        <View style={{ marginLeft: lap, width: size, height: size, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px ${ring}` } as any}>
          <Txt size={Math.round(size * 0.38)} line={Math.round(size * 0.5)} weight={600} color={tokens.sub}>+{rest}</Txt>
        </View>
      ) : null}
    </View>
  );
}
