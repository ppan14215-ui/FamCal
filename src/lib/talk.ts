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
  const j = name('J') || ws.some((w) => ['ich', 'mich', 'mir', 'meine', 'mein'].includes(w));
  const t = name('T');
  if ((j && t) || ws.some((w) => ['wir', 'uns', 'beide', 'zusammen', 'alle'].includes(w))) return 'both';
  return j ? 'J' : t ? 'T' : null;
}

const ICONS: [RegExp, ClayName][] = [
  [/zahn/, 'zahnarzt'], [/tierarzt/, 'tierarzt'], [/impf/, 'impfung'], [/hebamme/, 'hebamme'],
  [/arzt|\bu\d\b|praxis|kinderärzt|doktor|dr\./, 'stethoskop'], [/schwimm/, 'schwimmen'],
  [/geburtstag/, 'geburtstag'], [/oma|opa|essen|kochen|grill/, 'kochtopf'], [/kita|krippe/, 'kita'],
  [/schule/, 'schule'], [/amt|pass|ausweis/, 'amt'], [/fußball|fussball/, 'fussball'],
  [/yoga|rückbildung|pilates/, 'yogamatte'], [/einkauf|markt|supermarkt/, 'einkauf'],
  [/urlaub|reise/, 'reise'], [/flug|flughafen/, 'flugzeug'], [/zoo|spazier|kinderwagen/, 'kinderwagen'],
  [/handwerker|reparatur/, 'handwerker'], [/müll/, 'muell'], [/tennis/, 'tennis'], [/laufen|joggen/, 'laufen'],
  [/musik|konzert/, 'musik'], [/krabbel|pekip|baby/, 'fussabdruck'], [/anruf|telefon/, 'telefon'],
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
      const bare = part.every((w) => /^\d{1,2}$/.test(w) || ['um', 'am', 'ab', 'von', 'bis'].includes(w));
      if (bare && !part.includes('um')) continue;
      const w = parseWhen(part.join(' '));
      if (w) return { when: w, from: i, to: i + len };
    }
  }
  return null;
}

const VERBS = ['hat', 'haben', 'muss', 'müssen', 'geht', 'gehen', 'macht', 'machen', 'ist', 'sind', 'fährt', 'fahren', 'will', 'wollen', 'kann', 'soll', 'holt', 'bringt', 'bringen'];
const SUBJECTS = () => [persons.J.name, persons.T.name, 'ich', 'wir', 'du', 'beide'].map((x) => x.toLowerCase());

/** "Tom bringt Ben zur U6" → U6, sub "Tom bringt Ben". "Julia hat Zahnarzt" → Zahnarzt. */
function titleOf(rest: string): { title: string; sub?: string } {
  // "Erstelle mir einen Termin für …", "Trag ein: …" say only that something should be entered.
  rest = rest.replace(/^\s*(bitte\s+)?(erstell\w*|mach\w*|trag\w*|leg\w*|notier\w*)\s+(mir|uns)?\s*(bitte\s+)?(einen|ein|eine)?\s*(termin|eintrag)?\s*(ein|an)?\s*(für)?\s*:?\s*/i, '');
  const text = rest.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').replace(/^[,.\s]+|[,.\s]+$/g, '');
  const to = text.match(/^(.*?)\s*\b(zur|zum|beim|in die|ins|in den|bei (?:meinem|meiner|unserem|unserer|dem|der))\s+([^,]+)(.*)$/i);
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
    if (ws.length && ['einen', 'ein', 'eine', 'den', 'die', 'das', 'termin', 'termin:'].includes(clean(ws[0])) && ws.length > 1) ws.shift();
    return ws.join(' ');
  }).filter((c) => c && !/^(mit|auch|hin|mit hin)$/i.test(c));
  const [first, ...more] = clauses;
  return { title: cap(first ?? ''), sub: more.length ? cap(more.join(', ')) : undefined };
}

/**
 * What the family calendar already knows about a place: "Kinderarzt" finds
 * the last Termin at the pediatrician with its address.
 */
const KNOWN: [RegExp, RegExp][] = [
  [/kinderarzt|kinderärzt|\bu\d\b|impf|arzt/, /weber|kinderarzt/],
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
  return [...events].filter((e) => e.place && e.date <= TODAY && !e.source?.startsWith('Gesagt') && rule[1].test(`${e.title} ${e.sub ?? ''} ${e.place}`.toLowerCase()))
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
        ? `${persons[p].name} arbeitet da bis ${hm(hit.end ?? hit.start)}.`
        : `${persons[p].name} hat da schon „${hit.title}“ um ${hm(hit.start)}.`;
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
  return whole ? 'den ganzen Tag' : s.to === '21:00' ? `ab ${hm(s.from)}` : `${hm(s.from)} bis ${hm(s.to)}`;
}

/** Which days a question is about. */
function daysOf(l: string): { days: string[]; label: string } | null {
  const wd = weekday(TODAY);
  const sat = addDays(TODAY, (6 - wd + 7) % 7);
  const span = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));
  if (/wochenende/.test(l)) return { days: [sat, addDays(sat, 1)], label: 'Am Wochenende' };
  if (/nächste woche/.test(l)) { const mo = addDays(TODAY, ((8 - wd) % 7) || 7); return { days: span(mo, 7), label: 'Nächste Woche' }; }
  if (/diese woche/.test(l)) return { days: span(TODAY, ((7 - wd) % 7) + 1), label: 'Diese Woche' };
  const w = l.match(/\b(heute|morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/);
  if (w) {
    const when = parseWhen(w[1]);
    if (when) return { days: [when.date], label: when.date === TODAY ? 'Heute' : when.date === addDays(TODAY, 1) ? 'Morgen' : `Am ${long(when.date).split(',')[0]}` };
  }
  return null;
}

