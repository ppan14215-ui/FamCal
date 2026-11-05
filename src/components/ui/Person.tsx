/** Owner initials in the person colour, and the J/T pair from the headers. */
import React, { createContext, useContext } from 'react';
import { View } from 'react-native';
import Txt from './Txt';
import { persons, PersonId, tokens, personPalette, allColors, shade } from '../../theme';
import { useStore } from '../../state/store';

export type Persons = typeof persons;
/**
 * Who J and T are (name, tint, ink). The real app mounts no provider, so this is the global
 * `persons` (kept in step by applyNames and setColor). The onboarding showcase provides its
 * demo parents here, so the real names and colours are never touched.
 */
export const PersonsContext = createContext<Persons>(persons);
export const usePersons = () => useContext(PersonsContext);

export function Avatar({ p, size = 28, ring, letter }: { p: PersonId; size?: number; ring?: string; letter?: string }) {
  const c = usePersons()[p];
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
export function PersonDot({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  const c = shade(allColors.find((x) => x.name === color) ?? personPalette[2]);
  return (
    <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={Math.round(size * 0.42)} line={Math.round(size * 0.5)} weight={600} color={c.fg}>{name.trim()[0]?.toUpperCase() ?? '?'}</Txt>
    </View>
  );
}

/**
 * The whole family on top of every tab (Julian 05.11.): the parents and every child or
 * grandparent, each in exactly the colour their Termine have in the calendar.
 * Overlapping; from five people on the rest shows as +N.
 */
export function Family({ size = 28, ring = tokens.bg, max = 4 }: { size?: number; ring?: string; max?: number }) {
  const stored = useStore((s) => s.people);
  // In the onboarding showcase the parents are demo people; the real children stay out of it.
  const people = usePersons() === persons ? stored : [];
  const all: React.ReactNode[] = [
    <Avatar key="J" p="J" size={size} />,
    <Avatar key="T" p="T" size={size} />,
    ...people.map((p) => <PersonDot key={p.id} name={p.name} color={p.color} size={size} />),
  ];
  const shown = all.length > max ? all.slice(0, max - 1) : all;
  const rest = all.length - shown.length;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <View key={i} style={i ? { marginLeft: -8, marginVertical: -2, borderRadius: 999, borderWidth: 2, borderColor: ring } : undefined}>{n}</View>
      ))}
      {rest > 0 ? (
        <View style={{ marginLeft: -8, marginVertical: -2, borderRadius: 999, borderWidth: 2, borderColor: ring }}>
          <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: tokens.row, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={Math.round(size * 0.38)} line={Math.round(size * 0.5)} weight={600} color={tokens.sub}>+{rest}</Txt>
          </View>
        </View>
      ) : null}
    </View>
  );
}
