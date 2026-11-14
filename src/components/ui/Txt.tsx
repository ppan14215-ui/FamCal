/**
 * The app's only text primitive. Custom fonts on native ignore `fontWeight`,
 * so the weight picks the Geist file instead.
 */
import React from 'react';
import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import { fonts, tokens, Weight } from '../../theme';

type Props = TextProps & {
  size?: number;
  line?: number;
  weight?: Weight;
  color?: string;
  tracking?: number;
  center?: boolean;
  strike?: boolean;
  style?: StyleProp<TextStyle>;
};

export default function Txt({ size = 16, line, weight = 400, color = tokens.ink, tracking, center, strike, style, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        {
          fontFamily: fonts[weight],
          fontSize: size,
          lineHeight: line ?? Math.round(size * 1.38),
          color,
          letterSpacing: tracking,
          textAlign: center ? 'center' : undefined,
          textDecorationLine: strike ? 'line-through' : undefined,
        },
        style,
      ]}
    />
  );
}

/** Headline period / question mark in teal, as on every canvas board. */
export function Dot({ char = '.', color = tokens.done }: { char?: string; color?: string }) {
  return <Text style={{ color }}>{char}</Text>;
}
