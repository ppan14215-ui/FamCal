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
  // Der Dritte im Bunde (Julian 27.11.: new brand, step 1 = look only): white ground, Memo ink, Nebel for soft fills,
  // Moos for quiet text. Every layout and every behaviour stays as it was; only these values change.
  bg: '#FFFFFF',
  row: '#FFFFFF',
  ink: '#14302F',
  sub: '#71817F',
  mute: '#9AA8A6',
  hair: '#EEF2F1',
  /** The filled check for "erledigt": Memo ink, like the template. */
  done: '#14302F',
  doneSoft: '#E4EAE9',
  frist: '#E5484D',
  /** Urlaub, sunny and clearly its own (Julian 31.10.: "Vacation kaum zu erkennen"). */
  vac: '#F6CD6A',
  vacInk: '#5B4100',
  segBg: '#F1F4F3',
  /** The chosen pill in a segmented control: it must stand out from segBg in both modes. */
  segOn: '#FFFFFF',
  /** The chosen tab in the bottom bar. */
  pillOn: '#F1F4F3',
  chipBg: '#F1F4F3',
  circleLine: '#D5DEDC',
  dotOff: '#C9D2D0',
  danger: '#C7372F',
  /** Marked text: a light wash, so the selected words stay readable. */
  select: 'rgba(20,48,47,0.16)',
  ok: '#2F9E6E',
  scrim: 'rgba(20,48,47,0.28)',
  noteBg: '#F1F4F3',
  paper: '#FFFFFF',
  /** Text and icons on an ink surface (primary buttons, today's day). */
  onInk: '#FFFFFF',
  /** Frosted surface over a picture (the Symbol chip on a Termin). */
  glass: 'rgba(255,255,255,0.7)',
  /** The calm cover while the assistant works. */
  veil: 'rgba(255,255,255,0.95)',
  /** What marks today and now: ink. */
  accent: '#14302F',
  /** Its soft shadow. */
  accentGlow: 'rgba(20,48,47,0.14)',
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
  accent: '#F2F4F4', accentGlow: 'rgba(0,0,0,0.3)',
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
 * The shadows of the design system (Julian 14.11.: "shadow should become part of the design system"), measured on
 * wabi.ai's own stylesheet: near black at a few percent, one tight layer and one wide soft one pulled in under the
 * shape, never a glow. Every card and every circle takes its shadow from here, nothing writes its own.
 */
export const shadows = {
  /** A card lying on the ground. Wabi's `--sheet`. */
  card: '0 1px 2px rgba(20,48,47,0.05), 0 14px 30px -16px rgba(20,48,47,0.20)',
  /** A round button or a pill you press. Measured on Wabi's app (Julian's screenshot 14.11.): tight under the shape, almost nothing above it. */
  control: '0 1px 1px rgba(20,48,47,0.05), 0 3px 8px -2px rgba(20,48,47,0.16)',
  /** People circles: the stack of faces sits a little above the ground. */
  face: '0 4px 10px rgba(20,48,47,0.12)',
};

/**
 * Glass, only on things you press (nav, input, buttons, chips): white with an inner light, a hairline and a soft
 * shadow. The recipe is Wabi's inner light (Julian 13.11.). boxShadow draws on the new architecture and on the web.
 */
const G_IN = 'inset 0 1px 4px rgba(255,255,255,0.67), inset 0 -4px 4px rgba(255,255,255,0.85), inset 0 0 14px rgba(228,234,233,0.55)';
// At night the same shapes: a lifted dark surface, a faint light on the top edge, a deeper shadow.
const G_IN_N = 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 14px rgba(255,255,255,0.03)';
const glassOf = (night: boolean) => {
  const bg = night ? '#222C32' : '#FFFFFF';
  const inn = night ? G_IN_N : G_IN;
  const line = (a: number) => (night ? `0 0 0 1px rgba(255,255,255,${a})` : `0 0 0 1px rgba(20,48,47,${a})`);
  const drop = (y: number, r: number, a: number) => `0 ${y}px ${r}px rgba(${night ? '0,0,0' : '20,48,47'},${night ? Math.min(0.6, a * 3.2) : a})`;
  return {
    /** Small controls: round buttons, chips, the chosen segment. */
    sm: { backgroundColor: bg, boxShadow: `${inn}, ${line(0.05)}, ${night ? drop(2, 6, 0.05) : shadows.control}` } as any,
    /** The floating nav pill. */
    nav: { backgroundColor: bg, boxShadow: `${inn}, ${line(0.05)}, ${night ? drop(10, 30, 0.1) : '0 10px 30px -12px rgba(20,48,47,0.28)'}` } as any,
    /** The input card that grows out of Memo, and sheets. */
    card: { backgroundColor: bg, boxShadow: `${inn}, ${line(0.06)}, ${drop(14, 40, 0.14)}` } as any,
    /** A flat card in the content: only a hairline. */
    line: { backgroundColor: night ? '#1A2328' : '#FFFFFF', boxShadow: line(0.08) } as any,
    /** A card lying on the ground (chat cards, examples): white with a 1.5 px line, no shadow (brand template 27.11.). */
    lift: { backgroundColor: night ? '#1A2328' : '#FFFFFF', boxShadow: night ? `${line(0.07)}, 0 1px 2px rgba(0,0,0,0.3), 0 12px 28px -12px rgba(0,0,0,0.6)` : '0 0 0 1.5px #E4EAE9' } as any,
  };
};
/** The live glass styles; like `tokens` they swap in place, so every style reads the current ones. */
export const glass = glassOf(false);

