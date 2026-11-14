/**
 * What the assistant gets to see (Julian 05.11. 22:21: "Wir schicken ja jeden
 * Termin einer Familie an Claude"; 22:30: "wichtig ist, dass die Aufgaben
 * trotzdem sauber bearbeitet werden, auch nach viel Nutzung und viel Kontext").
 *
 * Before: up to 220 Termine, 200 older titles, every fact and list with every
 * sentence. Now:
 * - the next two weeks, the series that still run, and what matches the
 *   sentence (same words, named dates), with a count of what else there is;
 * - the names of the family as placeholders (Fam1, Fam2 …), set back on the
 *   phone before anything is shown or saved;
 * - connected private calendars only as "Belegt", work only as "Arbeit";
 * - three lookups Claude can ask for when something is missing. They run here,
 *   on the phone, over what the app already has: the server and Claude never
 *   get access to the database. At most 20 rows per lookup, 3 per sentence.
 */
import { get } from '../state/store';
import type { CalEvent, List, Task, Who } from '../state/types';
import { persons } from '../theme/tokens';
import { TODAY, addDays, weekday } from './dates';
import { facts, isWissen } from './wissen';
import { HIDDEN } from './core';
import { isPoints, players, total } from './points';
import { itemText } from '../data/sample';

export const MAX_ROWS = 20;
export const MAX_LOOKUPS = 3;
const AHEAD = 14;

// ─── Names as placeholders ─────────────────────────────────────────────────

export type Alias = { hide: (s: string) => string; show: (s: string) => string; codes: Record<string, string>; map: { code: string; name: string }[] };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NOT_A_NAME = new Set(['ich', 'du', 'wir', 'me', 'you', 'we', 'oma', 'opa', 'mama', 'papa', 'tante', 'onkel', 'kind', 'baby']);

/**
 * Parents are Fam1 (J) and Fam2 (T), then everyone else in the family in a fixed
 * order. Claude keeps the placeholder in titles and facts; show() puts the name back.
 * Only the family's own names: friends in titles ("Marco kommt") stay as they are.
 */
