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

/**
 * Themes (Julian 04.11.: "Palette gefällt, aber zu soft"). One theme for the
 * whole family; Hell or Dunkel stays per phone. Each theme only overrides the
 * ground, text and the one accent (`done`), so every screen keeps its roles.
 */
export type ThemeId = 'ruhe' | 'schiefer' | 'cashmere' | 'papier' | 'taxi' | 'marine';
type Over = Partial<Tokens>;
/**
 * Six looks from Julian's saved palettes (vault, 04.11.): Ruhe from @typelabo (FamCal's ink and teal already are
 * #16232A and #075056), Schiefer, Cashmere, Taxi and Marine from MindfulPalettes (MP020, MP061, MP167, MP100),
 * Papier from the "Cream Paper" prompt. Greys lean towards each theme's colour (@chalaska), the loud colour
 * is the rarest one (@itsolelehmann), the ground stays still (@leomeethewoo).
 */
const darkBase = (bg: string, row: string, ink: string, sub: string, mute: string, hair: string, done: string, doneSoft: string, seg: string, on: string, chip: string): Over => ({
  bg, row, ink, sub, mute, hair, done, doneSoft, segBg: seg, segOn: on, pillOn: on, chipBg: chip, circleLine: hair, dotOff: hair,
  select: `${done}55`, noteBg: chip, paper: row, onInk: bg, glass: `${row}B8`, veil: `${bg}F2`,
});
export const THEMES: { id: ThemeId; de: string; en: string; light: Over; dark: Over }[] = [
  { id: 'ruhe', de: 'Ruhe', en: 'Calm',
    light: { bg: '#EDF2F2', row: '#FFFFFF', ink: '#16232A', sub: '#4A5A61', mute: '#7B898F', hair: '#DCE4E5', done: '#075056', doneSoft: '#CDE5E2', frist: '#E04E00', segBg: '#E0E8E9', pillOn: '#E6EDEE', chipBg: '#E6EDEE', circleLine: '#C4D0D2', dotOff: '#CDD7D9', noteBg: '#E6EDEE', paper: '#F4F7F7' },
    dark: darkBase('#0D1619', '#17232A', '#EEF4F5', '#A7B6BB', '#7A8B91', '#283840', '#5FC1B6', '#1B4C47', '#111C20', '#33474F', '#22323A') },
  { id: 'schiefer', de: 'Schiefer', en: 'Slate',
    light: { bg: '#E4E3DC', row: '#FAF9F5', ink: '#1F282E', sub: '#414E58', mute: '#77807F', hair: '#D3D1C7', done: '#B83312', doneSoft: '#F1D3C6', frist: '#B83312', segBg: '#D9D7CE', segOn: '#FAF9F5', pillOn: '#DCDAD1', chipBg: '#DCDAD1', circleLine: '#BDBAAE', dotOff: '#C8C5BA', noteBg: '#DCDAD1', paper: '#EEEDE7', select: 'rgba(184,51,18,0.2)' },
    dark: darkBase('#1A2126', '#242E35', '#EFEEE8', '#B3B8B6', '#848B8B', '#36424B', '#FF4E20', '#5A2414', '#151B1F', '#414E58', '#2E3941') },
  { id: 'cashmere', de: 'Cashmere', en: 'Cashmere',
    light: { bg: '#E8DFD5', row: '#FBF7F2', ink: '#202124', sub: '#55504B', mute: '#8A8178', hair: '#DACFC2', done: '#384883', doneSoft: '#D8DCF0', frist: '#E25A10', segBg: '#DDD2C5', segOn: '#FBF7F2', pillOn: '#E0D6CA', chipBg: '#E0D6CA', circleLine: '#C7B9A9', dotOff: '#D0C3B4', noteBg: '#E0D6CA', paper: '#F2ECE5', select: 'rgba(56,72,131,0.2)' },
    dark: darkBase('#17151C', '#221F28', '#F3EEE8', '#BDB4AB', '#8C847C', '#36313D', '#9AA9F0', '#27204E', '#131118', '#423C4C', '#2C2833') },
  { id: 'papier', de: 'Papier', en: 'Paper',
    light: { bg: '#EBE7E1', row: '#FBFAF8', ink: '#1E1C1A', sub: '#57534E', mute: '#8A857E', hair: '#DBD6CE', done: '#D7372C', doneSoft: '#F5D4D0', frist: '#D7372C', segBg: '#E0DBD3', segOn: '#FBFAF8', pillOn: '#E3DED7', chipBg: '#E3DED7', circleLine: '#B5AFA7', dotOff: '#C9C3BA', noteBg: '#E3DED7', paper: '#F3F0EC', select: 'rgba(215,55,44,0.18)' },
    dark: darkBase('#151413', '#1F1D1B', '#F4F1EC', '#B5AFA7', '#8A857E', '#33302D', '#F06A5F', '#55211C', '#111010', '#403C38', '#2A2825') },
  { id: 'taxi', de: 'Taxi', en: 'Taxi',
    light: { bg: '#F9F7F6', row: '#FFFFFF', ink: '#16110D', sub: '#726259', mute: '#9A8C83', hair: '#EAE3DE', done: '#840804', doneSoft: '#F2D3CF', frist: '#840804', vac: '#F7B732', vacInk: '#3D2A00', segBg: '#EFE9E5', pillOn: '#F2EDE9', chipBg: '#F2EDE9', circleLine: '#D5CBC4', dotOff: '#DFD3CA', noteBg: '#F2EDE9', paper: '#FBFAF9', select: 'rgba(132,8,4,0.16)' },
    dark: darkBase('#120D0A', '#1E1713', '#F9F4F1', '#C0B1A7', '#8E7F75', '#352B25', '#F7B732', '#5A3F08', '#0E0A08', '#463A32', '#2A211C') },
  { id: 'marine', de: 'Marine', en: 'Navy',
    light: { bg: '#E3DCCA', row: '#FBF8F1', ink: '#011C39', sub: '#3D4B5E', mute: '#7C8288', hair: '#D3CBB6', done: '#00788A', doneSoft: '#C7E7EB', frist: '#B9461A', vac: '#F1D96E', vacInk: '#3B3000', segBg: '#D8D0BC', segOn: '#FBF8F1', pillOn: '#DBD3C0', chipBg: '#DBD3C0', circleLine: '#BFB59C', dotOff: '#C9C0A9', noteBg: '#DBD3C0', paper: '#EEE9DD', select: 'rgba(0,120,138,0.2)' },
    dark: darkBase('#010B16', '#0B1C2E', '#F3EFE4', '#A9B4C2', '#7A8696', '#1C3048', '#00AAC1', '#06404A', '#020F1C', '#25405C', '#132840') },
];
let themeId: ThemeId = 'ruhe';
export const currentTheme = () => themeId;

