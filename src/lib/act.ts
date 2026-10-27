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
import { understand, findWhen, whoOf, clean, Reply, fromModel } from './talk';
import { canUnderstand, understandOnline } from './verstehen';
import { tx, EN } from '../i18n/lang';
import { whenLine, splitDue, When } from './when';
import { long, hm, minutes, short } from './dates';
import { newId, listFromTemplate, templates, parseItem } from '../data/sample';

export type Ctx =
  | { kind: 'kalender' }
  | { kind: 'termin'; id: string }
  | { kind: 'liste'; id: string }
  | { kind: 'liste-neu' };

/** What is left on screen after landing: a card with follow-ups, or nothing. */
export type Result =
  | { kind: 'event'; event: CalEvent; needsTime?: boolean }
  | { kind: 'answer'; reply: Extract<Reply, { kind: 'answer' | 'ask' }> }
  | { kind: 'done'; text: string; undo?: () => void; open?: string };

export type Plan = {
  steps: string[];
  /** Does it, returns where it landed and what to show then. */
  /** `land` is where the drop flies; `lit` are all rows that glow (default: just `land`). */
  run: () => { land?: string; lit?: string[]; result?: Result; go?: string };
};

const NUM: Record<string, number> = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const pad = (n: number) => String(n).padStart(2, '0');
const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`; };
const nameOf = (w: Who) => (w === 'both' ? tx('euch beide', 'both of you') : w ? persons[w].name : tx('niemanden', 'nobody'));

/** "Milch, zwei Brot und Eier" → ["Milch", "2 Brot", "Eier"]. */
export function splitItems(text: string): string[] {
  const t = text
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

/** Sentences for a list, not the calendar. */
function listPlan(said: string): Plan | null {
  const l = said.toLowerCase();
  // Shopping from anywhere: "Auf die Einkaufsliste: Milch und Brot", "Wir brauchen Windeln".
  if (/einkauf|\bkaufen\b|\bbesorgen\b|wir brauchen|shopping|\bbuy\b|we need|grocer/.test(l) && !findWhen(said.split(/\s+/))) return liste(said, 'einkauf');
  if (/^\s*(neue|eine neue|leg(e)? (eine )?neue)\s+liste|^\s*liste\b|^\s*(a\s+)?new\s+list\b|^\s*list\b/.test(l)) return listeNeu(said);
  if (/^\s*(aufgabe|todo|to do|erinnere? (mich|uns) an|task|remind (me|us) to)\b/.test(l)) return liste(said.replace(/^\s*(aufgabe|todo|to do|erinnere? (mich|uns) an|task|remind (me|us) to)\s*:?\s*/i, ''), 'aufgaben');
  return null;
}

function kalender(said: string, pending: { title: string; who: Who } | null): Plan {
  return listPlan(said) ?? replyPlan(understand(said, get().events, pending, () => newId('e')));
}

export function replyPlan(reply: Reply): Plan {
  if (reply.kind !== 'added') {
    return { steps: [tx('Schaue in euren Kalender', 'Looking at your calendar')], run: () => ({ result: { kind: 'answer', reply } }) };
  }
  return {
    steps: reply.steps,
    run: () => { actions.addEvent(reply.event); return { land: reply.event.id, result: { kind: 'event', event: reply.event, needsTime: reply.needsTime } }; },
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
  steps.unshift(tx(`Ändere „${e.title}“, ${long(e.date)}${e.allDay ? '' : ' um ' + hm(e.start)}.`, `Changing “${e.title}”, ${long(e.date)}${e.allDay ? '' : ' at ' + hm(e.start)}.`));
  return {
    steps,
    run: () => {
      for (const f of todo) land = f() ?? land;
      return { land };
    },
  };
}

// ─── Listen ────────────────────────────────────────────────────────────────

function liste(said: string, id: string): Plan {
  if (id === 'aufgaben') {
    const parts = said.split(/,|\bund dann\b|\band then\b/).map((x) => x.trim()).filter(Boolean);
    const ts = parts.map((p) => splitDue(p));
    const who = whoOf(said.split(/\s+/));
    return {
      steps: [...ts.map((t) => `${tx('Aufgabe', 'Task')}: ${t.title.replace(/^(tom|julia|ich|wir)\s+(muss|müssen|soll)\s+/i, '')}${t.due ? tx(', bis ', ', by ') + short(t.due) : ''}.`), who ? tx(`Für ${nameOf(who)}.`, `For ${nameOf(who)}.`) : tx('Wer es macht, ist noch offen.', 'Who does it is still open.')],
      run: () => {
        actions.setActiveList('aufgaben');
        let last: string | undefined;
        for (const t of ts) last = actions.addTask(t.title.replace(/^(tom|julia|ich|wir)\s+(muss|müssen|soll)\s+/i, '').replace(/^./, (c) => c.toUpperCase()), t.due, who === 'both' ? null : who);
        return { land: last, go: '/listen' };
      },
    };
  }
  const list = get().lists.find((x) => x.id === id) ?? get().lists[0];
  const items = splitItems(said);
  return {
    steps: [`${list.name}: ${items.join(', ')}.`, list.kind === 'shopping' ? tx('Sortiert nach Laden, Drogerie oder Supermarkt.', 'Sorted by store.') : tx(`In „${list.name}“ eingetragen.`, `Added to “${list.name}”.`)],
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
      toast(tx(`${items.length === 1 ? items[0] : items.length + ' Dinge'} auf „${list.name}“`, `${items.length === 1 ? items[0] : items.length + ' things'} on “${list.name}”`), () => added.forEach((x) => actions.deleteItem(list.id, x)));
      return { land: last, lit: changed, go: '/listen' };
    },
  };
}

/** "Neue Liste Ostsee: Windeln, Sonnencreme" or "Packliste für den Urlaub". */
function listeNeu(said: string): Plan {
  const m = said.replace(/^\s*(neue|eine neue|leg(e)? (eine )?neue|a new|new)\s+/i, '').replace(/^\s*(liste|list)\s*(für|mit|namens|for|with|called)?\s*/i, '');
  const [head, tail] = m.split(/:|\bmit\b|\bwith\b/i);
  const name = (head || tx('Neue Liste', 'New list')).trim().replace(/^(die|den|das)\s+/i, '').replace(/^./, (c) => c.toUpperCase());
  const items = tail ? splitItems(tail) : [];
  const urlaub = /urlaub|reise|ostsee|pack|holiday|vacation|trip/i.test(name);
  const steps = [tx(`Neue Liste „${name}“.`, `New list “${name}”.`), items.length ? tx(`Mit ${items.join(', ')}.`, `With ${items.join(', ')}.`) : urlaub ? tx('Vorlage Urlaub mit Baby, 24 Dinge.', 'Template holiday with baby, 24 things.') : tx('Noch leer, sagt einfach, was drauf soll.', 'Still empty, just say what goes on it.')];
  return {
    steps,
    run: () => {
      const l: List = urlaub && !items.length ? listFromTemplate(name, 'reise', templates.urlaub) : listFromTemplate(name, urlaub ? 'reise' : 'karten', null);
      actions.createList(l);
      let last: string | undefined;
      const lit: string[] = [];
      for (const t of items) { const nid = actions.addItem(l.id, t); if (nid) { last = nid; lit.push(nid); } }
      return { land: last ?? `tab:${l.id}`, lit, go: '/listen' };
    },
  };
}

/**
 * The real app (Julian 27.10.: never wait on Claude). The rules answer at once;
 * Claude reads the same sentence meanwhile (2 to 4 seconds) and the Dock
 * quietly corrects what the rules got wrong. Lists, follow-ups ("um 15 Uhr")
 * and everything offline stay with the rules alone.
 */
export type ListSaid = { kind: 'liste'; list: 'einkauf' | 'aufgaben'; items: string[] };

export async function claudeSays(said: string): Promise<Reply | ListSaid | null> {
  const m = await understandOnline(said);
  if (m?.kind === 'liste' && m.items?.length) return { kind: 'liste', list: m.list === 'aufgaben' ? 'aufgaben' : 'einkauf', items: m.items };
  return m && fromModel(m, said, get().events, () => newId('e'));
}

/** Claude heard a list where the rules heard a Termin: the items go on the list. */
export const listFromClaude = (r: ListSaid): Plan => liste(r.items.join(', '), r.list);

/** What Claude changes on a Termin the rules just made; null when they agree. */
export function correction(made: CalEvent, r: Extract<Reply, { kind: 'added' }>): Partial<CalEvent> | null {
  const e = r.event;
  const patch: Partial<CalEvent> = {};
  const keys = ['title', 'sub', 'icon', 'date', 'endDate', 'start', 'end', 'allDay', 'who', 'place', 'repeat'] as const;
  for (const k of keys) if ((e[k] ?? null) !== (made[k] ?? null)) (patch as Record<string, unknown>)[k] = e[k];
  if (!made.bring?.length && e.bring?.length) patch.bring = e.bring;
  return Object.keys(patch).length ? patch : null;
}

export const thinksOnline = (ctx: Ctx, said: string, pending: unknown) => ctx.kind === 'kalender' && !pending && canUnderstand() && !listPlan(said);

export function plan(ctx: Ctx, said: string, pending: { title: string; who: Who } | null): Plan {
  if (ctx.kind === 'termin') return termin(said, ctx.id);
  if (ctx.kind === 'liste') {
    // A date in it on the task list still means a task, elsewhere a Termin.
    if (ctx.id !== 'aufgaben' && findWhen(said.split(/\s+/)) && !/einkauf|liste|shopping|list/i.test(said)) return kalender(said, pending);
    if (/^\s*(neue|eine neue)\s+liste|^\s*(a\s+)?new\s+list/i.test(said)) return listeNeu(said);
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

/** Short prompts above the field, per place. */
export const HINTS: Record<Ctx['kind'], string[]> = EN ? {
  kalender: ['Pediatrician on Friday', 'Julia has the dentist Fri 3pm', 'When are we free?', 'We need diapers'],
  termin: ['Tom goes', 'An hour later', 'Bring the vaccination card', 'Move to Friday 10am'],
  liste: ['Milk and bread', 'Two oat milk', 'New list Mia’s birthday'],
  'liste-neu': ['Packing list beach', 'Mia’s birthday: present, card'],
} : {
  kalender: ['Freitag zum Kinderarzt', 'Julia hat Fr 15 Uhr Zahnarzt', 'Wann haben wir frei?', 'Wir brauchen Windeln'],
  termin: ['Tom geht', 'Eine Stunde später', 'Impfpass mitnehmen', 'Auf Freitag 10 Uhr'],
  liste: ['Milch und Brot', 'Zwei Hafermilch', 'Neue Liste Geburtstag Mia'],
  'liste-neu': ['Packliste Ostsee', 'Geburtstag Mia: Geschenk, Karte'],
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
