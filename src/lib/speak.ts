/**
 * Die Sprechkarte (Julian 08.11.2026: "Input bar morphs into this", nach einem Travel-Widget auf X).
 * Beim Sprechen wächst die Leiste zu einer hellen Karte; Memo sitzt als Sprechknopf in ihrer Mitte.
 * Rückfragen kommen in derselben Karte, mit einer Antwortzeile, die zur Frage passt (Julian: "Ask clarifying
 * questions through inputs"). Einfarbig, ohne Verlauf (Julian 20:40).
 *
 * TalkBar schreibt, was gerade passiert (zuhören, aufschreiben, Text da), der Dock schreibt die offene Frage.
 * Die Karte selbst (SpeakCard) liest nur und ruft die Handler.
 */
import { useSyncExternalStore } from 'react';
import { tx } from '../i18n/lang';

export type SpeakPhase = 'idle' | 'listen' | 'write' | 'text' | 'done';

export type SpeakAsk = {
  text: string;
  /** Antworten zum Antippen. */
  picks?: { label: string; on: () => void }[];
  /** Die Uhrzeit-Frage: eine Reihe Stunden zum Antippen, gesagte Uhrzeit wird hervorgehoben. */
  hours?: { pick: (hhmm: string) => void; allDay: () => void; hit?: string };
  /** Hält die Karte offen, auch wenn gerade niemand spricht (die Uhrzeit-Frage öffnet sie ohne Mikro). */
  hold?: boolean;
  /** Ein gesagter Satz, der die Frage selbst beantwortet; true = erledigt, er landet nicht im Feld. */
  onSpoken?: (t: string) => boolean;
};

type State = { phase: SpeakPhase; text: string; ask: SpeakAsk | null; done: string };
type Handlers = { stop: () => void; cancel: () => void; send: () => void; edit: () => void; again: () => void };

let state: State = { phase: 'idle', text: '', ask: null, done: '' };
const noop = () => {};
export const speakHandlers: Handlers = { stop: noop, cancel: noop, send: noop, edit: noop, again: noop };
const subs = new Set<() => void>();

export function setSpeak(patch: Partial<State>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof State)[]) if (state[k] !== patch[k]) changed = true;
  if (!changed) return;
  state = { ...state, ...patch };
  subs.forEach((l) => l());
}
export const getSpeak = () => state;
export const speakOpen = (s: State = state) => s.phase !== 'idle' || !!s.ask?.hold;
export function useSpeak() {
  return useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l); }; }, () => state, () => state);
}

let doneT: ReturnType<typeof setTimeout> | undefined;
/** Kurz zeigen, was jetzt steht, dann schrumpft die Karte zurück in die Leiste. */
export function speakDone(text: string) {
  clearTimeout(doneT);
  setSpeak({ phase: 'done', done: text, ask: null, text: '' });
  doneT = setTimeout(() => { if (state.phase === 'done') setSpeak({ phase: 'idle', done: '' }); }, 1500);
}

export { parseHour } from './parseHour';

/** Die Zeile über dem Gesagten, je nach Phase. */
export const speakTitle = (s: State) =>
  s.phase === 'write' ? tx('Schreibe auf …', 'Writing it down …')
  : s.ask ? s.ask.text
  : s.phase === 'text' ? tx('Passt das so?', 'Is that right?')
  : tx('Ich höre zu …', "I'm listening …");
