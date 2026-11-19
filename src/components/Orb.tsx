/**
 * Die Kugel (Julian 26.10., "Glaskugel wie bei Wabi"): a glass sphere with
 * the two parents' colours flowing inside. Soft radial gradients only, so it
 * looks the same on web and native; real refraction comes later with Skia.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { persons } from '../theme';

type Blob = { color: string; r: number; dist: number; ms: number; phase: number };

/** One soft colour cloud circling the centre. */
function Cloud({ size, b, id, speed = 1 }: { size: number; b: Blob; id: string; speed?: number }) {
  const rot = useSharedValue(b.phase);
  useEffect(() => {
    rot.value = withRepeat(withTiming(b.phase + 360, { duration: b.ms / speed, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [speed]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const d = size * b.r * 2;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, st]}>
      <View style={{ position: 'absolute', left: size / 2 - d / 2 + size * b.dist, top: size / 2 - d / 2, width: d, height: d }}>
        <Svg width={d} height={d}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.color} stopOpacity={0.95} />
              <Stop offset="0.55" stopColor={b.color} stopOpacity={0.45} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#${id})`} />
        </Svg>
      </View>
    </Animated.View>
  );
}

export const orbColors = () => [persons.J.ink, persons.T.ink, '#2FA58F', '#E7A93B'];

/** The clouds alone, for the full-screen wash behind the thinking steps. */
export function Clouds({ size, speed = 1, soft = false, tag }: { size: number; speed?: number; soft?: boolean; tag: string }) {
  const [a, b, c, d] = orbColors();
  const blobs: Blob[] = [
    { color: a, r: soft ? 0.5 : 0.42, dist: 0.2, ms: 5200, phase: 0 },
    { color: b, r: soft ? 0.52 : 0.44, dist: 0.22, ms: 6400, phase: 150 },
    { color: c, r: soft ? 0.34 : 0.3, dist: 0.26, ms: 4300, phase: 260 },
    { color: d, r: soft ? 0.26 : 0.22, dist: 0.18, ms: 7600, phase: 60 },
  ];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: soft ? 0.5 : 1 }}>
      {blobs.map((bl, i) => <Cloud key={i} size={size} b={bl} id={`${tag}${i}`} speed={speed} />)}
    </View>
  );
}

let seq = 0;
export default function Orb({ size = 48, speed = 1 }: { size?: number; speed?: number }) {
  const tag = React.useMemo(() => `orb${++seq}_`, []);
  return (
    <View pointerEvents="none" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#F7F4EE' }}>
      <Clouds size={size} speed={speed} tag={tag} />
      {/* Glass: a bright rim, a shadow on the lower edge and a highlight top left. */}
      <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <RadialGradient id={`${tag}rim`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.94" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.8} />
          </RadialGradient>
          <RadialGradient id={`${tag}shade`} cx="50%" cy="85%" r="60%">
            <Stop offset="0" stopColor="#16232A" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#16232A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${tag}hi`} cx="34%" cy="26%" r="30%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${tag}shade)`} />
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${tag}rim)`} />
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${tag}hi)`} />
      </Svg>
    </View>
  );
}
