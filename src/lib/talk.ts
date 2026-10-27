/**
 * Sprechen (Pivot 26.10.): one sentence, typed or spoken, either becomes a
 * Termin for the right person or gets an answer from the shared calendar.
 * Prototype: rules, no model. Everything is relative to the fixed TODAY.
 */
import type { CalEvent, Who } from '../state/types';
import type { ClayName } from './clayIcons';
import type { PersonId } from '../theme/tokens';
import { persons } from '../theme/tokens';
import { parseWhen, When } from './when';
import { TODAY, NOW, addDays, weekday, minutes, long, short, hm, count } from './dates';
import { byTime } from './selectors';
import { tx, EN } from '../i18n/lang';

export type Slot = { date: string; from: string; to: string };

export type Reply =
  /** `steps` is what it thought on the way, shown before the Termin lands. */
  | { kind: 'added'; event: CalEvent; clash?: string; steps: string[]; needsTime?: boolean }
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

const ICONS: [RegExp, ClayName][] = [
  [/zahn|dentist/, 'zahnarzt'], [/tierarzt|\bvet\b/, 'tierarzt'], [/impf|vaccin|shot/, 'impfung'], [/hebamme|midwife/, 'hebamme'],
  [/arzt|\bu\d\b|praxis|kinderärzt|doktor|dr\.|doctor|pediatric|checkup|clinic/, 'stethoskop'], [/schwimm|swim/, 'schwimmen'],
  [/geburtstag|birthday|bday/, 'geburtstag'], [/oma|opa|essen|kochen|grill|grandma|grandpa|dinner|lunch|brunch|bbq/, 'kochtopf'], [/kita|krippe|daycare|nursery|preschool/, 'kita'],
  [/schule|school/, 'schule'], [/amt|pass|ausweis|dmv|office/, 'amt'], [/fußball|fussball|soccer|football/, 'fussball'],
  [/yoga|rückbildung|pilates/, 'yogamatte'], [/einkauf|markt|supermarkt|grocer|shopping/, 'einkauf'],
  [/urlaub|reise|vacation|holiday|trip/, 'reise'], [/flug|flughafen|flight|airport/, 'flugzeug'], [/zoo|spazier|kinderwagen|walk|stroller/, 'kinderwagen'],
  [/handwerker|reparatur|plumber|repair|electrician/, 'handwerker'], [/müll|trash|garbage|bins/, 'muell'], [/tennis/, 'tennis'], [/laufen|joggen|\brun\b|running|jog/, 'laufen'],
  [/musik|konzert|music|concert/, 'musik'], [/krabbel|pekip|baby|playgroup/, 'fussabdruck'], [/anruf|telefon|\bcall\b|phone/, 'telefon'],
];
const iconFor = (title: string): ClayName => ICONS.find(([re]) => re.test(title.toLowerCase()))?.[1] ?? 'kalender';

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

const VERBS = ['hat', 'haben', 'muss', 'müssen', 'geht', 'gehen', 'macht', 'machen', 'ist', 'sind', 'fährt', 'fahren', 'will', 'wollen', 'kann', 'soll', 'holt', 'bringt', 'bringen',
  'has', 'have', 'got', 'must', 'needs', 'need', 'goes', 'go', 'is', 'are', 'takes', 'take', 'brings', 'picks', 'drives', 'wants', 'will', "'ll", 'should', 'can'];
const SUBJECTS = () => [persons.J.name, persons.T.name, 'ich', 'wir', 'du', 'beide', 'i', 'we', 'you', "we're", "i'm", "i've", "we've", "i'll", "we'll"].map((x) => x.toLowerCase());

/** "Tom bringt Ben zur U6" → U6, sub "Tom bringt Ben". "Julia hat Zahnarzt" → Zahnarzt. */
function titleOf(rest: string): { title: string; sub?: string } {
  // "Erstelle mir einen Termin für …", "Trag ein: …" say only that something should be entered.
  rest = rest.replace(/^\s*(bitte\s+)?(erstell\w*|mach\w*|trag\w*|leg\w*|notier\w*)\s+(mir|uns)?\s*(bitte\s+)?(einen|ein|eine)?\s*(termin|eintrag)?\s*(ein|an)?\s*(für)?\s*:?\s*/i, '')
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
  return { title: cap(first ?? ''), sub: more.length ? cap(more.join(', ')) : undefined };
}

