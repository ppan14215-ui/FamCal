/**
 * One-piece icons and how the whole picture moves (motion designer pass,
 * Julian 31.10.). Only icons that really are ONE thing move as a whole: a
 * ball bounces, a key turns, a plane flies. Icons whose separate pieces are
 * baked into one picture (racket and ball, drum and sticks, pot and plant)
 * must never move as one; they get the quiet "press" until their parts are
 * rendered (docs/design-notes/Icon-Teile-Prompts.md). Curves: clayCurves.ts.
 */
import type { ClayName } from './clayIcons';

type W = { kind: string; origin?: string; what: string; variant?: string };
const w = (kind: string, what: string, origin?: string, variant?: string): W => ({ kind, what, origin, variant });

export const clayWhole: Partial<Record<ClayName, W>> = {
  abschluss: w('toss', 'Hut fliegt hoch, dreht sich, wird gefangen', '50% 50%'),
  aktenkoffer: w('carry', 'wird am Griff hochgehoben, pendelt, abgestellt', '50% 18%'),
  anheften: w('pressin', 'Nadel wird kurz angehoben und fest hineingedrückt', '50% 95%'),
  augenuntersuchung: w('blink', 'Auge blinzelt zweimal', '50% 50%'),
  ausflug: w('look', 'Fernglas schaut nach links und rechts', '50% 70%'),
  babybett: w('lull', 'Bett wiegt sich ganz sanft', '50% 95%'),
  ball: w('bounce', 'Ball springt mit echter Schwerkraft, dreht sich aus', '50% 50%'),
  basketball: w('bounce', 'Ball springt mit echter Schwerkraft, dreht sich aus', '50% 50%'),
  besen: w('sweep', 'fegt aus dem Griff heraus, drei Striche', '62% 8%'),
  bohrmaschine: w('buzz', 'Bohrmaschine vibriert', '50% 60%'),
  brille: w('adjust', 'Brille wird hochgeschoben und fällt zurück', '50% 50%'),
  buegeleisen: w('iron', 'Bügeleisen gleitet vor und zurück', '50% 85%'),
  einstellungen: w('gear', 'Zahnrad dreht sich einmal mit Gewicht', '50% 50%'),
  experiment: w('swirl', 'Kolben wird geschwenkt', '50% 90%'),
  fitness: w('curl', 'Hantel wird im Bogen hochgezogen', '30% 70%'),
  flugzeug: w('fly', 'hebt ab und landet wieder', '50% 60%'),
  foto: w('shake', 'Polaroid wird geschüttelt', '50% 50%'),
  fussabdruck: w('pressin', 'wird in den Boden gedrückt', '50% 90%'),
  fussball: w('bounce', 'Ball springt mit echter Schwerkraft, dreht sich aus', '50% 50%'),
  'geburtstagskrone': w('drop', 'Krone fällt an ihren Platz', '50% 95%'),
  giesskanne: w('pour', 'Kanne kippt und gießt', '62% 80%'),
  gluehbirne: w('glow', 'flackert an und leuchtet warm', '50% 45%'),
  handball: w('bounce', 'Ball springt mit echter Schwerkraft, dreht sich aus', '50% 50%'),
  hautpflege: w('squeeze', 'Tube wird gedrückt', '50% 90%'),
  herz: w('beat', 'schlägt zweimal', '50% 60%'),
  hundeleine: w('dangle', 'pendelt an der Schlaufe', '78% 12%'),
  inhalator: w('squeeze', 'wird heruntergedrückt', '50% 95%'),
  'inline-skaten': w('glide', 'stößt ab und gleitet', '50% 90%'),
  klettern: w('dangle', 'Karabiner pendelt am Seil', '55% 8%'),
  kontakt: w('cardflip', 'Karte dreht sich einmal', '50% 50%'),
  krankenkasse: w('cardflip', 'Karte dreht sich einmal', '50% 50%'),
  kuscheltier: w('squish', 'wird gedrückt und federt zurück', '50% 90%'),
  laetzchen: w('dangle', 'pendelt am Hals', '50% 10%'),
  laufen: w('step', 'Ferse hebt sich über die Spitze, setzt auf', '82% 88%'),
  laufrad: w('drive', 'rollt los und kommt zurück', '50% 90%'),
  medizin: w('shake', 'Flasche wird geschüttelt', '50% 80%'),
  meditation: w('breathe', 'atmet langsam ein und aus', '50% 90%'),
  mobile: w('dangle', 'pendelt am Haken', '50% 6%'),
  ort: w('drop', 'Pin fällt auf seinen Ort', '50% 95%'),
  radfahren: w('drive', 'fährt los und kommt zurück', '50% 90%'),
  rasenmaeher: w('mow', 'mäht vor und zurück', '50% 90%'),
  rassel: w('shake', 'Rassel wird geschüttelt', '30% 80%'),
  recycling: w('cycle', 'Pfeile laufen einmal rund', '50% 50%'),
  reise: w('carry', 'Koffer wird angehoben, pendelt, abgestellt', '50% 12%'),
  reiten: w('gallop', 'Sattel wippt im Galopp', '50% 90%'),
  rollstuhl: w('drive', 'rollt los und kommt zurück', '50% 90%'),
  rucksack: w('carry', 'wird hochgehoben und geschultert', '50% 12%'),
  rugby: w('toss', 'Ei wird hochgeworfen und dreht sich', '50% 50%'),
  schlafmaske: w('breathe', 'atmet ruhig', '50% 50%'),
  schlafsack: w('breathe', 'atmet ruhig', '50% 90%'),
  schlittschuhlaufen: w('glide', 'stößt ab und gleitet', '50% 90%'),
  schluessel: w('dangle', 'baumelt am Ring und klimpert aus', '72% 28%'),
  schnuller: w('beat', 'nuckelt', '50% 50%'),
  schule: w('present', 'Schultüte wird hochgehalten und gewackelt', '50% 90%'),
  schwimmen: w('float', 'plumpst aufs Wasser und schaukelt aus', '50% 70%'),
  segeln: w('rock', 'schaukelt auf den Wellen', '50% 90%'),
  kanu: w('rock', 'schaukelt auf dem Wasser', '50% 80%'),
  skateboard: w('ollie', 'Ollie: Tail runter, springt, landet', '50% 70%'),
  snowboard: w('glide', 'gleitet und kippt in die Kurve', '50% 70%'),
  sonnencreme: w('squeeze', 'Flasche wird gedrückt', '50% 90%'),
  'stand-up-paddling': w('float', 'schaukelt auf dem Wasser', '50% 70%'),
  strampler: w('dangle', 'hängt auf der Leine und pendelt', '50% 6%'),
  suchen: w('scan', 'Lupe sucht im Kreis', '50% 50%'),
  surfen: w('glide', 'reitet die Welle', '50% 70%'),
  tee: w('pour', 'Kanne kippt und gießt', '60% 85%'),
  telefon: w('ring', 'klingelt', '50% 40%'),
  'termin-absagen': w('no', 'schüttelt den Kopf', '50% 50%'),
  'termin-verschieben': w('nudge', 'schiebt sich nach rechts', '50% 50%'),
  therapie: w('squish', 'Sessel gibt nach wie beim Hinsetzen', '50% 95%'),
  tierarzt: w('pressin', 'Pfote wird eingedrückt', '50% 90%'),
  turnen: w('dangle', 'Ringe schwingen', '50% 4%'),
  uhr: w('ring', 'Wecker klingelt', '50% 40%'),
  versicherung: w('umbrella', 'Schirm spannt sich auf', '50% 90%'),
  videokonferenz: w('beat', 'pulsiert wie live', '50% 50%'),
  volleyball: w('bounce', 'Ball springt mit echter Schwerkraft, dreht sich aus', '50% 50%'),
  waage: w('pressin', 'Schale wird heruntergedrückt', '50% 90%'),
  wandern: w('step', 'Ferse hebt sich über die Spitze, setzt auf', '80% 88%'),
  waschmaschine: w('buzz', 'schleudert', '50% 90%'),
  wassertrinken: w('pour', 'Glas kippt zum Trinken', '50% 90%'),
  wickeltasche: w('carry', 'wird am Griff hochgehoben, pendelt', '50% 10%'),
  wolke: w('drift', 'zieht zur Seite und zurück', '50% 50%'),
  zug: w('drive', 'fährt los und kommt zurück', '50% 90%'),

  // Codex icons 02.11.2026 that are one thing: calm motions on critical springs
  // (calmF in clayCurves.ts). Origins sit where the thing stands, hangs or turns.
  // Vehicles: v starts with 'L' when the front points left, so they always drive
  // forwards; the rest names its weight (no two kinds of vehicle move alike).
  bus: w('arrive', 'fährt los, kommt von hinten wieder, nickt beim Bremsen', '50% 73%'),
  schulbus: w('arrive', 'fährt los, kommt von hinten wieder, nickt beim Bremsen', '50% 74%', 'L school'),
  strassenbahn: w('arrive', 'fährt auf Schienen los und kommt wieder, kaum Nicken', '50% 79%', 'rail'),
  taxi: w('arrive', 'fährt los, kommt von hinten wieder, nickt beim Bremsen', '50% 74%', 'L car'),
  motorrad: w('arrive', 'zieht schnell an (Vorderrad hebt sich), kommt wieder, nickt beim Bremsen', '50% 73%', 'L moto'),
  roller: w('arrive', 'rollt leicht los, kommt von hinten wieder', '50% 81%', 'L light'),
  lastenrad: w('arrive', 'fährt los, kommt von hinten wieder, nickt leicht beim Bremsen', '50% 71%', 'light'),
  camping: w('arrive', 'zieht schwer und langsam an, kommt gemächlich wieder', '50% 74%', 'heavy'),
  faehre: w('sail', 'legt schwer ab, kommt langsam wieder an und setzt sich ins Wasser', '50% 75%'),
  // Buildings and fixed things
  bank: w('place', 'wird wie eine Spielfigur abgesetzt, ein kleiner Ruck', '50% 81%'),
  museum: w('place', 'wird wie eine Spielfigur abgesetzt, ein kleiner Ruck', '50% 79%', 'museum'),
  garage: w('place', 'wird wie eine Spielfigur abgesetzt, ein kleiner Ruck', '50% 74%', 'garage'),
  karussell: w('carousel', 'dreht sich ein Stück und zurück', '50% 50%'),
  regenbogen: w('grow', 'sinkt verblassend in den Horizont und steigt wieder auf', '50% 73%'),
  // People nod, each in their own way
  'person-baby': w('nod', 'legt den Kopf schief', '50% 81%', 'baby'),
  'person-kind': w('nod', 'nickt zweimal schnell', '50% 81%', 'kind'),
  'person-frau': w('nod', 'nickt und neigt den Kopf', '50% 81%', 'frau'),
  'person-mann': w('nod', 'nickt', '50% 81%'),
  'person-senior': w('nod', 'nickt langsam', '50% 81%', 'senior'),
  // Food is served
  pasta: w('serve', 'Schüssel wird angehoben und sanft abgesetzt', '50% 76%', 'pasta'),
  pizza: w('serve', 'Stück wird waagerecht angehoben und sanft abgesetzt', '50% 81%', 'pizza'),
  salat: w('serve', 'Schüssel wird angehoben und sanft abgesetzt', '50% 80%', 'salat'),
  familienessen: w('serve', 'Geschirr wird wie auf einem Tablett angehoben und sanft abgesetzt', '50% 68%', 'flat'),
  fruehstueck: w('serve', 'Teller wird angehoben und sanft abgesetzt', '50% 72%', 'morgen'),
  mittagessen: w('serve', 'Teller wird angehoben und sanft abgesetzt', '50% 75%', 'mittag'),
  eisdiele: w('offer', 'Eis wird hochgehalten und kippt einem zu', '50% 81%', 'eis'),
  pokal: w('offer', 'Pokal wird hochgehoben', '50% 80%'),
  // Carried things hang from their handle
  dokumentenmappe: w('lift', 'steife Mappe wird angehoben, schwingt kaum, abgestellt', '55% 26%', 'stiff'),
  federmappe: w('serve', 'wird waagerecht angehoben und abgesetzt (kein Griff)', '50% 80%', 'case'),
  sporttasche: w('lift', 'weiche Tasche wird an den Griffen angehoben, schwingt mit, abgestellt', '50% 28%', 'soft'),
  kettlebell: w('heavy', 'wird hochgewuchtet, fällt und landet hart, federt kaum', '50% 81%'),
  // Music
  gitarre: w('strum', 'zwei Anschläge, der Korpus gibt nach', '42% 78%'),
  floete: w('flute', 'wird zum Spielen angehoben', '42% 80%'),
  klavier: w('keys', 'zwei Akkorde, ruckt zweimal auf seine Füße', '50% 77%'),
  // Things you sit or lie in give a little
  hotel: w('sink', 'jemand legt sich hinein', '50% 75%'),
  autokindersitz: w('sink', 'Kind wird hineingesetzt', '50% 81%'),
  urlaub: w('sway', 'jemand steigt in die Hängematte, das Gestell wiegt auf seinen Füßen', '50% 88%'),
  trampolin: w('spring', 'Matte gibt nach und federt zurück, die Füße bleiben stehen', '50% 60%'),
  // Cards and papers
  fuehrerschein: w('showcard', 'wird vorgezeigt und kippt ins Licht', '50% 50%'),
  personalausweis: w('showcard', 'wird vorgezeigt und kippt ins Licht', '50% 50%', 'id'),
  landkarte: w('unfold', 'faltet sich zusammen und wieder auf', '50% 50%'),
  // Seasons and small things
  fruehling: w('bloom', 'Blüte schließt sich ein wenig und öffnet sich mit einer Drehung', '44% 46%'),
  herbst: w('leaf', 'Wind hebt das Blatt, es segelt pendelnd herab', '50% 50%'),
  sommer: w('hop', 'der Wind hebt den Hut, er kippt und landet', '50% 70%'),
  halloween: w('roll', 'Kürbis schaukelt auf seinem runden Boden', '50% 80%'),
  geldboerse: w('snap', 'wird zugedrückt und öffnet sich wieder', '50% 80%'),
  feiertag: w('showcard', 'der Tag wird gezeigt und kippt ins Licht', '50% 50%', 'cal'),
  gaming: w('steer', 'Controller lenkt nach links und rechts', '50% 50%'),
  naehen: w('sew', 'Maschine näht ein paar schnelle Stiche', '50% 81%'),
  schwimmbrille: w('stretch', 'Band wird etwas gedehnt und schnappt zurück, Gläser bleiben rund', '50% 50%'),
  tauchen: w('dive', 'taucht ab und steigt wieder auf', '50% 50%'),
};

