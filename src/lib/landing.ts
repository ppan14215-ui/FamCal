/**
 * Where something lands (Julian 27.10.: speaking works everywhere). Rows,
 * list items and fields on a Termin register under an id; after a spoken
 * change the drop flies to that id and the thing there lights up. The screen
 * in front registers its scroller so a target out of view can be brought in.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { View, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

const nodes = new Map<string, View>();
type Scroller = { ref: React.RefObject<ScrollView | null>; y: React.MutableRefObject<number> };
let scroller: Scroller | null = null;

/** Ref callback for something a spoken change can land on. */
export function useLanding(id: string | undefined) {
  return useCallback((n: View | null) => {
    if (!id) return;
    if (n) nodes.set(id, n);
    else nodes.delete(id);
  }, [id]);
}

/** The scroll view of the focused screen. */
export function useScroller(ref: React.RefObject<ScrollView | null>) {
  const y = useRef(0);
  useFocusEffect(useCallback(() => {
    const me = { ref, y };
    scroller = me;
    return () => { if (scroller === me) scroller = null; };
  }, [ref]));
  return (v: number) => { y.current = v; };
}

export type Pt = { x: number; y: number };

/**
 * Finds the target on screen. If it sits outside the band between `top` and
 * `floor`, scrolls it to the upper third first. Calls back null if missing.
 */
export function locate(id: string, band: { top: number; floor: number; height: number }, done: (p: Pt | null) => void, tries = 0) {
  const node = nodes.get(id) as any;
  if (!node?.measureInWindow) {
    if (tries < 6) setTimeout(() => locate(id, band, done, tries + 1), 80);
    else done(null);
    return;
  }
  node.measureInWindow((x: number, y: number, w: number, h: number) => {
    if (tries < 7 && (y < band.top || y + h > band.floor) && scroller?.ref.current) {
      scroller.ref.current.scrollTo({ y: Math.max(0, scroller.y.current + y - band.height * 0.3), animated: true });
      setTimeout(() => locate(id, band, done, 7), 420);
      return;
    }
    done({ x: x + Math.min(90, w / 4), y: y + h / 2 });
  });
}

// What just landed, so its rows can glow once. Several at a time when one sentence adds several items (Julian 27.10.).
let lit = new Set<string>();
const subs = new Set<() => void>();
export function light(id: string | string[] | null) { lit = new Set(id == null ? [] : Array.isArray(id) ? id : [id]); subs.forEach((l) => l()); }
export function useLit(id: string | undefined) {
  return useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => !!id && lit.has(id), () => false);
}
export function useClearLitOnUnmount() {
  useEffect(() => () => light(null), []);
}
