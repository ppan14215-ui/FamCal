/**
 * Sprechen überall (Julian 27.10.): one sentence, wherever you are. The place
 * you are in decides what it means. On a Termin "Tom geht, Impfpass
 * mitnehmen" changes that Termin, on a list "Milch und zwei Brot" fills that
 * list, in the calendar it becomes a Termin or an answer. Every plan says
 * what it understood (shown under the orb) and where the result lands.
 * Rules everywhere; in the real app Claude reads calendar sentences first (planOnline).
 */
import type { CalEvent, Who, List } from '../state/types';
import { get, actions, toast } from '../state/store';
import { persons } from '../theme/tokens';
import { blueprintFor, blocksLine } from './blueprint';
import { understand, findWhen, whoOf, clean, Reply, fromModel, type Suggest } from './talk';
import { canUnderstand, understandOnline, understandLive, type Convo, type Glimpse } from './verstehen';
import { tx, EN } from '../i18n/lang';
import { whenLine, splitDue, parseWhen, When } from './when';
import { long, hm, minutes, short, WD_SHORT, weekday, dmShort } from './dates';
import { newId, listFromTemplate, templates, parseItem } from '../data/sample';
import { savedFor, type Recipe } from './rezepte';
import { myRole } from './sync';
import { isFeiertag } from './feiertage';
import { isVacation, leftLine } from './urlaub';
import { isPoints, parseRound, players, matchPlayer, standLine, roundsOf, doubledText } from './points';

const ids = (list: CalEvent[]) => new Set(list.map((e) => e.id));

export type Ctx =
  | { kind: 'kalender' }
  | { kind: 'termin'; id: string }
  | { kind: 'liste'; id: string }
  | { kind: 'liste-neu' };

/** What is left on screen after landing: a card with follow-ups, or nothing. */
export type Result =
  | { kind: 'event'; event: CalEvent; needsTime?: boolean; suggest?: Suggest; ask?: string }
  | { kind: 'answer'; reply: Extract<Reply, { kind: 'answer' | 'ask' }> }
  | { kind: 'done'; text: string; sub?: string; undo?: () => void; open?: string; events?: string[]; note?: boolean }
  /** The sentence stopped mid-thought: the card shows the start and the next sentence is appended. */
  | { kind: 'cut' }
  /** Not sure what it is: the card asks, calendar or a list. */
  | { kind: 'unclear'; text: string }
  /** Claude wants a list the family does not have yet (Julian 29.10.): asked first, one tap to make it. */
  | { kind: 'newList'; name: string; said: ListSaid }
  /** New work on days that already have work (Julian 29.10.): asked, never doubled silently. */
  | { kind: 'workClash'; incoming: CalEvent[]; old: CalEvent[] }
  /** A dish: ingredients to tick off, or first which recipe. `added` is what the sentence itself put on the list. */
  | { kind: 'recipe'; dish: string; picks: string[]; variants?: string[]; question?: string; added?: string; undo?: () => void;
      /** Read from a link: kept for the family once something lands. */
      from?: Recipe;
      /** The family made this dish before: "Wieder dein Rezept von chefkoch.de?" first, with its own picks. */
      kept?: { recipe: Recipe; picks: string[] };
      /** Already at home, shown struck through so it is clear what was left off. */
      have?: string[] };

export type Plan = {
  /** What the machine is about to do, in one line above the steps ("Ich setze auf die Einkaufsliste"). Only for changes, not for questions. */
  head?: string;
  steps: string[];
  /** Does it, returns where it landed and what to show then. */
  /** `land` is where the drop flies; `lit` are all rows that glow (default: just `land`). */
  run: () => { land?: string; lit?: string[]; result?: Result; go?: string };
};

const NUM: Record<string, number> = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const pad = (n: number) => String(n).padStart(2, '0');
const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`; };
/** "Nudeln", "Nudeln und 2 Milch", "Nudeln, Brot und 2 Milch". */
const joinAnd = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${tx('und', 'and')} ${xs[xs.length - 1]}`);
/** Whoever else sees the change, for the receipt. */
const otherSees = () => tx('Ihr seht es beide.', 'You both see it.');
const nameOf = (w: Who) => (w === 'both' ? tx('euch beide', 'both of you') : w ? persons[w].name : tx('niemanden', 'nobody'));

