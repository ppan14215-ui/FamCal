import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { tokens } from '../../src/theme';
import { endPreview } from '../../src/lib/vorschau';

export default function OnboardingLayout() {
  // Leaving the onboarding any way (back button too) ends a preview, so nothing stays muted.
  useEffect(() => () => endPreview(), []);
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg } }} />;
}
