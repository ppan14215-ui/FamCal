/**
 * Sample family for the prototype: Julia, Tom and Ben (born 14.09.2026,
 * 6 Wochen alt on "today" 29.10.2026). Texts come from the canvas boards;
 * weekdays were recalculated where the canvas had them wrong (e.g. the
 * canvas said "Fr 7. Nov", 7.11.2026 is a Saturday).
 */
import type { CalEvent, Task, List, InboxItem, Doc, Milestone, Item } from '../state/types';

let n = 0;
const id = (p: string) => `${p}${++n}`;
const it = (name: string, who: Item['who'] = null, done = false, extra: Partial<Item> = {}): Item => ({ id: id('i'), name, who, done, ...extra });

export const events: CalEvent[] = [
  // Diese Woche (Mo 26. bis So 1. Nov)
  { id: 'w-mo', title: 'Arbeit', icon: 'kalender', date: '2026-10-26', start: '09:00', end: '16:00', who: 'T', work: true },
  { id: 'e-hebi', title: 'Hebamme Sarah', sub: 'Nachsorge zu Hause', icon: 'hebamme', date: '2026-10-26', start: '09:00', end: '10:00', who: 'J' },
  { id: 'w-di', title: 'Arbeit', icon: 'kalender', date: '2026-10-27', start: '09:00', end: '16:00', who: 'T', work: true },
  { id: 'e-krabbel', title: 'Krabbelgruppe', sub: 'Gemeindehaus Südstadt', icon: 'fussabdruck', date: '2026-10-27', start: '10:30', end: '11:30', who: 'J' },
  { id: 'w-mi', title: 'Arbeit', icon: 'kalender', date: '2026-10-28', start: '09:00', end: '13:00', who: 'J', work: true },
  { id: 'w-do', title: 'Arbeit', icon: 'kalender', date: '2026-10-29', start: '08:30', end: '16:00', who: 'T', work: true },
  {
    id: 'e-u6', title: 'U6 bei Dr. Weber', sub: 'Tom bringt Ben', icon: 'stethoskop', date: '2026-10-29', start: '09:30', end: '10:15', who: 'T',
    place: 'Kinderarztpraxis Weber · Hauptstr. 12', source: 'Aus der Bestätigung von Doctolib, 12. Oktober',
    bring: [{ id: 'b1', t: 'U-Heft', done: true }, { id: 'b2', t: 'Impfpass', done: false }, { id: 'b3', t: 'Versichertenkarte', done: false }],
  },
  { id: 'e-rueck', title: 'Rückbildung', sub: 'Hebammenpraxis', icon: 'yogamatte', date: '2026-10-29', start: '14:00', end: '15:00', who: 'J', place: 'Hebammenpraxis Lind', repeat: 'Jeden Donnerstag' },
  { id: 'e-pass', title: 'Bürgeramt: Pass', sub: 'Ben muss mit', icon: 'reisepass', date: '2026-10-29', start: '16:00', end: '16:30', who: 'T', place: 'Bürgeramt Mitte', bring: [
    { id: 'b4', t: 'Geburtsurkunde des Kindes', done: true, by: 'assistent', src: 'service.berlin.de', url: 'https://service.berlin.de/dienstleistung/121151' },
    { id: 'b5', t: 'Digitales biometrisches Passfoto vom Fotografen', done: false, who: 'J', by: 'assistent', src: 'service.berlin.de', url: 'https://service.berlin.de/dienstleistung/121151' },
    { id: 'b6', t: 'Ausweise von euch beiden', done: false, by: 'assistent', src: 'service.berlin.de', url: 'https://service.berlin.de/dienstleistung/121151' },
    { id: 'b7', t: 'Falls einer von euch nicht mitkommt: seine Einverständniserklärung und Ausweiskopie', done: false, who: 'J', by: 'assistent', src: 'service.berlin.de', url: 'https://service.berlin.de/dienstleistung/121151' },
    { id: 'b8', t: '37,50 Euro Gebühr (unter 24 Jahren)', done: false, by: 'assistent', src: 'service.berlin.de', url: 'https://service.berlin.de/dienstleistung/121151' },
  ] },
  { id: 'e-oma', title: 'Oma Renate kommt', sub: 'Abendessen', icon: 'kochtopf', date: '2026-10-29', start: '18:30', who: null },
  { id: 'w-fr', title: 'Arbeit', icon: 'kalender', date: '2026-10-30', start: '09:00', end: '14:00', who: 'T', work: true },
  { id: 'e-markt', title: 'Wochenmarkt', sub: 'Gemüse für die Woche', icon: 'einkauf', date: '2026-10-30', start: '11:00', end: '12:30', who: 'J' },
  { id: 'e-zoo', title: 'Zoo mit Lena', sub: 'Kinderwagen mitnehmen', icon: 'kinderwagen', date: '2026-11-01', start: '15:00', end: '17:00', who: 'both' },
  // Rest Oktober
  { id: 'e-r1', title: 'Rückbildung', sub: 'Hebammenpraxis', icon: 'yogamatte', date: '2026-10-01', start: '14:00', who: 'J' },
  { id: 'e-r2', title: 'Rückbildung', sub: 'Hebammenpraxis', icon: 'yogamatte', date: '2026-10-08', start: '14:00', who: 'J' },
  { id: 'e-kk', title: 'Krankenkasse anrufen', sub: 'Ben anmelden', icon: 'telefon', date: '2026-10-12', start: '10:00', who: 'T' },
  { id: 'e-u3', title: 'U3 bei Dr. Weber', sub: 'erledigt', icon: 'u-heft', date: '2026-10-14', start: '10:30', who: 'T' },
  { id: 'e-r3', title: 'Rückbildung', sub: 'Hebammenpraxis', icon: 'yogamatte', date: '2026-10-15', start: '14:00', who: 'J' },
  { id: 'e-lena', title: 'Geburtstag Lena', sub: 'Kaffee bei Lena', icon: 'geburtstag', date: '2026-10-17', start: '15:00', who: 'both' },
  { id: 'e-r4', title: 'Rückbildung', sub: 'Hebammenpraxis', icon: 'yogamatte', date: '2026-10-22', start: '14:00', who: 'J' },
  { id: 'e-essen', title: 'Essen bei Lena', sub: 'Nachtisch mitbringen', icon: 'kochtopf', date: '2026-10-22', start: '18:30', who: 'both' },
  { id: 'e-floh', title: 'Babyflohmarkt', sub: 'Schule am Park', icon: 'kinderwagen', date: '2026-10-24', start: '10:00', who: 'J' },
  // November
  { id: 'e-inge', title: 'Oma Inge wird 70', sub: 'Geburtstag', icon: 'geschenk', date: '2026-11-02', start: '12:00', who: 'both' },
  { id: 'e-fb1', title: 'Fußball', sub: 'Sportplatz Süd', icon: 'fussball', date: '2026-11-03', start: '19:00', end: '20:30', who: 'T', repeat: 'Jeden Dienstag' },
  { id: 'e-r5', title: 'Rückbildung', sub: 'Hebammenpraxis', icon: 'yogamatte', date: '2026-11-05', start: '14:00', who: 'J' },
  { id: 'e-u5', title: 'U5 bei Dr. Weber', sub: 'Kinderarztpraxis Weber', icon: 'stethoskop', date: '2026-11-12', start: '09:30', end: '10:15', who: 'T' },
];

