/**
 * Hallo (Onboarding v3, decisions 02.11.2026): the first thing anyone sees is the real app at work,
 * played for a demo family (src/components/showcase/Showcase.tsx). Eight short chapters, the claim
 * "Ein Assistent, mit dem ihr beide sprecht", then "Jetzt ihr": the demo clears out and the family
 * step follows. "Überspringen" jumps to the last chapter; "Los geht’s" there starts.
 * The real app signs in next; the test link goes to the family step.
 */
import React from 'react';
import { router } from 'expo-router';
import Showcase from '../../src/components/showcase/Showcase';
import { actions, get, toast } from '../../src/state/store';
import { LIVE } from '../../src/lib/live';
import { isPreview } from '../../src/lib/vorschau';
import { stepViewed, onboardingDone, inviteSent, calendarConnected } from '../../src/lib/funnel';
import { tx } from '../../src/i18n/lang';

export default function Hallo() {
  stepViewed('hallo');
  const start = () => {
    if (isPreview()) return router.push('/onboarding/eltern');
    if (LIVE) return router.push('/anmelden');
    actions.reset();
    router.push('/onboarding/eltern');
  };
  const invited = () => {
    if (isPreview()) return toast(tx('Vorschau: hier ginge es zur Anmeldung', 'Preview: this would go to sign in'));
    if (LIVE) return router.push('/anmelden');
    // The link is on every chapter. A family that already has its own data (reached here through
    // +not-found mid session) keeps it: the demo is never written over a real store.
    if (get().names.J) return router.replace('/chat');
    actions.loadDemo();
    router.replace('/chat');
  };
  return <Showcase onStart={start} onInvited={invited} />;
}