export function applyPalette(isDark: boolean, theme: ThemeId = themeId) {
  dark = isDark;
  themeId = THEMES.some((t) => t.id === theme) ? theme : 'ruhe';
  const t = THEMES.find((x) => x.id === themeId)!;
  Object.assign(tokens, isDark ? DARK : LIGHT, isDark ? t.dark : t.light);
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

/** The six colours a parent can pick in onboarding (Canvas "Zu zweit"). */
/**
 * Each person's colour (Julian 04.11.: stronger, more to pick). The first six
 * keep their names and places, so saved choices stay; six more follow.
 */
export const personPalette = [
  { name: 'Rosa', bg: '#F7C6D2', fg: '#8A1538' },
  { name: 'Blau', bg: '#C2D6F7', fg: '#173E88' },
  { name: 'Mint', bg: '#B5E3D9', fg: '#0A5048' },
  { name: 'Sand', bg: '#FAD1A0', fg: '#7A3D00' },
  { name: 'Salbei', bg: '#BFE0B4', fg: '#1F5426' },
  { name: 'Flieder', bg: '#E0CAF3', fg: '#592886' },
  { name: 'Koralle', bg: '#FBC9B6', fg: '#8F2D12' },
  { name: 'Gelb', bg: '#F5DE7E', fg: '#5A4500' },
  { name: 'Limette', bg: '#D9EA94', fg: '#3B5000' },
  { name: 'Türkis', bg: '#B0DDEC', fg: '#0A4C62' },
  { name: 'Indigo', bg: '#CDCBF7', fg: '#33269A' },
  { name: 'Pflaume', bg: '#EBC3E2', fg: '#74195F' },
];

export const radii = { tile: 16, row: 20, card: 24, sheet: 32, pill: 999 } as const;

export const fonts = {
  400: 'Geist_400Regular',
  500: 'Geist_500Medium',
  600: 'Geist_600SemiBold',
  700: 'Geist_700Bold',
} as const;
export type Weight = keyof typeof fonts;
