/**
 * FamCal design tokens. Source of truth is `design/gen.py` (Clay-Ruhe-System,
 * Canvas v37). HANDOFF.md lists the same values; the older frontmatter in
 * docs/DESIGN.md is superseded where it differs.
 *
 * Rules that shape these values (docs/DESIGN.md, "Einfachheit"):
 * - Farbe nur im Objekt: surfaces are white or `bg`, colour lives in clay
 *   icons, their tiles, people and deadlines.
 * - Ein dunkles Element pro Screen: `ink` fills only the main action and the
 *   plus button. Selection shows a ring or a person colour, never dark.
 * - `done` (teal) is for "erledigt" and the period after headlines.
 */
const LIGHT = {
  bg: '#F5F5F4',
  row: '#FFFFFF',
  ink: '#16232A',
  sub: '#5B666B',
  mute: '#8A9397',
  hair: '#E7E7E4',
  done: '#075056',
  doneSoft: '#E2EEEC',
  frist: '#C2410C',
  /** Urlaub, sunny and clearly its own (Julian 31.10.: "Vacation kaum zu erkennen"). */
  vac: '#F6CD6A',
  vacInk: '#5B4100',
  segBg: '#EAEAE7',
  /** The chosen pill in a segmented control: it must stand out from segBg in both modes. */
  segOn: '#FFFFFF',
  /** The chosen tab in the bottom bar, on a white pill. */
  pillOn: '#EFEFEC',
  chipBg: '#EFEFEC',
  circleLine: '#C9CDCF',
  dotOff: '#D5D8D9',
  danger: '#C7372F',
  /** Marked text: light teal, so the selected words stay readable (a dark highlight hid them on Android, Julian 28.10.). */
  select: 'rgba(7,80,86,0.22)',
  ok: '#2F9E6E',
  scrim: 'rgba(22,35,42,0.28)',
  noteBg: '#ECEBE7',
  paper: '#F4F1EA',
  /** Text and icons on an ink surface (the mic bubble, primary buttons, today's day). */
  onInk: '#FFFFFF',
  /** Frosted surface over a picture (the Symbol chip on a Termin). */
  glass: 'rgba(255,255,255,0.7)',
  /** The calm cover while the assistant works. */
  veil: 'rgba(250,249,246,0.95)',
};
export type Tokens = Record<keyof typeof LIGHT, string>;

/**
 * Darkmode (Julian 28.10.). Same roles, night values: a deep blue-grey
 * ground with the teal kept as the one accent. Ink turns light, so the one
 * "dark" element becomes the one bright element; onInk follows.
 */
const DARK: Tokens = {
  bg: '#0F1518', row: '#1A2328', ink: '#F2F4F4', sub: '#A9B2B6', mute: '#7C878C', hair: '#2C3840',
  done: '#5FB7AE', doneSoft: '#1E4F49', frist: '#F08A4B', vac: '#8C6A1F', vacInk: '#FFF4D6', segBg: '#151C20', segOn: '#3B4B53', pillOn: '#3B4B53', chipBg: '#2A363C',
  circleLine: '#3A464C', dotOff: '#3A464C', danger: '#F0766C', select: 'rgba(95,183,174,0.32)', ok: '#4CC28E',
  scrim: 'rgba(0,0,0,0.55)', noteBg: '#1F272B', paper: '#1C2326', onInk: '#16232A', glass: 'rgba(26,35,40,0.72)', veil: 'rgba(15,21,24,0.95)',
};

