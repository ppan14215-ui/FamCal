/** Diagonal stripes for synced work blocks ("nur als gestreifter Block Arbeit"). */
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { persons, PersonId } from '../theme';

/** Distance between stripes along a row: 9 px apart across the stripe, at 45 degrees. */
const STEP = 9 * Math.SQRT2;

/**
 * The stripes are drawn as plain lines at the measured size. A rotated SVG
 * pattern stopped part way down tall blocks on Android (Julian 28.10.).
 */
export default function Stripes({ p, style, children, radius = 14 }: { p: PersonId; style?: StyleProp<ViewStyle>; children?: React.ReactNode; radius?: number }) {
  const c = persons[p];
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  let d = '';
  for (let x = 0; x < size.w + size.h; x += STEP) d += `M${x.toFixed(1)} 0L${(x - size.h).toFixed(1)} ${size.h}`;
  return (
    <View
      onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; if (w !== size.w || h !== size.h) setSize({ w, h }); }}
      style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: c.tint }, style]}
    >
      {size.w > 0 && (
        <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={size.w} height={size.h}>
          <Path d={d} stroke={c.stripe} strokeWidth={4} />
        </Svg>
      )}
      {children}
    </View>
  );
}