export const tasks: Task[] = [
  { id: 't-besch', title: 'Bescheinigung anfragen', icon: 'umschlag-euro', due: '2026-11-28', dueLabel: 'bis 28. Nov', frist: true, who: 'T', done: false },
  { id: 't-foto', title: 'Passfotos machen', icon: 'reisepass', due: '2026-10-29', dueLabel: 'heute fällig', who: 'J', done: false },
  { id: 't-urk', title: 'Geburtsurkunde abholen', icon: 'urkunde', who: 'J', done: true, doneBy: 'J' },
  // Ohne Zuständigen: landen im Kartenstapel "Aufgaben aufteilen".
  { id: 't-inge', title: 'Geschenk für Oma Inge', icon: 'geschenk', due: '2026-11-01', dueLabel: 'bis So 1. Nov', who: null, done: false, text: '70. Geburtstag. Julia hat eine Idee notiert: Fotobuch vom ersten Monat.' },
  { id: 't-windel', title: 'Windeln Größe 3 bestellen', icon: 'windeln', dueLabel: 'ab Dezember', who: null, done: false, text: 'Ben wächst aus Größe 2 raus. Eine Packung zum Testen reicht.' },
  { id: 't-kochen', title: 'Essen für Sonntag planen', icon: 'kochtopf', due: '2026-11-01', dueLabel: 'bis So 1. Nov', who: null, done: false, text: 'Oma Renate und Opa kommen zum Mittagessen. Einer kocht, einer kauft ein.' },
  { id: 't-kita', title: 'Kita-Platz anfragen', icon: 'kita', dueLabel: 'bis Ende Januar', who: null, done: false, text: 'Für den Start im Herbst 2027. Anmeldung über das Kita-Portal der Stadt.' },
];

