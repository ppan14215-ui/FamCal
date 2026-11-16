import React, { useState } from 'react';
import { Tabs, useIsFocused } from 'expo-router';
import NavBar from '../../src/components/NavBar';
import { tokens } from '../../src/theme';
import { Keyed, usePaletteGen } from '../../src/theme/mode';

/**
 * What a tab shows is drawn again with a new look, but only once the tab is looked at: drawn while hidden, a page
 * has no size yet and its build-up never runs. The tabs themselves stay, so nobody lands on another tab after
 * choosing a theme in the settings.
 */
function Fresh({ children }: { children: React.ReactNode }) {
  const want = usePaletteGen();
  const front = useIsFocused();
  const [shown, setShown] = useState(want);
  if (front && shown !== want) setShown(want);
  return <React.Fragment key={shown}>{children}</React.Fragment>;
}

/** Kalender, Listen, Chat, Einstellungen (Julian 16.11.: the calendar is the heart and the start, the chat is the log, the settings get a tab of their own; Eingang lives in the chat). The first tab is also where Android's back leads. */
export default function TabsLayout() {
  usePaletteGen();
  return (
    <Tabs
      tabBar={(props) => <Keyed><NavBar {...props} /></Keyed>}
      screenLayout={({ children }) => <Fresh>{children}</Fresh>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg }, freezeOnBlur: true,
        // Each tab builds up quickly instead of just appearing (Julian 31.10.). A short fade, no slide: tabs are peers,
        // sliding claims a depth that isn't there and is felt dozens of times a day (Emil Kowalski, animate-expo, 08.11.).
        animation: 'fade', transitionSpec: { animation: 'timing', config: { duration: 150 } } }}
    >
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="listen" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="einstellungen" />
      <Tabs.Screen name="eingang" options={{ href: null }} />
    </Tabs>
  );
}
