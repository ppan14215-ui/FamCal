/**
 * Anmelden (Julian 27.10.): the real app starts here. Apple or Google, no
 * password. Apple only where it exists (iPhone, web); Google everywhere.
 * After sign-in the family loads, new families go through onboarding.
 */
import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, Btn, Hint, Meta, TextLink } from '../src/components/ui/kit';
import Intro from '../src/components/Intro';
import { signInWithApple, signInWithGoogle, signInForTest, canTestSignIn, SignIn } from '../src/lib/auth';
import { startSync } from '../src/lib/sync';
import { get } from '../src/state/store';
import { tokens } from '../src/theme';
import { haptics } from '../src/lib/haptics';
import { tx } from '../src/i18n/lang';

/** After any sign-in: load the family, then the calendar or, for a new family, onboarding. */
export async function afterSignIn(name?: string): Promise<string | null> {
  const res = await startSync(name);
  if (res.error) return tx('Die Verbindung hat nicht geklappt. Bitte noch einmal versuchen.', 'Could not connect. Please try again.');
  const s = get();
  router.replace(s.events.length || s.names.T ? '/kalender' : '/familie');
  return null;
}

export default function Anmelden() {
  const [busy, setBusy] = useState<'apple' | 'google' | 'test' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (which: 'apple' | 'google' | 'test', fn: () => Promise<SignIn>) => {
    if (busy) return;
    haptics.tap();
    setBusy(which);
    setError(null);
    const r = await fn();
    // Web leaves the page for the provider; the app comes back signed in (see index).
    if (Platform.OS === 'web' && !r.error) return;
    if (r.error) { setBusy(null); return setError(tx('Anmelden hat nicht geklappt. Bitte noch einmal.', 'Sign-in did not work. Please try again.')); }
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
          {apple ? <Btn label={busy === 'apple' ? tx('Einen Moment …', 'One moment …') : tx('Mit Apple fortfahren', 'Continue with Apple')} onPress={() => go('apple', signInWithApple)} /> : null}
          <Btn label={busy === 'google' ? tx('Einen Moment …', 'One moment …') : tx('Mit Google fortfahren', 'Continue with Google')} primary={!apple} onPress={() => go('google', signInWithGoogle)} />
          {canTestSignIn ? <TextLink label={busy === 'test' ? tx('Einen Moment …', 'One moment …') : tx('Ohne Konto testen', 'Test without an account')} weight={400} onPress={() => go('test', signInForTest)} /> : null}
          {error ? <Meta color={tokens.danger}>{error}</Meta> : <Hint center>{tx('Ihr meldet euch beide an und teilt einen Kalender.', 'You both sign in and share one calendar.')}</Hint>}
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: 8 }}>
        <Intro />
      </View>
    </Screen>
  );
}
