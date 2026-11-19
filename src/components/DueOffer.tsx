/** One "Mitdenken nach Alter" offer (Julian 31.10.): what is due for a child, put it on the list or say it is done. */
import React from 'react';
import { View } from 'react-native';
import Txt from './ui/Txt';
import { Tile } from './ui/Clay';
import { Meta } from './ui/kit';
import PressScale from './ui/PressScale';
import { tokens } from '../theme';
import { toast } from '../state/store';
import { haptics } from '../lib/haptics';
import { toTodo, markHandled, Due } from '../lib/mitdenken';
import { TODAY, short } from '../lib/dates';
import { tx } from '../i18n/lang';

export default function DueOffer({ d }: { d: Due }) {
  const now = d.from <= TODAY;
  const list = () => { haptics.commit(); const undo = toTodo(d); toast(tx('Steht auf Zu erledigen', 'On your to-do list'), undo); };
  const done = () => { haptics.select(); markHandled(d.key); toast(tx('Gut, abgehakt', 'Good, ticked off'), () => markHandled(d.key, false)); };
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
      <Tile name={d.icon} bg="transparent" size={40} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ gap: 2 }}>
          <Txt size={16} line={21} weight={600}>{d.title.startsWith(d.kidName) || d.title.includes(d.kidName) ? d.title : `${d.title} · ${d.kidName}`}</Txt>
          <Meta>{now ? tx(`Jetzt fällig, ${d.window}, bis ${short(d.to)}`, `Due now, ${d.window}, until ${short(d.to)}`) : tx(`Ab ${short(d.from)}, ${d.window}`, `From ${short(d.from)}, ${d.window}`)}</Meta>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PressScale onPress={list} scale={0.95} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: tokens.ink }}>
            <Txt size={13.5} weight={600} color={tokens.bg}>{tx('Auf die Liste', 'Add to list')}</Txt>
          </PressScale>
          <PressScale onPress={done} scale={0.95} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: tokens.chipBg }}>
            <Txt size={13.5} weight={600}>{tx('Schon erledigt', 'Already done')}</Txt>
          </PressScale>
        </View>
      </View>
    </View>
  );
}
