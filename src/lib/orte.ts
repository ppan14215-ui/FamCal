/**
 * Places the family keeps going back to (Julian 31.10.: "Welcher Kinderarzt ist das?", then next time
 * "Wieder bei Dr. X eingetragen, wie beim letzten Mal"). The memory is the calendar itself: the latest
 * Termin of the same kind that has a place. That way it syncs to the partner with no extra table.
 *
 * Search is free: Photon (OpenStreetMap data, komoot). No key, no cost. Before a big public launch,
 * check its fair-use limits or host our own (see memory famcal-orte-lernen).
 */
import { whereNow } from './feiertage';
import type { CalEvent } from '../state/types';

export type PlaceKind = { key: string; de: boolean; q: string; again: (p: string) => string };

const de = (key: string, q: string) => ({ key, de: true, q });
const en = (key: string, q: string) => ({ key, de: false, q });

/** Most specific first; the plain doctor comes last. */
const KINDS: [RegExp, { key: string; de: boolean; q: string }][] = [
  [/kinderarzt|kinderärzt|\bu\s?\d{1,2}\b|u-untersuchung|vorsorge.*(kind|baby)/i, de('kinderarzt', 'Welcher Kinderarzt ist das?')],
  [/pa?ediatrician|kids?'? doctor/i, en('kinderarzt', 'Which pediatrician is it?')],
  [/zahnarzt|zahnärzt|zahnreinigung|kieferorthop/i, de('zahnarzt', 'Welcher Zahnarzt ist das?')],
  [/dentist|orthodont/i, en('zahnarzt', 'Which dentist is it?')],
  [/frauenarzt|frauenärzt|gynäkolog/i, de('frauenarzt', 'Welche Frauenarztpraxis ist das?')],
  [/gyn(a)?ecolog|ob-?gyn/i, en('frauenarzt', 'Which gynecologist is it?')],
  [/friseur|frisör|haare schneiden|haarschnitt|barbier/i, de('friseur', 'Welcher Friseur ist das?')],
  [/hairdresser|haircut|barber|hair salon/i, en('friseur', 'Which hairdresser is it?')],
  [/hebamme/i, de('hebamme', 'Welche Hebamme ist das?')],
  [/midwife/i, en('hebamme', 'Which midwife is it?')],
  [/physio|krankengymnastik/i, de('physio', 'Welche Physiopraxis ist das?')],
  [/tierarzt|tierärzt/i, de('tierarzt', 'Welcher Tierarzt ist das?')],
  [/\bvet\b|veterinar/i, en('tierarzt', 'Which vet is it?')],
  [/hausarzt|\barzt|ärztin|arzttermin|doktor/i, de('arzt', 'Welcher Arzt ist das?')],
  [/doctor|\bgp\b/i, en('arzt', 'Which doctor is it?')],
];

export function placeKind(title: string): PlaceKind | undefined {
  const hit = KINDS.find(([re]) => re.test(title));
  if (!hit) return undefined;
  const k = hit[1];
  return { ...k, again: (p) => (k.de ? `Wieder bei ${p} eingetragen, wie beim letzten Mal.` : `Added at ${p} again, like last time.`) };
}

/** The place used last time for this kind, from the family's own calendar. */
export function lastPlace(events: CalEvent[], kind: string, notId: string): string | undefined {
  let best: CalEvent | undefined;
  for (const e of events) {
    if (e.id === notId || !e.place?.trim()) continue;
    if (placeKind(e.title)?.key !== kind) continue;
    if (!best || e.date > best.date) best = e;
  }
  return best?.place;
}

/** The short label for "Wieder bei …": the name before the address. */
export const placeName = (p: string) => p.split(',')[0].trim();

/** "Dr. Müller" from a spoken answer has no address yet; "Dr. Müller, Hauptstr. 3, Köln" does. */
export const looksVerified = (p: string) => /,/.test(p) && /\d/.test(p);

export type Found = { name: string; street: string; city: string; lat: number; lon: number };

export const foundText = (f: Found) => [f.name, f.street, f.city].filter(Boolean).join(', ');

/** Up to five places for what was said, near the family's town when we know it. */
export async function findPlace(what: string, lang: 'de' | 'en'): Promise<Found[]> {
  const ort = whereNow().ort;
  const q = ort && !what.toLowerCase().includes(ort.toLowerCase()) ? `${what} ${ort}` : what;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=${lang}`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = await r.json();
    const out: Found[] = [];
    for (const f of j?.features ?? []) {
      const p = f?.properties ?? {};
      const c = f?.geometry?.coordinates;
      if (!p.name || !Array.isArray(c)) continue;
      const street = [p.street, p.housenumber].filter(Boolean).join(' ');
      const city = [p.postcode, p.city ?? p.town ?? p.village ?? p.district].filter(Boolean).join(' ');
      if (!street && !city) continue;
      const item = { name: String(p.name), street, city, lon: Number(c[0]), lat: Number(c[1]) };
      if (!out.some((o) => foundText(o) === foundText(item))) out.push(item);
      if (out.length >= 5) break;
    }
    return out;
  } catch {
    return [];
  }
}

export const mapsLink = (place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

/** Slippy-map tile position (fractional) for a point. */
export function tileXY(lat: number, lon: number, z: number) {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return { x, y };
}