/**
 * What the family calendar already knows about a place: "Kinderarzt" finds
 * the last Termin at the pediatrician with its address.
 */
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
  if (!rule) return;
  // Only what really happened: past Termine, not ones just said.
  return [...events].filter((e) => e.place && e.date <= TODAY && !/^(Gesagt|Said)/.test(e.source ?? '') && rule[1].test(`${e.title} ${e.sub ?? ''} ${e.place}`.toLowerCase()))
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
    place: known?.place, repeat: w.repeat, source: tx(`Gesagt: „${q}“`, `Said: “${q}”`),
  };
  const clash = clashOf(events, event);
  const steps = [`${title}, ${long(w.date)}${w.start ? ` ${tx('um', 'at')} ${hm(w.start)}` : ''}${w.repeat ? `, ${tx(w.repeat.toLowerCase(), w.repeat)}` : ''}.`];
  if (known) steps.push(tx(`${known.place} kenne ich vom Termin „${known.title}“ am ${short(known.date)}.`, `I know ${known.place} from “${known.title}” on ${short(known.date)}.`));
  steps.push(who === 'both' ? tx('Für euch beide.', 'For both of you.') : who ? tx(`Für ${persons[who].name}.`, `For ${persons[who].name}.`) : tx('Wer geht, ist noch offen.', 'Nobody is set to go yet.'));
  if (clash) steps.push(clash);
  else if (who && w.start) steps.push(tx('Da ist sonst nichts, passt.', 'Nothing else then, fits.'));
  if (!w.start) steps.push(NO_TIME());
  return { kind: 'added', event, clash, steps, needsTime: !w.start };
}

/** What the "verstehen" function sends back (supabase/functions/verstehen). */
export type Understood = {
  kind: 'termin' | 'frage' | 'unklar'; title: string; sub: string | null; date: string | null; end_date: string | null;
  start: string | null; end: string | null; who: Who; place: string | null; repeat: string | null;
  bring: string[]; steps: string[]; question: string | null;
};

const NO_TIME = () => tx('Keine Uhrzeit genannt, ich trage den Tag ein und frage nach.', "No time given, I'll add the day and ask.");
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

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
  const start = m.start && HHMM.test(m.start) ? m.start : undefined;
  const known = recall(`${m.title} ${m.sub ?? ''}`, events);
  const guess = iconFor(`${m.title} ${m.sub ?? ''}`);
  const icon = guess === 'kalender' && known ? known.icon : guess;
  const len = icon === 'stethoskop' || icon === 'zahnarzt' ? 45 : 60;
  const event: CalEvent = {
    id: newId(), title: cap(m.title), sub: m.sub || undefined, icon, who,
    date: m.date, endDate: m.end_date && ISO.test(m.end_date) && m.end_date > m.date ? m.end_date : undefined,
    start: start ?? '00:00', allDay: !start,
    end: start ? (m.end && HHMM.test(m.end) && m.end > start ? m.end : toHm(Math.min(minutes(start) + len, 23 * 60 + 59))) : undefined,
    place: m.place || known?.place, repeat: m.repeat || undefined, source: tx(`Gesagt: „${said.trim()}“`, `Said: “${said.trim()}”`),
    bring: m.bring.length ? m.bring.map((t, i) => ({ id: `${newId()}-b${i}`, t, done: false })) : undefined,
  };
  const clash = clashOf(events, event);
  const steps = m.steps.length ? m.steps.slice(0, 4) : [`${event.title}, ${long(event.date)}${start ? ` ${tx('um', 'at')} ${hm(start)}` : ''}.`];
  if (clash) steps.push(clash);
  if (!start) steps.push(NO_TIME());
  return { kind: 'added', event, clash, steps, needsTime: !start };
}

/** Day by day for the home screen: today plus the next six days. */
export function week(events: CalEvent[]): { date: string; events: CalEvent[] }[] {
  return Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)).map((date) => ({
    date,
    events: events.filter((e) => e.date === date && !e.work).sort(byTime),
  }));
}

export const dayLabel = (d: string) => (d === TODAY ? tx('Heute', 'Today') : d === addDays(TODAY, 1) ? tx('Morgen', 'Tomorrow') : short(d));
