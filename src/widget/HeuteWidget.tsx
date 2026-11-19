/**
 * Homescreen widget "FamCal Heute" (Julian 30.10.): today and tomorrow at a
 * glance, without opening the app. Drawn by react-native-android-widget from
 * a small snapshot the app writes (see snapshot.ts); a tap opens the app on
 * the calendar, the plus opens a new entry.
 */
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Snapshot } from './snapshot';

const C = { bg: '#F5F5F4', row: '#FFFFFF', ink: '#16232A', sub: '#5B666B', mute: '#8A9397', done: '#075056', hair: '#E7E7E4' } as const;

function Line({ time, title, dot }: { time: string; title: string; dot: `#${string}` }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', paddingVertical: 4 }}>
      <FlexWidget style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginRight: 8 }} />
      <TextWidget text={time} style={{ fontSize: 13, color: C.sub, width: 46 }} />
      <TextWidget text={title} maxLines={1} truncate="END" style={{ fontSize: 14, color: C.ink, fontWeight: '600' }} />
    </FlexWidget>
  );
}

export function HeuteWidget({ snap }: { snap: Snapshot | null }) {
  const days = snap?.days ?? [];
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'famcal://kalender' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.row, borderRadius: 24, padding: 14, flexDirection: 'column' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginBottom: 6 }}>
        <TextWidget text={snap?.head ?? 'FamCal'} style={{ fontSize: 17, color: C.ink, fontWeight: '700' }} />
        <TextWidget text="." style={{ fontSize: 17, color: C.done, fontWeight: '700' }} />
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'famcal://neu' }}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <TextWidget text="+" style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '700' }} />
        </FlexWidget>
      </FlexWidget>
      {days.length ? days.map((d) => (
        <FlexWidget key={d.label} style={{ flexDirection: 'column', width: 'match_parent', marginTop: 4 }}>
          <TextWidget text={d.label.toUpperCase()} style={{ fontSize: 11, color: C.mute, fontWeight: '600', letterSpacing: 0.06 }} />
          {d.items.length ? d.items.map((it, i) => <Line key={i} time={it.time} title={it.title} dot={(it.color as `#${string}`) || C.done} />) : (
            <TextWidget text={d.free} style={{ fontSize: 13, color: C.sub, paddingVertical: 4 }} />
          )}
          {d.more ? <TextWidget text={d.more} style={{ fontSize: 12, color: C.mute }} /> : null}
        </FlexWidget>
      )) : (
        <TextWidget text={snap?.empty ?? 'Öffne FamCal einmal, dann erscheinen hier eure Termine.'} style={{ fontSize: 13, color: C.sub }} />
      )}
    </FlexWidget>
  );
}
