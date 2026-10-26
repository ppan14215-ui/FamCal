/** All clay icons offered under "Alle", grouped as on the canvas, with German names for search. */
import type { ClayName } from '../lib/clayIcons';

export const SYMBOL_GROUPS: { title: string; icons: ClayName[] }[] = [
  { title: 'Sport', icons: ['fussball', 'schwimmen', 'turnen', 'tanzen', 'laufen', 'radfahren', 'tennis', 'reiten', 'yogamatte', 'pilates', 'klettern', 'fitness', 'basketball', 'handball', 'volleyball', 'ski', 'kanu', 'segeln'] },
  { title: 'Gesundheit', icons: ['stethoskop', 'zahnarzt', 'impfung', 'hebamme', 'apotheke', 'ultraschall', 'u-heft', 'tierarzt', 'thermometer', 'medizin'] },
  { title: 'Familie und Zuhause', icons: ['geburtstag', 'geschenk', 'kochtopf', 'kita', 'schule', 'haustier', 'putzen', 'handwerker', 'einladung', 'musik', 'buch', 'zuhause'] },
  { title: 'Amt und Geld', icons: ['amt', 'vertrag', 'umschlag-euro', 'versicherung', 'steuer', 'reisepass', 'kindergeld', 'krankenkasse', 'urkunde', 'rechnung'] },
  { title: 'Unterwegs', icons: ['auto', 'flugzeug', 'reise', 'kinderwagen', 'rucksack', 'wandern', 'babyschale', 'ort'] },
];

const LABEL: Partial<Record<ClayName, string>> = {
  fussball: 'Fußball', schwimmen: 'Schwimmen', turnen: 'Turnen', tanzen: 'Tanzen', laufen: 'Laufen', radfahren: 'Radfahren', tennis: 'Tennis', reiten: 'Reiten',
  yogamatte: 'Kurs', pilates: 'Pilates', klettern: 'Klettern', fitness: 'Fitness', basketball: 'Basketball', handball: 'Handball', volleyball: 'Volleyball', ski: 'Ski', kanu: 'Kanu', segeln: 'Segeln',
  stethoskop: 'Arzt', zahnarzt: 'Zahnarzt', impfung: 'Impfung', hebamme: 'Hebamme', apotheke: 'Apotheke', ultraschall: 'Ultraschall', 'u-heft': 'U-Untersuchung', tierarzt: 'Tierarzt', thermometer: 'Krank', medizin: 'Medizin',
  geburtstag: 'Familie', geschenk: 'Geschenk', kochtopf: 'Essen', kita: 'Kita', schule: 'Schule', haustier: 'Haustier', putzen: 'Putzen', handwerker: 'Handwerker', einladung: 'Einladung', musik: 'Musik', buch: 'Lesen', zuhause: 'Zuhause',
  amt: 'Amt', vertrag: 'Amt', 'umschlag-euro': 'Geld', versicherung: 'Versicherung', steuer: 'Steuer', reisepass: 'Ausweis', kindergeld: 'Kindergeld', krankenkasse: 'Krankenkasse', urkunde: 'Urkunde', rechnung: 'Rechnung',
  auto: 'Auto', flugzeug: 'Flug', reise: 'Reise', kinderwagen: 'Spaziergang', rucksack: 'Ausflug', wandern: 'Wandern', babyschale: 'Autofahrt', ort: 'Ort',
};

export const symbolLabel = (n: ClayName) => LABEL[n] ?? n[0].toUpperCase() + n.slice(1);
export const isSport = (n: ClayName) => SYMBOL_GROUPS[0].icons.includes(n) && n !== 'yogamatte';
