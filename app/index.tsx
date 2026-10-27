import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { LIVE } from '../src/lib/live';
import { useAuth } from '../src/lib/auth';
import { afterSignIn } from './anmelden';
import { tokens } from '../src/theme';

/**
 * The test link begins with onboarding ("Ich wurde eingeladen" skips to the
 * calendar). The real app asks for sign-in first, then loads the family.
 */
export default function Index() {
  const { ready, session } = useAuth();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (LIVE && ready && session && !loading) { setLoading(true); afterSignIn(); }
  }, [ready, session]);
  if (!LIVE) return <Redirect href="/onboarding" />;
  if (ready && !session) return <Redirect href="/anmelden" />;
  return <View style={{ flex: 1, backgroundColor: tokens.bg }} />;
}
