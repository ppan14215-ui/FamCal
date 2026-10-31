/**
 * Gesetzliche Feiertage (Julian 29.10.: "Feiertage sind automatisch eingetragen").
 * Computed for any year and Bundesland, so nothing has to be looked up. They show
 * in the calendar, work series skip them and they never cost a vacation day.
 */
import { addDays } from './dates';

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Easter Sunday (Gauss, Gregorian calendar). */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, month, day);
}

const IN = (land: string, ...lands: string[]) => !land || lands.includes(land);

/** [date, name] for one year; without a Bundesland only the nationwide ones and the most common. */
export function feiertage(year: number, land = '', ort = ''): [string, string][] {
  const e = easter(year);
  const out: [string, string][] = [
    [iso(year, 1, 1), 'Neujahr'],
    [addDays(e, -2), 'Karfreitag'],
    [addDays(e, 1), 'Ostermontag'],
    [iso(year, 5, 1), 'Tag der Arbeit'],
    [addDays(e, 39), 'Christi Himmelfahrt'],
    [addDays(e, 50), 'Pfingstmontag'],
    [iso(year, 10, 3), 'Tag der Deutschen Einheit'],
    [iso(year, 12, 25), '1. Weihnachtstag'],
    [iso(year, 12, 26), '2. Weihnachtstag'],
  ];
  if (land && IN(land, 'Baden-Württemberg', 'Bayern', 'Sachsen-Anhalt')) out.push([iso(year, 1, 6), 'Heilige Drei Könige']);
  if (land && IN(land, 'Berlin', 'Mecklenburg-Vorpommern')) out.push([iso(year, 3, 8), 'Frauentag']);
  if (land && IN(land, 'Baden-Württemberg', 'Bayern', 'Hessen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland')) out.push([addDays(e, 60), 'Fronleichnam']);
  // Bayern: only where more Catholics than Protestants live (Art. 1 Abs. 3 FTG, Zensus 2022, 1 708 of 2 056 Gemeinden).
  if (land === 'Saarland' || (land === 'Bayern' && ort && !OHNE_HIMMELFAHRT.has(ort))) out.push([iso(year, 8, 15), 'Mariä Himmelfahrt']);
  if (land === 'Bayern' && ort === 'Augsburg') out.push([iso(year, 8, 8), 'Augsburger Friedensfest']);
  if (land && IN(land, 'Thüringen')) out.push([iso(year, 9, 20), 'Weltkindertag']);
  if (land && IN(land, 'Brandenburg', 'Bremen', 'Hamburg', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen')) out.push([iso(year, 10, 31), 'Reformationstag']);
  if (land && IN(land, 'Baden-Württemberg', 'Bayern', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland')) out.push([iso(year, 11, 1), 'Allerheiligen']);
  if (land === 'Sachsen') {
    // Wednesday before 23 November.
    let d = iso(year, 11, 22);
    while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 3) d = addDays(d, -1);
    out.push([d, 'Buß- und Bettag']);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * The 348 Bavarian Gemeinden without Mariä Himmelfahrt, names as in the Destatis list
 * (Bayerisches Landesamt für Statistik, Datenbank "Mariä Himmelfahrt", Zensus 2022, read 29.10.2026).
 */
const OHNE_HIMMELFAHRT = new Set('Birgland|Edelsfeld|Hirschbach|Illschwang|Königstein|Etzelwang|Neukirchen b.Sulzbach-Rosenberg|Weigendorf|Neustadt am Kulm|Bayreuth|Coburg|Hof|Bad Berneck i.Fichtelgebirge|Betzenstein|Bindlach|Bischofsgrün|Creußen|Eckersdorf|Emtmannsberg|Gefrees|Gesees|Glashütten|Goldkronach|Haag|Heinersreuth|Hummeltal|Mistelbach|Mistelgau|Plech|Prebitz|Schnabelwaid|Seybothenreuth|Speichersdorf|Warmensteinach|Weidenberg|Ahorn|Dörfles-Esbach|Ebersdorf b.Coburg|Großheirath|Grub a.Forst|Itzgrund|Lautertal|Meeder|Neustadt b.Coburg|Niederfüllbach|Bad Rodach|Rödental|Seßlach|Sonnefeld|Untersiemau|Weidhausen b.Coburg|Weitramsdorf|Egloffstein|Gräfenberg|Hiltpoltstein|Igensdorf|Wiesenttal|Bad Steben|Berg|Döhlau|Feilitzsch|Gattendorf|Geroldsgrün|Helmbrechts|Issigau|Köditz|Konradsreuth|Leupoldsgrün|Lichtenberg|Münchberg|Naila|Oberkotzau|Regnitzlosau|Rehau|Schauenstein|Schwarzenbach a.d.Saale|Schwarzenbach a.Wald|Selbitz|Sparneck|Stammbach|Töpen|Trogen|Weißdorf|Zell im Fichtelgebirge|Küps|Ludwigsstadt|Mitwitz|Schneckenlohe|Tettau|Weißenbrunn|Grafengehaig|Guttenberg|Harsdorf|Himmelkron|Kasendorf|Ködnitz|Kulmbach|Mainleus|Marktschorgast|Neudrossenfeld|Neuenmarkt|Rugendorf|Thurnau|Trebgast|Untersteinach|Wirsberg|Wonsees|Michelau i.OFr.|Redwitz a.d.Rodach|Bad Alexandersbad|Arzberg|Höchstädt i.Fichtelgebirge|Hohenberg a.d.Eger|Kirchenlamitz|Marktleuthen|Marktredwitz|Röslau|Schirnding|Schönwald|Selb|Thiersheim|Thierstein|Tröstau|Weißenstadt|Wunsiedel|Ansbach|Erlangen|Fürth|Nürnberg|Schwabach|Adelshofen|Bechhofen|Bruckberg|Buch a.Wald|Burk|Colmberg|Dentlein a.Forst|Diebach|Dietenhofen|Dinkelsbühl|Dombühl|Ehingen|Feuchtwangen|Flachslanden|Gebsattel|Gerolfingen|Geslau|Heilsbronn|Insingen|Langfurth|Lehrberg|Leutershausen|Lichtenau|Merkendorf|Mönchsroth|Neuendettelsau|Neusitz|Oberdachstetten|Ohrenbach|Petersaurach|Röckingen|Rothenburg ob der Tauber|Rügland|Sachsen b.Ansbach|Schillingsfürst|Schnelldorf|Schopfloch|Steinsfeld|Unterschwaningen|Wassertrüdingen|Weidenbach|Weihenzell|Weiltingen|Wettringen|Wieseth|Windelsbach|Windsbach|Wittelshofen|Wörnitz|Aurachtal|Buckenhof|Eckental|Heroldsberg|Kalchreuth|Lonnerstadt|Möhrendorf|Mühlhausen|Oberreichenbach|Spardorf|Uttenreuth|Vestenbergsgreuth|Ammerndorf|Cadolzburg|Großhabersdorf|Langenzenn|Oberasbach|Obermichelbach|Puschendorf|Roßtal|Seukendorf|Stein|Tuchenbach|Veitsbronn|Wilhermsdorf|Zirndorf|Alfeld|Altdorf b.Nürnberg|Burgthann|Engelthal|Feucht|Happurg|Hartenstein|Henfenfeld|Hersbruck|Kirchensittenbach|Lauf a.d.Pegnitz|Leinburg|Offenhausen|Ottensoos|Pommelsbrunn|Reichenschwand|Röthenbach a.d.Pegnitz|Rückersdorf|Schwaig b.Nürnberg|Schwarzenbruck|Velden|Vorra|Winkelhaid|Bad Windsheim|Baudenbach|Burgbernheim|Burghaslach|Dachsbach|Diespeck|Dietersheim|Emskirchen|Ergersheim|Gallmersgarten|Gerhardshofen|Gollhofen|Gutenstetten|Hagenbüchach|Hemmersheim|Illesheim|Ippesheim|Ipsheim|Langenfeld|Marktbergel|Markt Erlbach|Markt Nordheim|Markt Taschendorf|Münchsteinach|Neuhof a.d.Zenn|Neustadt a.d.Aisch|Oberickelsheim|Obernzenn|Simmershofen|Sugenheim|Trautskirchen|Uehlfeld|Uffenheim|Weigenheim|Wilhelmsdorf|Büchenbach|Georgensgmünd|Kammerstein|Schwanstetten|Rednitzhembach|Rohr|Roth|Thalmässing|Wendelstein|Absberg|Alesheim|Muhr a.See|Bergen|Burgsalach|Dittenheim|Ettenstatt|Gunzenhausen|Haundorf|Heidenheim|Höttingen|Langenaltheim|Markt Berolzheim|Meinheim|Nennslingen|Pappenheim|Pfofeld|Polsingen|Solnhofen|Theilenhofen|Treuchtlingen|Weißenburg i.Bay.|Westheim|Geroda|Zeitlofs|Aubstadt|Höchheim|Ostheim v.d.Rhön|Sondheim v.d.Rhön|Willmars|Königsberg i.Bay.|Maroldsweisach|Rentweinsdorf|Untermerzbach|Ermershausen|Abtswind|Albertshofen|Buchbrunn|Castell|Kitzingen|Kleinlangheim|Mainbernheim|Mainstockheim|Marktbreit|Markt Einersheim|Marktsteft|Martinsheim|Obernbreit|Rödelsee|Rüdenhausen|Segnitz|Wiesenbronn|Hasloch|Mittelsinn|Partenstein|Sennfeld|Altertheim|Reichenberg|Remlingen|Sommerhausen|Uettingen|Winterhausen|Bächingen a.d.Brenz|Lauben|Woringen|Alerheim|Auhausen|Deiningen|Ederheim|Forheim|Harburg (Schwaben)|Hohenaltheim|Mönchsdeggingen|Möttingen|Nördlingen|Wechingen'.split('|'));

/** Germany needs no download: every holiday is computed here. Other countries come from src/lib/holidays.ts. */
let foreign: { country: string; days: Map<string, string> } | null = null;
export function setForeign(country: string, days: [string, string][]) { foreign = country === 'DE' ? null : { country, days: new Map(days) }; cache.clear(); }

let where = { land: '', ort: '' };
export function setWhere(land: string, ort: string) { where = { land, ort }; cache.clear(); }
export const whereNow = () => where;

const cache = new Map<string, Set<string>>();
/** Is this day a public holiday where the family lives? */
export function isFeiertag(date: string, _land?: string) {
  if (foreign) return foreign.days.has(date);
  const y = Number(date.slice(0, 4));
  const k = `${y}|${where.land}|${where.ort}`;
  if (!cache.has(k)) cache.set(k, new Set(feiertage(y, where.land, where.ort).map(([d]) => d)));
  return cache.get(k)!.has(date);
}

/** Days off work: weekends and holidays. */
export const isWorkday = (date: string, _land?: string) => { const wd = new Date(`${date}T12:00:00Z`).getUTCDay(); return wd !== 0 && wd !== 6 && !isFeiertag(date); };

/**
 * Holidays and days like Halloween are good to know, but nobody "goes" there
 * (Julian 30.10.: "aktuell sieht es aus als hätte ich da was vor"). They show
 * as a quiet line on their day, never as a Termin with a person. Only the bare
 * name counts: "Weihnachten bei Mama" is a real Termin.
 */
const INFO_DAYS = /^(halloween|allerheiligen|allerseelen|reformationstag|neujahr|silvester|heilige drei könige|valentinstag|rosenmontag|weiberfastnacht|fasching|karneval|aschermittwoch|gründonnerstag|karfreitag|karsamstag|ostern|ostersonntag|ostermontag|tag der arbeit|muttertag|vatertag|christi himmelfahrt|pfingsten|pfingstsonntag|pfingstmontag|fronleichnam|mariä himmelfahrt|weltkindertag|tag der deutschen einheit|erntedank|erntedankfest|martinstag|st\.? martin|volkstrauertag|buß- und bettag|totensonntag|ewigkeitssonntag|nikolaus|nikolaustag|[1-4]\. advent|heiligabend|weihnachten|1\. weihnachtstag|2\. weihnachtstag|erster weihnachtstag|zweiter weihnachtstag|new year'?s day|new year'?s eve|valentine'?s day|easter|easter sunday|easter monday|good friday|mother'?s day|father'?s day|independence day|labor day|memorial day|thanksgiving|christmas|christmas eve|christmas day|boxing day|all saints'? day)$/i;

export const isInfoDay = (e: { cal?: string; title: string; allDay?: boolean; place?: string; work?: boolean }) =>
  !e.work && (e.cal === 'feiertage' || (!!e.allDay && !e.place && INFO_DAYS.test(e.title.trim())));