/** The live palette. Values swap in place with `applyPalette`, so every style reads the current one. */
export const tokens: Tokens = { ...LIGHT };
let dark = false;
export const isDark = () => dark;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => `#${v.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
/** a toward b by t (0 keeps a). */
export const blend = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
/** A pastel for the night: the colour stays, deep and quiet. */
export const nightBg = (c: string) => (dark ? blend(c, '#0F1518', 0.66) : c);
/** Its text colour, lifted so it reads on the deep tint. */
export const nightFg = (c: string) => (dark ? blend(c, '#FFFFFF', 0.45) : c);
/** A palette entry as it shows right now. */
/** At night a person's tint comes from their strong colour, so pink stays pink (a pale pastel turned grey, Julian 28.10.). */
export const shade = (c: { name: string; bg: string; fg: string }) => ({ name: c.name, bg: dark ? blend(c.fg, '#0F1518', 0.45) : c.bg, fg: nightFg(c.fg) });

export function applyPalette(isDark: boolean) {
  dark = isDark;
  Object.assign(tokens, isDark ? DARK : LIGHT);
}

export type PersonId = 'J' | 'T';

export const persons: Record<PersonId, { name: string; tint: string; ink: string; stripe: string; colorName: string }> = {
  J: { name: 'Julia', tint: '#F6DDE2', ink: '#9D2B48', stripe: '#EFC6CF', colorName: 'Rosa' },
  T: { name: 'Tom', tint: '#DCE7F4', ink: '#1F4E89', stripe: '#C3D5EC', colorName: 'Blau' },
};

/** Tint behind a clay icon tile. Falls back to a neutral grey. */
const TINT: Record<string, string> = {
  stethoskop: '#E6EEF4', kochtopf: '#F2EEE7', 'umschlag-euro': '#F7EDE1', reisepass: '#E2EEEC',
  yogamatte: '#E7EDE4', geschenk: '#F8E8E5', 'papier-stift': '#EEF0F2', kalender: '#E2EEEC',
  glocke: '#F2EEE7', kindergeld: '#F6F0DD', impfung: '#F8E8E5', erledigt: '#E2EEEC',
  vertrag: '#EEF0F2', 'kamera-scan': '#EEF0F2', 'brief-gelesen': '#F7EDE1', chat: '#E7EDE4',
  eingang: '#F2EEE7', telefon: '#E6EEF4', windeln: '#E6EEF4', thermometer: '#F8E8E5',
  krankenkasse: '#E2EEEC', zuhause: '#F2EEE7', sync: '#E2EEEC', rechnung: '#EEF0F2',
  fussabdruck: '#F8E8E5', reise: '#E6EEF4', geburtstag: '#F8E8E5', 'u-heft': '#F6F0DD',
  'hand-nimmt': '#F2EEE7', spaeter: '#E2EEEC', karten: '#F2EEE7', einkauf: '#E7EDE4',
  fussball: '#E7EDE4', hebamme: '#F8E8E5', urkunde: '#F6F0DD', schnuller: '#E6EEF4', paket: '#F2EEE7',
};
export const tint = (n: string) => nightBg(TINT[n] ?? '#EEF0F2');

type Pal = { name: string; bg: string; fg: string };
/**
 * Colour themes (Julian 04.11.: "Es ging um die Farben der Personen und verschiedene Themes dafür, nicht die App UI").
 * One theme for the whole family; each person picks a colour from it. The app's own colours never change.
 * Saved choices are an index; a theme with fewer colours wraps around. `name` stays the colour's id.
 */
export type ThemeId = 'klassisch' | 'kraeftig' | 'erde' | 'meer' | 'retro';
export const THEMES: { id: ThemeId; de: string; en: string; colors: Pal[] }[] = [
  { id: 'klassisch', de: 'Klassisch', en: 'Classic', colors: [
    { name: 'Rosa', bg: '#F7C6D2', fg: '#8A1538' }, { name: 'Blau', bg: '#C2D6F7', fg: '#173E88' },
    { name: 'Mint', bg: '#B5E3D9', fg: '#0A5048' }, { name: 'Sand', bg: '#FAD1A0', fg: '#7A3D00' },
    { name: 'Salbei', bg: '#BFE0B4', fg: '#1F5426' }, { name: 'Flieder', bg: '#E0CAF3', fg: '#592886' },
    { name: 'Koralle', bg: '#FBC9B6', fg: '#8F2D12' }, { name: 'Gelb', bg: '#F5DE7E', fg: '#5A4500' },
    { name: 'Limette', bg: '#D9EA94', fg: '#3B5000' }, { name: 'Türkis', bg: '#B0DDEC', fg: '#0A4C62' },
    { name: 'Indigo', bg: '#CDCBF7', fg: '#33269A' }, { name: 'Pflaume', bg: '#EBC3E2', fg: '#74195F' },
  ] },
  { id: 'kraeftig', de: 'Kräftig', en: 'Bold', colors: [
    { name: 'Pink', bg: '#FF9FCB', fg: '#7A0F45' }, { name: 'Royal', bg: '#8AB4FF', fg: '#0B2E73' },
    { name: 'Grün', bg: '#8EDB8A', fg: '#0F4D12' }, { name: 'Orange', bg: '#FFB46B', fg: '#6B3300' },
    { name: 'Violett', bg: '#C3A2FF', fg: '#3D1A85' }, { name: 'Zitrone', bg: '#FFD84D', fg: '#4D3B00' },
    { name: 'Rot', bg: '#FF8A80', fg: '#7A0E0E' }, { name: 'Lagune', bg: '#6FD6CF', fg: '#00474A' },
  ] },
  { id: 'erde', de: 'Erde', en: 'Earth', colors: [
    { name: 'Terrakotta', bg: '#E9B29B', fg: '#7A2E14' }, { name: 'Schiefer', bg: '#BAC4CC', fg: '#2B3A45' },
    { name: 'Salbeigrün', bg: '#B9CDBB', fg: '#2F4A35' }, { name: 'Ocker', bg: '#EBCB8B', fg: '#6B4A00' },
    { name: 'Petrol', bg: '#A9CBCC', fg: '#0B4A50' }, { name: 'Beere', bg: '#D2B4C4', fg: '#5A2442' },
    { name: 'Oliv', bg: '#CBD3A0', fg: '#3E4A12' }, { name: 'Lehm', bg: '#E3D3BD', fg: '#5C4426' },
  ] },
  { id: 'meer', de: 'Meer', en: 'Sea', colors: [
    { name: 'Koralle', bg: '#F4A891', fg: '#7A2A12' }, { name: 'Marine', bg: '#A9B9D6', fg: '#011C39' },
    { name: 'Teal', bg: '#8FD0D9', fg: '#00505C' }, { name: 'Strand', bg: '#F1D96E', fg: '#3B3000' },
    { name: 'Seegras', bg: '#B5D1A8', fg: '#2B4A20' }, { name: 'Lavendel', bg: '#C9C3E6', fg: '#3A2E7A' },
    { name: 'Aqua', bg: '#B6E3E3', fg: '#0E5555' }, { name: 'Möwe', bg: '#D3D8DE', fg: '#3A4450' },
  ] },
  { id: 'retro', de: 'Retro', en: 'Retro', colors: [
    { name: 'Tomate', bg: '#F09A87', fg: '#7D1D0B' }, { name: 'Himmel', bg: '#A8C8E8', fg: '#18406B' },
    { name: 'Seegrün', bg: '#7FC1BE', fg: '#0C4744' }, { name: 'Senf', bg: '#EBC24D', fg: '#4A3500' },
    { name: 'Moos', bg: '#C5C98A', fg: '#41450F' }, { name: 'Pflaume', bg: '#CFA2C0', fg: '#5C1E4A' },
    { name: 'Mandarine', bg: '#F5B27A', fg: '#6E3500' }, { name: 'Rosé', bg: '#F4C2C2', fg: '#7D2638' },
  ] },
];
/** The active theme's colours. Mutable: swapped in place by applyColorTheme. */
export const personPalette: Pal[] = [...THEMES[0].colors];
/** Every colour of every theme, so a colour name saved for a kid still resolves after a switch. */
export const allColors: Pal[] = THEMES.flatMap((t) => t.colors);
let themeId: ThemeId = 'klassisch';
export const currentTheme = () => themeId;
export function applyColorTheme(id: ThemeId) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  themeId = t.id;
  personPalette.splice(0, personPalette.length, ...t.colors);
}

export const radii = { tile: 16, row: 20, card: 24, sheet: 32, pill: 999 } as const;

export const fonts = {
  400: 'Geist_400Regular',
  500: 'Geist_500Medium',
  600: 'Geist_600SemiBold',
  700: 'Geist_700Bold',
} as const;
export type Weight = keyof typeof fonts;