export const shopping: List = {
  id: 'einkauf', name: 'Einkauf', icon: 'einkauf', kind: 'shopping',
  sections: [
    { id: 'drogerie', title: 'Drogerie', items: [it('Windeln Gr. 2', 'J', false, { note: 'ab Dezember Größe 3' }), it('Wundcreme', 'T')] },
    { id: 'supermarkt', title: 'Supermarkt', items: [it('Hafermilch', 'T', false, { qty: 2, note: 'ungesüßt' }), it('Brot', 'J'), it('Kaffee', 'J'), it('Bananen', 'T', true)] },
  ],
};

export const kliniktasche = (): List => ({
  id: id('l'), name: 'Kliniktasche', icon: 'hebamme', kind: 'packing',
  sections: [
    { id: id('s'), title: 'Für Julia', items: [it('Mutterpass', null, true), it('Bequeme Kleidung', null, true), it('Stilleinlagen', 'J'), it('Ladekabel, lang', 'T'), it('Hausschuhe', null, true), it('Waschzeug', null, true), it('Still-BH', null, true), it('Snacks für die Nacht')] },
    { id: id('s'), title: 'Für Ben', items: [it('Erstes Outfit, Größe 50', null, true), it('Babyschale fürs Auto', 'T', false, { note: 'vor der Entlassung einbauen' }), it('Body, Größe 56', null, true), it('Mütze', null, true), it('Spucktücher', null, true), it('Decke', 'J')] },
    { id: id('s'), title: 'Für Tom', items: [it('Wechselkleidung', null, true), it('Snacks und Getränke', null, true), it('Kamera', null, true), it('Kleingeld fürs Parkhaus', 'T')] },
  ],
});

const fresh = (names: string[][]): { title: string; names: string[] }[] => names.map(([title, ...rest]) => ({ title, names: rest }));

