/**
 * A clay symbol from a Termin's words, German or English (Julian 27.10.:
 * "Fußball am Montag mit Freunden" gets the ball). Used by the rules, as a
 * fallback when Claude names no icon, and for imported phone calendars.
 * Specific before general: "Zahnarzt" before "Arzt", "Kinderarzt" before
 * "Kind". Short words carry \b so "Samstag" is no "Amt".
 */
import type { ClayName } from './clayIcons';

const ICONS: [RegExp, ClayName][] = [
  // Gesundheit
  [/zahn|dentist|kieferorth|orthodont/, 'zahnarzt'],
  [/tierarzt|\bvet\b|veterinar/, 'tierarzt'],
  [/impf|vaccin|\bshots?\b|booster/, 'impfung'],
  [/hebamme|midwife/, 'hebamme'],
  [/ultraschall|ultrasound|\bscan\b|frauenarzt|gynäk|gyn\b|obgyn/, 'ultraschall'],
  [/\bu\d{1,2}\b|u-heft|vorsorge/, 'u-heft'],
  [/augen|optiker|eye ?(test|exam|doctor)|optician/, 'augenuntersuchung'],
  [/hörtest|hörgerät|ohrenarzt|\bhno\b|hearing/, 'hoergeraet'],
  [/physio|krankengymnast|osteopath/, 'physiotherapie'],
  [/therapie|therapeut|therapy|therapist|logopäd|ergotherap|speech therap/, 'therapie'],
  [/krankenhaus|klinik|hospital|notaufnahme|emergency/, 'krankenhaus'],
  [/blutabnahme|bluttest|blood ?test|labor\b/, 'blutprobe'],
  [/allergi/, 'allergie'],
  [/apotheke|pharmacy|rezept abholen|prescription/, 'apotheke'],
  [/massage/, 'massage'],
  [/arzt|ärztin|praxis|doktor|\bdr\.|doctor|pediatric|checkup|check-up|clinic|untersuchung/, 'stethoskop'],
  [/krank|fieber|sick|fever/, 'thermometer'],
  [/schwanger|pregnan/, 'schwangerschaftstest'],

  // Sport
  [/fußball|fussball|soccer|football|kicken/, 'fussball'],
  [/schwimm|swim|seepferdchen/, 'schwimmen'],
  [/basketball/, 'basketball'], [/handball/, 'handball'], [/volleyball/, 'volleyball'],
  [/tischtennis|ping ?pong|table tennis/, 'tischtennis'], [/badminton|federball/, 'badminton'], [/squash/, 'squash'], [/padel/, 'padel'], [/tennis/, 'tennis'],
  [/eishockey|ice hockey/, 'eishockey'], [/hockey/, 'hockey'], [/rugby/, 'rugby'], [/cricket/, 'cricket'], [/golf/, 'golf'],
  [/bowling|kegeln/, 'bowling'], [/boule|boccia|pétanque|petanque/, 'boule'], [/darts/, 'darts'],
  [/boxen|boxing/, 'boxen'], [/judo|karate|taekwondo|kampfsport|martial/, 'kampfsport'], [/fechten|fencing/, 'fechten'],
  [/turnen|gymnastics|kinderturnen|eltern-kind-turnen/, 'turnen'], [/tanz|ballett|dance|ballet/, 'tanzen'],
  [/pilates/, 'pilates'], [/yoga|rückbildung|postnatal/, 'yogamatte'], [/meditat|achtsam|mindful/, 'meditation'],
  [/fitness|gym\b|workout|krafttraining/, 'fitness'], [/klettern|bouldern|climb/, 'klettern'],
  [/laufen|joggen|\brun\b|running|\bjog|marathon/, 'laufen'], [/radfahr|fahrrad|radtour|\bbike|cycling/, 'radfahren'], [/laufrad|balance bike/, 'laufrad'],
  [/reiten|reitstunde|pony|pferd|riding|horse/, 'reiten'], [/\bski\b|skifahr|skiing/, 'ski'], [/snowboard/, 'snowboard'], [/schlittschuh|eislaufen|ice skat/, 'schlittschuhlaufen'],
  [/inline|rollschuh|roller ?skat/, 'inline-skaten'], [/skateboard/, 'skateboard'], [/surf/, 'surfen'], [/paddle ?board|\bsup\b|stand.?up/, 'stand-up-paddling'],
  [/kanu|kajak|canoe|kayak/, 'kanu'], [/rudern|rowing/, 'rudern'], [/segeln|sailing/, 'segeln'], [/wander|hiking|\bhike/, 'wandern'],

  // Kinder und Familie
  [/kindergeburtstag|geburtstag|birthday|bday/, 'geburtstag'],
  [/elternabend|elterngespräch|parent.?teacher|parents.? evening/, 'elternabend'],
  [/kita|krippe|kindergarten|tagesmutter|daycare|nursery|preschool/, 'kita'],
  [/schulbus|school bus/, 'schulbus'],
  [/hausaufgabe|homework/, 'hausaufgaben'],
  [/prüfung|klausur|exam/, 'pruefung'],
  [/nachhilfe|sprachkurs|language class|tutor/, 'sprachkurs'],
  [/schule|school|einschulung/, 'schule'],
  [/spielplatz|playground/, 'spielplatz'],
  [/spielenachmittag|spieleabend|brettspiel|board ?game|game night/, 'gesellschaftsspiel'],
  [/krabbel|pekip|playgroup|babygruppe|baby ?group/, 'fussabdruck'],
  [/bibliothek|bücherei|library/, 'bibliothek'],
  [/vorlesen|lesen|buch|book|reading/, 'buch'],
  [/musik|konzert|klavier|gitarre|geige|flöte|chor|music|concert|piano|guitar|violin|choir/, 'musik'],
  [/einladung|party|feier|fest\b|invitation|celebration/, 'einladung'],
  [/geschenk|present|gift/, 'geschenk'],
  [/frühstück|breakfast/, 'fruehstueck'], [/mittagessen|\blunch/, 'mittagessen'], [/abendessen|\bdinner|supper/, 'abendessen'],
  [/café|cafe|kaffee|coffee/, 'cafe'], [/\btee\b|\btea\b/, 'tee'],
  [/\boma\b|\bopa\b|essen\b|kochen|grill|brunch|bbq|grandma|grandpa|cook/, 'kochtopf'],
  [/\bhund\b|\bhunde|gassi|\bdog/, 'hundeleine'], [/haustier|katze|\bpet\b|\bcat\b/, 'haustier'],

  // Zuhause
  [/umzug|umziehen|moving|move house/, 'umzug'],
  [/friseur|frisör|haare schneiden|haircut|hairdress|barber/, 'friseur'],
  [/maniküre|nägel|manicure|nails/, 'manikuere'],
  [/handwerker|reparatur|klempner|elektriker|monteur|plumber|repair|electrician/, 'handwerker'],
  [/putzen|putzfrau|reinigung|cleaning|cleaner/, 'putzen'],
  [/staubsaug|vacuum/, 'staubsauger'], [/fenster ?putzen|window/, 'fensterputzen'], [/wäsche|waschen|laundry/, 'waesche'],
  [/rasen|mähen|lawn|mow/, 'rasenmaeher'], [/garten|hecke|garden|hedge/, 'heckenschere'], [/gießen|pflanzen|plants|water the/, 'giesskanne'],
  [/müll|tonne|abfall|trash|garbage|bins|rubbish/, 'muell'], [/altglas|glascontainer|recycl|wertstoff|gelber sack/, 'recycling'],
  [/paket|lieferung|\bpost\b|package|parcel|delivery/, 'paket'],
  [/einkauf|markt|supermarkt|grocer|shopping/, 'einkauf'],

  // Arbeit und Termine
  [/videocall|videokonferenz|zoom|teams|video ?call/, 'videokonferenz'],
  [/meeting|besprechung|termin mit chef/, 'meeting'], [/präsentation|vortrag|presentation|talk\b/, 'praesentation'],
  [/homeoffice|home office|wfh/, 'homeoffice'], [/onlinekurs|webinar|online ?course/, 'onlinekurs'],
  [/anruf|telefon|\bcall\b|phone/, 'telefon'],

  // Amt und Geld
  [/steuer|\btax(es)?\b/, 'steuer'], [/kindergeld|elterngeld|child benefit/, 'kindergeld'], [/krankenkasse|health insurance/, 'krankenkasse'],
  [/versicherung|insurance/, 'versicherung'], [/rechnung|bezahlen|invoice|bill\b/, 'rechnung'], [/vertrag|kündig|contract/, 'vertrag'],
  [/urkunde|certificate/, 'urkunde'], [/reisepass|personalausweis|\bpass\b|ausweis|passport/, 'reisepass'],
  [/\bamt\b|behörde|bürgeramt|rathaus|standesamt|jugendamt|kundenzentrum|dmv|city hall/, 'amt'],
  [/frist|deadline|abgabe|due\b/, 'frist'], [/bank|sparen|savings/, 'sparschwein'],

  // Unterwegs
  [/ausflug|zoo|tierpark|museum|outing|excursion/, 'ausflug'], [/flug|flughafen|flight|airport|\bfly\b/, 'flugzeug'], [/\bzug\b|\bbahn|-bahn|train/, 'zug'],
  [/urlaub|reise|ferien|vacation|holiday|trip/, 'reise'],
  [/spazier|kinderwagen|walk|stroller/, 'kinderwagen'], [/auto|werkstatt|tüv|reifen|car\b|garage|mot\b/, 'auto'],
  [/strand|beach|sonnencreme|sunscreen/, 'sonnencreme'],
];

export const iconFor = (text: string): ClayName => {
  const t = text.toLowerCase();
  return ICONS.find(([re]) => re.test(t))?.[1] ?? 'kalender';
};
