/**
 * "Neu und offen", exactly as in the klar draft Julian approved ("Start"): one quiet line per thing with its clay
 * icon, the name, one grey line of what happened, and on the right how long ago. What I have not seen yet carries a
 * dot and a stronger name. A tap opens the thing itself. It stands on top of Kalender · Heute (Briefing.tsx).
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Txt from './ui/Txt';
import PressScale from './ui/PressScale';
import { ClayIcon } from './ui/Clay';
import { H2 } from './ui/kit';
import { tokens } from '../theme';
import { actions } from '../state/store';
import { haptics } from '../lib/haptics';
import { ago, type StartRow } from '../lib/start';
import { tx } from '../i18n/lang';

/** One line of the list (44 of 284 in the draft). */
const ROW = 60;

export default function Start({ rows, onEntry }: { rows: StartRow[]; /** A question from the other one: it is answered in the chat. */ onEntry: (id: string) => void }) {
  const fresh = rows.filter((r) => r.fresh).length;
  const open = (r: StartRow) => {
    haptics.select();
    if ('event' in r.to) router.push(`/termin/${r.to.event}`);
    else if ('list' in r.to) { actions.setActiveList(r.to.list); router.navigate('/listen'); }
    else if ('tasks' in r.to) { actions.setActiveList('aufgaben'); router.navigate('/listen'); }
    else onEntry(r.to.entry);
  };
  return (
    <View>
      <H2 right={fresh ? tx(`${fresh} neu`, `${fresh} new`) : undefined}>{tx('Neu und offen', 'New and open')}</H2>
      <View style={{ paddingTop: 4 }}>
        {rows.map((r, i) => (
          <PressScale key={r.key} scale={0.985} onPress={() => open(r)} accessibilityRole="button" accessibilityLabel={`${r.title}, ${r.sub}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 13, height: ROW, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: tokens.hair }}>
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}><ClayIcon name={r.icon} size={32} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={17} line={22} weight={r.fresh ? 600 : 500} numberOfLines={1}>{r.title}</Txt>
              <Txt size={15} line={20} color={tokens.sub} numberOfLines={1}>{r.sub}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {r.fresh ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.accent }} /> : null}
              <Txt size={14.5} line={19} color={tokens.sub} numberOfLines={1}>{ago(r.at)}</Txt>
            </View>
          </PressScale>
        ))}
      </View>
    </View>
  );
}
