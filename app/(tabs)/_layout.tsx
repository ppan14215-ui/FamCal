import React from 'react';
import { Tabs } from 'expo-router';
import NavBar from '../../src/components/NavBar';
import { tokens } from '../../src/theme';
import { Keyed, usePaletteGen } from '../../src/theme/mode';

/** Kalender, Listen, Chat (Julian 16.11.: the calendar is the heart and the start, the chat is the log; Eingang lives in the chat). The first tab is also where Android's back leads. */
export default function TabsLayout() {
  usePaletteGen();
  return (
    <Tabs
      tabBar={(props) => <Keyed><NavBar {...props} /></Keyed>}
      screenLayout={({ children }) => <Keyed>{children}</Keyed>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg }, freezeOnBlur: true,
        // Each tab builds up quickly instead of just appearing (Julian 31.10.). A short fade, no slide: tabs are peers,
        // sliding claims a depth that isn't there and is felt dozens of times a day (Emil Kowalski, animate-expo, 08.11.).
        animation: 'fade', transitionSpec: { animation: 'timing', config: { duration: 150 } } }}
    >
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="listen" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="eingang" options={{ href: null }} />
    </Tabs>
  );
}
