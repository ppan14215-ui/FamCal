/**
 * The briefing on top of Kalender · Heute (Julian 14.11.: "Das Briefing kann die today Seite im calender werden"):
 * what is new and still open stands above the days, in the lines of the klar draft's "Start". It is part of the
 * list and scrolls away with it. What I have seen loses its dot when I leave the tab, not while I am looking.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Start from '../../components/Start';
import { useStore } from '../../state/store';
import { useFeed } from '../../lib/feed';
import { getFamily, myRole } from '../../lib/sync';
import { startRows, startSeen, markStartSeen } from '../../lib/start';

export default function Briefing() {
  const feed = useFeed();
  const events = useStore((s) => s.events);
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const me = getFamily() ? myRole() : 'J';
  const [seen, setSeen] = useState(startSeen);
  useFocusEffect(useCallback(() => () => { markStartSeen(); setSeen(startSeen()); }, []));
  const rows = useMemo(() => startRows(feed, { events, lists, tasks }, me, seen), [feed, events, lists, tasks, me, seen]);
  if (!rows.length) return null;
  return (
    <View style={{ paddingTop: 8, paddingBottom: 18 }}>
      {/* A question lives in the chat: the tap leads there. */}
      <Start rows={rows} onEntry={() => router.navigate('/chat')} />
    </View>
  );
}
