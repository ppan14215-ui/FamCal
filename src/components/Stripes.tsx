/** Diagonal stripes for synced work blocks ("nur als gestreifter Block Arbeit"). */
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { persons, PersonId } from '../theme';

let seq = 0;

export default function Stripes({ p, style, children, radius = 14 }: { p: PersonId; style?: StyleProp<ViewStyle>; children?: React.ReactNode; radius?: number }) {
  const id = React.useMemo(() => `st${++seq}`, []);
  const c = persons[p];
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: c.tint }, style]}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={9} height={9} patternTransform="rotate(45)">
            <Rect x={0} y={0} width={9} height={9} fill={c.tint} />
            <Line x1={0} y1={0} x2={0} y2={9} stroke={c.stripe} strokeWidth={4} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
