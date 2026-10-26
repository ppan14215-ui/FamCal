import { router } from 'expo-router';

/** Back, or Heute when the screen was opened directly (web link, reload). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/heute');
}
