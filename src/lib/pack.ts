/**
 * Mitdenken (Julian 29.10.: "Du fährst mit deinem 2 Monate alten Baby in den
 * Urlaub, und das sind die Dinge, die du mitbringen solltest"). A trip in the
 * calendar offers its own packing list, made for this family: the children's
 * ages, how long, where to. Claude writes it on the server; without a
 * connection the rules build one from the same ages.
 */
import { supabase } from './cloud';
import { getAuth } from './auth';
import { LANG, tx } from '../i18n/lang';
import { get, actions } from '../state/store';
import { newId } from '../data/sample';
import type { CalEvent, List } from '../state/types';

const TRIP = /urlaub|reise|ferien|ostsee|nordsee|meer|strand|berge|ski|camping|wochenende in|trip|holiday|vacation|travel/i;

/** A Termin that is a trip: by its words, its icon, or two or more days away. */
export function isTrip(e: Pick<CalEvent, 'title' | 'icon' | 'date' | 'endDate' | 'allDay' | 'work'>) {
  if (e.work) return false;
  return TRIP.test(e.title) || e.icon === 'reise' || e.icon === 'flugzeug' || (!!e.allDay && !!e.endDate && e.endDate > e.date && /\b(bei|zu|nach|in|to|at)\b/i.test(e.title));
}

export const packListFor = (eventId: string) => get().lists.find((l) => l.forEvent === eventId);

const months = (birthday: string, at: string) => {
  const b = new Date(`${birthday}T12:00:00`), d = new Date(`${at}T12:00:00`);
  return Math.max(0, (d.getFullYear() - b.getFullYear()) * 12 + d.getMonth() - b.getMonth() - (d.getDate() < b.getDate() ? 1 : 0));
};

/** The children with their age on the day the trip starts. */
export function kidsOn(date: string) {
  return get().people.filter((p) => p.kind === 'kind' && p.birthday).map((p) => ({ name: p.name, months: months(p.birthday!, date) }));
}

export const ageText = (m: number) => (m < 24 ? tx(`${m} ${m === 1 ? 'Monat' : 'Monate'}`, `${m} ${m === 1 ? 'month' : 'months'}`) : tx(`${Math.floor(m / 12)} Jahre`, `${Math.floor(m / 12)} years`));

type Sections = { title: string; items: string[] }[];

/** Offline: the same thinking as rules, by age and length. */
function byRules(e: CalEvent, kids: { name: string; months: number }[]): Sections {
  const days = e.endDate ? Math.round((Date.parse(e.endDate) - Date.parse(e.date)) / 864e5) + 1 : 2;
  const out: Sections = [];
  for (const k of kids) {
    const items = k.months < 12
      ? [tx(`Windeln (${days * 7})`, `Nappies (${days * 7})`), tx('Feuchttücher', 'Wipes'), tx('Wickelunterlage', 'Changing mat'), tx(`Bodys (${days + 2})`, `Bodysuits (${days + 2})`), tx('Strampler', 'Sleepsuits'), tx('Mütze', 'Hat'), tx('Schlafsack', 'Sleeping bag'), tx('Spucktücher', 'Muslins'), tx('Fläschchen', 'Bottles'), tx('Schnuller', 'Dummy'), tx('Babytrage', 'Baby carrier'), tx('Babyschale', 'Infant car seat'), tx('Reisebett', 'Travel cot'), tx('Fieberthermometer', 'Thermometer'), tx('Kinderreisepass', 'Child passport'), tx('Impfpass', 'Vaccination card')]
      : k.months < 48
        ? [tx(`Windeln (${days * 5})`, `Nappies (${days * 5})`), tx('Feuchttücher', 'Wipes'), tx(`Wechselkleidung (${days + 2})`, `Spare clothes (${days + 2})`), tx('Schlafanzug', 'Pyjamas'), tx('Kuscheltier', 'Cuddly toy'), tx('Trinkflasche', 'Water bottle'), tx('Snacks', 'Snacks'), tx('Buggy', 'Buggy'), tx('Kindersitz', 'Car seat'), tx('Sonnenhut', 'Sun hat'), tx('Kinderreisepass', 'Child passport')]
        : [tx(`Kleidung für ${days} Tage`, `Clothes for ${days} days`), tx('Schlafanzug', 'Pyjamas'), tx('Kuscheltier', 'Cuddly toy'), tx('Bücher oder Spiele', 'Books or games'), tx('Kopfhörer', 'Headphones'), tx('Trinkflasche', 'Water bottle'), tx('Kinderreisepass', 'Child passport')];
    out.push({ title: tx(`Für ${k.name}`, `For ${k.name}`), items });
  }
  out.push({ title: tx('Für euch', 'For you'), items: [tx(`Kleidung für ${days} Tage`, `Clothes for ${days} days`), tx('Ladekabel', 'Chargers'), tx('Medikamente', 'Medication'), tx('Ausweise', 'IDs'), tx('Versichertenkarten', 'Health cards'), tx('Kulturbeutel', 'Toiletries')] });
  out.push({ title: tx('Unterwegs', 'On the way'), items: [tx('Snacks', 'Snacks'), tx('Wasser', 'Water'), ...(kids.some((k) => k.months < 12) ? [tx('Wickeltasche', 'Changing bag')] : [])] });
  return out;
}

async function byClaude(e: CalEvent, kids: { name: string; months: number }[]): Promise<Sections | null> {
  if (!supabase || !getAuth().session) return null;
  const { data, error } = await supabase.functions.invoke<{ sections: Sections | null }>('liste', {
    body: { action: 'packliste', trip: e.title, place: e.place ?? '', from: e.date, to: e.endDate ?? e.date, kids, lang: LANG },
  });
  return error || !data?.sections?.length ? null : data.sections;
}

/** Makes the list for this trip and returns it; the same trip never gets two. */
export async function makePackList(e: CalEvent): Promise<List> {
  const have = packListFor(e.id);
  if (have) return have;
  const kids = kidsOn(e.date);
  const sections = (await byClaude(e, kids).catch(() => null)) ?? byRules(e, kids);
  const again = packListFor(e.id);
  if (again) return again;
  const l: List = {
    id: newId('l'), name: tx(`Packliste ${e.title}`, `Packing ${e.title}`), icon: 'reise', kind: 'packing', forEvent: e.id,
    sections: sections.slice(0, 8).map((s) => ({ id: newId('s'), title: s.title.slice(0, 60), items: s.items.slice(0, 40).map((n) => ({ id: newId('i'), name: n.slice(0, 80), who: null, done: false })) })),
  };
  actions.createList(l);
  return l;
}
