import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { LIVE } from '../src/lib/live';
import { useAuth } from '../src/lib/auth';
import { afterSignIn } from './anmelden';
import { tokens } from '../src/theme';
import { Btn, Meta } from '../src/components/ui/kit';
import { tx } from '../src/i18n/lang';

/**
 * The test link begins with onboarding ("Ich wurde eingeladen" skips to the
 * calendar). The real app asks for sign-in first, then loads the family.
 * Audit 09.11.: when the first load failed (no network, timeout) this screen
 * stayed blank forever. Now it says so and offers to try again.
 */
export default function Index() {
  const { ready, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); setLoading(true); void afterSignIn().then((e) => { if (e) { setError(e); setLoading(false); } }); };
  useEffect(() => {
    if (LIVE && ready && session && !loading && !error) load();
  }, [ready, session]);
  if (!LIVE) return <Redirect href="/onboarding" />;
  if (ready && !session) return <Redirect href="/onboarding" />;
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, justifyContent: 'center', padding: 24, gap: 14 }}>
      {error ? <>
        <Meta>{error}</Meta>
        <Btn label={tx('Nochmal versuchen', 'Try again')} primary onPress={load} />
      </> : null}
    </View>
  );
}
