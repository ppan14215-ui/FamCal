/**
 * Sprechen (Pivot 26.10.): one sentence, typed or spoken, either becomes a
 * Termin for the right person or gets an answer from the shared calendar.
 * Prototype: rules, no model. Everything is relative to the fixed TODAY.
 */
import type { CalEvent, Who } from '../state/types';
import { clayIcons, type ClayName } from './clayIcons';
import type { PersonId } from '../theme/tokens';
import { persons } from '../theme/tokens';
import { parseWhen, When } from './when';
import { iconFor } from './iconWords';
import { TODAY, NOW, addDays, weekday, minutes, long, short, hm, count } from './dates';
import { byTime } from './selectors';
import { tx, EN } from '../i18n/lang';

export type Slot = { date: string; from: string; to: string };
/** A place from an earlier, similar Termin, asked about instead of copied (Julian 28.10.: "Immer noch bei Salon XY?"). */
export type Suggest = { place: string; title: string; date: string };

export type Reply =
  /** `steps` is what it thought on the way, shown before the Termin lands. */
  | { kind: 'added'; event: CalEvent; clash?: string; steps: string[]; needsTime?: boolean; more?: CalEvent[]; suggest?: Suggest; ask?: string }
  | { kind: 'answer'; text: string; events?: CalEvent[]; slots?: Slot[] }
  /** Understood what, not when. The next sentence can be just the time. */
  | { kind: 'ask'; text: string; title: string; who: Who };