export function aliases(): Alias {
  const people = [...get().people].sort((a, b) => a.id.localeCompare(b.id));
  const map: { code: string; name: string }[] = [];
  const add = (name: string | undefined, code: string) => { const n = (name ?? '').trim(); if (n.length >= 2 && !NOT_A_NAME.has(n.toLowerCase())) map.push({ code, name: n }); };
  add(persons.J.name, 'Fam1');
  add(persons.T.name, 'Fam2');
  people.forEach((p, i) => add(p.name, `Fam${i + 3}`));
  const codes: Record<string, string> = { J: 'Fam1', T: 'Fam2', ...Object.fromEntries(people.map((p, i) => [p.id, `Fam${i + 3}`])) };
  // Whole names first, then single words of longer names ("Oma Inge" also as "Inge").
  const words: { re: RegExp; code: string; len: number }[] = [];
  for (const m of map) {
    words.push({ re: new RegExp(`(?<![\\p{L}\\p{N}])${esc(m.name)}(?=s?(?![\\p{L}\\p{N}]))`, 'giu'), code: m.code, len: m.name.length });
    const parts = m.name.split(/\s+/);
    if (parts.length > 1) for (const w of parts) if (w.length >= 3 && !NOT_A_NAME.has(w.toLowerCase())) words.push({ re: new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?=s?(?![\\p{L}\\p{N}]))`, 'giu'), code: m.code, len: w.length });
  }
  words.sort((a, b) => b.len - a.len);
  const names = new Map(map.map((m) => [m.code, m.name]));
  return {
    map, codes,
    hide: (s) => words.reduce((t, w) => t.replace(w.re, w.code), s ?? ''),
    show: (s) => (s ?? '').replace(/Fam(\d+)(?!\d)/g, (all, n) => names.get(`Fam${n}`) ?? all),
  };
}

/** Every string inside Claude's answer gets the real names back. */
export function showDeep<T>(v: T, A: Alias): T {
  if (typeof v === 'string') return A.show(v) as T;
  if (Array.isArray(v)) return v.map((x) => showDeep(x, A)) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, showDeep(x, A)])) as T;
  return v;
}

// ─── Lines ─────────────────────────────────────────────────────────────────

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const day = (d: string) => `${d} ${WD[weekday(d)]}`;
const clip = (s: string | undefined, n = 60) => (s ?? '').replace(/[\n\r|]/g, ' ').slice(0, n);
const whoTag = (w: Who | undefined) => (w === 'both' ? 'beide' : w ? w : '');
/** From a connected calendar other than holidays: only that the time is taken. */
const privat = (e: CalEvent) => !!e.cal && e.cal !== 'feiertage';

export function eventLine(e: CalEvent, A: Alias) {
  const time = e.allDay ? 'ganztägig' : `${e.start}${e.end ? `-${e.end}` : ''}`;
  const span = e.endDate ? ` bis ${day(e.endDate)}` : '';
  if (privat(e)) return `${e.id} | ${day(e.date)}${span} | ${time} | ${e.work ? 'Arbeit' : 'Belegt'} | ${whoTag(e.who)}; aus privatem Kalender, nur lesen`;
  const h = (s: string | undefined, n?: number) => A.hide(clip(s, n));
  const tags = [
    whoTag(e.who),
    e.people?.length ? `mit ${e.people.map((p) => A.codes[p]).filter(Boolean).join(', ')}` : '',
    e.place ? `Ort ${h(e.place, 40)}` : '',
    // Work blocks are stored day by day; their repeat text is only a note, so it must not look like a series.
    e.repeat && !e.work ? `${h(e.repeat, 40)}${e.repeatUntil ? ` bis ${e.repeatUntil}` : ''}` : '',
    e.skipDates?.length ? `ohne ${e.skipDates.slice(-6).join(', ')}` : '',
    e.work ? 'Arbeitstag, einzelner Eintrag' : '',
    e.bring?.length ? `mit ${e.bring.map((b) => h(b.t, 30)).join(', ')}` : '',
    e.cal === 'feiertage' ? 'Feiertag' : '',
  ].filter(Boolean).join('; ');
  return `${e.id} | ${day(e.date)}${span} | ${time} | ${h(e.title)}${e.sub ? ` (${h(e.sub, 40)})` : ''}${tags ? ` | ${tags}` : ''}`;
}

// ─── Matching the sentence ─────────────────────────────────────────────────

const STOP = new Set(('heute morgen übermorgen gestern bitte noch eine einen einem einer nicht auch dann wann was wie wer wo habe haben hast hat sind bist ist wird werden kommt kommen machen mach mache trag trage tragen eintragen termin termine terminen liste listen alle allen jeden jede jedem jeder nächste nächsten nächster diese diesen dieser woche wochen über unter nach vor beim bei zum zur mein meine meinen meiner unser unsere unseren soll sollen kann können muss müssen will wollen ändere ändern änder verschieb verschiebe verschieben lösch lösche löschen uhr und oder aber mit von für den dem des die der das ein ich wir ihr sie mir mich uns dir dich sich schon gerade mal doch gibt steht stehen drauf rein raus auf aus ins bis seit ganz ganze ganzen immer wieder neu neue neuen fällt fallen aus montag dienstag mittwoch donnerstag freitag samstag sonntag montags dienstags mittwochs donnerstags freitags samstags sonntags tag tage tagen abend abends mittag mittags früh vormittag nachmittag nachmittags the this that with have has had next what when where who how please tomorrow today and for from are was were will can our your add put move delete change monday tuesday wednesday thursday friday saturday sunday day days week').split(' '));

export function keywords(s: string): string[] {
  return [...new Set((s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)))];
}
/** How many words of the sentence the text has: "Zahnarzt Fam3" ranks Karlo's Zahnarzt above his other Termine. */
const score = (text: string, kws: string[]) => {
  if (!kws.length) return 0;
  const ws = keywords(text);
  // A family name alone counts half: "Mia" fits hundreds of Termine, "Zahnarzt" and "Mia" together only a few.
  return kws.filter((k) => ws.some((w) => w === k || (Math.min(w.length, k.length) >= 5 && (w.startsWith(k.slice(0, 5)) || k.startsWith(w.slice(0, 5)))))).reduce((n, k) => n + (/^fam\d+$/.test(k) ? 0.5 : 1), 0);
};
const hit = (text: string, kws: string[]) => score(text, kws) > 0;
/** The best matches: when some fit two words of the sentence ("Zahnarzt Fam3"), the ones fitting one are left out. */
function best<T>(xs: T[], text: (x: T) => string, kws: string[], n: number, tie: (a: T, b: T) => number): T[] {
  const onlyNames = kws.every((k) => /^fam\d+$/.test(k));
  const sc = xs.map((x) => ({ x, n: score(text(x), kws) })).filter((y) => y.n >= (onlyNames ? 0.5 : 1));
  const top = Math.max(0, ...sc.map((y) => y.n));
  return sc.filter((y) => top <= 1 || y.n === top).sort((a, b) => b.n - a.n || tie(a.x, b.x)).slice(0, n).map((y) => y.x);
}
const evText = (e: CalEvent, A: Alias) => (privat(e) ? (e.work ? 'Arbeit' : '') : A.hide(`${e.title} ${e.sub ?? ''} ${e.place ?? ''} ${(e.people ?? []).map((p) => A.codes[p] ?? '').join(' ')}`));

/** Dates written in the sentence ("13.11.", "am 6. November"): the Termine on those days come along. */
const MONTHS = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
export function datesIn(said: string): string[] {
  const out: string[] = [];
  const y = Number(TODAY.slice(0, 4));
  const add = (d: number, m: number) => {
    if (d < 1 || d > 31 || m < 1 || m > 12) return;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push(iso < addDays(TODAY, -60) ? `${y + 1}${iso.slice(4)}` : iso);
  };
  for (const m of said.matchAll(/(?<!\d)(\d{1,2})\.\s?(\d{1,2})\.?/g)) add(Number(m[1]), Number(m[2]));
  for (const m of said.toLowerCase().matchAll(/(?<!\d)(\d{1,2})\.?\s+(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)/g)) add(Number(m[1]), MONTHS.indexOf(m[2]) + 1);
  return [...new Set(out)];
}

const byDate = (a: CalEvent, b: CalEvent) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
const near = (a: CalEvent, b: CalEvent) => Math.abs(Date.parse(a.date) - Date.parse(TODAY)) - Math.abs(Date.parse(b.date) - Date.parse(TODAY));

// ─── The lean state ────────────────────────────────────────────────────────

/** What goes along with one sentence. `said` and `screen` are already pseudonymised. */
export function leanSnapshot(said: string, screen: string, A: Alias, screenList?: string): string {
  const { events, lists, tasks, people } = get();
  const kws = keywords(said);
  const from = addDays(TODAY, -2);
  const to = addDays(TODAY, AHEAD);
  const shown = new Set<string>();
  const take = (es: CalEvent[]) => es.filter((e) => !shown.has(e.id) && (shown.add(e.id), true));

  const series = take(events.filter((e) => e.repeat && !e.work && e.cal !== 'feiertage' && e.date <= addDays(TODAY, 365) && (!e.repeatUntil || e.repeatUntil >= from)).sort(byDate).slice(0, 30));
  const win = take(events.filter((e) => (e.endDate ?? e.date) >= from && e.date <= to).sort(byDate).slice(0, 90));
  const days = new Set(datesIn(said));
  const onDays = take(events.filter((e) => days.has(e.date) || (e.endDate && [...days].some((d) => d >= e.date && d <= e.endDate!))).sort(byDate).slice(0, 15));
  const matched = take(best(events.filter((e) => !shown.has(e.id) && (e.cal !== 'feiertage' || e.date >= TODAY)), (e) => evText(e, A), kws, 10, near)).sort(byDate);

  // Work days further out: only how many and until when, so "alle Arbeitstage im Dezember" uses auswahl.
  const workOut = (['J', 'T'] as const).map((w) => {
    const ws = events.filter((e) => e.work && e.who === w && !shown.has(e.id) && e.date > to).sort(byDate);
    return ws.length ? `${w}: ${ws.length} weitere Arbeitstage von ${day(ws[0].date)} bis ${day(ws[ws.length - 1].date)}` : '';
  }).filter(Boolean);
  const rest = events.length - shown.size;

  const all = facts(lists);
  const fl = all.length <= 15 ? all : best(all, (f) => A.hide(`${f.text} ${f.about ?? ''}`), kws, 12, (a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
  const factLines = fl.map((f) => `${f.id}: ${A.hide(clip(f.text, 160))}${f.about ? ` [über ${A.hide(clip(f.about, 30))}]` : ''}${f.by ? ` (${f.by}${f.at ? `, ${day(f.at)}` : ''})` : f.at ? ` (${day(f.at)})` : ''}`);

  const listLines = lists.filter((l) => !isWissen(l) && !(HIDDEN.points && isPoints(l))).slice(0, 25).map((l: List) => {
    if (isPoints(l)) return `Punkteliste ${l.id} "${A.hide(clip(l.name))}": ${players(l).map((p) => `${p.id} ${A.hide(clip(p.name, 30))} ${total(p)}`).join(', ') || 'noch keine Spieler'}`;
    const items = l.sections.flatMap((x) => x.items);
    const open = items.filter((i) => !i.done);
    const whole = l.id === 'einkauf' || l.id === screenList || open.length <= 3 || hit(A.hide(l.name), kws);
    const pick = whole ? open.slice(0, 40) : open.filter((i) => hit(A.hide(itemText(i)), kws)).slice(0, 15);
    const done = l.id === 'einkauf' || l.id === screenList ? items.filter((i) => i.done).slice(-5) : [];
    const more = open.length - pick.length;
    return [
      `Liste ${l.id} "${A.hide(clip(l.name))}"${open.length ? `, ${open.length} offen` : ' (leer)'}${more > 0 ? `, ${more} davon nicht gezeigt (liste_lesen)` : ''}`,
      ...pick.map((i) => `  ${i.id}: ${A.hide(clip(itemText(i)))}${i.who ? ` (${i.who})` : ''}`),
      ...(done.length ? [`  abgehakt: ${done.map((i) => `${i.id}: ${A.hide(clip(itemText(i), 30))}`).join(', ')}`] : []),
    ].join('\n');
  });
  const taskLines = HIDDEN.tasks ? [] : tasks.filter((t: Task) => !t.done).slice(0, 15).map((t) => `${t.id}: ${A.hide(clip(t.title))}${t.due ? ` bis ${day(t.due)}` : ''}${t.who ? ` (${whoTag(t.who)})` : ''}`);

  const fam = [`Fam1 (J, Elternteil)`, `Fam2 (T, Elternteil)`, ...[...people].sort((a, b) => a.id.localeCompare(b.id)).map((p) => `${A.codes[p.id]} (${p.kind === 'kind' ? 'Kind' : p.kind === 'grosseltern' ? 'Großeltern' : 'Familie'}${p.birthday ? `, geboren ${p.birthday.slice(0, 4)}` : ''})`)];
  return [
    `Familie: ${fam.join(', ')}`,
    `Termine ${day(from)} bis ${day(to)} (id | Tag | Zeit | Titel | Details):\n${win.map((e) => eventLine(e, A)).join('\n') || '(keine)'}`,
    series.length ? `Serien, die weiterlaufen:\n${series.map((e) => eventLine(e, A)).join('\n')}` : '',
    onDays.length ? `An den genannten Tagen:\n${onDays.map((e) => eventLine(e, A)).join('\n')}` : '',
    matched.length ? `Passend zum Satz (auch frühere):\n${matched.map((e) => eventLine(e, A)).join('\n')}` : '',
    workOut.length ? `Arbeitstage weiter weg (für viele davon termin_aendern oder termin_loeschen mit auswahl):\n${workOut.join('\n')}` : '',
    `Nicht gezeigt: ${Math.max(0, rest)} weitere Termine (termine_suchen).`,
    `Familiengedächtnis (${all.length} Fakten${all.length > fl.length ? `, ${fl.length} passende gezeigt, weitere mit gedaechtnis_suchen` : ''}; id: Fakt [über wen] (wer, wann)):\n${factLines.join('\n') || '(nichts Passendes)'}`,
    `Listen (die Liste einkauf ist die Einkaufsliste):\n${listLines.join('\n') || '(keine)'}`,
    taskLines.length ? `Aufgaben:\n${taskLines.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

// ─── Lookups (on the phone) ────────────────────────────────────────────────

const WD_IN: Record<string, number> = { so: 0, su: 0, mo: 1, di: 2, tu: 2, mi: 3, we: 3, do: 4, th: 4, fr: 5, sa: 6 };
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type Auswahl = { suche?: string; von?: string; bis?: string; wochentage?: string[]; arbeit?: boolean };

/** Termine that fit a description; `A.hide` text is matched, so "Fam3" finds Karlo's. */
export function select(q: Auswahl, A: Alias, own = false): CalEvent[] {
  const von = ISO.test(s(q.von)) ? s(q.von) : '';
  const bis = ISO.test(s(q.bis)) ? s(q.bis) : '';
  const wds = (Array.isArray(q.wochentage) ? q.wochentage : []).map((w) => WD_IN[String(w).toLowerCase().slice(0, 2)]).filter((n) => n !== undefined);
  const kws = keywords(A.hide(s(q.suche)));
  if (!von && !bis && !wds.length && typeof q.arbeit !== 'boolean' && !kws.length) return [];
  return get().events.filter((e) =>
    (!own || (!e.cal)) &&
    (!von || (e.endDate ?? e.date) >= von) && (!bis || e.date <= bis) &&
    (!wds.length || wds.includes(weekday(e.date))) &&
    (typeof q.arbeit !== 'boolean' || !!e.work === q.arbeit) &&
    (!kws.length || hit(evText(e, A), kws)));
}

/** Runs one lookup Claude asked for; the answer goes back pseudonymised. */
export function lookup(tool: string, input: Record<string, any>, A: Alias): string {
  const i = input ?? {};
  if (tool === 'termine_suchen') {
    const found = select(i, A);
    const ranged = ISO.test(s(i.von)) || ISO.test(s(i.bis));
    const kws = keywords(A.hide(s(i.suche)));
    const n = new Map(found.map((e) => [e.id, score(evText(e, A), kws)]));
    const sorted = found.sort((a, b) => (n.get(b.id)! - n.get(a.id)!) || (ranged ? byDate(a, b) : near(a, b)));
    const rows = sorted.slice(0, MAX_ROWS);
    const more = found.length - rows.length;
    return rows.length ? `${(ranged ? rows : rows.sort(byDate)).map((e) => eventLine(e, A)).join('\n')}${more > 0 ? `\n(${more} weitere; enger suchen oder für Änderungen an allen auswahl nehmen)` : ''}` : '(nichts gefunden)';
  }
  if (tool === 'liste_lesen') {
    const l = get().lists.find((x) => x.id === s(i.list)) ?? get().lists.find((x) => x.name.toLowerCase() === s(i.list).toLowerCase());
    if (!l || isWissen(l)) return '(diese Liste gibt es nicht)';
    const kws = keywords(A.hide(s(i.suche)));
    const items = l.sections.flatMap((x) => x.items);
    const open = items.filter((x) => !x.done && (!kws.length || hit(A.hide(itemText(x)), kws)));
    const rows = open.slice(0, MAX_ROWS);
    const done = items.filter((x) => x.done && (!kws.length || hit(A.hide(itemText(x)), kws))).slice(-5);
    return [`Liste ${l.id} "${A.hide(clip(l.name))}"`, ...rows.map((x) => `  ${x.id}: ${A.hide(clip(itemText(x)))}${x.who ? ` (${x.who})` : ''}`), ...(open.length > rows.length ? [`  (${open.length - rows.length} weitere offen; mit suche eingrenzen)`] : []), ...(done.length ? [`  abgehakt: ${done.map((x) => `${x.id}: ${A.hide(clip(itemText(x), 30))}`).join(', ')}`] : [])].join('\n');
  }
  if (tool === 'gedaechtnis_suchen') {
    const kws = keywords(A.hide(s(i.suche)));
    const all = facts();
    const found = kws.length ? all.filter((f) => hit(A.hide(`${f.text} ${f.about ?? ''}`), kws)) : all;
    const rows = found.slice(-MAX_ROWS);
    return rows.length ? `${rows.map((f) => `${f.id}: ${A.hide(clip(f.text, 160))}${f.about ? ` [über ${A.hide(clip(f.about, 30))}]` : ''}${f.by ? ` (${f.by}${f.at ? `, ${day(f.at)}` : ''})` : ''}`).join('\n')}${found.length > rows.length ? `\n(${found.length - rows.length} ältere weitere)` : ''}` : '(nichts dazu gemerkt)';
  }
  return '(unbekannte Suche)';
}

export const LOOKUPS = new Set(['termine_suchen', 'liste_lesen', 'gedaechtnis_suchen']);