const STOP = new Set(['wann', 'ist', 'sind', 'wer', 'was', 'die', 'der', 'das', 'den', 'dem', 'zur', 'zum', 'mit', 'bei', 'beim', 'hat', 'haben', 'kommt', 'geht', 'bringt', 'macht', 'nächste', 'nächsten', 'eigentlich', 'noch', 'wieder', 'unsere', 'unser', 'ein', 'eine', 'am', 'um', 'zu', 'und', 'fährt', 'holt', 'muss']);

function whoLine(e: CalEvent): string {
  if (e.who === 'both') return 'Ihr geht beide.';
  if (e.who === 'J' || e.who === 'T') return `${persons[e.who].name} geht.`;
  return 'Wer geht, ist noch offen.';
}

function answer(q: string, events: CalEvent[]): Reply {
  const l = q.toLowerCase();
  const who = whoOf(q.split(/\s+/));
  const mine = (e: CalEvent) => !who || who === 'both' || e.who === who || e.who === 'both';

  if (/\bfrei\b|zeit für|zeit haben|zeit\?/.test(l)) {
    const p: PersonId | 'both' = who === 'J' || who === 'T' ? who : 'both';
    const slots = freeSlots(events, p).slice(0, 4);
    const lead = p === 'both' ? 'Ihr habt beide Zeit' : `${persons[p].name} hat Zeit`;
    return slots.length
      ? { kind: 'answer', text: `${lead}, Arbeit schon abgezogen:`, slots }
      : { kind: 'answer', text: 'Diese Woche ist kein längerer Block mehr frei.' };
  }

  // "Wann ist die U5?", "Wer bringt Ben zur U6?"
  if (/^\s*(wann|wer)\b/.test(l)) {
    const keys = l.replace(/[?.,!]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w) && w !== persons.J.name.toLowerCase() && w !== persons.T.name.toLowerCase());
    const hit = [...events].filter((e) => e.date >= TODAY && !e.work).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .find((e) => keys.some((k) => `${e.title} ${e.sub ?? ''}`.toLowerCase().includes(k)));
    if (hit) {
      const at = `${long(hit.date)}${hit.allDay ? '' : ` um ${hm(hit.start)}`}`;
      const text = /^\s*wer/.test(l) ? `${whoLine(hit)} ${hit.title} ist am ${at}.` : `${hit.title} ist am ${at}. ${whoLine(hit)}`;
      return { kind: 'answer', text, events: [hit] };
    }
    if (keys.length) return { kind: 'answer', text: `Dazu finde ich nichts im Kalender. Sag einfach, wann es ist, dann trage ich es ein.` };
  }

  const span = daysOf(l) ?? (/\b(was|steht|an\?|vor)\b/.test(l) ? { days: Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)), label: 'In den nächsten sieben Tagen' } : null);
  if (span) {
    const list = events.filter((e) => span.days.includes(e.date) && !e.work && mine(e)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const forWhom = who === 'J' || who === 'T' ? ` bei ${persons[who].name}` : '';
    return list.length
      ? { kind: 'answer', text: `${span.label}${forWhom}: ${list.length === 1 ? 'ein Termin' : count(list.length, 'Termin', 'Termine')}.`, events: list }
      : { kind: 'answer', text: `${span.label}${forWhom} steht nichts an.` };
  }
  return { kind: 'answer', text: 'Das kann ich im Testlink noch nicht. Probiert „Was steht am Wochenende an?“ oder „Wann haben wir beide frei?“' };
}

const isQuestion = (q: string) => /\?\s*$/.test(q) || /^\s*(wann|was|wer|wie|wo|haben|hat|habe|sind|ist|gibt|steht|welche)\b/i.test(q);

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
    if (!found) return { kind: 'ask', text: `Wann ist „${pending.title}“? Zum Beispiel „Freitag 15 Uhr“.`, ...pending };
  }
  if (!title) return { kind: 'answer', text: 'Was soll ich eintragen? Zum Beispiel „Julia hat Freitag 15 Uhr Zahnarzt“.' };
  if (!found) return { kind: 'ask', text: `Wann ist „${title}“? Zum Beispiel „Freitag 15 Uhr“.`, title, who };

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
    place: known?.place, repeat: w.repeat, source: `Gesagt: „${q}“`,
  };
  const clash = clashOf(events, event);
  const steps = [`${title}, ${long(w.date)}${w.start ? ` um ${hm(w.start)}` : ''}${w.repeat ? `, ${w.repeat.toLowerCase()}` : ''}.`];
  if (known) steps.push(`${known.place} kenne ich vom Termin „${known.title}“ am ${short(known.date)}.`);
  steps.push(who === 'both' ? 'Für euch beide.' : who ? `Für ${persons[who].name}.` : 'Wer geht, ist noch offen.');
  if (clash) steps.push(clash);
  else if (who && w.start) steps.push('Da ist sonst nichts, passt.');
  if (!w.start) steps.push('Keine Uhrzeit genannt, ich trage den Tag ein und frage nach.');
  return { kind: 'added', event, clash, steps, needsTime: !w.start };
}

/** Day by day for the home screen: today plus the next six days. */
export function week(events: CalEvent[]): { date: string; events: CalEvent[] }[] {
  return Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)).map((date) => ({
    date,
    events: events.filter((e) => e.date === date && !e.work).sort(byTime),
  }));
}

export const dayLabel = (d: string) => (d === TODAY ? 'Heute' : d === addDays(TODAY, 1) ? 'Morgen' : short(d));
