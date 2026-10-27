/**
 * Anmelden (Julian 27.10.): the real app starts here. Apple or Google, no
 * password. Apple only where it exists (iPhone, web); Google everywhere.
 * After sign-in the family loads, new families go through onboarding.
 */
import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, Btn, Hint, Meta } from '../src/components/ui/kit';
import Intro from '../src/components/Intro';
import { signInWithApple, signInWithGoogle, SignIn } from '../src/lib/auth';
import { startSync } from '../src/lib/sync';
import { get } from '../src/state/store';
import { tokens } from '../src/theme';
import { haptics } from '../src/lib/haptics';

/** After any sign-in: load the family, then the calendar or, for a new family, onboarding. */
export async function afterSignIn(name?: string): Promise<string | null> {
  const res = await startSync(name);
  if (res.error) return 'Die Verbindung hat nicht geklappt. Bitte noch einmal versuchen.';
  const s = get();
  router.replace(s.events.length || s.names.T ? '/kalender' : '/familie');
  return null;
}

export default function Anmelden() {
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (which: 'apple' | 'google', fn: () => Promise<SignIn>) => {
    if (busy) return;
    haptics.tap();
    setBusy(which);
    setError(null);
    const r = await fn();
    // Web leaves the page for the provider; the app comes back signed in (see index).
    if (Platform.OS === 'web' && !r.error) return;
    if (r.error) { setBusy(null); return setError('Anmelden hat nicht geklappt. Bitte noch einmal.'); }
    const failed = await afterSignIn(r.name);
    setBusy(null);
    if (failed) setError(failed);
  };

  const apple = Platform.OS === 'ios' || Platform.OS === 'web';
  return (
    <Screen
      gap={28}
      footer={
        <View style={{ gap: 10 }}>
          {apple ? <Btn label={busy === 'apple' ? 'Einen Moment …' : 'Mit Apple fortfahren'} onPress={() => go('apple', signInWithApple)} /> : null}
          <Btn label={busy === 'google' ? 'Einen Moment …' : 'Mit Google fortfahren'} primary={!apple} onPress={() => go('google', signInWithGoogle)} />
          {error ? <Meta color={tokens.danger}>{error}</Meta> : <Hint center>Ihr meldet euch beide an und teilt einen Kalender.</Hint>}
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: 8 }}>
        <Intro />
      </View>
    </Screen>
  );
}
