/**
 * What the app knows about a city (Julian 26.10.: "Namen und Stadt zuerst,
 * dann zeigen, was die KI daraus zieht"). In the product the assistant looks
 * this up on the city's own website; the prototype carries a few cities that
 * were checked by hand on 26.10.2026. Every fact keeps its source, so the app
 * can always say where it comes from.
 */
import type { Bring } from '../state/types';

export type Source = { label: string; url: string };
export type City = {
  name: string;
  land: string;
  /** Where passports and ID cards are applied for. */
  amt: string;
  amtNote?: string;
  pass: Source;
  kita: { name: string; how: string; url?: string; src: Source };
};

const NRW_FAMILIE: Source = { label: 'familienportal.nrw', url: 'https://www.familienportal.nrw/de/0-bis-1-jahre/freizeit/reisedokumente-fuer-kinder' };
const ELTERNFRISTEN: Source = { label: 'elternfristen.de', url: 'https://www.elternfristen.de/kita' };

export const CITIES: City[] = [
  {
    name: 'Köln', land: 'Nordrhein-Westfalen', amt: 'Kundenzentrum', amtNote: 'Montags und mittwochs ohne Termin.',
    pass: { label: 'stadt-koeln.de', url: 'https://www.stadt-koeln.de/service/produkte/00417/index.html' },
    kita: { name: 'LITTLE BIRD', how: 'Bis zu fünf Wunsch-Kitas pro Kita-Jahr online vormerken.', url: 'https://portal-koeln.little-bird.de/', src: { label: 'portal-koeln.little-bird.de', url: 'https://portal-koeln.little-bird.de/' } },
  },
  {
    name: 'München', land: 'Bayern', amt: 'Bürgerbüro',
    pass: { label: 'bayernportal.de', url: 'https://www.bayernportal.de/dokumente/leistung/9332988744' },
    kita: { name: 'kita finder+', how: 'Online anmelden, frühestens 12 Monate vor Betreuungsbeginn.', url: 'https://kitafinder.muenchen.de/elternportal/de/index.html', src: { label: 'kitafinder.muenchen.de', url: 'https://kitafinder.muenchen.de/elternportal/de/index.html' } },
  },
  {
    name: 'Düsseldorf', land: 'Nordrhein-Westfalen', amt: 'Bürgerbüro',
    pass: NRW_FAMILIE,
    kita: { name: 'Kita-Navigator', how: 'Eltern-Login anlegen und Wunsch-Kitas vormerken.', url: 'https://duesseldorf.kita-navigator.org/suche/', src: { label: 'duesseldorf.de', url: 'https://www.duesseldorf.de/familie/kinderbetreuung/kita-navigator' } },
  },
  {
    name: 'Berlin', land: 'Berlin', amt: 'Bürgeramt',
    pass: { label: 'service.berlin.de', url: 'https://service.berlin.de/dienstleistung/121151' },
    kita: { name: 'Kita-Gutschein', how: 'Erst den Gutschein beim Jugendamt beantragen, dann direkt bei Kitas anfragen.', src: ELTERNFRISTEN },
  },
  {
    name: 'Hamburg', land: 'Hamburg', amt: 'Kundenzentrum',
    pass: { label: 'hamburg.de', url: 'https://www.hamburg.de/service/info/11265043/n0' },
    kita: { name: 'Kita-Gutschein', how: 'Erst den Gutschein beim Bezirksamt beantragen, dann direkt bei Kitas anfragen.', src: ELTERNFRISTEN },
  },
];

export const findCity = (q?: string | null): City | undefined => {
  const n = (q ?? '').trim().toLowerCase().replace(/^stadt\s+/, '');
  if (!n) return undefined;
  return CITIES.find((c) => c.name.toLowerCase() === n || (n.length >= 3 && c.name.toLowerCase().startsWith(n)));
};

/**
 * Reisepass for a baby (the Kinderreisepass is gone since 1.1.2024). Same
 * rules everywhere in Germany; checked on familienportal.nrw, stadt-koeln.de
 * and service.berlin.de on 26.10.2026. The city only changes the source.
 */
export function passBring(city?: City): Bring[] {
  const src = city?.pass ?? NRW_FAMILIE;
  const a = (id: string, t: string): Bring => ({ id: `${id}-${Math.random().toString(36).slice(2, 6)}`, t, done: false, by: 'assistent', src: src.label, url: src.url });
  return [
    a('pass-gu', 'Geburtsurkunde des Kindes'),
    a('pass-foto', 'Digitales biometrisches Passfoto vom Fotografen'),
    a('pass-ausweise', 'Ausweise von euch beiden'),
    a('pass-zust', 'Falls einer von euch nicht mitkommt: seine Einverständniserklärung und Ausweiskopie'),
    a('pass-kind', 'Das Kind selbst, es muss dabei sein'),
    a('pass-geb', '37,50 Euro Gebühr (unter 24 Jahren)'),
  ];
}

/** Titles that mean "passport or ID at the city office". */
export const isPassTermin = (title: string) => /pass|ausweis|bürgeramt|buergeramt|kundenzentrum|bürgerbüro/i.test(title);
