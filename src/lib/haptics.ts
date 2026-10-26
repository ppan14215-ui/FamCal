/**
 * Haptics, same vocabulary as Namore's lib/haptics. No settings toggle yet in
 * the prototype; web is a no-op.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const noop = () => {};
const on = Platform.OS !== 'web';
// On the web link, Android browsers can still buzz; iOS Safari ignores it.
const buzz = (p: number | number[]) => () => { try { (globalThis as any).navigator?.vibrate?.(p); } catch {} };

export const haptics = {
  /** Selection tick: tab switch, ring tick, chip toggle. */
  select: on ? () => { Haptics.selectionAsync().catch(noop); } : buzz(4),
  /** Light tap: undo, secondary actions. */
  tap: on ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(noop); } : buzz(8),
  /** Medium: commit (assign a card, mark done). */
  commit: on ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(noop); } : buzz(12),
  success: on ? () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(noop); } : buzz([8, 60, 12]),
  warning: on ? () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(noop); } : buzz([20, 40, 20]),
};
