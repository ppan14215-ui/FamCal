/**
 * Tags in text (Julian 24.11.2026: "names, events and locations are recognized like text within the text message,
 * just like in the video"). Finds the family's names, times, places and the Termin words in a sentence, so the
 * sentence can show what Memo understood while you type or speak, in the chat and in the partner's messages.
 *
 * Plain and local: no network, no model. Names come from the family, times and places from simple patterns,
 * Termin words from what Memo actually made of the sentence. Pure functions, tested in scripts/tags-test.ts.
 */
export type TagKind = 'person' | 'time' | 'event' | 'place';
export type Seg = { text: string; kind?: TagKind; /** person tags: the person's colours */ bg?: string; fg?: string; key?: string };
export type TagNames = { name: string; bg: string; fg: string }[];

// Letters spelled out instead of \p{L}: safe on every JS engine the app runs on (Hermes, web).
const L = 'A-Za-zÀ-ÖØ-öø-ÿĀ-ž';
const LU = 'A-ZÀ-ÖØ-ÞĀ-Ž';
const DAYS_DE = 'Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Montags|Dienstags|Mittwochs|Donnerstags|Freitags|Samstags|Sonntags';
const DAYS_EN = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mondays|Tuesdays|Wednesdays|Thursdays|Fridays|Saturdays|Sundays';
const MONTHS_DE = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
const MONTHS_EN = 'January|February|March|April|May|June|July|August|September|October|November|December';
const REL = 'heute|morgen|übermorgen|heute Abend|morgen früh|morgen Abend|heute Nachmittag|morgen Nachmittag|today|tomorrow|tonight|tomorrow morning|tomorrow evening';
const NEXT = '(?:nächste[nmrs]?|kommende[nmrs]?|diese[nmrs]?|next|this)\\s+(?:Woche|Wochenende|Monat|week|weekend|month|' + DAYS_DE + '|' + DAYS_EN + ')';
const DATE = `(?:am\\s+)?\\d{1,2}\\.(?:\\d{1,2}\\.(?:\\d{2,4})?|\\s+(?:${MONTHS_DE}))|(?:${MONTHS_EN})\\s+\\d{1,2}(?:st|nd|rd|th)?|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${MONTHS_EN})`;
const CLOCK = '(?:um|ab|bis|gegen|at|from|until|by)\\s+\\d{1,2}(?:[:.]\\d{2})?(?:\\s*(?:Uhr|h|am|pm|a\\.m\\.|p\\.m\\.))?|\\d{1,2}[:.]\\d{2}(?:\\s*(?:Uhr|am|pm))?|\\d{1,2}\\s*(?:Uhr|am|pm)|halb\\s+(?:eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|\\d{1,2})';
const WEEKDAY = `(?:(?:am|on|jeden|every)\\s+)?(?:${DAYS_DE}|${DAYS_EN})`;
const TIME_ONE = `(?:${NEXT}|${DATE}|${WEEKDAY}|${REL}|${CLOCK})`;
// Pieces of one time stand together: "Dienstag um 16 Uhr", "morgen, 9:30", "am 3. Dezember um 8".
const TIME_RE = new RegExp(`(?<![${L}\\d])(?:${TIME_ONE})(?:(?:\\s*,\\s*|\\s+)(?:${TIME_ONE}))*(?![${L}\\d])`, 'gi');
// Where: a preposition and one to three capitalised words ("bei Dr. Weber", "im Kindergarten", "at Lakeside Park").
const PLACE_RE = new RegExp(`(?<![${L}])(?:bei|beim|im|in der|in die|ins|zum|zur|vom|nach|vor dem|vor der|at|in)\\s+((?:Dr\\.\\s+|St\\.\\s+)?[${LU}][${L}\\-']+(?:\\s+(?:[${LU}][${L}\\-']+|\\d+[a-z]?)){0,2})`, 'g');

// The word right after a place preposition is the place, never the Termin.
const PLACE_WORD = /(?:bei|beim|im|ins|zum|zur|vom|nach|at|in|der|dem|Dr\.|St\.)\s+$/;

type Hit = { a: number; b: number; kind: TagKind; bg?: string; fg?: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** All tags in the text, as segments in order. Earlier kinds win where two overlap: person, time, event, place. */
export function tagSegments(text: string, opts: { names?: TagNames; titles?: string[] } = {}): Seg[] {
  if (!text) return [];
  const hits: Hit[] = [];
  const free = (a: number, b: number) => !hits.some((h) => a < h.b && b > h.a);
  const add = (a: number, b: number, kind: TagKind, extra?: Partial<Hit>) => { if (b > a && free(a, b)) hits.push({ a, b, kind, ...extra }); };
  // People: whole words, longest name first ("Oma Gisela" before "Oma"), also the genitive -s ("Julias").
  const names = (opts.names ?? []).filter((n) => n.name.trim().length >= 2).sort((x, y) => y.name.length - x.name.length);
  for (const n of names) {
    const re = new RegExp(`(?<![${L}])${esc(n.name.trim())}s?(?![${L}])`, 'g');
    for (const m of text.matchAll(re)) add(m.index!, m.index! + m[0].length, 'person', { bg: n.bg, fg: n.fg });
  }
  for (const m of text.matchAll(TIME_RE)) add(m.index!, m.index! + m[0].length, 'time');
  // Termin words: the title Memo made, where the sentence says it ("Zahnarzt").
  for (const t of opts.titles ?? []) {
    // The place in a title is the place, not the Termin: "Zahnarzt bei Dr. Weber" tags "Zahnarzt" and, below, "Dr. Weber".
    const w = t.trim().replace(new RegExp(`\\s+(?:bei|beim|im|in der|ins|zum|zur|vom|at|in)\\s+[${LU}].*$`), ''); if (w.length < 3) continue;
    const m = new RegExp(`(?<![${L}])${esc(w)}(?![${L}])`, 'i').exec(text);
    if (m) { add(m.index, m.index + m[0].length, 'event'); continue; }
    // A longer title ("Tom hat Zahnarzt bei Dr. Weber"): its first capitalised word that is not yet a name or a place.
    for (const word of w.match(new RegExp(`[${LU}][${L}]{3,}`, 'g')) ?? []) {
      const n = new RegExp(`(?<![${L}])${esc(word)}(?![${L}])`).exec(text);
      if (n && free(n.index, n.index + word.length) && !PLACE_WORD.test(text.slice(Math.max(0, n.index - 8), n.index))) { add(n.index, n.index + word.length, 'event'); break; }
    }
  }
  for (const m of text.matchAll(PLACE_RE)) {
    const a = m.index! + m[0].length - m[1].length;
    add(a, a + m[1].length, 'place');
  }
  hits.sort((x, y) => x.a - y.a);
  const out: Seg[] = []; let at = 0; const seen: Record<string, number> = {};
  for (const h of hits) {
    if (h.a > at) out.push({ text: text.slice(at, h.a) });
    const t = text.slice(h.a, h.b); const k = `${h.kind}:${t.toLowerCase()}`; seen[k] = (seen[k] ?? 0) + 1;
    out.push({ text: t, kind: h.kind, bg: h.bg, fg: h.fg, key: `${k}:${seen[k]}` });
    at = h.b;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** True when the text has at least one tag (callers keep the plain text path otherwise). */
export const hasTags = (segs: Seg[]) => segs.some((s) => !!s.kind);
