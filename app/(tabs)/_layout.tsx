import React from 'react';
import { Tabs } from 'expo-router';
import NavBar from '../../src/components/NavBar';
import { tokens } from '../../src/theme';

/** Heute, Kalender, Listen, Eingang. Heute has no tabs; Listen has clay tabs. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg }, animation: 'none' }}
    >
      <Tabs.Screen name="heute" />
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="listen" />
      <Tabs.Screen name="eingang" />
    </Tabs>
  );
}
