import React, { useState } from 'react';
import { Tabs, useIsFocused } from 'expo-router';
import NavBar from '../../src/components/NavBar';
import { tokens } from '../../src/theme';
import { Keyed, useColorGen, usePaletteGen } from '../../src/theme/mode';

/**
 * What a tab shows is drawn again with a new look, and (colours) after a person's colour changed (Julian 16.11.: one
 * colour per person, the same everywhere). Only once the tab is looked at: drawn while hidden, a page has no size yet
 * and its build-up never runs. The tabs themselves stay, so nobody lands on another tab after choosing a theme.
 */
function Fresh({ children, colours }: { children: React.ReactNode; colours: boolean }) {
  const g = usePaletteGen();
  const c = useColorGen();
  const want = colours ? `${g}.${c}` : `${g}`;
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
      // The settings keep their place when a colour was chosen there; the other tabs draw again with the new colour.
      screenLayout={({ children, route }) => <Fresh colours={route.name !== 'einstellungen'}>{children}</Fresh>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg }, freezeOnBlur: true,
        // Each tab builds up quickly instead of just appearing (Julian 31.10.). A short fade, no slide: tabs are peers,
        // sliding claims a depth that isn't there and is felt dozens of times a day (Emil Kowalski, animate-expo, 08.11.).
        animation: 'fade', transitionSpec: { animation: 'timing', config: { duration: 150 } } }}
    >
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="listen" />
      {/* Built at the start, so a tap on Memo lands in a chat that is already there instead of one that first has to
          draw while the Sprechkarte grows (Julian 17.11.: "anytime I open memo the input also jumps"). */}
      <Tabs.Screen name="chat" options={{ lazy: false }} />
      <Tabs.Screen name="einstellungen" />
      <Tabs.Screen name="eingang" options={{ href: null }} />
    </Tabs>
  );
}
