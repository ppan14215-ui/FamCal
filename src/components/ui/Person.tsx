/** Owner initials in the person colour, and the J/T pair from the headers. */
import React from 'react';
import { View } from 'react-native';
import Txt from './Txt';
import { persons, PersonId, tokens } from '../../theme';

export function Avatar({ p, size = 28, ring }: { p: PersonId; size?: number; ring?: string }) {
  const c = persons[p];
  return (
    <View
      style={{
        width: size, height: size, borderRadius: 999, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center',
        borderWidth: ring ? 2 : 0, borderColor: ring,
      }}
    >
      <Txt size={Math.round(size * 0.42)} line={Math.round(size * 0.5)} weight={600} color={c.ink}>{p}</Txt>
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