/** "Milch, zwei Brot und Eier" → ["Milch", "2 Brot", "Eier"]. */
export function splitItems(text: string): string[] {
  const t = text
    .replace(/\s*\b(auf|in|zu)\s+(die|der|meine|meiner|unsere|unserer|unsre)?\s*\w*liste\b(\s+(setzen|schreiben|packen|tun|drauf))?/gi, ' ')
    .replace(/\s*\b(to|on|onto)\s+(the|my|our)\s+(\w+\s+)?list\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*(bitte\s+)?(noch\s+)?(auf (die|unsere) (\w+)?liste( setzen| schreiben)?:?|wir brauchen( noch)?|brauchen( noch)?|kauf(e|en)?( noch)?|besorg(e|en)?( noch)?|einpacken:?|pack(e|en)?( ein)?:?|setz(e)?|schreib(e)?|(please\s+)?(add\s+)?(to (the|our) (\w+ )?list:?|we need( some)?|we're out of|buy|get( some)?|pack))\s*/i, '')
    .replace(/\s+(auf die (\w+)?liste|kaufen|besorgen|mitnehmen|einpacken|to (the|our) (\w+ )?list)\s*\.?$/i, '');
  return t.split(/,|\bund\b|\bsowie\b|\band\b/i).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean).map((x) => {
    const m = x.match(/^(\w+)\s+(.+)$/);
    const n = m && NUM[m[1].toLowerCase()];
    const s = n ? `${n > 1 ? n + ' ' : ''}${m![2]}` : x;
    return s[0].toUpperCase() + s.slice(1);
  });
}

// ─── Kalender ──────────────────────────────────────────────────────────────

/** "Erinnere mich (daran), …", "Aufgabe: …", "Remind me to …": a task, not a Termin (Julian 28.10.). */
const REMIND = /^\s*(bitte\s+)?(aufgabe|todo|to do|erinnere? (mich|uns)|task|remind (me|us))\b/i;

/** "Erinnere mich Freitag meinen Wabi Account zu löschen" → "Freitag Wabi Account löschen"; the day stays for the due date. */
function remindText(said: string) {
  const t = said
    .replace(/^\s*(bitte\s+)?(aufgabe|todo|to do|task)\s*:?\s*/i, '')
    .replace(/^\s*(bitte\s+)?(erinnere? (mich|uns)|remind (me|us))(\s+bitte)?(\s+(daran|dran|an|to|about))?\s*,?\s*/i, '')
    .replace(/^(dass|that)\s+(ich|wir|i|we)\s+/i, '')
    .replace(/\b(meine[nms]?|mein|unsere[nms]?|unser|my|our)\s+/gi, '')
    .replace(/\bzu\s+(\S+?)[.!]?\s*$/i, '$1')
    .trim();
  return dueLast(t);
}

/** "Freitag Wabi Account löschen" → "Wabi Account löschen bis Freitag", so the task gets its day. */
function dueLast(t: string) {
  const w = t.split(/\s+/);
  for (let n = Math.min(4, w.length - 1); n >= 1; n--) {
    const head = w.slice(0, n).join(' ').replace(/^(am|on)\s+/i, '');
    if (parseWhen(head)) return `${w.slice(n).join(' ')} ${tx('bis', 'by')} ${head}`;
    const tail = w.slice(-n).join(' ').replace(/^(am|on)\s+/i, '');
    if (parseWhen(tail)) return `${w.slice(0, -n).join(' ')} ${tx('bis', 'by')} ${tail}`;
  }
  return t;
}

/** Sentences for a list, not the calendar. */
const GAME = /\b(romm[eé]|rummy|canasta|kniffel|yahtzee|skat|doppelkopf|uno|wizard|phase 10|darts)\b/i;

/** "Wir spielen Rommé mit Julian, Sophia und Oma": a points list for that game, players from the sentence (Julian 30.10.). */
function gamePlan(said: string): Plan | null {
  const g = said.match(GAME);
  const asks = /\b(spiel\w*|playing|play|punkte|zähl\w*|addier\w*|score|liste|list)\b/i.test(said);
  if (!g || !asks) return null;
  const name = g[1].toLowerCase().startsWith('romm') ? 'Rommé' : g[1].replace(/^./, (c) => c.toUpperCase());
  const existing = get().lists.find((x) => isPoints(x) && x.name.toLowerCase() === name.toLowerCase());
  const who = said.match(/\b(?:mit|with|spieler:?|players:?)\s+(.+)$/i)?.[1] ?? '';
  const names = who.split(/,|\bund\b|\band\b/i).map((x) => x.trim().replace(/^(mir|me|uns|us)$/i, '')).filter((x) => x && x.length <= 30 && !/\d/.test(x)).map((x) => x.replace(/^./, (c) => c.toUpperCase()));
  if (existing) return liste(names.length ? names.join(', ') : said, existing.id, names.length ? names : undefined);
  return newList(name, names);
}

function listPlan(said: string): Plan | null {
  const l = said.toLowerCase();
  const game = gamePlan(said);
  if (game) return game;
  // Shopping from anywhere: "Auf die Einkaufsliste: Milch und Brot", "Wir brauchen Windeln".
  if (/einkauf|\bkaufen\b|\bbesorgen\b|wir brauchen|shopping|\bbuy\b|we need|grocer/.test(l) && !findWhen(said.split(/\s+/))) return liste(said, 'einkauf');
  if (/^\s*(neue|eine neue|leg(e)? (eine )?neue)\s+liste|^\s*liste\b|^\s*(a\s+)?new\s+list\b|^\s*list\b/.test(l)) return listeNeu(said);
  if (REMIND.test(l)) return liste(remindText(said), 'aufgaben');
  return null;
}

function kalender(said: string, pending: { title: string; who: Who } | null): Plan {
  return listPlan(said) ?? replyPlan(understand(said, get().events, pending, () => newId('e')));
}

/** `replacing`: the entries this reading takes the place of; they are no clash (Julian 30.10.: "jeden Mittwoch davon"). */
export function replyPlan(reply: Reply, replacing?: Set<string>): Plan {
  if (reply.kind !== 'added') {
    return { steps: [tx('Schaue in euren Kalender', 'Looking at your calendar')], run: () => ({ result: { kind: 'answer', reply } }) };
  }
  // "Ich arbeite" names nobody: work is always the speaker's (the stripes need a person).
  [reply.event, ...(reply.more ?? [])].forEach((e) => { if (e.work && !e.who) e.who = myRole(); });
  // A work series skips public holidays ("Feiertage sind automatisch eingetragen", Julian 29.10.).
  const all = [reply.event, ...(reply.more ?? [])];
  const kept = all.length > 1 ? all.filter((e) => !(e.work && isFeiertag(e.date, get().land))) : all;
  if (kept.length && kept.length < all.length) {
    const off = all.length - kept.length;
    reply.event = kept[0]; reply.more = kept.slice(1);
    reply.steps = [...reply.steps, tx(off === 1 ? 'Ein Feiertag bleibt frei' : `${off} Feiertage bleiben frei`, off === 1 ? 'One public holiday stays free' : `${off} public holidays stay free`)];
  }
  const incoming = [reply.event, ...(reply.more ?? [])];
  // The receipt counts what happened (Julian 30.10.: "keine Zweifel, was die Maschine gemacht hat").
  const shifts = incoming.filter((e) => e.work);
  if (shifts.length > 2) {
    const last = shifts.reduce((a, b) => (b.date > a.date ? b : a));
    reply.steps = [...reply.steps, tx(`${shifts.length} Arbeitstage eingetragen, der letzte am ${WD_SHORT[weekday(last.date)]} ${dmShort(last.date)}`, `${shifts.length} workdays added, the last on ${WD_SHORT[weekday(last.date)]} ${dmShort(last.date)}`)];
  }
  const old = workClashes(incoming).filter((e) => !replacing?.has(e.id));
  if (old.length) {
    return {
      head: tx('Da ist schon Arbeit eingetragen', 'Work is already booked there'),
      steps: [...reply.steps, clashLine(old)],
      run: () => ({ land: old[0].id, result: { kind: 'workClash', incoming, old } }),
    };
  }
  // Urlaub uses the person's budget (Julian 29.10.): the receipt says what is left.
  const trip = incoming.find(isVacation);
  if (trip) {
    if (!trip.who) trip.who = myRole();
    const year = Number(trip.date.slice(0, 4));
    const { vacation, names, land, events } = get();
    const after = [...events.filter((e) => !ids(incoming).has(e.id)), ...incoming];
    const lines = (trip.who === 'both' ? (['J', 'T'] as const) : trip.who === 'J' || trip.who === 'T' ? [trip.who] : [])
      .map((p) => leftLine(after, p, vacation[p], year, land, trip.who === 'both' ? names[p] : '')).filter(Boolean);
    reply.steps = [...reply.steps, ...lines];
  }
  if (reply.more?.length) return manyPlan(reply.event, reply.more, reply.steps);
  return {
    head: tx('Ich trage in den Kalender ein', 'Adding to the calendar'),
    steps: reply.steps,
    run: () => { actions.addEvent(reply.event); return { land: reply.event.id, result: { kind: 'event', event: reply.event, needsTime: reply.needsTime, suggest: reply.suggest, ask: reply.ask } }; },
  };
}

/** Work already in the calendar on the same day for the same person. */
function workClashes(incoming: CalEvent[]): CalEvent[] {
  const ids = new Set(incoming.map((e) => e.id));
  const days = new Set(incoming.filter((e) => e.work).map((e) => `${e.who}|${e.date}`));
  return get().events.filter((e) => e.work && !ids.has(e.id) && days.has(`${e.who}|${e.date}`));
}

const span = (e: CalEvent) => (e.allDay || !e.end ? tx('ganztägig', 'all day') : tx(`${hm(e.start)} bis ${hm(e.end)}`, `${hm(e.start)} to ${hm(e.end)}`));

export function clashLine(old: CalEvent[]) {
  return old.length === 1
    ? tx(`Am ${short(old[0].date)} steht schon Arbeit ${span(old[0])}.`, `${short(old[0].date)} already has work ${span(old[0])}.`)
    : tx(`An ${old.length} Tagen steht schon Arbeit.`, `${old.length} days already have work.`);
}

/** Ersetzen: the old blocks go, the new ones come; Beide: both stay. One Rückgängig either way. */
export function settleWork(incoming: CalEvent[], old: CalEvent[], replace: boolean): Extract<Result, { kind: 'done' }> & { lit: string[] } {
  if (replace) old.forEach((e) => actions.removeEvent(e.id));
  incoming.forEach((e) => actions.addEvent(e));
  const text = replace
    ? (incoming.length === 1 ? tx(`Arbeit am ${short(incoming[0].date)} ist jetzt ${span(incoming[0])}.`, `Work on ${short(incoming[0].date)} is now ${span(incoming[0])}.`) : tx(`${old.length} Arbeitstage ersetzt, ${incoming.length} eingetragen.`, `${old.length} work days replaced, ${incoming.length} added.`))
    : tx(`${incoming.length} dazu eingetragen, die alten bleiben.`, `${incoming.length} added, the old ones stay.`);
  return {
    kind: 'done', text, sub: otherSees(), lit: incoming.map((e) => e.id), events: incoming.map((e) => e.id),
    undo: () => { incoming.forEach((e) => actions.removeEvent(e.id)); if (replace) old.forEach((e) => actions.addEvent(e)); },
  };
}

/** Several Termine from one sentence (Julian 28.10.): each lands, one receipt, one Rückgängig takes all back. */
function manyPlan(first: CalEvent, more: CalEvent[], steps: string[]): Plan {
  const all = [first, ...more];
  const names = [...new Set(all.map((e) => e.title))];
  return {
    head: tx(`Ich trage ${all.length} Einträge ein`, `Adding ${all.length} entries`),
    steps,
    run: () => {
      all.forEach((e) => actions.addEvent(e));
      const text = tx(`${joinAnd(names.map((x) => `„${x}“`))} ${names.length === 1 ? 'steht' : 'stehen'} im Kalender.`, `${joinAnd(names.map((x) => `“${x}”`))} ${names.length === 1 ? 'is' : 'are'} in the calendar.`);
      return { land: first.id, lit: all.map((e) => e.id), result: { kind: 'done', text, sub: `${tx(`${all.length} Einträge.`, `${all.length} entries.`)} ${otherSees()}`, undo: () => all.forEach((e) => actions.removeEvent(e.id)), events: all.map((e) => e.id) } };
    },
  };
}

// ─── Termin ────────────────────────────────────────────────────────────────

function termin(said: string, id: string): Plan {
  const e = get().events.find((x) => x.id === id);
  if (!e) return kalender(said, null);
  const l = said.toLowerCase();
  const steps: string[] = [];
  const todo: (() => string | undefined)[] = [];
  let land: string | undefined;

  if (/\b(absagen|fällt aus|löschen|streichen|cancel|cancelled|delete|remove|called off)\b/.test(l)) {
    return {
      steps: [tx(`„${e.title}“ absagen.`, `Cancel “${e.title}”.`), tx('Rückgängig geht gleich unten.', 'You can undo it right below.')],
      run: () => {
        const before = e;
        actions.removeEvent(e.id);
        toast(tx(`„${e.title}“ abgesagt`, `“${e.title}” cancelled`), () => actions.addEvent(before));
        return { go: '/kalender' };
      },
    };
  }

  // Bring: "Impfpass mitnehmen", "Mitbringen: Windeln und Spucktuch"
  const bring = said.match(/(?:mitbringen|mitnehmen|einpacken|nicht vergessen|bring|take along|pack|don't forget)\s*:?\s*(.+)$/i) ?? said.match(/^(.*?)\s+(?:mitbringen|mitnehmen|einpacken|nicht vergessen)\b/i);
  let rest = said;
  if (bring) {
    const all = splitItems(bring[1].replace(/^.*\b(geht|übernimmt|bringt \w+|goes|takes it)\b,?\s*(und\s+|and\s+)?/i, ''));
    const has = new Set((e.bring ?? []).map((b) => b.t.toLowerCase()));
    const items = all.filter((t) => !has.has(t.toLowerCase()));
    const known = all.filter((t) => has.has(t.toLowerCase()));
    if (known.length) steps.push(tx(`${known.join(', ')} ${known.length === 1 ? 'steht' : 'stehen'} schon auf der Liste.`, `${known.join(', ')} ${known.length === 1 ? 'is' : 'are'} already on the list.`));
    if (items.length) {
      steps.push(tx(`Mitbringen: ${items.join(', ')}.`, `Bring: ${items.join(', ')}.`));
      todo.push(() => { let last; for (const t of items) last = actions.addBring(e.id, t); return last ? `bring:${last}` : undefined; });
      rest = said.replace(bring[0], ' ');
    }
  }

  // Who: "Tom geht", "ich übernehme", "wir gehen beide"
  const words = rest.split(/\s+/);
  if (/\b(geht|gehe|gehen|übernimmt|übernehme|übernehmen|macht|mache|bringt|bringe|fährt|fahre|hin|goes|go|going|takes|take|drives|drive)\b/i.test(said)) {
    const who = whoOf(said.split(/\s+/));
    if (who && who !== e.who) {
      steps.push(tx(`${who === 'both' ? 'Ihr geht beide' : `${persons[who].name} geht`}, statt ${nameOf(e.who)}.`, `${who === 'both' ? 'You both go' : `${persons[who].name} goes`}, instead of ${nameOf(e.who)}.`));
      todo.push(() => { actions.setEventWho(e.id, who); return `${e.id}:who`; });
    }
  }

  // When: "auf 15 Uhr", "verschieb auf Freitag", "eine Stunde später"
  const later = l.match(/(eine|1|zwei|2|halbe)\s*(stunde|stunden)\s*(später|früher)/) ?? l.match(/(an|one|1|two|2|half an?)\s*(hour|hours)\s*(later|earlier)/)?.map((x) => x.replace(/^(an|one)$/, 'eine').replace(/^two$/, 'zwei').replace(/^half an?$/, 'halbe').replace('later', 'später').replace('earlier', 'früher'));
  const found = findWhen(words.filter((w) => !/^(verschieb\w*|auf|lieber|doch|erst|move|moved|to|rather|instead)$/i.test(clean(w))));
  if (later && !e.allDay) {
    const n = (later[1] === 'halbe' ? 30 : (/zwei|2/.test(later[1]) ? 120 : 60)) * (later[3] === 'früher' ? -1 : 1);
    const start = addMin(e.start, n);
    const end = e.end ? addMin(e.end, n) : undefined;
    steps.push(tx(`${later[3] === 'früher' ? 'Früher' : 'Später'}: ${hm(start)} statt ${hm(e.start)}.`, `${later[3] === 'früher' ? 'Earlier' : 'Later'}: ${hm(start)} instead of ${hm(e.start)}.`));
    todo.push(() => { const b = actions.moveEvent(e.id, { date: e.date, start, end }); if (b) toast(tx(`Verschoben auf ${hm(start)}`, `Moved to ${hm(start)}`), () => actions.restoreEvent(b)); return `${e.id}:when`; });
  } else if (found) {
    const w: When = found.when;
    const len = e.end && !e.allDay ? minutes(e.end) - minutes(e.start) : 60;
    // Only a time keeps the day, only a day keeps the time.
    const onlyTime = !/(\d{1,2}\.\d{1,2}|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\bmo\b|\bdi\b|\bmi\b|\bdo\b|\bfr\b|\bsa\b|\bso\b|morgen|heute|woche|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|week|january|february|march|may|june|july|october|december)/i.test(found ? words.slice(found.from, found.to).join(' ') : '');
    const date = onlyTime ? e.date : w.date;
    const start = w.start ?? (e.allDay ? undefined : e.start);
    const end = w.end ?? (start ? addMin(start, len) : undefined);
    const nw: When = { date, start, end };
    steps.push(tx(`Verschieben auf ${whenLine(nw)}.`, `Move to ${whenLine(nw)}.`));
    todo.push(() => { const b = actions.moveEvent(e.id, nw); if (b) toast(`${tx('Verschoben auf', 'Moved to')} ${short(date)}${start ? ' ' + hm(start) : ''}`, () => actions.restoreEvent(b)); return `${e.id}:when`; });
  }

  // Place: "Ort: Hauptstr. 3", "in der Praxis am Markt"
  const place = said.match(/^\s*(?:ort|adresse|wo|place|address|location|where)\s*:?\s*(.+)$/i);
  if (place) {
    steps.push(`${tx('Ort', 'Place')}: ${place[1]}.`);
    todo.push(() => { actions.updateEvent(e.id, { place: place[1].trim() }); return `${e.id}:title`; });
  }
  // Title: "heißt Nachsorge", "umbenennen in U6 Nachuntersuchung"
  const title = said.match(/^\s*(?:heißt|titel|umbenennen in|nenn(?:e)? (?:es|ihn)|title|rename (?:it )?to|call it)\s*:?\s*(.+)$/i);
  if (title) {
    steps.push(`${tx('Neuer Titel', 'New title')}: ${title[1]}.`);
    todo.push(() => { actions.updateEvent(e.id, { title: title[1].trim() }); return `${e.id}:title`; });
  }

  if (!todo.length) {
    // Anything else is a note on the Termin.
    steps.push(tx(`Als Notiz an „${e.title}“: ${said}`, `As a note on “${e.title}”: ${said}`));
    todo.push(() => { actions.updateEvent(e.id, { sub: said }); return `${e.id}:title`; });
  }
  const head = tx(`Ich ändere „${e.title}“`, `Changing “${e.title}”`);
  return {
    head,
    steps,
    run: () => {
      for (const f of todo) land = f() ?? land;
      return { land };
    },
  };
}

// ─── Listen ────────────────────────────────────────────────────────────────

/** A round for a points list: "Julian 35, Sophia 12", one Rückgängig takes the round back. */
function pointsPlan(list: List, said: string): Plan | null {
  const r = parseRound(said);
  if (!r) return null;
  const factor = r.double && list.blueprint?.points?.doubleWord !== false ? 2 : 1;
  const n = roundsOf(list) + 1;
  return {
    head: tx(`Runde ${n} auf „${list.name}“`, `Round ${n} on “${list.name}”`),
    steps: r.round.map((x) => `${x.who} ${x.points * factor}${factor === 2 ? ` (${x.points} ${doubledText()})` : ''}`),
    run: () => {
      actions.setActiveList(list.id);
      const fresh = get().lists.find((l) => l.id === list.id) ?? list;
      const made: string[] = [];
      const before = new Map<string, number[]>();
      const touched: string[] = [];
      for (const x of r.round) {
        const all = players(get().lists.find((l) => l.id === list.id) ?? fresh);
        let p = matchPlayer(all, x.who);
        if (!p) { const nid = actions.addItem(list.id, x.who); if (!nid) continue; made.push(nid); p = players(get().lists.find((l) => l.id === list.id)!).find((i) => i.id === nid); }
        if (!p) continue;
        const rounds = p.data?.rounds ?? [];
        before.set(p.id, rounds);
        // Everyone gets a place in each round; whoever was not named scores 0.
        const padded = [...rounds, ...Array(Math.max(0, n - 1 - rounds.length)).fill(0)];
        actions.setItemData(list.id, p.id, { rounds: [...padded, x.points * factor] });
        touched.push(p.id);
      }
      const now = get().lists.find((l) => l.id === list.id) ?? fresh;
      const text = tx(`Runde ${n}: ${standLine(now)}.`, `Round ${n}: ${standLine(now)}.`);
      return {
        land: touched[0], lit: touched, go: '/listen',
        result: { kind: 'done', text, sub: factor === 2 ? tx('Diese Runde zählt doppelt.', 'This round counts double.') : otherSees(), undo: () => { before.forEach((v, id) => actions.setItemData(list.id, id, { rounds: v })); made.forEach((id) => actions.deleteItem(list.id, id)); } },
      };
    },
  };
}

function liste(said: string, id: string, given?: string[]): Plan {
  if (id === 'aufgaben') {
    const parts = said.split(/,|\bund dann\b|\band then\b/).map((x) => x.trim()).filter(Boolean);
    const ts = parts.map((p) => splitDue(p));
    const who = whoOf(said.split(/\s+/));
    return {
      head: ts.length === 1 ? tx('Ich lege eine Aufgabe an', 'Adding a task') : tx(`Ich lege ${ts.length} Aufgaben an`, `Adding ${ts.length} tasks`),
      steps: [...ts.map((t) => `${tx('Aufgabe', 'Task')}: ${t.title.replace(/^(tom|julia|ich|wir)\s+(muss|müssen|soll)\s+/i, '')}${t.due ? tx(', bis ', ', by ') + short(t.due) : ''}.`), who ? tx(`Für ${nameOf(who)}.`, `For ${nameOf(who)}.`) : tx('Wer es macht, ist noch offen.', 'Who does it is still open.')],
      run: () => {
        actions.setActiveList('aufgaben');
        const made: string[] = [];
        const titles: string[] = [];
        for (const t of ts) {
          const title = t.title.replace(/^(tom|julia|ich|wir)\s+(muss|müssen|soll)\s+/i, '').replace(/^./, (c) => c.toUpperCase());
          titles.push(title);
          made.push(actions.addTask(title, t.due, who === 'both' ? null : who));
        }
        const text = tx(`${joinAnd(titles.map((x) => `„${x}“`))} ${titles.length === 1 ? 'steht' : 'stehen'} bei den Aufgaben.`, `${joinAnd(titles.map((x) => `“${x}”`))} ${titles.length === 1 ? 'is' : 'are'} on your tasks.`);
        return { land: made[made.length - 1], lit: made, go: '/listen', result: { kind: 'done', text, sub: otherSees(), undo: () => made.forEach((x) => actions.deleteTask(x)) } };
      },
    };
  }
  const list = get().lists.find((x) => x.id === id) ?? get().lists[0];
  if (isPoints(list) && !given?.length) { const pp = pointsPlan(list, said); if (pp) return pp; }
  const items = given?.length ? given.map((x) => x.trim()).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)) : splitItems(said);
  return {
    // Every item is its own step, so each one visibly ticks off (Julian 27.10.: "kein Zweifel, was die Maschine ausführt").
    head: tx(`Ich setze auf „${list.name}“`, `Adding to “${list.name}”`),
    steps: items,
    run: () => {
      actions.setActiveList(list.id);
      let last: string | undefined;
      const added: string[] = [];
      const changed: string[] = [];
      const open = list.sections.flatMap((sec) => sec.items).filter((i) => !i.done);
      for (const t of items) {
        // Already on the list: the new amount replaces the old one instead of a second line.
        const same = open.find((i) => i.name.toLowerCase() === parseItem(t).name.toLowerCase());
        if (same) { actions.editItem(list.id, same.id, t); last = same.id; changed.push(same.id); continue; }
        const nid = actions.addItem(list.id, t);
        if (nid) { last = nid; added.push(nid); changed.push(nid); }
      }
      const text = tx(`${joinAnd(items)} ${items.length === 1 ? 'steht' : 'stehen'} auf „${list.name}“.`, `${joinAnd(items)} ${items.length === 1 ? 'is' : 'are'} on “${list.name}”.`);
      return { land: last, lit: changed, go: '/listen', result: { kind: 'done', text, sub: otherSees(), undo: () => added.forEach((x) => actions.deleteItem(list.id, x)) } };
    },
  };
}

/** "Neue Liste Ostsee: Windeln, Sonnencreme" or "Packliste für den Urlaub". */
function listeNeu(said: string): Plan {
  const m = said.replace(/^\s*(neue|eine neue|leg(e)? (eine )?neue|a new|new)\s+/i, '').replace(/^\s*(liste|list)\s*(für|mit|namens|for|with|called)?\s*/i, '');
  const [head, tail] = m.split(/:|\bmit\b|\bwith\b/i);
  const name = (head || tx('Neue Liste', 'New list')).trim().replace(/^(die|den|das)\s+/i, '').replace(/^./, (c) => c.toUpperCase());
  return newList(name, tail ? splitItems(tail) : []);
}

/** A new list with a name and maybe first items; lists that adapt (films, books) pick their blocks by name. */
function newList(name: string, items: string[]): Plan {
  const urlaub = /urlaub|reise|ostsee|pack|holiday|vacation|trip/i.test(name);
  const bp = blueprintFor(name);
  const steps = [tx(`Neue Liste „${name}“.`, `New list “${name}”.`), ...(bp ? [blocksLine(bp)] : []), items.length ? tx(`Mit ${items.join(', ')}.`, `With ${items.join(', ')}.`) : urlaub ? tx('Vorlage Urlaub mit Baby, 24 Dinge.', 'Template holiday with baby, 24 things.') : tx('Noch leer, sagt einfach, was drauf soll.', 'Still empty, just say what goes on it.')];
  return {
    head: tx('Ich lege eine neue Liste an', 'Creating a new list'),
    steps,
    run: () => {
      const l: List = urlaub && !items.length ? listFromTemplate(name, 'reise', templates.urlaub) : listFromTemplate(name, urlaub ? 'reise' : 'karten', null);
      actions.createList(l, { auto: true });
      let last: string | undefined;
      const lit: string[] = [];
      for (const t of items) { const nid = actions.addItem(l.id, t); if (nid) { last = nid; lit.push(nid); } }
      const text = items.length ? tx(`Neue Liste „${name}“ mit ${joinAnd(items)}.`, `New list “${name}” with ${joinAnd(items)}.`) : tx(`Neue Liste „${name}“ ist angelegt.`, `New list “${name}” is ready.`);
      return { land: last ?? `tab:${l.id}`, lit, go: '/listen', result: { kind: 'done', text, sub: otherSees(), undo: () => actions.deleteList(l.id) } };
    },
  };
}

/**
 * The real app (Julian 27.10.: never wait on Claude). The rules answer at once;
 * Claude reads the same sentence meanwhile (2 to 4 seconds) and the Dock
 * quietly corrects what the rules got wrong. Lists, follow-ups ("um 15 Uhr")
 * and everything offline stay with the rules alone.
 */
export type ListSaid = { kind: 'liste'; list: string; name?: string; items: string[]; dish?: string; extra?: string[]; variants?: string[]; question?: string; have?: string[] };

export type Said = Reply | ListSaid | { kind: 'cut' } | { kind: 'unclear'; text: string };

export async function claudeSays(said: string, convo?: Convo, onGlimpse?: (g: Glimpse) => void): Promise<Said | null> {
  const m = onGlimpse ? await understandLive(said, convo, onGlimpse) : await understandOnline(said, convo);
  if (m?.kind === 'abgebrochen') return { kind: 'cut' };
  if (m?.kind === 'unklar') return { kind: 'unclear', text: m.question || UNCLEAR() };
  if (m?.kind === 'liste' && (m.items?.length || m.dish || m.list === 'neu')) {
    const known = m.list === 'aufgaben' || m.list === 'neu' || get().lists.some((l) => l.id === m.list);
    return { kind: 'liste', list: known ? m.list! : 'einkauf', name: m.list_name || undefined, items: m.items ?? [], dish: m.dish || undefined, extra: (m.extra ?? []).slice(0, 30), variants: (m.variants ?? []).slice(0, 4), question: m.question ?? undefined, have: (m.have ?? []).slice(0, 20) };
  }
  return m && fromModel(m, said, get().events, () => newId('e'));
}

const UNCLEAR = () => tx('Soll das in den Kalender oder auf eine Liste?', 'Should this go in the calendar or on a list?');

/** Stops on a word that needs more ("Wir sind seit Sonntag und", "Am Freitag um"): wait for the rest instead of guessing. */
export const cutOff = (said: string) => /(\b(und|oder|bis|ab|um|mit|dann|seit|für|am|im|zum|zur|nach|von|weil|and|or|until|at|with|then|for|on|to|from|because)|…|\.\.\.)\s*$/i.test(said.trim());

/** Cut off or unclear: a card, nothing changes yet. */
export const holdPlan = (result: Extract<Result, { kind: 'cut' | 'unclear' }>): Plan => ({ steps: [], run: () => ({ result }) });
export const unclearPlan = (text = UNCLEAR()) => holdPlan({ kind: 'unclear', text });

/** What is on the card, for Claude to change: only the parts a person can say something about. */
export function draftOf(ids: string[]): string | undefined {
  const es = ids.map((id) => get().events.find((e) => e.id === id)).filter(Boolean) as CalEvent[];
  if (!es.length) return undefined;
  const one = (e: CalEvent) => ({ title: e.title, sub: e.sub ?? '', date: e.date, end_date: e.endDate ?? '', start: e.allDay ? '' : e.start, end: e.allDay ? '' : e.end ?? '', who: e.who ?? 'none', place: e.place ?? '', repeat: e.repeat ?? '', work: !!e.work, bring: (e.bring ?? []).map((b) => b.t) });
  // Work laid out day by day goes back as the one entry Claude made of it ("Arbeit bis Weihnachten"), so it can change a part of it.
  const runs = new Map<string, CalEvent[]>();
  const rest: CalEvent[] = [];
  for (const e of es) {
    if (!e.work) { rest.push(e); continue; }
    const k = [e.title, e.who, e.allDay ? '' : `${e.start}-${e.end}`, e.repeat].join('|');
    runs.set(k, [...(runs.get(k) ?? []), e]);
  }
  const all = [...[...runs.values()].map((r) => r.sort((a, b) => a.date.localeCompare(b.date))).map((r) => (r.length > 1 ? { ...one(r[0]), date: r[0].date, end_date: r[r.length - 1].date, repeat: r[0].repeat || tx('Montag bis Freitag', 'Mondays to Fridays') } : one(r[0]))), ...rest.map(one)];
  return JSON.stringify(all.length === 1 ? all[0] : all);
}

/**
 * A follow-up changed the one Termin on the card ("Freitag um drei", "Tom kommt mit"):
 * it changes in place and the card stays open for the next sentence.
 */
export function revisePlan(made: CalEvent, r: Extract<Reply, { kind: 'added' }>): Plan | null {
  const patch = correction(made, r);
  if (!patch) return null;
  // Claude sends the whole new state; new things to bring are added, nothing is dropped silently.
  if (r.event.bring?.length) {
    const have = new Set((made.bring ?? []).map((b) => b.t.toLowerCase()));
    const add = r.event.bring.filter((b) => !have.has(b.t.toLowerCase()));
    patch.bring = add.length ? [...(made.bring ?? []), ...add] : undefined;
    if (!add.length) delete patch.bring;
  }
  if (!Object.keys(patch).length) return null;
  return {
    head: tx(`Ich ändere „${made.title}“`, `Changing “${made.title}”`),
    steps: r.steps.slice(0, 3),
    run: () => {
      actions.updateEvent(made.id, patch);
      const event = get().events.find((e) => e.id === made.id) ?? { ...made, ...patch };
      return { land: made.id, result: { kind: 'event', event, needsTime: event.allDay && !event.endDate && r.needsTime } };
    },
  };
}

/** The rules' version of a follow-up on the card's Termin, when Claude is not there. */
export function reviseOffline(id: string, said: string): Plan {
  const p = termin(said, id);
  return {
    ...p,
    run: () => {
      const out = p.run();
      const event = get().events.find((e) => e.id === id);
      return event ? { ...out, result: { kind: 'event', event } } : out;
    },
  };
}

/** Claude heard a list where the rules heard a Termin: the items go on the list. */
/**
 * Claude's items are used as they are, already split (Julian 29.10.: "Cornflakes Milchzucker Mehl").
 * Said on a list of their own ("Urlaub packen") they stay there unless the shopping list was named.
 */
export const listFromClaude = (r: ListSaid, said = '', onScreen?: string): Plan => {
  if (r.dish) return recipePlan(r);
  // Julian 29.10.: "Erstelle eine Watchlist für Filme", "Shutter Island auf die Watchlist".
  if (r.list === 'neu') return newList((r.name || tx('Neue Liste', 'New list')).replace(/^./, (c) => c.toUpperCase()), r.items);
  if (r.list !== 'einkauf' && r.list !== 'aufgaben') {
    const l = get().lists.find((x) => x.id === r.list);
    return l ? liste(r.items.join(', '), l.id, r.items) : newList(r.name || r.list, r.items);
  }
  const own = onScreen && onScreen !== 'einkauf' && onScreen !== 'aufgaben' && r.list === 'einkauf' && !/einkauf|shopping|grocer|supermarkt/i.test(said);
  const id = own ? onScreen! : r.list;
  return id === 'aufgaben' ? liste(r.items.join(', '), id) : liste(r.items.join(', '), id, r.items);
};

/** The sentence itself asks for a new list ("Erstelle eine Watchlist"), so no need to ask again. */
export const asksNewList = (said: string) => /\b(erstell\w*|anleg\w*|leg\w*\b.*\ban\b|neue\w* liste|mach\w*\b.*\bliste|create|make|new list|start a list)\b/i.test(said);

/** Cooking or baking said out loud ("Bolognese kochen", "für einen Karottenkuchen"): Claude knows the recipe, the rules do not. */
export const dishy = (said: string) => /\b(koch\w*|back\w*|rezept\w*|zutaten|kuchen\w*|torte|cook\w*|bak\w*|recipe|ingredients|cake)\b/i.test(said);

/**
 * A dish (Julian 28.10.): what was said goes on the list at once, the rest of
 * the recipe is offered to tick off, or the card first asks which recipe.
 */
function recipePlan(r: ListSaid): Plan {
  const dish = r.dish!;
  const said = r.items.length ? liste(r.items.join(', '), 'einkauf') : null;
  const have = r.have ?? [];
  const picks = missing(r.extra ?? [], [...r.items, ...have]);
  const asks = !!r.variants?.length && !picks.length;
  const saved = savedFor(dish);
  const kept = saved ? { recipe: saved, picks: missing(saved.ingredients, [...r.items, ...have]) } : undefined;
  const note = kept ? tx(`${dish} hattet ihr schon, ich frage nach eurem Rezept.`, `You've made ${dish} before, I'll ask about your recipe.`) : asks ? tx(`Für ${dish} frage ich kurz nach dem Rezept.`, `For ${dish} I'll ask which recipe.`) : tx(`Für ${dish} fehlen noch ${picks.length} Dinge, du wählst gleich.`, `${dish} needs ${picks.length} more things, you pick next.`);
  return {
    head: said?.head ?? tx(`Ich schaue, was ${dish} braucht`, `Checking what ${dish} needs`),
    steps: [...(said?.steps ?? []), note],
    run: () => {
      const out = said?.run();
      const first = out?.result?.kind === 'done' ? out.result : undefined;
      return {
        ...(out ?? { go: '/listen' }),
        result: { kind: 'recipe', dish, picks, kept, have: have.length ? have : undefined, variants: asks ? r.variants : undefined, question: asks ? r.question || tx('Welches Rezept, und für wie viele?', 'Which recipe, and for how many?') : undefined, added: first?.text, undo: first?.undo },
      };
    },
  };
}

/** What a recipe needs that is neither open on the shopping list nor just said. */
function missing(all: string[], said: string[] = []) {
  const name = (x: string) => parseItem(x).name.toLowerCase();
  const open = new Set((get().lists.find((l) => l.id === 'einkauf')?.sections ?? []).flatMap((s) => s.items).filter((i) => !i.done).map((i) => name(i.name)));
  const now = new Set(said.map(name));
  return [...new Set(all)].filter((x) => !open.has(name(x)) && !now.has(name(x)));
}

/** A recipe read from a link (Julian 28.10.): every ingredient to tick off, the family keeps it. */
export function linkPlan(r: Recipe): Plan {
  const picks = missing(r.ingredients);
  return {
    head: tx(`Ich lese das Rezept ${r.name}`, `Reading the recipe ${r.name}`),
    steps: [
      tx(`${r.ingredients.length} Zutaten${r.servings ? ` für ${r.servings}` : ''} von ${r.host ?? 'der Seite'}.`, `${r.ingredients.length} ingredients${r.servings ? ` for ${r.servings}` : ''} from ${r.host ?? 'the page'}.`),
      tx('Ich merke es mir für das nächste Mal.', "I'll remember it for next time."),
    ],
    run: () => { actions.setActiveList('einkauf'); return { go: '/listen', result: { kind: 'recipe', dish: r.name, picks, from: r } }; },
  };
}

/** The ticked ingredients go on the shopping list; returns the receipt. */
export function addPicks(dish: string, items: string[]): Extract<Result, { kind: 'done' }> & { lit: string[] } {
  actions.setActiveList('einkauf');
  const made = items.map((t) => actions.addItem('einkauf', t)).filter(Boolean) as string[];
  const text = tx(`${made.length} Zutaten für ${dish} stehen auf „Einkauf“.`, `${made.length} ingredients for ${dish} are on “Shopping”.`);
  return { kind: 'done', text, sub: otherSees(), undo: () => made.forEach((x) => actions.deleteItem('einkauf', x)), lit: made };
}

/** What Claude changes on a Termin the rules just made; null when they agree. */
export function correction(made: CalEvent, r: Extract<Reply, { kind: 'added' }>): Partial<CalEvent> | null {
  const e = r.event;
  const patch: Partial<CalEvent> = {};
  const keys = ['title', 'sub', 'icon', 'date', 'endDate', 'start', 'end', 'allDay', 'who', 'place', 'repeat'] as const;
  for (const k of keys) if ((e[k] ?? null) !== (made[k] ?? null)) (patch as Record<string, unknown>)[k] = e[k];
  if (!made.bring?.length && e.bring?.length) patch.bring = e.bring;
  return Object.keys(patch).length ? patch : null;
}

/** Claude reads every sentence on the calendar and on the lists (Julian 29.10.: the rules put "Karotten auf meine Einkaufsliste" on the list as it was). */
export const thinksOnline = (ctx: Ctx, said: string, pending: unknown) => !pending && canUnderstand() && !(ctx.kind === 'liste' && isPoints(get().lists.find((l) => l.id === ctx.id)) && !!parseRound(said)) && !gameFor(said) && !(GAME.test(said) && gamePlan(said)) && (ctx.kind === 'kalender' || ctx.kind === 'liste' || (ctx.kind !== 'termin' && dishy(said)));

/** From anywhere (chat too): a sentence whose names are all players of a points list is a round there. */
function gameFor(said: string): List | undefined {
  const r = parseRound(said);
  if (!r) return undefined;
  return get().lists.find((l) => isPoints(l) && players(l).length > 0 && r.round.every((x) => !!matchPlayer(players(l), x.who)));
}

export function plan(ctx: Ctx, said: string, pending: { title: string; who: Who } | null): Plan {
  if (ctx.kind === 'termin') return termin(said, ctx.id);
  const game = ctx.kind !== 'liste' ? gameFor(said) : undefined;
  if (game) { const pp = pointsPlan(game, said); if (pp) return pp; }
  if (ctx.kind === 'liste') {
    // "Erinnere mich …" is a task from any list.
    if (REMIND.test(said)) return liste(remindText(said), 'aufgaben');
    // A date in it on the task list still means a task, elsewhere a Termin.
    if (ctx.id !== 'aufgaben' && findWhen(said.split(/\s+/)) && !/einkauf|liste|shopping|list/i.test(said)) return kalender(said, pending);
    if (/^\s*(neue|eine neue)\s+liste|^\s*(a\s+)?new\s+list/i.test(said)) return listeNeu(said);
    // Naming the shopping list wins over the list on screen (Julian 28.10.: "auf die Einkaufsliste" became a task).
    if (ctx.id !== 'einkauf' && /einkauf|shopping|grocer/i.test(said)) return liste(said, 'einkauf');
    return liste(said, ctx.id);
  }
  if (ctx.kind === 'liste-neu') return listeNeu(/liste|list/i.test(said) ? said : `${tx('Neue Liste', 'New list')} ${said}`);
  return kalender(said, pending);
}

/** What the mic says in the testlink, per place. */
export const SPOKEN: Record<Ctx['kind'], string[]> = EN ? {
  kalender: ['Make me an appointment at the pediatrician on Friday', 'Saturday 10am baby swimming, Tom goes with Ben', 'When are we both free?'],
  termin: ['Julia goes, bring the vaccination card and a burp cloth', 'An hour later'],
  liste: ['Milk, two oat milk and wipes', 'Burp cloths and sunscreen'],
  'liste-neu': ['New list beach: sunscreen, beach tent and sun hat'],
} : {
  kalender: ['Erstelle mir einen Termin für Freitag bei meinem Kinderarzt', 'Samstag 10 Uhr Babyschwimmen, Tom geht mit Ben', 'Wann haben wir beide frei?'],
  termin: ['Julia geht, Impfpass und Spucktuch mitnehmen', 'Eine Stunde später'],
  liste: ['Milch, zwei Hafermilch und Feuchttücher', 'Spucktücher und Sonnencreme'],
  'liste-neu': ['Neue Liste Ostsee: Sonnencreme, Strandmuschel und Sonnenhut'],
};

export const PLACEHOLDER: Record<Ctx['kind'], string> = EN ? {
  kalender: 'Say or type what’s coming up',
  termin: 'Change: time, who goes, what to bring …',
  liste: 'What goes on the list?',
  'liste-neu': 'Name and what goes on it …',
} : {
  kalender: 'Sag oder schreib, was ansteht',
  termin: 'Ändern: Zeit, wer geht, Mitbringen …',
  liste: 'Was kommt auf die Liste?',
  'liste-neu': 'Name und was draufkommt …',
};