/** Templates for "Neue Liste". */
export const templates = {
  urlaub: fresh([
    ['Für Ben', 'Windeln', 'Feuchttücher', 'Wickelunterlage', 'Bodys', 'Strampler', 'Mütze', 'Schlafsack', 'Spucktücher', 'Fläschchen', 'Schnuller', 'Lieblingsrassel', 'Babytrage', 'Sonnencreme Baby', 'Kinderreisepass', 'Versichertenkarte', 'Thermometer'],
    ['Für euch', 'Ladekabel', 'Medikamente', 'Wanderschuhe', 'Regenjacke'],
    ['Unterwegs', 'Kinderwagen', 'Babyschale', 'Snacks', 'Wasser'],
  ]),
  erstausstattung: fresh([
    ['Schlafen', 'Beistellbett', 'Schlafsack', 'Matratze'],
    ['Wickeln', 'Wickelauflage', 'Windeln Gr. 1', 'Feuchttücher', 'Wundcreme'],
    ['Anziehen', 'Bodys Gr. 50/56', 'Strampler', 'Mützchen', 'Söckchen'],
    ['Unterwegs', 'Kinderwagen', 'Babyschale', 'Tragetuch'],
  ]),
  geschenke: fresh([
    ['Oma Inge, 70', 'Fotobuch vom ersten Monat'],
    ['Mia, 3', 'Holzpuzzle'],
  ]),
};

export function listFromTemplate(name: string, icon: List['icon'], tpl: { title: string; names: string[] }[] | null): List {
  return {
    id: id('l'), name, icon, kind: 'packing',
    sections: tpl ? tpl.map((s) => ({ id: id('s'), title: s.title, items: s.names.map((x) => it(x)) })) : [{ id: id('s'), title: 'Liste', items: [] }],
  };
}

export const geschenke = (): List => listFromTemplate('Geschenke', 'geschenk', templates.geschenke);

export const inbox: InboxItem[] = [
  {
    id: 'in-doc', icon: 'brief-gelesen', src: 'Mail von Doctolib · vor 10 Min', title: 'Impftermin Mo 9. Nov, 10:20', made: 'wird Termin für Ben', state: 'ask',
    adds: { event: { id: 'e-impf', title: 'Erste Impfungen', sub: 'Kinderarztpraxis Weber', icon: 'impfung', date: '2026-11-09', start: '10:20', end: '10:50', who: null, source: 'Aus der Mail von Doctolib', bring: [{ id: 'b6', t: 'Impfpass', done: false }, { id: 'b7', t: 'U-Heft', done: false }] } },
  },
  {
    id: 'in-mia', icon: 'geburtstag', src: 'Foto von Julia · gestern', title: 'Einladung: Mias 3. Geburtstag', made: 'So 8. Nov · Geschenk als Aufgabe', state: 'ask',
    adds: {
      event: { id: 'e-mia', title: 'Mias 3. Geburtstag', sub: 'bei Familie Berg', icon: 'geburtstag', date: '2026-11-08', start: '15:00', end: '17:30', who: 'both' },
      task: { id: 't-mia', title: 'Geschenk für Mia', icon: 'geschenk', due: '2026-11-07', dueLabel: 'bis Sa 7. Nov', who: null, done: false, text: 'Mia wird 3. Auf der Einladung steht: gern etwas zum Basteln.' },
    },
  },
  { id: 'in-eg', icon: 'umschlag-euro', src: 'Foto von Tom · Do', title: 'Elterngeld: Bescheinigung fehlt', made: 'Frist 12. Dez · Aufgabe Tom', state: 'ok' },
];

export const docs: Doc[] = [
  { id: 'd-eg', icon: 'umschlag-euro', title: 'Elterngeld: Bescheinigung', sub: '', group: 'frist', frist: '2026-12-12', route: '/infozettel', who: 'T' },
  { id: 'd-handy', icon: 'vertrag', title: 'Handyvertrag Tom kündbar', sub: 'bis 31. Jan', group: 'frist', frist: '2027-01-31' },
  { id: 'd-urk', icon: 'urkunde', title: 'Geburtsurkunde', sub: 'liegt vor · 3 Kopien', group: 'ben' },
  { id: 'd-kk', icon: 'krankenkasse', title: 'Versichertenkarte', sub: 'angefragt 20. Okt', group: 'ben' },
  { id: 'd-pass', icon: 'reisepass', title: 'Kinderreisepass', sub: 'fehlt · Urlaub im März', group: 'ben', missing: true, who: null },
];

