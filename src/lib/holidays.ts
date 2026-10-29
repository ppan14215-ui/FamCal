/**
 * Holidays for every country (Julian 29.10.: "wenn man aus den USA joined sollte es ähnlich
 * funktionieren"). Germany is computed on the phone (src/lib/feiertage.ts), with Bundesland
 * and, in Bayern, the Gemeinde. Every other country comes once a year from Nager.Date
 * (date.nager.at, free, no key, only the country code is sent) and is kept on the phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { feiertage, setForeign, setWhere } from './feiertage';
import { tx } from '../i18n/lang';

export type Day = [date: string, name: string];
type Nager = { date: string; localName: string; name: string; global: boolean; counties: string[] | null; types: string[] };

/** Countries offered first; the phone's own country is always added. Names in German and English. */
export const COUNTRIES: [code: string, de: string, en: string][] = [
  ['DE', 'Deutschland', 'Germany'], ['AT', 'Österreich', 'Austria'], ['CH', 'Schweiz', 'Switzerland'],
  ['US', 'USA', 'United States'], ['GB', 'Großbritannien', 'United Kingdom'], ['IE', 'Irland', 'Ireland'],
  ['CA', 'Kanada', 'Canada'], ['AU', 'Australien', 'Australia'], ['NZ', 'Neuseeland', 'New Zealand'],
  ['NL', 'Niederlande', 'Netherlands'], ['BE', 'Belgien', 'Belgium'], ['LU', 'Luxemburg', 'Luxembourg'],
  ['FR', 'Frankreich', 'France'], ['ES', 'Spanien', 'Spain'], ['PT', 'Portugal', 'Portugal'],
  ['IT', 'Italien', 'Italy'], ['DK', 'Dänemark', 'Denmark'], ['SE', 'Schweden', 'Sweden'],
  ['NO', 'Norwegen', 'Norway'], ['FI', 'Finnland', 'Finland'], ['PL', 'Polen', 'Poland'],
  ['CZ', 'Tschechien', 'Czechia'], ['HU', 'Ungarn', 'Hungary'], ['GR', 'Griechenland', 'Greece'],
  ['TR', 'Türkei', 'Türkiye'], ['MX', 'Mexiko', 'Mexico'], ['BR', 'Brasilien', 'Brazil'],
  ['ZA', 'Südafrika', 'South Africa'], ['JP', 'Japan', 'Japan'], ['SG', 'Singapur', 'Singapore'],
];
export const countryName = (c: string) => { const r = COUNTRIES.find(([k]) => k === c); return r ? tx(r[1], r[2]) : c; };

export const LANDS_DE = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'];
const US: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** The country the phone is set to, Germany if it says nothing. */
export function phoneCountry(): string {
  try { return (getLocales()[0]?.regionCode ?? 'DE').toUpperCase(); } catch { return 'DE'; }
}

/** Regions to pick from: Bundesländer, US states, otherwise the codes the holidays mention. */
export function regions(country: string): { key: string; label: string }[] {
  if (country === 'DE') return LANDS_DE.map((l) => ({ key: l, label: l }));
  if (country === 'US') return Object.entries(US).map(([k, v]) => ({ key: `US-${k}`, label: v }));
  return [...new Set(regionCodes.get(country) ?? [])].sort().map((k) => ({ key: k, label: k.replace(`${country}-`, '') }));
}
export const regionName = (country: string, region: string) => (country === 'US' ? US[region.replace('US-', '')] ?? region : region.replace(`${country}-`, ''));

const regionCodes = new Map<string, string[]>();
const KEY = (c: string, y: number) => `famcal.holidays.${c}.${y}`;

async function year(country: string, y: number): Promise<Nager[]> {
  try {
    const kept = await AsyncStorage.getItem(KEY(country, y));
    if (kept) return JSON.parse(kept);
  } catch {}
  try {
    const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${country}`);
    if (!r.ok) return [];
    const list = (await r.json()) as Nager[];
    AsyncStorage.setItem(KEY(country, y), JSON.stringify(list)).catch(() => {});
    return list;
  } catch { return []; }
}

/** Days off for this country and region, this year and next. Only real public holidays, not observances. */
export async function holidaysFor(country: string, region: string, ort: string, from: number): Promise<Day[]> {
  setWhere(country === 'DE' ? region : '', ort);
  if (country === 'DE') { setForeign('DE', []); return [...feiertage(from, region, ort), ...feiertage(from + 1, region, ort)]; }
  const all = [...(await year(country, from)), ...(await year(country, from + 1))];
  regionCodes.set(country, all.flatMap((h) => h.counties ?? []));
  const days: Day[] = all
    .filter((h) => h.types.includes('Public') && (h.global || (!!region && !!h.counties?.includes(region))))
    .map((h) => [h.date, h.localName || h.name]);
  const seen = new Set<string>();
  const out = days.filter(([d, n]) => !seen.has(d + n) && !!seen.add(d + n));
  setForeign(country, out);
  return out;
}