export function applyPalette(isDark: boolean) {
  dark = isDark;
  Object.assign(tokens, isDark ? DARK : LIGHT);
  const g = glassOf(isDark);
  (Object.keys(g) as (keyof typeof g)[]).forEach((k) => Object.assign(glass[k], g[k]));
}

export type PersonId = 'J' | 'T';

export const persons: Record<PersonId, { name: string; tint: string; ink: string; stripe: string; colorName: string }> = {
  J: { name: 'Julia', tint: '#5B8DEF', ink: '#1F3F80', stripe: '#5B8DEF', colorName: 'M-Blau' },
  T: { name: 'Tom', tint: '#F4A340', ink: '#6B4210', stripe: '#F4A340', colorName: 'M-Amber' },
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
export type ThemeId = 'marke' | 'bunt';
// Julian 04.11. (second round): themes from his saved app designs and big apps, plus a Klassisch made from the app's own UI colours.
// Familie (the brand) has 8 colours, Bunt 10. Names are unique across themes, since a kid's colour is saved by name.
export const THEMES: { id: ThemeId; de: string; en: string; colors: Pal[] }[] = [
  // Der Dritte im Bunde (Julian 27.11.): one clear colour per person, the four of the brand first (Julian blue, Sophia
  // amber, Emil green, Oma lilac), four calm ones added so every child can have its own.
  { id: 'marke', de: 'Familie', en: 'Family', colors: [
    { name: 'M-Blau', bg: '#5B8DEF', fg: '#1F3F80' }, { name: 'M-Amber', bg: '#F4A340', fg: '#6B4210' },
    { name: 'M-Grün', bg: '#7BC67E', fg: '#2B5A2D' }, { name: 'M-Lila', bg: '#C58BE0', fg: '#57306B' },
    { name: 'M-Koralle', bg: '#F2836B', fg: '#6E2E20' }, { name: 'M-Türkis', bg: '#4FBFB5', fg: '#1D5A55' },
    { name: 'M-Rosa', bg: '#EE8DB5', fg: '#6B2D47' }, { name: 'M-Sand', bg: '#D8B56A', fg: '#5E4A1A' },
  ] },
  // Julian 25.11. (pill palette from an Interfaces post): bright fills for the family bubbles, 10 colours.
  { id: 'bunt', de: 'Bunt', en: 'Bright', colors: [
    { name: 'B-Lila', bg: '#A8ABFF', fg: '#46476B' }, { name: 'B-Blau', bg: '#00CAFF', fg: '#00546B' },
    { name: 'B-Himmel', bg: '#00D7FF', fg: '#005A6B' }, { name: 'B-Türkis', bg: '#00E4C2', fg: '#005F51' },
    { name: 'B-Grün', bg: '#00E291', fg: '#005E3C' }, { name: 'B-Limette', bg: '#AFCE00', fg: '#495600' },
    { name: 'B-Gelb', bg: '#FDAC00', fg: '#6A4800' }, { name: 'B-Orange', bg: '#FF8B54', fg: '#6B3A23' },
    { name: 'B-Lachs', bg: '#FF8289', fg: '#6B3639' }, { name: 'B-Pink', bg: '#FF81B9', fg: '#6B364D' },
  ] },
];
/** The active theme's colours. Mutable: swapped in place by applyColorTheme. */
export const personPalette: Pal[] = [...THEMES[0].colors];
// Colours of earlier themes, kept only so a colour saved by name (e.g. for a kid) still resolves.
const RETIRED: Pal[] = [
  // Erde, removed 27.11. (Julian: the brand look is the standard, Bunt stays the other choice).
  { name: 'E-Blau', bg: '#D3DDEC', fg: '#34507A' }, { name: 'E-Flieder', bg: '#E6D6E6', fg: '#6B3F6B' }, { name: 'E-Terrakotta', bg: '#F2D3C4', fg: '#8A3B22' }, { name: 'E-Ocker', bg: '#F3E0B0', fg: '#7A5A12' }, { name: 'E-Salbei', bg: '#D6E3CF', fg: '#3E5E3A' }, { name: 'E-Rose', bg: '#F0D5D6', fg: '#84404A' }, { name: 'E-Petrol', bg: '#CFE1DD', fg: '#1F5C57' }, { name: 'E-Stein', bg: '#E4DACB', fg: '#5E5140' },
  // Themes removed 25.11. (Julian: only Erde and Bunt stay).
  { name: 'Blau', bg: '#D2DCE7', fg: '#1F4E89' },
  { name: 'Rose', bg: '#EBD5DA', fg: '#9D2B48' },
  { name: 'Petrol', bg: '#CDDCDD', fg: '#075056' },
  { name: 'Orange', bg: '#F3D9CE', fg: '#AF3A0B' },
  { name: 'Grün', bg: '#D5ECE2', fg: '#237551' },
  { name: 'Sonne', bg: '#F4EBD2', fg: '#856614' },
  { name: 'Rot', bg: '#F4D7D5', fg: '#B3312A' },
  { name: 'Tinte', bg: '#D0D3D4', fg: '#16232A' },
  { name: 'N-Blau', bg: '#C6DBE7', fg: '#286284' },
  { name: 'N-Pink', bg: '#EECDDE', fg: '#973B6C' },
  { name: 'N-Grün', bg: '#CBDCD3', fg: '#35664C' },
  { name: 'N-Orange', bg: '#F4D9C1', fg: '#935016' },
  { name: 'N-Gelb', bg: '#F0E0C5', fg: '#825D1E' },
  { name: 'N-Rot', bg: '#F3CDCB', fg: '#A13A36' },
  { name: 'N-Lila', bg: '#E0D4E9', fg: '#704F89' },
  { name: 'N-Braun', bg: '#E4D6CF', fg: '#7C5341' },
  { name: 'S-Mint', bg: '#C9F8E6', fg: '#0F5A43' },
  { name: 'S-Sand', bg: '#F3E2CD', fg: '#7A4E1A' },
  { name: 'S-Lavendel', bg: '#CFD1F8', fg: '#353A9A' },
  { name: 'S-Flieder', bg: '#E1D0F3', fg: '#5D2E8F' },
  { name: 'S-Vanille', bg: '#FDEFD0', fg: '#7A5A0E' },
  { name: 'S-Salbei', bg: '#D3EEE0', fg: '#2C5F45' },
  { name: 'S-Pfirsich', bg: '#FCD9C9', fg: '#8E3B17' },
  { name: 'S-Himmel', bg: '#CDE6F6', fg: '#1D5480' },
  { name: 'K-Orange', bg: '#FFDBC8', fg: '#AD3E03' },
  { name: 'K-Petrol', bg: '#C8D8DA', fg: '#075056' },
  { name: 'K-Türkis', bg: '#C7ECF1', fg: '#00707F' },
  { name: 'K-Marine', bg: '#C7CDD3', fg: '#011C39' },
  { name: 'K-Gelb', bg: '#FCF7DF', fg: '#7D7139' },
  { name: 'K-Rot', bg: '#F1D1D1', fg: '#AF2B29' },
  { name: 'K-Lila', bg: '#DCD3EC', fg: '#5B3E8C' },
  { name: 'K-Grün', bg: '#D3E6CF', fg: '#2E6326' },
  { name: 'Rosa', bg: '#F7C6D2', fg: '#8A1538' }, { name: 'Mint', bg: '#B5E3D9', fg: '#0A5048' },
  { name: 'Sand', bg: '#FAD1A0', fg: '#7A3D00' }, { name: 'Salbei', bg: '#BFE0B4', fg: '#1F5426' },
  { name: 'Flieder', bg: '#E0CAF3', fg: '#592886' }, { name: 'Koralle', bg: '#FBC9B6', fg: '#8F2D12' },
  { name: 'Gelb', bg: '#F5DE7E', fg: '#5A4500' }, { name: 'Limette', bg: '#D9EA94', fg: '#3B5000' },
  { name: 'Türkis', bg: '#B0DDEC', fg: '#0A4C62' }, { name: 'Indigo', bg: '#CDCBF7', fg: '#33269A' },
  { name: 'Pflaume', bg: '#EBC3E2', fg: '#74195F' },
];
/** Every colour of every theme, so a colour name saved for a kid still resolves after a switch. */
export const allColors: Pal[] = [...THEMES.flatMap((t) => t.colors), ...RETIRED];
let themeId: ThemeId = 'marke';
export const currentTheme = () => themeId;
export function applyColorTheme(id: ThemeId) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  themeId = t.id;
  personPalette.splice(0, personPalette.length, ...t.colors);
}

export const radii = { tile: 16, row: 20, card: 24, sheet: 32, pill: 999 } as const;

/** Headings (brand 27.11.): DM Sans ExtraBold, set tight. The files lie in assets/fonts, loaded in app/_layout.tsx. */
export const headFont = 'DMSans_800ExtraBold';

// DM Sans (brand 27.11.). Custom fonts on native ignore fontWeight, so each weight is its own file.
export const fonts = {
  400: 'DMSans_400Regular',
  500: 'DMSans_500Medium',
  600: 'DMSans_600SemiBold',
  700: 'DMSans_700Bold',
} as const;
export type Weight = keyof typeof fonts;
