/** Clay icons and their tinted tile (the only coloured surface in a row). */
import React from 'react';
import { Image, View, ViewStyle, StyleProp } from 'react-native';
import { clayIcons, ClayName } from '../../lib/clayIcons';
import { tint } from '../../theme';

export function ClayIcon({ name, size = 40, style }: { name: ClayName; size?: number; style?: StyleProp<any> }) {
  return <Image source={clayIcons[name]} style={[{ width: size, height: size }, style]} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

export function Tile({ name, size = 52, radius, ratio = 0.78, bg, style }: { name: ClayName; size?: number; radius?: number; ratio?: number; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius ?? Math.round(size * 0.31), backgroundColor: bg ?? tint(name), alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <ClayIcon name={name} size={Math.round(size * ratio)} />
    </View>
  );
}
