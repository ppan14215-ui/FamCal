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
  // Klar (Julian 13.11.): white, near black and greys. Colour comes from people only, never from the app.
  bg: '#FAFAFA',
  row: '#FFFFFF',
  ink: '#111417',
  sub: '#6B7176',
  mute: '#9AA0A5',
  hair: '#E9EAEB',
  /** Was teal. The klar look has no accent of its own, so "erledigt" and chosen things are ink. */
  done: '#111417',
  doneSoft: '#E6E8EA',
  frist: '#C2410C',
  /** Urlaub, sunny and clearly its own (Julian 31.10.: "Vacation kaum zu erkennen"). */
  vac: '#F6CD6A',
  vacInk: '#5B4100',
  segBg: '#F0F1F2',
  /** The chosen pill in a segmented control: it must stand out from segBg in both modes. */
  segOn: '#FFFFFF',
  /** The chosen tab in the bottom bar. */
  pillOn: '#F0F1F2',
  chipBg: '#F0F1F2',
  circleLine: '#C8CCCF',
  dotOff: '#D9DCDE',
  danger: '#C7372F',
  /** Marked text: a light grey wash, so the selected words stay readable. */
  select: 'rgba(17,20,23,0.16)',
  ok: '#2F9E6E',
  scrim: 'rgba(17,20,23,0.28)',
  noteBg: '#F0F1F2',
  paper: '#F4F1EA',
  /** Text and icons on an ink surface (primary buttons, today's day). */
  onInk: '#FFFFFF',
  /** Frosted surface over a picture (the Symbol chip on a Termin). */
  glass: 'rgba(255,255,255,0.7)',
  /** The calm cover while the assistant works. */
  veil: 'rgba(250,250,250,0.95)',
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

/** A person's colour as one solid tone: the bar on a Termin, the dot, the filled check (klar look, Julian 13.11.). */
export const vivid = (fg: string) => blend(fg, '#FFFFFF', dark ? 0.35 : 0.2);

/**
 * Glass, only on things you press (nav, input, buttons, chips): white with an inner light, a hairline and a soft
 * shadow. The recipe is Wabi's inner light (Julian 13.11.). boxShadow draws on the new architecture and on the web.
 */
