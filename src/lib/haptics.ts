/**
 * Haptics, same vocabulary as Namore's lib/haptics. No settings toggle yet in
 * the prototype; web is a no-op.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const noop = () => {};
const on = Platform.OS !== 'web';

export const haptics = {
  /** Selection tick: tab switch, ring tick, chip toggle. */
  select: on ? () => { Haptics.selectionAsync().catch(noop); } : noop,
  /** Light tap: undo, secondary actions. */
  tap: on ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(noop); } : noop,
  /** Medium: commit (assign a card, mark done). */
  commit: on ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(noop); } : noop,
  success: on ? () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(noop); } : noop,
  warning: on ? () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(noop); } : noop,
};
