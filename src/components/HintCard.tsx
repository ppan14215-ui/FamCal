/**
 * The assistant noticing something ("Aufgefallen", "Neu im Kalender"). It only
 * asks; the parents confirm (HANDOFF: der Assistent handelt nie ungefragt).
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import Txt from './ui/Txt';
import LineIcon from './ui/LineIcon';
import { Btn } from './ui/kit';
import PressScale from './ui/PressScale';
import { tx } from '../i18n/lang';
import { ClayIcon, Tile } from './ui/Clay';
import { tokens } from '../theme';
import type { ClayName } from '../lib/clayIcons';

type Props = { icon: ClayName; tile?: boolean; kicker: string; title: string; body: string; yes: string; no: string; onYes: () => void; onNo: () => void };

export default function HintCard({ icon, tile, kicker, title, body, yes, no, onYes, onNo }: Props) {
  return (
    <Animated.View exiting={FadeOut.duration(180)} style={{ gap: 12, padding: 16, borderRadius: 22, backgroundColor: tokens.row }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {tile ? <Tile bg="transparent" name={icon} size={44} radius={13} /> : <ClayIcon name={icon} size={44} />}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <LineIcon name="sparkle" size={13} color={tokens.sub} />
            <Txt size={13} color={tokens.sub}>{kicker}</Txt>
          </View>
          <Txt size={16.5} line={22} weight={600}>{title}</Txt>
          <Txt size={14} line={20} color={tokens.sub}>{body}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 56 }}>
        <Btn label={yes} height={40} onPress={onYes} style={{ flex: 1, paddingHorizontal: 8 }} />
        <Btn label={no} height={40} primary={false} onPress={onNo} style={{ flex: 1, paddingHorizontal: 8 }} />
      </View>
    </Animated.View>
  );
}

/**
 * The same thing in one line, as in the klar draft Julian approved (14.11.): a quiet grey strip with the icon, one
 * sentence whose first word is bold, and the way on. The small x puts it away.
 */
export function HintLine({ icon, bold, text, go, onGo, onNo }: { icon: ClayName; bold: string; text: string; go: string; onGo: () => void; onNo?: () => void }) {
  return (
    <Animated.View exiting={FadeOut.duration(180)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 6, borderRadius: 14, backgroundColor: tokens.chipBg }}>
      <ClayIcon name={icon} size={28} />
      <Txt size={15.5} line={21} style={{ flex: 1 }}><Txt size={15.5} line={21} weight={600}>{bold}</Txt>{text}</Txt>
      <PressScale scale={0.95} hitSlop={8} accessibilityRole="button" accessibilityLabel={go} onPress={onGo} style={{ paddingVertical: 6, paddingHorizontal: 6 }}>
        <Txt size={15.5} weight={600}>{go}</Txt>
      </PressScale>
      {onNo ? (
        <PressScale scale={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={tx('Ausblenden', 'Hide')} onPress={onNo} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <LineIcon name="x" size={14} color={tokens.mute} />
        </PressScale>
      ) : null}
    </Animated.View>
  );
}
