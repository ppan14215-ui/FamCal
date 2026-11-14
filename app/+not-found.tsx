import { Redirect } from 'expo-router';

/**
 * The web build is served from a sub path (e.g. a shared link), which the
 * router does not know. Anything unknown goes to the start.
 */
export default function NotFound() {
  return <Redirect href="/onboarding" />;
}
