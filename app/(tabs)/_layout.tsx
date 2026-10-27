import React from 'react';
import { Tabs } from 'expo-router';
import NavBar from '../../src/components/NavBar';
import { tokens } from '../../src/theme';

/** Kalender, Listen, Eingang (Julian 27.10.: the calendar is the key view, Heute lives in it). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tokens.bg }, animation: 'none' }}
    >
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="listen" />
      <Tabs.Screen name="eingang" />
    </Tabs>
  );
}
