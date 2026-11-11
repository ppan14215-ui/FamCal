/**
 * Sign-in as a sheet, not a wall (Julian 11.11.2026, x.com/adrian_partain/status/2120222864284745958: "we made
 * our sign in page a modal instead of a full screen", +10 % onboarding completion). The onboarding stays
 * visible behind a soft scrim, the sheet comes up from the bottom like an input area, and Memo sits on its
 * top edge. Pull it down or tap outside and you are back where you were, nothing lost.
 * Same providers as app/anmelden.tsx; after sign-in the family loads as there (afterSignIn).
 */
import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import Sheet from '../Sheet';
import { Btn, Meta, TextLink } from '../ui/kit';
import Txt from '../ui/Txt';
import Blob from '../buddy/Blob';
import { signInWithApple, signInWithGoogle, signInForTest, canTestSignIn, type SignIn } from '../../lib/auth';
import { afterSignIn } from '../../../app/anmelden';
import { useBuddy } from '../../lib/buddy';
import { tokens } from '../../theme';
import { haptics } from '../../lib/haptics';
import { tx } from '../../i18n/lang';
import { track, trackOnce } from '../../lib/analytics';

export default function SignInSheet({ onClose, partner, from }: { onClose: () => void; partner?: string; from: 'showcase' | 'flow' }) {
  const [busy, setBusy] = useState<'apple' | 'google' | 'test' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glad, setGlad] = useState(0);
  const b = useBuddy();
  useEffect(() => { trackOnce('signin', 'onboarding_step_viewed', { step: 'signin', flow: from === 'flow' ? 'flow' : 'v3' }); }, []);

  const go = async (which: 'apple' | 'google' | 'test', fn: () => Promise<SignIn>) => {
    if (busy) return;
    haptics.tap();
    setBusy(which);
    setError(null);
    track('signin_started', { provider: which });
    const r = await fn();
    if (r.error) track('signin_failed', { provider: which, reason: r.error.slice(0, 80) });
    else if (Platform.OS !== 'web') track('signin_completed', { provider: which });
    // Web leaves the page for the provider; the app comes back signed in (see index).
    if (Platform.OS === 'web' && !r.error) return;
    if (r.error) { setBusy(null); return setError(tx('Hat nicht geklappt. Bitte noch einmal.', 'That didn’t work. Please try again.')); }
    setGlad((g) => g + 1);
    haptics.success();
    const failed = await afterSignIn(r.name);
    setBusy(null);
    if (failed) setError(failed);
  };

  const apple = Platform.OS === 'ios' || Platform.OS === 'web';
  const who = partner?.trim();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 50 }}>
      <Sheet bg={tokens.row} onClose={onClose} style={{ paddingTop: 34, gap: 18, overflow: 'visible' }}>
        {/* Memo sits on the sheet's edge and looks at you; he thinks while the sign-in runs. */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -38, alignSelf: 'center', width: 64, height: 64 }}>
          <Blob size={64} mood={busy ? 'think' : 'idle'} joy={glad + b.joy} poke={b.poke} gaze={{ x: 0, y: 0.35 }} shadow={false} />
        </View>
        <View style={{ gap: 8, paddingHorizontal: 4 }}>
          <Txt size={22} weight={700} line={28} center>{tx('Fast geschafft. Wo soll ich mir das merken?', 'Almost there. Where should I keep it?')}</Txt>
          <Txt size={15.5} line={21} color={tokens.sub} center>
            {who
              ? tx(`In deinem Konto. Dann ist nichts weg, und ${who} sieht alles auch.`, `In your account. Then nothing gets lost, and ${who} sees it all too.`)
              : tx('In deinem Konto. Dann ist nichts weg, und dein Partner sieht alles auch.', 'In your account. Then nothing gets lost, and your partner sees it all too.')}
          </Txt>
        </View>
        <View style={{ gap: 10 }}>
          {apple ? <Btn label={busy === 'apple' ? tx('Einen Moment …', 'One moment …') : tx('Mit Apple fortfahren', 'Continue with Apple')} onPress={() => go('apple', signInWithApple)} /> : null}
          <Btn label={busy === 'google' ? tx('Einen Moment …', 'One moment …') : tx('Mit Google fortfahren', 'Continue with Google')} primary={!apple} onPress={() => go('google', signInWithGoogle)} />
          {canTestSignIn ? <TextLink label={busy === 'test' ? tx('Einen Moment …', 'One moment …') : tx('Ohne Konto testen', 'Test without an account')} weight={400} onPress={() => go('test', signInForTest)} /> : null}
          {error ? <Meta color={tokens.danger}>{error}</Meta> : <Txt size={13} color={tokens.mute} center>{tx('Kein Passwort. Dauert zwei Sekunden.', 'No password. Takes two seconds.')}</Txt>}
        </View>
      </Sheet>
    </View>
  );
}