/** Bens erstes Jahr: from birth date and Bundesland (Bayern). */
export const milestones: Milestone[] = [
  { id: 'm-kg', icon: 'kindergeld', title: 'Kindergeld', sub: 'beantragt', date: '2026-10-02', done: true },
  { id: 'm-u3', icon: 'u-heft', title: 'U3', sub: '4.–5. Woche', date: '2026-10-14', done: true },
  { id: 'm-impf', icon: 'impfung', title: 'Erste Impfungen', sub: 'ab 8. Woche · Mo 9. Nov', date: '2026-11-09', done: false, text: 'Beim Kinderarzt. Impfpass mitnehmen.' },
  { id: 'm-eg', icon: 'umschlag-euro', title: 'Elterngeld', sub: 'Frist 12. Dez', date: '2026-12-12', frist: true, done: false, who: 'T', text: 'Braucht eine Bescheinigung von Toms Arbeitgeber.' },
  { id: 'm-u4', icon: 'stethoskop', title: 'U4', sub: '3.–4. Monat · Jan', date: '2027-01-11', done: false },
  { id: 'm-impf2', icon: 'impfung', title: 'Zweite Impfungen', sub: 'mit der U4', date: '2027-01-12', done: false },
  { id: 'm-pass', icon: 'reisepass', title: 'Kinderreisepass', sub: 'vor dem Urlaub im März', date: '2027-02-27', done: false },
  { id: 'm-u5', icon: 'u-heft', title: 'U5', sub: '6.–7. Monat · ab 14. März', date: '2027-03-14', done: false },
  { id: 'm-urlaub', icon: 'reise', title: 'Ostsee', sub: '20.–27. März', date: '2027-03-20', done: false },
  { id: 'm-kita', icon: 'kita', title: 'Kita-Anmeldung', sub: 'für Herbst 2027', date: '2027-01-31', done: false },
  { id: 'm-u6', icon: 'stethoskop', title: 'U6', sub: '10.–12. Monat', date: '2027-07-14', done: false },
  { id: 'm-bday', icon: 'geburtstag', title: 'Erster Geburtstag', sub: 'Di 14. Sep 2027', date: '2027-09-14', done: false },
];

/** Cards for onboarding "Wer kümmert sich?" (6 cards, canvas row 0). */
export const onboardingCards: Task[] = [
  { id: 'o-eg', title: 'Elterngeld beantragen', icon: 'umschlag-euro', dueLabel: 'Frist 12. Dez · noch 6 Wochen', frist: true, who: null, done: false, text: 'Braucht eine Bescheinigung von Toms Arbeitgeber. Rückwirkend gibt es nur drei Monate.' },
  { id: 'o-impf', title: 'Erste Impfungen', icon: 'impfung', dueLabel: 'Mo 9. Nov · in 11 Tagen', frist: true, who: null, done: false, text: 'Beim Kinderarzt. Impfpass mitnehmen.' },
  { id: 'o-pass', title: 'Kinderreisepass', icon: 'reisepass', dueLabel: 'vor dem Urlaub im März', who: null, done: false, text: 'Termin beim Bürgeramt, Ben muss mit. Passfoto vorher machen.' },
  { id: 'o-kk', title: 'Versichertenkarte für Ben', icon: 'krankenkasse', dueLabel: 'angefragt 20. Okt', who: null, done: false, text: 'Die Krankenkasse schickt sie per Post. Nachhaken, wenn sie bis Mitte November fehlt.' },
  { id: 'o-kita', title: 'Kita-Platz anfragen', icon: 'kita', dueLabel: 'bis Ende Januar', who: null, done: false, text: 'Für den Start im Herbst 2027. Anmeldung über das Kita-Portal der Stadt.' },
  { id: 'o-u4', title: 'U4 ausmachen', icon: 'stethoskop', dueLabel: '3.–4. Monat · Januar', who: null, done: false, text: 'Bei Dr. Weber anrufen, am besten gleich mit den zweiten Impfungen.' },
];

