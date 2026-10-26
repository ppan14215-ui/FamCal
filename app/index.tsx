import { Redirect } from 'expo-router';

/** Every fresh start begins with onboarding; "Ich wurde eingeladen" skips to Heute. */
export default function Index() {
  return <Redirect href="/onboarding" />;
}
