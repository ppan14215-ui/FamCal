/**
 * Bilder in der Eingabe (Julian 11.11.: "whenever I'm adding a picture or a screenshot, I want to have the input
 * behave the exact same way as the input in the Claude app does"): the picture lands as a small preview inside the
 * field, with an x to take it out; you can still type or say something to go with it, and Senden sends both.
 * The picture never leaves the phone: the phone reads its text, numbers like an IBAN are cut out, and only that
 * text goes along (as with the photo of a letter).
 */
import { useSyncExternalStore } from 'react';

export type Pic = { id: string; uri: string };
let pics: Pic[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());
let n = 0;

/** Up to four at a time, like a message in the Claude app keeps it small. */
export function addPic(uri: string) { if (pics.length >= 4) return; pics = [...pics, { id: `p${++n}`, uri }]; emit(); }
export function dropPic(id: string) { pics = pics.filter((p) => p.id !== id); emit(); }
export function takePics(): Pic[] { const all = pics; pics = []; emit(); return all; }
export const usePics = () => useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => pics, () => pics);