/** What "Oft bei euch" and the add field suggest. */
export const catalog: { name: string; section: 'drogerie' | 'supermarkt'; last?: string }[] = [
  { name: 'Hafermilch', section: 'supermarkt', last: 'zuletzt vor 5 Tagen' },
  { name: 'Haferflocken', section: 'supermarkt' },
  { name: 'Handcreme', section: 'drogerie' },
  { name: 'Windeln Gr. 2', section: 'drogerie' },
  { name: 'Feuchttücher', section: 'drogerie' },
  { name: 'Brot', section: 'supermarkt' },
  { name: 'Bananen', section: 'supermarkt' },
  { name: 'Kaffee', section: 'supermarkt' },
  { name: 'Milch', section: 'supermarkt' },
  { name: 'Eier', section: 'supermarkt' },
  { name: 'Wundcreme', section: 'drogerie' },
  { name: 'Äpfel', section: 'supermarkt' },
  { name: 'Käse', section: 'supermarkt' },
  { name: 'Shampoo', section: 'drogerie' },
  { name: 'Zahnpasta', section: 'drogerie' },
];

export const oftBeiEuch = ['Windeln Gr. 2', 'Feuchttücher', 'Brot', 'Bananen', 'Kaffee', 'Milch', 'Eier', 'Wundcreme'];

const DROGERIE = ['windel', 'creme', 'feucht', 'shampoo', 'zahn', 'seife', 'wasch', 'tücher', 'tuecher', 'pflaster', 'stilleinlagen', 'dusch', 'deo', 'schnuller'];
export function sectionFor(name: string): 'drogerie' | 'supermarkt' {
  const k = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (k) return k.section;
  const l = name.toLowerCase();
  return DROGERIE.some((w) => l.includes(w)) ? 'drogerie' : 'supermarkt';
}

/**
 * "2 Hafermilch, ungesüßt" → qty 2, name Hafermilch, note ungesüßt.
 * Julian 26.10.: Menge und Notiz werden aus dem Text gelesen.
 */
export function parseItem(text: string): { name: string; qty?: number; note?: string } {
  let t = text.trim();
  let qty: number | undefined;
  let unit: string | undefined;
  // "500 g Mehl": number plus unit becomes the note, "2 Hafermilch" a quantity.
  // Recipe lines too (Julian 28.10.: Rezept per Link): "2 EL Tomatenmark", "1 ½ Dosen Tomaten", "1 Prise Salz".
  const u = t.match(/^((?:\d+(?:[.,]\d+)?(?:\s*[½¼¾])?|[½¼¾])\s*(?:g|kg|ml|l|cl|dl|Stk|Stück|Pck|Pkt|Packung(?:en)?|EL|TL|Dose[n]?|Becher|Bund|Prise[n]?|Zehe[n]?|Scheibe[n]?|Tasse[n]?|Glas|Gläser|Msp|Schuss|cups?|tbsp|tsp|oz|lbs?|cans?|cloves?|pinch)\.?)\s+(.+)$/i);
  const m = !u && t.match(/^(\d+)(?:\s*x)?\s+(.+)$/i);
  if (u) { unit = u[1]; t = u[2]; } else if (m) { qty = Number(m[1]); t = m[2]; }
  const [name, ...rest] = t.split(',');
  const note = [unit, rest.join(',').trim()].filter(Boolean).join(', ') || undefined;
  return { name: name.trim(), qty: qty && qty > 1 ? qty : undefined, note };
}
export function itemText(i: Item): string {
  return `${i.qty ? i.qty + ' ' : ''}${i.name}${i.note ? ', ' + i.note : ''}`;
}
export function itemMeta(i: Item): string | undefined {
  const parts = [i.qty ? String(i.qty) : null, i.note ?? null].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export const newId = id;