/**
 * WAITS FOR PARTS (Codex icons 02.11.2026, Icon-Teile-Prompts.md "Neu
 * 02.11.2026"): these pictures hold several separate things, so they must not
 * move as one. Until their parts are rendered they only give a little under the
 * finger ('wait'). When the parts land, move the icon to clayMotion instead.
 */
// u-bahn (tunnel, train) and audiobuch (book, headphones) moved here after the
// motion jury 02.11.: they are two things each and must not move as one.
const WAITS_FOR_PARTS = [
  'ampel', 'antrag', 'aquarium', 'audiobuch', 'ausstellung', 'autowaschanlage', 'autowerkstatt', 'backen', 'basteln', 'bier',
  'bogenschiessen', 'briefkasten', 'brotdose', 'budget', 'date', 'feier', 'geige', 'geldautomat', 'gemuese', 'grillen',
  'hochzeit', 'keramik', 'kino', 'kompass', 'konzert', 'kreditkarte', 'ladesaeule', 'lohnabrechnung', 'malen', 'medaille',
  'obst', 'ostern', 'parkplatz', 'picknick', 'planetarium', 'pruefung', 'reifenwechsel', 'restaurant', 'sauna', 'schnee',
  'silvester', 'jubilaeum', 'spenden', 'spinning', 'strand', 'stricken', 'tankstelle', 'theater', 'trinkflasche',
  'u-bahn', 'ueberweisung', 'verkehrskegel', 'wahl', 'weihnachten', 'wind', 'zelt',
] as const satisfies readonly ClayName[];
for (const n of WAITS_FOR_PARTS) clayWhole[n] = w('wait', 'wartet auf Einzelteile: nur ein kleines Nachgeben beim Antippen', '50% 90%');
export const WAITING_FOR_PARTS: readonly ClayName[] = WAITS_FOR_PARTS;

/** Everything not listed and without parts waits for its parts and answers with the quiet press. */
export const PRESS: W = { kind: 'press', what: 'wartet auf Einzelteile, bis dahin nur ein leichtes Antippen', origin: '50% 92%' };

/** Codex icons whose names the app already had before 02.11. (their pictures were replaced by the Codex renders). */
export const CODEX_HAD: readonly string[] = ['briefkasten', 'brotdose', 'federmappe', 'fruehstueck', 'mittagessen', 'pruefung', 'schulbus'];