const pad = (n: number) => String(n).padStart(2, '0');
const toHm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const clean = (w: string) => w.toLowerCase().replace(/[.,!?;:„“"]/g, '');

/** Who a word means. The phone belongs to J in the prototype. */
export function whoOf(words: string[]): Who {
  const ws = words.map(clean);
  const name = (p: PersonId) => {
    const n = persons[p].name.toLowerCase();
    return ws.some((w) => w === n || w === `${n}s`);
  };
  const j = name('J') || ws.some((w) => ['ich', 'mich', 'mir', 'meine', 'mein', 'i', "i'm", "i've", 'me', 'my'].includes(w));
  const t = name('T');
  if ((j && t) || ws.some((w) => ['wir', 'uns', 'beide', 'zusammen', 'alle', 'we', "we're", 'us', 'our', 'both', 'together', 'everyone'].includes(w))) return 'both';
  return j ? 'J' : t ? 'T' : null;
}


/**
 * The longest run of words that reads as a day or time ("Donnerstag 9:30",
 * "am Freitag um 15 Uhr"). A bare number only counts next to "um" or "Uhr".
 */
export function findWhen(words: string[]): { when: When; from: number; to: number; also?: { from: number; to: number } } | null {
  const first = windowIn(words, () => true);
  if (!first) return null;
  // "Am 12. November Zahnarzt um 10": the day and the time can sit apart.
  if (!first.when.start) {
    const time = windowIn(words, (i, len) => i + len <= first.from || i >= first.to);
    if (time?.when.start) return { ...first, when: { ...first.when, start: time.when.start, end: time.when.end }, also: { from: time.from, to: time.to } };
  }
  return first;
}

function windowIn(words: string[], ok: (i: number, len: number) => boolean): { when: When; from: number; to: number } | null {
  for (let len = Math.min(6, words.length); len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      if (!ok(i, len)) continue;
      const part = words.slice(i, i + len).map(clean);
      const bare = part.every((w) => /^\d{1,2}$/.test(w) || ['um', 'am', 'ab', 'von', 'bis', 'at', 'to', 'from'].includes(w));
      if (bare && !part.includes('um') && !part.includes('at')) continue;
      const w = parseWhen(part.join(' '));
      if (w) return { when: w, from: i, to: i + len };
    }
  }
  return null;
}

// First person too (Julian 28.10.: "Ich habe einen Friseurtermin" kept "Habe einen" in the title).
const VERBS = ['hat', 'haben', 'habe', 'hab', 'hatte', 'muss', 'müssen', 'geht', 'gehen', 'gehe', 'macht', 'machen', 'mache', 'ist', 'sind', 'bin', 'fährt', 'fahren', 'fahre', 'will', 'wollen', 'möchte', 'möchten', 'werde', 'kann', 'soll', 'holt', 'hole', 'bringt', 'bringen', 'bringe',
  'has', 'have', 'got', 'must', 'needs', 'need', 'goes', 'go', 'is', 'are', 'takes', 'take', 'brings', 'picks', 'drives', 'wants', 'will', "'ll", 'should', 'can'];
const SUBJECTS = () => [persons.J.name, persons.T.name, 'ich', 'wir', 'du', 'beide', 'i', 'we', 'you', "we're", "i'm", "i've", "we've", "i'll", "we'll"].map((x) => x.toLowerCase());

/** "Tom bringt Ben zur U6" → U6, sub "Tom bringt Ben". "Julia hat Zahnarzt" → Zahnarzt. */
function titleOf(rest: string): { title: string; sub?: string } {
  // "Erstelle mir einen Termin für …", "Trag ein: …" say only that something should be entered.
  rest = rest.replace(/^\s*(bitte\s+)?(erstell\w*|stell\w*|mach\w*|trag\w*|leg\w*|notier\w*|plan\w*|setz\w*|merk\w*)\s+(mir|uns|dir)?\s*(bitte\s+)?(einen|ein|eine)?\s*(termin|eintrag)?\s*(ein|an)?\s*(für)?\s*:?\s*/i, '')
    .replace(/^\s*(please\s+)?(create|make|add|put( in)?|schedule|book|set up|note)\s+(me\s+|us\s+)?(an?\s+)?(event|appointment|entry)?\s*(for)?\s*:?\s*/i, '');
  const text = rest.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').replace(/^[,.\s]+|[,.\s]+$/g, '');
  const to = text.match(/^(.*?)\s*\b(zur|zum|beim|in die|ins|in den|bei (?:meinem|meiner|unserem|unserer|dem|der)|to the|to|at the|for (?:the|a|an))\s+([^,]+)(.*)$/i);
  if (to) {
    const sub = to[1].trim();
    // "Tom muss" says nothing the avatar does not; "Tom bringt Ben" does.
    const says = sub.split(' ').some((w) => !SUBJECTS().includes(clean(w)) && !VERBS.includes(clean(w)));
    return { title: cap(to[3].trim()), sub: says ? cap(sub) : undefined };
  }
  const subjects = SUBJECTS();
  const clauses = text.split(',').map((c) => {
    const ws = c.trim().split(' ').filter(Boolean);
    if (ws.length && subjects.includes(clean(ws[0]))) {
      ws.shift();
      if (ws.length && VERBS.includes(clean(ws[0]))) ws.shift();
    }
    if (ws.length && VERBS.includes(clean(ws[0]))) ws.shift();
    if (ws.length && ['einen', 'ein', 'eine', 'den', 'die', 'das', 'termin', 'termin:', 'a', 'an', 'the', 'appointment', 'appointment:'].includes(clean(ws[0])) && ws.length > 1) ws.shift();
    return ws.join(' ');
  }).filter((c) => c && !/^(mit|auch|hin|mit hin|too|also|with)$/i.test(c));
  const [first, ...more] = clauses;
  // "Sonntag 17 Uhr mit Anja und Erik" names only who; the Termin is meeting them (Julian 28.10.).
  if (first && /^(mit|with)\s+\S/i.test(first)) return { title: tx('Treffen', 'Meet-up'), sub: [first, ...more].join(', ') };
  return { title: cap(first ?? ''), sub: more.length ? cap(more.join(', ')) : undefined };
}

/**
 * What the family calendar already knows about a place: "Kinderarzt" finds
 * the last Termin at the pediatrician with its address.
 */
/** Words that never make a Termin on their own (Julian 28.10.: "Seit" made no sense as a title). */
const FILLER = /^(seit|bis|ab|und|oder|dann|danach|noch|schon|wieder|auch|mal|jetzt|so|da|hier|wir|ich|du|ihr|sind|bin|ist|haben|hat|since|until|from|and|or|then|still|again|also|now|we|i|you|are|am|is|have|has)$/;
const meaningless = (t: string | undefined) => !t || t.split(/\s+/).every((w) => FILLER.test(clean(w)));

const KNOWN: [RegExp, RegExp][] = [
  [/kinderarzt|kinderärzt|\bu\d\b|impf|arzt|pediatric/, /weber|kinderarzt|pediatric/],
  [/hebamme|nachsorge/, /hebamme/],
  [/rückbildung/, /rückbildung/],
  [/bürgeramt|pass|ausweis/, /bürgeramt/],
];
function recall(title: string, events: CalEvent[]): CalEvent | undefined {
  const l = title.toLowerCase();
  if (/zahn|tierarzt/.test(l)) return;
  const rule = KNOWN.find(([want]) => want.test(l));
  // Only what really happened: past Termine with a place, not ones just said.
  const past = events.filter((e) => e.place && e.date <= TODAY && !/^(Gesagt|Said)/.test(e.source ?? ''));
  // Any earlier Termin with the same main word ("Friseur" and "Friseurtermin"), not only the known kinds.
  if (!rule) {
    const stems = l.split(/[^a-zäöüß]+/).map((w) => w.replace(/(termin|besuch|appointment)$/, '')).filter((w) => w.length >= 4 && !FILLER.test(w));
    if (!stems.length) return;
    return past.filter((e) => stems.some((st) => e.title.toLowerCase().includes(st))).sort((a, b) => b.date.localeCompare(a.date))[0];
  }
  return past.filter((e) => rule[1].test(`${e.title} ${e.sub ?? ''} ${e.place}`.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Everything that blocks a person at a time, work included. */
function busyFor(events: CalEvent[], date: string, who: PersonId | 'both') {
  return events
    .filter((e) => e.date === date && !e.allDay && (who === 'both' || e.who === who || e.who === 'both' || e.who === null))
    .map((e) => ({ e, a: minutes(e.start), b: e.end ? minutes(e.end) : minutes(e.start) + 60 }));
}

function clashOf(events: CalEvent[], ev: CalEvent): string | undefined {
  if (!ev.start || ev.allDay) return;
  const a = minutes(ev.start); const b = ev.end ? minutes(ev.end) : a + 60;
  const ps: PersonId[] = ev.who === 'J' || ev.who === 'T' ? [ev.who] : ev.who === 'both' ? ['J', 'T'] : [];
  for (const p of ps) {
    const hit = events.find((e) => e.id !== ev.id && e.date === ev.date && !e.allDay && (e.who === p || e.who === 'both') && minutes(e.start) < b && (e.end ? minutes(e.end) : minutes(e.start) + 60) > a);
    if (hit) {
      return hit.work
        ? tx(`${persons[p].name} arbeitet da bis ${hm(hit.end ?? hit.start)}.`, `${persons[p].name} is at work until ${hm(hit.end ?? hit.start)}.`)
        : tx(`${persons[p].name} hat da schon „${hit.title}“ um ${hm(hit.start)}.`, `${persons[p].name} already has “${hit.title}” at ${hm(hit.start)}.`);
    }
  }
}

/** Gaps of at least 90 minutes between 9 and 21 Uhr in the next week. */
export function freeSlots(events: CalEvent[], who: PersonId | 'both', days = 7): Slot[] {
  const out: Slot[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(TODAY, i);
    let at = Math.max(9 * 60, i === 0 ? Math.ceil(minutes(NOW) / 30) * 30 : 0);
    const busy = busyFor(events, date, who).sort((x, y) => x.a - y.a);
    for (const { a, b } of [...busy, { a: 21 * 60, b: 21 * 60 }]) {
      if (a - at >= 90) { out.push({ date, from: toHm(at), to: toHm(Math.min(a, 21 * 60)) }); break; }
      at = Math.max(at, b);
    }
  }
  return out;
}

export function slotLine(s: Slot): string {
  const whole = s.from === '09:00' && s.to === '21:00';
  return whole ? tx('den ganzen Tag', 'all day') : s.to === '21:00' ? tx(`ab ${hm(s.from)}`, `from ${hm(s.from)}`) : `${hm(s.from)} ${tx('bis', 'to')} ${hm(s.to)}`;
}

/** Which days a question is about. */
function daysOf(l: string): { days: string[]; label: string } | null {
  const wd = weekday(TODAY);
  const sat = addDays(TODAY, (6 - wd + 7) % 7);
  const span = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));
  if (/wochenende|weekend/.test(l)) return { days: [sat, addDays(sat, 1)], label: tx('Am Wochenende', 'This weekend') };
  if (/nächste woche|next week/.test(l)) { const mo = addDays(TODAY, ((8 - wd) % 7) || 7); return { days: span(mo, 7), label: tx('Nächste Woche', 'Next week') }; }
  if (/diese woche|this week/.test(l)) return { days: span(TODAY, ((7 - wd) % 7) + 1), label: tx('Diese Woche', 'This week') };
  const w = l.match(/\b(heute|morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (w) {
    const when = parseWhen(w[1]);
    if (when) return { days: [when.date], label: when.date === TODAY ? tx('Heute', 'Today') : when.date === addDays(TODAY, 1) ? tx('Morgen', 'Tomorrow') : tx(`Am ${long(when.date).split(',')[0]}`, `On ${long(when.date).split(',')[0]}`) };
  }
  return null;
}

const STOP = new Set(['wann', 'ist', 'sind', 'wer', 'was', 'die', 'der', 'das', 'den', 'dem', 'zur', 'zum', 'mit', 'bei', 'beim', 'hat', 'haben', 'kommt', 'geht', 'bringt', 'macht', 'nächste', 'nächsten', 'eigentlich', 'noch', 'wieder', 'unsere', 'unser', 'ein', 'eine', 'am', 'um', 'zu', 'und', 'fährt', 'holt', 'muss',
  'when', 'is', 'are', 'who', 'what', 'the', 'to', 'with', 'at', 'has', 'have', 'does', 'do', 'going', 'goes', 'takes', 'brings', 'next', 'our', 'a', 'an', 'and', 'on', 'again', 'picks', 'up']);

function whoLine(e: CalEvent): string {
  if (e.who === 'both') return tx('Ihr geht beide.', 'You are both going.');
  if (e.who === 'J' || e.who === 'T') return tx(`${persons[e.who].name} geht.`, `${persons[e.who].name} is going.`);
  return tx('Wer geht, ist noch offen.', 'Nobody is set to go yet.');
}

function answer(q: string, events: CalEvent[]): Reply {
  const l = q.toLowerCase();
  const who = whoOf(q.split(/\s+/));
  const mine = (e: CalEvent) => !who || who === 'both' || e.who === who || e.who === 'both';

  if (/\bfrei\b|zeit für|zeit haben|zeit\?|\bfree\b|available|\btime for\b/.test(l)) {
    const p: PersonId | 'both' = who === 'J' || who === 'T' ? who : 'both';
    const slots = freeSlots(events, p).slice(0, 4);
    const lead = p === 'both' ? tx('Ihr habt beide Zeit', 'You are both free') : tx(`${persons[p].name} hat Zeit`, `${persons[p].name} is free`);
    return slots.length
      ? { kind: 'answer', text: tx(`${lead}, Arbeit schon abgezogen:`, `${lead}, work already left out:`), slots }
      : { kind: 'answer', text: tx('Diese Woche ist kein längerer Block mehr frei.', 'No longer free stretch left this week.') };
  }

  // "Wann ist die U5?", "Wer bringt Ben zur U6?"
  if (/^\s*(wann|wer|when|who)\b/.test(l)) {
    const keys = l.replace(/[?.,!]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w) && w !== persons.J.name.toLowerCase() && w !== persons.T.name.toLowerCase());
    const hit = [...events].filter((e) => e.date >= TODAY && !e.work).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .find((e) => keys.some((k) => `${e.title} ${e.sub ?? ''}`.toLowerCase().includes(k)));
    if (hit) {
      const at = `${long(hit.date)}${hit.allDay ? '' : ` ${tx('um', 'at')} ${hm(hit.start)}`}`;
      const is = tx(`${hit.title} ist am ${at}.`, `${hit.title} is on ${at}.`);
      const text = /^\s*(wer|who)/.test(l) ? `${whoLine(hit)} ${is}` : `${is} ${whoLine(hit)}`;
      return { kind: 'answer', text, events: [hit] };
    }
    if (keys.length) return { kind: 'answer', text: tx('Dazu finde ich nichts im Kalender. Sag einfach, wann es ist, dann trage ich es ein.', "I can't find that in the calendar. Just say when it is and I'll add it.") };
  }

  const span = daysOf(l) ?? (/\b(was|steht|an\?|vor|what|coming up|planned)\b/.test(l) ? { days: Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)), label: tx('In den nächsten sieben Tagen', 'In the next seven days') } : null);
  if (span) {
    const list = events.filter((e) => span.days.includes(e.date) && !e.work && mine(e)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const forWhom = who === 'J' || who === 'T' ? tx(` bei ${persons[who].name}`, ` for ${persons[who].name}`) : '';
    return list.length
      ? { kind: 'answer', text: `${span.label}${forWhom}: ${list.length === 1 ? tx('ein Termin', 'one event') : count(list.length, tx('Termin', 'event'), tx('Termine', 'events'))}.`, events: list }
      : { kind: 'answer', text: tx(`${span.label}${forWhom} steht nichts an.`, `${span.label}${forWhom}: nothing planned.`) };
  }
  return { kind: 'answer', text: tx('Das kann ich noch nicht. Probiert „Was steht am Wochenende an?“ oder „Wann haben wir beide frei?“', "I can't do that yet. Try “What's on this weekend?” or “When are we both free?”") };
}

const askWhen = (title: string) => tx(`Wann ist „${title}“? Zum Beispiel „Freitag 15 Uhr“.`, `When is “${title}”? For example “Friday 3pm”.`);

const isQuestion = (q: string) => /\?\s*$/.test(q) || /^\s*(wann|was|wer|wie|wo|haben|hat|habe|sind|ist|gibt|steht|welche)\b/i.test(q)
  // "Do" is Thursday in German, so the English openers count on English phones only.
  || (EN && /^\s*(when|what|who|how|where|is|are|do|does|any|which|what's|when's|who's)\b/i.test(q));


/** Reads one sentence. `pending` is a title still waiting for its time. */
export function understand(input: string, events: CalEvent[], pending?: { title: string; who: Who } | null, newId = () => `e-${Date.now()}`): Reply {
  const q = input.trim();
  if (!pending && isQuestion(q)) return answer(q, events);

  const words = q.split(/\s+/);
  const found = findWhen(words);
  const rest = found ? words.filter((_, i) => !(i >= found.from && i < found.to) && !(found.also && i >= found.also.from && i < found.also.to)) : words;
  let who = whoOf(rest);
  let { title, sub } = titleOf(rest.join(' '));
  if (meaningless(title)) title = '';
  if (pending && (!title || found)) {
    title = title && !found ? title : pending.title;
    who = who ?? pending.who;
    if (!found) return { kind: 'ask', text: askWhen(pending.title), ...pending };
  }
  if (!title) return { kind: 'answer', text: tx('Was soll ich eintragen? Zum Beispiel „Julia hat Freitag 15 Uhr Zahnarzt“.', 'What should I add? For example “Julia has the dentist Friday at 3pm”.') };
  if (!found) return { kind: 'ask', text: askWhen(title), title, who };

  const w = found.when;
  const known = recall(`${title} ${sub ?? ''}`, events);
  const guess = iconFor(`${title} ${sub ?? ''}`);
  const icon = guess === 'kalender' && known ? known.icon : guess;
  const len = icon === 'stethoskop' || icon === 'zahnarzt' ? 45 : 60;
  const start = w.start ?? '00:00';
  const event: CalEvent = {
    id: newId(), title, sub: sub || undefined, icon, who,
    date: w.date, endDate: w.endDate, start, allDay: !w.start,
    end: w.start ? w.end ?? toHm(Math.min(minutes(start) + len, 23 * 60 + 59)) : undefined,
    repeat: w.repeat, source: tx(`Gesagt: „${q}“`, `Said: “${q}”`),
  };
  const clash = clashOf(events, event);
  const steps = [`${title}, ${long(w.date)}${w.start ? ` ${tx('um', 'at')} ${hm(w.start)}` : ''}${w.repeat ? `, ${tx(w.repeat.toLowerCase(), w.repeat)}` : ''}.`];
  if (known) steps.push(tx(`Letztes Mal bei ${known.place}, ich frage gleich nach.`, `Last time at ${known.place}, I'll ask.`));
  steps.push(who === 'both' ? tx('Für euch beide.', 'For both of you.') : who ? tx(`Für ${persons[who].name}.`, `For ${persons[who].name}.`) : tx('Wer geht, ist noch offen.', 'Nobody is set to go yet.'));
  if (clash) steps.push(clash);
  else if (who && w.start) steps.push(tx('Da ist sonst nichts, passt.', 'Nothing else then, fits.'));
  if (!w.start) steps.push(NO_TIME());
  return { kind: 'added', event, clash, steps, needsTime: !w.start, suggest: suggestOf(known) };
}

const suggestOf = (e: CalEvent | undefined): Suggest | undefined => (e?.place ? { place: e.place, title: e.title, date: e.date } : undefined);

/** What the "verstehen" function sends back (supabase/functions/verstehen). */
export type Understood = {
  kind: 'termin' | 'frage' | 'liste' | 'abgebrochen' | 'unklar'; title: string; sub: string | null; date: string | null; end_date: string | null;
  start: string | null; end: string | null; who: Who; place: string | null; repeat: string | null;
  bring: string[]; steps: string[]; question: string | null;
  /** Claude picks the icon from the names the app sends (Julian 27.10.: "Fußball" gets the ball). */
  icon?: string | null;
  /** kind "liste": the sentence belongs on a list, from any screen (Julian 27.10.). */
  list?: 'einkauf' | 'aufgaben' | null; items?: string[];
  /** A dish: what else it needs, or which recipe first (Julian 28.10.: "Bolognese kochen"). */
  dish?: string; extra?: string[]; variants?: string[];
  /** Said as already at home ("habe nur Tomaten daheim"), kept off the list. */
  have?: string[];
  /** Working hours: shown as a striped block, not in the lists (Julian 28.10.). */
  work?: boolean;
  /** Further Termine from the same sentence ("Urlaub bis Sonntag, danach Arbeit ab Dienstag"). */
  more?: { title: string; sub: string | null; date: string; end_date: string | null; start: string | null; end: string | null; who: Who | 'none'; place: string | null; repeat: string | null; icon?: string | null; work?: boolean }[];
};

/** Icons a Termin can carry: the whole ones, not their animated parts. */
export const TERMIN_ICON_NAMES = (Object.keys(clayIcons) as ClayName[]).filter((k) => !k.includes('__'));
const isIcon = (v: unknown): v is ClayName => typeof v === 'string' && !v.includes('__') && v in clayIcons;

const NO_TIME = () => tx('Keine Uhrzeit genannt, ich trage den Tag ein und frage nach.', "No time given, I'll add the day and ask.");
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

/**
 * What was said stays in the words it was said in (Julian 28.10.: "Friseurtermin"
 * must not come back as "Hairdresser"). A title sharing no word with the sentence
 * was translated: the rules' title from the sentence itself is used instead.
 */
function kept(title: string, said: string): string {
  const l = said.toLowerCase();
  const ours = title.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((w) => w.length >= 3);
  if (!ours.length || ours.some((w) => l.includes(w.slice(0, 4)))) return title;
  const words = said.trim().split(/\s+/);
  const f = findWhen(words);
  const rest = f ? words.filter((_, i) => !(i >= f.from && i < f.to) && !(f.also && i >= f.also.from && i < f.also.to)) : words;
  const own = titleOf(rest.join(' ')).title;
  // A rules title that is still most of the sentence is worse than a translated one (29.10.: "Dienstag arbeite ich wieder jeden Tag").
  return own && !meaningless(own) && own.split(/\s+/).length <= 3 ? own : title;
}

/**
 * Turns the model's reading into the same Reply the rules give, so the
 * screens need no second path. Questions still go to the rules, they know
 * the calendar. Returns null when the answer is unusable; the rules then try.
 */
export function fromModel(m: Understood, said: string, events: CalEvent[], newId = () => `e-${Date.now()}`): Reply | null {
  if (m.kind === 'frage') return answer(said, events);
  if (m.kind !== 'termin' || !m.title) return null;
  const who: Who = m.who === 'J' || m.who === 'T' || m.who === 'both' ? m.who : null;
  if (!m.date || !ISO.test(m.date)) return { kind: 'ask', text: m.question || askWhen(m.title), title: m.title, who };
  // A start equal to the clock with no time in the sentence was made up from "now" (29.10.).
  const madeUp = m.start === NOW && !/\d|uhr|o'?clock|mittag|abend|morgens|noon|evening|morning/i.test(said);
  const start = m.start && HHMM.test(m.start) && !madeUp ? m.start : undefined;
  const known = recall(`${m.title} ${m.sub ?? ''}`, events);
  const guess = isIcon(m.icon) && m.icon !== 'kalender' ? m.icon : iconFor(`${m.title} ${m.sub ?? ''}`);
  const icon = guess === 'kalender' && known ? known.icon : guess;
  const len = icon === 'stethoskop' || icon === 'zahnarzt' ? 45 : 60;
  const event: CalEvent = {
    id: newId(), title: cap(kept(m.title, said)), sub: m.sub || undefined, icon, who,
    date: m.date, endDate: m.end_date && ISO.test(m.end_date) && m.end_date > m.date ? m.end_date : undefined,
    start: start ?? '00:00', allDay: !start,
    end: start ? (m.end && HHMM.test(m.end) && m.end > start ? m.end : toHm(Math.min(minutes(start) + len, 23 * 60 + 59))) : undefined,
    place: m.place || undefined, repeat: m.repeat || undefined, source: tx(`Gesagt: „${said.trim()}“`, `Said: “${said.trim()}”`),
    bring: m.bring.length ? m.bring.map((t, i) => ({ id: `${newId()}-b${i}`, t, done: false })) : undefined,
  };
  if (m.work) event.work = true;
  const more = (m.more ?? []).filter((x) => x.title && ISO.test(x.date)).slice(0, 20).map((x): CalEvent => {
    const s = x.start && HHMM.test(x.start) ? x.start : undefined;
    const ic = isIcon(x.icon) && x.icon !== 'kalender' ? x.icon : iconFor(`${x.title} ${x.sub ?? ''}`);
    return {
      id: newId(), title: cap(x.title), sub: x.sub || undefined, icon: ic, who: x.who === 'J' || x.who === 'T' || x.who === 'both' ? x.who : null,
      date: x.date, endDate: x.end_date && ISO.test(x.end_date) && x.end_date > x.date ? x.end_date : undefined,
      start: s ?? '00:00', allDay: !s, end: s ? (x.end && HHMM.test(x.end) && x.end > s ? x.end : toHm(Math.min(minutes(s) + 60, 23 * 60 + 59))) : undefined,
      place: x.place || undefined, repeat: x.repeat || undefined, work: x.work || undefined, source: event.source,
    };
  });
  const clash = more.length ? undefined : clashOf(events, event);
  const steps = m.steps.length ? m.steps.slice(0, 4) : [`${event.title}, ${long(event.date)}${start ? ` ${tx('um', 'at')} ${hm(start)}` : ''}.`];
  if (clash) steps.push(clash);
  // Claude asks about the time only where one is usual; "Geburtstag" or "Urlaub" stay all day without a question.
  const open = !start && !more.length && !event.endDate && !!m.question;
  if (open) steps.push(NO_TIME());
  return { kind: 'added', event, clash, steps, needsTime: open, ask: open ? m.question ?? undefined : undefined, more: more.length ? more : undefined, suggest: m.place || more.length ? undefined : suggestOf(known) };
}

/** Day by day for the home screen: today plus the next six days. */
export function week(events: CalEvent[]): { date: string; events: CalEvent[] }[] {
  return Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)).map((date) => ({
    date,
    events: events.filter((e) => e.date === date && !e.work).sort(byTime),
  }));
}

export const dayLabel = (d: string) => (d === TODAY ? tx('Heute', 'Today') : d === addDays(TODAY, 1) ? tx('Morgen', 'Tomorrow') : short(d));
