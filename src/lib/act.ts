/**
 * Sprechen überall (Julian 27.10.): one sentence, wherever you are. The place
 * you are in decides what it means. On a Termin "Tom geht, Impfpass
 * mitnehmen" changes that Termin, on a list "Milch und zwei Brot" fills that
 * list, in the calendar it becomes a Termin or an answer. Every plan says
 * what it understood (shown under the orb) and where the result lands.
 * Prototype: rules, no model.
 */
import type { CalEvent, Who, List } from '../state/types';
import { get, actions, toast } from '../state/store';
import { persons } from '../theme/tokens';
import { understand, findWhen, whoOf, clean, Reply } from './talk';
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
  run: () => { land?: string; result?: Result; go?: string };
};

const NUM: Record<string, number> = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10 };
const pad = (n: number) => String(n).padStart(2, '0');
const addMin = (t: string, m: number) => { const v = Math.min(1439, minutes(t) + m); return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`; };
const nameOf = (w: Who) => (w === 'both' ? 'euch beide' : w ? persons[w].name : 'niemanden');

/** "Milch, zwei Brot und Eier" → ["Milch", "2 Brot", "Eier"]. */
export function splitItems(text: string): string[] {
  const t = text
    .replace(/^\s*(bitte\s+)?(noch\s+)?(auf (die|unsere) (\w+)?liste( setzen| schreiben)?:?|wir brauchen( noch)?|brauchen( noch)?|kauf(e|en)?( noch)?|besorg(e|en)?( noch)?|einpacken:?|pack(e|en)?( ein)?:?|setz(e)?|schreib(e)?)\s*/i, '')
    .replace(/\s+(auf die (\w+)?liste|kaufen|besorgen|mitnehmen|einpacken)\s*\.?$/i, '');
  return t.split(/,|\bund\b|\bsowie\b/i).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean).map((x) => {
    const m = x.match(/^(\w+)\s+(.+)$/);
    const n = m && NUM[m[1].toLowerCase()];
    const s = n ? `${n > 1 ? n + ' ' : ''}${m![2]}` : x;
    return s[0].toUpperCase() + s.slice(1);
  });
}

// ─── Kalender ──────────────────────────────────────────────────────────────

function kalender(said: string, pending: { title: string; who: Who } | null): Plan {
  const l = said.toLowerCase();
  // Shopping from anywhere: "Auf die Einkaufsliste: Milch und Brot", "Wir brauchen Windeln".
  if (/einkauf|\bkaufen\b|\bbesorgen\b|wir brauchen/.test(l) && !findWhen(said.split(/\s+/))) return liste(said, 'einkauf');
  if (/^\s*(neue|eine neue|leg(e)? (eine )?neue)\s+liste|^\s*liste\b/.test(l)) return listeNeu(said);
  if (/^\s*(aufgabe|todo|to do|erinnere? (mich|uns) an)\b/.test(l)) return liste(said.replace(/^\s*(aufgabe|todo|to do|erinnere? (mich|uns) an)\s*:?\s*/i, ''), 'aufgaben');

  const reply = understand(said, get().events, pending, () => newId('e'));
  if (reply.kind !== 'added') {
    return { steps: ['Schaue in euren Kalender'], run: () => ({ result: { kind: 'answer', reply } }) };
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

  if (/\b(absagen|fällt aus|löschen|streichen)\b/.test(l)) {
    return {
      steps: [`„${e.title}“ absagen.`, 'Rückgängig geht gleich unten.'],
      run: () => {
        const before = e;
        actions.removeEvent(e.id);
        toast(`„${e.title}“ abgesagt`, () => actions.addEvent(before));
        return { go: '/kalender' };
      },
    };
  }

  // Bring: "Impfpass mitnehmen", "Mitbringen: Windeln und Spucktuch"
  const bring = said.match(/(?:mitbringen|mitnehmen|einpacken|nicht vergessen)\s*:?\s*(.+)$/i) ?? said.match(/^(.*?)\s+(?:mitbringen|mitnehmen|einpacken|nicht vergessen)\b/i);
  let rest = said;
  if (bring) {
    const all = splitItems(bring[1].replace(/^.*\b(geht|übernimmt|bringt \w+)\b,?\s*(und\s+)?/i, ''));
    const has = new Set((e.bring ?? []).map((b) => b.t.toLowerCase()));
    const items = all.filter((t) => !has.has(t.toLowerCase()));
    const known = all.filter((t) => has.has(t.toLowerCase()));
    if (known.length) steps.push(`${known.join(', ')} ${known.length === 1 ? 'steht' : 'stehen'} schon auf der Liste.`);
    if (items.length) {
      steps.push(`Mitbringen: ${items.join(', ')}.`);
      todo.push(() => { let last; for (const t of items) last = actions.addBring(e.id, t); return last ? `bring:${last}` : undefined; });
      rest = said.replace(bring[0], ' ');
    }
  }

  // Who: "Tom geht", "ich übernehme", "wir gehen beide"
  const words = rest.split(/\s+/);
  if (/\b(geht|gehe|gehen|übernimmt|übernehme|übernehmen|macht|mache|bringt|bringe|fährt|fahre|hin)\b/i.test(said)) {
    const who = whoOf(said.split(/\s+/));
    if (who && who !== e.who) {
      steps.push(`${who === 'both' ? 'Ihr geht beide' : `${persons[who].name} geht`}, statt ${nameOf(e.who)}.`);
      todo.push(() => { actions.setEventWho(e.id, who); return `${e.id}:who`; });
    }
  }

  // When: "auf 15 Uhr", "verschieb auf Freitag", "eine Stunde später"
  const later = l.match(/(eine|1|zwei|2|halbe)\s*(stunde|stunden)\s*(später|früher)/);
  const found = findWhen(words.filter((w) => !/^(verschieb\w*|auf|lieber|doch|erst)$/i.test(clean(w))));
  if (later && !e.allDay) {
    const n = (later[1] === 'halbe' ? 30 : (/zwei|2/.test(later[1]) ? 120 : 60)) * (later[3] === 'früher' ? -1 : 1);
    const start = addMin(e.start, n);
    const end = e.end ? addMin(e.end, n) : undefined;
    steps.push(`${later[3] === 'früher' ? 'Früher' : 'Später'}: ${hm(start)} statt ${hm(e.start)}.`);
    todo.push(() => { const b = actions.moveEvent(e.id, { date: e.date, start, end }); if (b) toast(`Verschoben auf ${hm(start)}`, () => actions.restoreEvent(b)); return `${e.id}:when`; });
  } else if (found) {
    const w: When = found.when;
    const len = e.end && !e.allDay ? minutes(e.end) - minutes(e.start) : 60;
    // Only a time keeps the day, only a day keeps the time.
    const onlyTime = !/(\d{1,2}\.\d{1,2}|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\bmo\b|\bdi\b|\bmi\b|\bdo\b|\bfr\b|\bsa\b|\bso\b|morgen|heute|woche|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)/i.test(found ? words.slice(found.from, found.to).join(' ') : '');
    const date = onlyTime ? e.date : w.date;
    const start = w.start ?? (e.allDay ? undefined : e.start);
    const end = w.end ?? (start ? addMin(start, len) : undefined);
    const nw: When = { date, start, end };
    steps.push(`Verschieben auf ${whenLine(nw)}.`);
    todo.push(() => { const b = actions.moveEvent(e.id, nw); if (b) toast(`Verschoben auf ${short(date)}${start ? ' ' + hm(start) : ''}`, () => actions.restoreEvent(b)); return `${e.id}:when`; });
  }

  // Place: "Ort: Hauptstr. 3", "in der Praxis am Markt"
  const place = said.match(/^\s*(?:ort|adresse|wo)\s*:?\s*(.+)$/i);
  if (place) {
    steps.push(`Ort: ${place[1]}.`);
    todo.push(() => { actions.updateEvent(e.id, { place: place[1].trim() }); return `${e.id}:title`; });
  }
  // Title: "heißt Nachsorge", "umbenennen in U6 Nachuntersuchung"
  const title = said.match(/^\s*(?:heißt|titel|umbenennen in|nenn(?:e)? (?:es|ihn))\s*:?\s*(.+)$/i);
  if (title) {
    steps.push(`Neuer Titel: ${title[1]}.`);
    todo.push(() => { actions.updateEvent(e.id, { title: title[1].trim() }); return `${e.id}:title`; });
  }

  if (!todo.length) {
    // Anything else is a note on the Termin.
    steps.push(`Als Notiz an „${e.title}“: ${said}`);
    todo.push(() => { actions.updateEvent(e.id, { sub: said }); return `${e.id}:title`; });
  }
  steps.unshift(`Ändere „${e.title}“, ${long(e.date)}${e.allDay ? '' : ' um ' + hm(e.start)}.`);
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
    const parts = said.split(/,|\bund dann\b/).map((x) => x.trim()).filter(Boolean);
    const ts = parts.map((p) => splitDue(p));
    const who = whoOf(said.split(/\s+/));
    return {
      steps: [...ts.map((t) => `Aufgabe: ${t.title.replace(/^(tom|julia|ich|wir)\s+(muss|müssen|soll)\s+/i, '')}${t.due ? ', bis ' + short(t.due) : ''}.`), who ? `Für ${nameOf(who)}.` : 'Wer es macht, ist noch offen.'],
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
    steps: [`${list.name}: ${items.join(', ')}.`, list.kind === 'shopping' ? 'Sortiert nach Laden, Drogerie oder Supermarkt.' : `In „${list.name}“ eingetragen.`],
    run: () => {
      actions.setActiveList(list.id);
      let last: string | undefined;
      const added: string[] = [];
      const open = list.sections.flatMap((sec) => sec.items).filter((i) => !i.done);
      for (const t of items) {
        // Already on the list: the new amount replaces the old one instead of a second line.
        const same = open.find((i) => i.name.toLowerCase() === parseItem(t).name.toLowerCase());
        if (same) { actions.editItem(list.id, same.id, t); last = same.id; continue; }
        const nid = actions.addItem(list.id, t);
        if (nid) { last = nid; added.push(nid); }
      }
      toast(`${items.length === 1 ? items[0] : items.length + ' Dinge'} auf „${list.name}“`, () => added.forEach((x) => actions.deleteItem(list.id, x)));
      return { land: last, go: '/listen' };
    },
  };
}

/** "Neue Liste Ostsee: Windeln, Sonnencreme" or "Packliste für den Urlaub". */
function listeNeu(said: string): Plan {
  const m = said.replace(/^\s*(neue|eine neue|leg(e)? (eine )?neue)\s+/i, '').replace(/^\s*liste\s*(für|mit|namens)?\s*/i, '');
  const [head, tail] = m.split(/:|\bmit\b/i);
  const name = (head || 'Neue Liste').trim().replace(/^(die|den|das)\s+/i, '').replace(/^./, (c) => c.toUpperCase());
  const items = tail ? splitItems(tail) : [];
  const urlaub = /urlaub|reise|ostsee|pack/i.test(name);
  const steps = [`Neue Liste „${name}“.`, items.length ? `Mit ${items.join(', ')}.` : urlaub ? 'Vorlage Urlaub mit Baby, 24 Dinge.' : 'Noch leer, sagt einfach, was drauf soll.'];
  return {
    steps,
    run: () => {
      const l: List = urlaub && !items.length ? listFromTemplate(name, 'reise', templates.urlaub) : listFromTemplate(name, urlaub ? 'reise' : 'karten', null);
      actions.createList(l);
      let last: string | undefined;
      for (const t of items) last = actions.addItem(l.id, t) ?? last;
      return { land: last ?? `tab:${l.id}`, go: '/listen' };
    },
  };
}

export function plan(ctx: Ctx, said: string, pending: { title: string; who: Who } | null): Plan {
  if (ctx.kind === 'termin') return termin(said, ctx.id);
  if (ctx.kind === 'liste') {
    // A date in it on the task list still means a task, elsewhere a Termin.
    if (ctx.id !== 'aufgaben' && findWhen(said.split(/\s+/)) && !/einkauf|liste/i.test(said)) return kalender(said, pending);
    if (/^\s*(neue|eine neue)\s+liste/i.test(said)) return listeNeu(said);
    return liste(said, ctx.id);
  }
  if (ctx.kind === 'liste-neu') return listeNeu(/liste/i.test(said) ? said : `Neue Liste ${said}`);
  return kalender(said, pending);
}

/** What the mic says in the testlink, per place. */
export const SPOKEN: Record<Ctx['kind'], string[]> = {
  kalender: ['Erstelle mir einen Termin für Freitag bei meinem Kinderarzt', 'Samstag 10 Uhr Babyschwimmen, Tom geht mit Ben', 'Wann haben wir beide frei?'],
  termin: ['Julia geht, Impfpass und Spucktuch mitnehmen', 'Eine Stunde später'],
  liste: ['Milch, zwei Hafermilch und Feuchttücher', 'Spucktücher und Sonnencreme'],
  'liste-neu': ['Neue Liste Ostsee: Sonnencreme, Strandmuschel und Sonnenhut'],
};

/** Short prompts above the field, per place. */
export const HINTS: Record<Ctx['kind'], string[]> = {
  kalender: ['Freitag zum Kinderarzt', 'Julia hat Fr 15 Uhr Zahnarzt', 'Wann haben wir frei?', 'Wir brauchen Windeln'],
  termin: ['Tom geht', 'Eine Stunde später', 'Impfpass mitnehmen', 'Auf Freitag 10 Uhr'],
  liste: ['Milch und Brot', 'Zwei Hafermilch', 'Neue Liste Geburtstag Mia'],
  'liste-neu': ['Packliste Ostsee', 'Geburtstag Mia: Geschenk, Karte'],
};

export const PLACEHOLDER: Record<Ctx['kind'], string> = {
  kalender: 'Sag oder schreib, was ansteht',
  termin: 'Ändern: Zeit, wer geht, Mitbringen …',
  liste: 'Was kommt auf die Liste?',
  'liste-neu': 'Name und was draufkommt …',
};