const G_IN = 'inset 0 1px 4px rgba(255,255,255,0.67), inset 0 -4px 4px rgba(255,255,255,0.85), inset 0 0 14px rgba(229,229,229,0.55)';
export const glass = {
  /** Small controls: round buttons, chips, the chosen segment. */
  sm: { backgroundColor: '#FFFFFF', boxShadow: `${G_IN}, 0 0 0 1px rgba(17,20,23,0.07), 0 2px 6px rgba(17,20,23,0.05)` } as any,
  /** The floating nav pill. */
  nav: { backgroundColor: '#FFFFFF', boxShadow: `${G_IN}, 0 0 0 1px rgba(17,20,23,0.05), 0 10px 30px rgba(17,20,23,0.10)` } as any,
  /** The input card that grows out of Memo, and sheets. */
  card: { backgroundColor: '#FFFFFF', boxShadow: `${G_IN}, 0 0 0 1px rgba(17,20,23,0.06), 0 14px 40px rgba(17,20,23,0.14)` } as any,
  /** A flat card in the content: only a hairline. */
  line: { backgroundColor: '#FFFFFF', boxShadow: '0 0 0 1px rgba(17,20,23,0.08)' } as any,
};

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
export type ThemeId = 'klassisch' | 'notion' | 'stundenplan' | 'kontrast';
// Julian 04.11. (second round): themes from his saved app designs and big apps, plus a Klassisch made from the app's own UI colours.
// Every theme has 8 colours. Names are unique across themes, since a kid's colour is saved by name.
export const THEMES: { id: ThemeId; de: string; en: string; colors: Pal[] }[] = [
  { id: 'klassisch', de: 'Klassisch', en: 'Classic', colors: [
    { name: 'Blau', bg: '#D2DCE7', fg: '#1F4E89' }, { name: 'Rose', bg: '#EBD5DA', fg: '#9D2B48' },
    { name: 'Petrol', bg: '#CDDCDD', fg: '#075056' }, { name: 'Orange', bg: '#F3D9CE', fg: '#AF3A0B' },
    { name: 'Grün', bg: '#D5ECE2', fg: '#237551' }, { name: 'Sonne', bg: '#F4EBD2', fg: '#856614' },
    { name: 'Rot', bg: '#F4D7D5', fg: '#B3312A' }, { name: 'Tinte', bg: '#D0D3D4', fg: '#16232A' },
  ] },
  // Notion's tag colours, a little stronger so they carry a calendar block, text darkened to stay readable.
  { id: 'notion', de: 'Notion', en: 'Notion', colors: [
    { name: 'N-Blau', bg: '#C6DBE7', fg: '#286284' }, { name: 'N-Pink', bg: '#EECDDE', fg: '#973B6C' },
    { name: 'N-Grün', bg: '#CBDCD3', fg: '#35664C' }, { name: 'N-Orange', bg: '#F4D9C1', fg: '#935016' },
    { name: 'N-Gelb', bg: '#F0E0C5', fg: '#825D1E' }, { name: 'N-Rot', bg: '#F3CDCB', fg: '#A13A36' },
    { name: 'N-Lila', bg: '#E0D4E9', fg: '#704F89' }, { name: 'N-Braun', bg: '#E4D6CF', fg: '#7C5341' },
  ] },
  // From Julian's saved school timetable design: soft, like a real Stundenplan.
  { id: 'stundenplan', de: 'Stundenplan', en: 'Timetable', colors: [
    { name: 'S-Mint', bg: '#C9F8E6', fg: '#0F5A43' }, { name: 'S-Sand', bg: '#F3E2CD', fg: '#7A4E1A' },
    { name: 'S-Lavendel', bg: '#CFD1F8', fg: '#353A9A' }, { name: 'S-Flieder', bg: '#E1D0F3', fg: '#5D2E8F' },
    { name: 'S-Vanille', bg: '#FDEFD0', fg: '#7A5A0E' }, { name: 'S-Salbei', bg: '#D3EEE0', fg: '#2C5F45' },
    { name: 'S-Pfirsich', bg: '#FCD9C9', fg: '#8E3B17' }, { name: 'S-Himmel', bg: '#CDE6F6', fg: '#1D5480' },
  ] },
  // From his saved typelabo and MindfulPalettes posts, two colours added to reach 8.
  { id: 'kontrast', de: 'Kontrast', en: 'Contrast', colors: [
    { name: 'K-Orange', bg: '#FFDBC8', fg: '#AD3E03' }, { name: 'K-Petrol', bg: '#C8D8DA', fg: '#075056' },
    { name: 'K-Türkis', bg: '#C7ECF1', fg: '#00707F' }, { name: 'K-Marine', bg: '#C7CDD3', fg: '#011C39' },
    { name: 'K-Gelb', bg: '#FCF7DF', fg: '#7D7139' }, { name: 'K-Rot', bg: '#F1D1D1', fg: '#AF2B29' },
    { name: 'K-Lila', bg: '#DCD3EC', fg: '#5B3E8C' }, { name: 'K-Grün', bg: '#D3E6CF', fg: '#2E6326' },
  ] },
];
/** The active theme's colours. Mutable: swapped in place by applyColorTheme. */
export const personPalette: Pal[] = [...THEMES[0].colors];
// Colours of earlier themes, kept only so a colour saved by name (e.g. for a kid) still resolves.
const RETIRED: Pal[] = [
  { name: 'Rosa', bg: '#F7C6D2', fg: '#8A1538' }, { name: 'Mint', bg: '#B5E3D9', fg: '#0A5048' },
  { name: 'Sand', bg: '#FAD1A0', fg: '#7A3D00' }, { name: 'Salbei', bg: '#BFE0B4', fg: '#1F5426' },
  { name: 'Flieder', bg: '#E0CAF3', fg: '#592886' }, { name: 'Koralle', bg: '#FBC9B6', fg: '#8F2D12' },
  { name: 'Gelb', bg: '#F5DE7E', fg: '#5A4500' }, { name: 'Limette', bg: '#D9EA94', fg: '#3B5000' },
  { name: 'Türkis', bg: '#B0DDEC', fg: '#0A4C62' }, { name: 'Indigo', bg: '#CDCBF7', fg: '#33269A' },
  { name: 'Pflaume', bg: '#EBC3E2', fg: '#74195F' },
];
/** Every colour of every theme, so a colour name saved for a kid still resolves after a switch. */
export const allColors: Pal[] = [...THEMES.flatMap((t) => t.colors), ...RETIRED];
let themeId: ThemeId = 'klassisch';
export const currentTheme = () => themeId;
export function applyColorTheme(id: ThemeId) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  themeId = t.id;
  personPalette.splice(0, personPalette.length, ...t.colors);
}

export const radii = { tile: 16, row: 20, card: 24, sheet: 32, pill: 999 } as const;

// Inter (Julian 13.11., klar look). Custom fonts on native ignore fontWeight, so each weight is its own file.
export const fonts = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
} as const;
export type Weight = keyof typeof fonts;
