/**
 * How far the on-screen keyboard covers the bottom of the screen, so an input
 * pinned to the bottom can ride up with it (Julian 26.10.: "unten, mit
 * Keyboard hochschieben"). Native reads the keyboard frame; mobile Safari and
 * Chrome shrink the visual viewport instead.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const vv = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!vv) return;
      const on = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      vv.addEventListener('resize', on);
      vv.addEventListener('scroll', on);
      return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on); };
    }
    // Android draws edge to edge: the keyboard's height leaves out the
    // navigation bar under it, so the field sat partly behind the keys
    // (Julian 28.10.). The distance from the keyboard's top to the bottom of
    // the screen includes it.
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const fromTop = Dimensions.get('screen').height - e.endCoordinates.screenY;
      setInset(Platform.OS === 'android' && e.endCoordinates.screenY > 0 ? Math.max(e.endCoordinates.height, fromTop) : e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setInset(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return inset;
}

// Whether someone is typing in the talk field. Android Chrome shrinks the whole
// window for the keyboard, so the inset above stays 0 there; focus is the
// signal that works everywhere (Julian 27.10.: tabs go away while typing).
let typing = false;
const subs = new Set<() => void>();
export function setTyping(on: boolean) { if (typing !== on) { typing = on; subs.forEach((l) => l()); } }
export function useTyping() {
  return useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => typing, () => false);
}
