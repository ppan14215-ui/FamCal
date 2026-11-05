/**
 * Pressable with UI-thread scale feedback (taken from Namore). The app's one
 * press idiom. `style` lands on the Pressable itself.
 */
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  children?: React.ReactNode;
};

export default function PressScale({ style, scale = 0.97, onPressIn, onPressOut, children, ...rest }: Props) {
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={(e) => { s.value = withSpring(scale, springs.snappy); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, springs.snappy); onPressOut?.(e); }}
    >
      {children}
    </AnimatedPressable>
  );
}
