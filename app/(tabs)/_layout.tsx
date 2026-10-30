import React from 'react';
import { Tabs } from 'expo-router';
import NavBar from '../../src/components/NavBar';
import { tokens } from '../../src/theme';
import { Keyed, usePaletteGen } from '../../src/theme/mode';

/** Chat, Kalender, Listen (Julian 29.10.: the family chat is the start; Eingang lives in the chat now). */
export default function TabsLayout() {
  usePaletteGen();
  return (
    <Tabs
      tabBar={(props) => <Keyed><NavBar {...props} /></Keyed>}
      screenLayout={({ children }) => <Keyed>{children}</Keyed>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg }, animation: 'none', freezeOnBlur: true }}
    >
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="listen" />
      <Tabs.Screen name="eingang" options={{ href: null }} />
    </Tabs>
  );
}
