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

  // Codex icons 02.11.: specific sports before the general ones below ("cargo bike" is no Radfahren, "gym bag" no Fitness)
  [/trampolin|trampoline|jump ?house|sprungbude/, 'trampolin'], [/bogenschie|archery/, 'bogenschiessen'],
  [/spinning|indoor ?cycling|ergometer/, 'spinning'], [/kettlebell|crossfit|\bhiit\b/, 'kettlebell'],
  [/tauchen|tauchkurs|tauchschein|diving|scuba|schnorchel|snorkel/, 'tauchen'], [/schwimmbrille|goggles/, 'schwimmbrille'],
  [/sporttasche|sportzeug|sportsachen|turnbeutel|gym ?bag/, 'sporttasche'],
  [/lastenrad|cargo ?bike/, 'lastenrad'], [/motorrad|motorbike|motorcycle/, 'motorrad'],

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
  // Laternen- und Martinsumzug are a November Kita event, not moving house
  [/laterne|martins|sankt martin|st\.? martin/, 'herbst'],

  // Codex icons 02.11. (after Geburtstag, before the general rules they refine: Musik, Ausflug, Kochtopf, Auto, Zug, Reise)
  // Ausgehen und Kultur
  [/\bkino|cinema|movie|\bfilm\b|filmabend/, 'kino'], [/theater|theatre|musical|schauspiel|\boper\b|opera|kasperle/, 'theater'],
  [/konzert|concert|\bgig\b|festival/, 'konzert'], [/ausstellung|exhibition|galerie|gallery|vernissage/, 'ausstellung'],
  [/museum|museen/, 'museum'], [/planetarium|sternwarte|observatory/, 'planetarium'], [/aquarium|sea ?life/, 'aquarium'],
  [/kirmes|jahrmarkt|rummel|funfair|freizeitpark|theme park|karussell|carousel|volksfest/, 'karussell'],
  [/restaurant|essen gehen|eating out|dinner out|tisch reserv/, 'restaurant'], [/date ?night|\bdate mit|rendezvous|dinner zu zweit/, 'date'],
  [/\bbier\b|\bbeer|biergarten|kneipe|\bpub\b|stammtisch|oktoberfest/, 'bier'],
  [/hochzeit|wedding|trauung|polterabend/, 'hochzeit'], [/jubiläum|jubilaeum|anniversary|jahrestag/, 'jubilaeum'],
  [/feiertag|public holiday|bank holiday|brückentag/, 'feiertag'],
  // the holiday or the occasion is the activity, not the party around it
  [/halloween/, 'halloween'], [/baby ?shower|babyparty/, 'person-baby'],
  [/\bparty|partys|konfetti|\bfete\b|fasching|karneval|fastnacht|kostüm/, 'feier'],
  [/medaille|\bmedal|siegerehrung|bundesjugendspiele|sportfest/, 'medaille'], [/pokal|turnier|tournament|trophy|meisterschaft|championship/, 'pokal'],
  // Hobbys und Musik (before the general Musik rule)
  [/gitarre|guitar/, 'gitarre'], [/klavier|piano/, 'klavier'], [/geige|violin|cello|bratsche/, 'geige'], [/flöte|floete|\bflute/, 'floete'],
  [/hörbuch|hoerbuch|audiobook|tonie/, 'audiobuch'], [/zocken|gaming|playstation|xbox|nintendo|video ?game|konsole|\bps5\b/, 'gaming'],
  [/\bmalen|malkurs|ausmalen|painting|zeichnen|drawing|aquarell/, 'malen'], [/basteln|bastel|\bcrafts?\b|\bdiy\b/, 'basteln'],
  [/stricken|strickkurs|knitting|häkeln|crochet/, 'stricken'], [/\bnähen|nähkurs|nähmaschine|naehen|sewing/, 'naehen'], [/töpfer|keramik|pottery|ceramic/, 'keramik'],
  [/backen|baking|plätzchen|kuchen/, 'backen'],
  // Essen (Frühstück, Mittag- und Abendessen kommen weiter unten)
  [/familienessen|family dinner|familienfeier/, 'familienessen'], [/grill|bbq|barbecue/, 'grillen'], [/picknick|picnic/, 'picknick'],
  // Icons v1 emoji extension 03.11.: what is eaten names the food ("Sushi essen", "Erdbeeren pflücken").
  [/erdbeer|strawberr/, 'strawberry'], [/kirsch|cherr/, 'cherries'], [/heidelbeer|blaubeer|blueberr/, 'blueberries'],
  [/banane|banana/, 'banana'], [/zitrone|lemon/, 'lemon'], [/wassermelone|watermelon|melone/, 'watermelon'], [/pfirsich|peach/, 'peach'],
  [/\bbirnen?\b|\bpears?\b/, 'pear'], [/ananas|pineapple/, 'pineapple'], [/kokos|coconut/, 'coconut'], [/avocado/, 'avocado'],
  [/\bmais\b|maiskolben|\bcorn\b/, 'corn'], [/gurke|cucumber/, 'cucumber'], [/karotte|möhre|moehre|carrot/, 'carrot'], [/brokkoli|broccoli/, 'broccoli'],
  [/pilze|pilz sammeln|champignon|mushroom/, 'mushroom'], [/süßkartoffel|suesskartoffel|sweet potato/, 'sweet-potato'],
  [/croissant/, 'croissant'], [/brezel|breze|pretzel/, 'pretzel'], [/bäcker|baecker|bakery|\bbrot\b|\bbread\b/, 'bread'], [/käse|kaese|cheese|raclette|fondue/, 'cheese'],
  [/dumpling|gyoza|dim sum/, 'dumpling'], [/sushi/, 'sushi'], [/ramen|pho\b/, 'ramen'], [/popcorn/, 'popcorn'], [/\b(cheese)?burgers?\b/, 'hamburger'],
  [/pommes|\bfries\b/, 'french-fries'], [/\btacos?\b/, 'taco'], [/burrito/, 'burrito'], [/hot ?dog/, 'hotdog'],
  [/pfannkuchen|pancake|crêpe|crepe/, 'pancakes'], [/waffel|waffle/, 'waffle'], [/\bkekse?\b|cookie/, 'cookie'], [/schokolade|chocolate/, 'chocolate-bar'],
  [/süßigkeit|suessigkeit|candy|sweets/, 'candy'], [/lolli|lollipop/, 'lollipop'], [/honig|honey|imker/, 'honey'], [/bagel/, 'bagel'],
  [/\breis\b|\brice\b/, 'rice-bowl'], [/curry/, 'curry'], [/bento/, 'bento'], [/donut|doughnut/, 'doughnut'], [/\beier\b|\beggs?\b/, 'egg'],
  [/pizza/, 'pizza'], [/pasta|nudel|spaghetti|lasagne/, 'pasta'], [/salat|salad/, 'salat'],
  [/eisdiele|eiscafé|eiscafe|eis essen|ice ?cream|gelato/, 'eisdiele'],
  [/\bobst|fruit|äpfel|\bapfel|\bbirnen?\b|banane/, 'obst'], [/gemüse|gemuese|vegetable|veggie|karotte|möhre|brokkoli|zucchini/, 'gemuese'],
  [/brotdose|lunch ?box/, 'brotdose'], [/trinkflasche|water ?bottle|wasserflasche/, 'trinkflasche'], [/federmappe|mäppchen|pencil case/, 'federmappe'],
  // Menschen
  [/großeltern|grosseltern|grandparents|altenheim|seniorenheim|pflegeheim/, 'person-senior'],
  [/babysitter|nanny|kinderfrau/, 'person-kind'], [/babybesuch|neugeboren|newborn/, 'person-baby'],
  [/mädelsabend|maedelsabend|frauenabend|girls'? ?night/, 'person-frau'], [/männerabend|jungsabend|guys'? ?night/, 'person-mann'],
  // Draußen
  [/\bstrand|beach|badesee|\bmeer\b|seaside/, 'strand'],
  [/zelten|zeltlager|\bzelt\b|\btent\b/, 'zelt'], [/camping|wohnmobil|camper|wohnwagen|caravan/, 'camping'],
  [/hotel|übernachtung|airbnb|ferienwohnung|hostel/, 'hotel'], [/hängematte|haengematte|hammock|entspannen|relax/, 'urlaub'],
  [/kompass|compass|orientierungslauf|geocach|schnitzeljagd/, 'kompass'], [/landkarte|stadtplan|\bmap\b|route planen/, 'landkarte'],
  [/sauna|therme|\bspa\b|wellness/, 'sauna'],
  // Unterwegs (before Auto and Zug)
  [/u-bahn|\bubahn|subway|\bmetro\b|underground/, 'u-bahn'], [/straßenbahn|strassenbahn|\btram\b/, 'strassenbahn'],
  [/schulbus|school bus/, 'schulbus'], [/\bbus(se|fahrt\w*|haltestelle|ticket|linie|fahrkarte)?\b/, 'bus'], [/\btaxi|\bcab\b|\buber\b/, 'taxi'], [/fähre|faehre|ferry/, 'faehre'],
  [/tretroller|e-roller|\broller(fahren)?\b|scooter/, 'roller'],
  [/führerschein|fuehrerschein|fahrstunde|fahrschule|driving (lesson|test)|driver'?s licen/, 'fuehrerschein'],
  [/werkstatt|inspektion|tüv|\bmot\b|car service/, 'autowerkstatt'], [/reifen|\btyres?\b|\btires?\b/, 'reifenwechsel'],
  [/waschanlage|auto waschen|car ?wash/, 'autowaschanlage'], [/tanken|tankstelle|gas station|petrol|\bfuel/, 'tankstelle'],
  [/ladesäule|ladesaeule|wallbox|e-auto|charging station/, 'ladesaeule'], [/parkhaus|parkplatz|parken|parking|parkausweis|anwohnerpark/, 'parkplatz'],
  [/garage/, 'garage'], [/kindersitz|car seat|autositz/, 'autokindersitz'],
  [/verkehrsschule|verkehrserziehung|ampel|traffic light|fahrradprüfung/, 'ampel'], [/baustelle|roadworks|umleitung|\bstau\b/, 'verkehrskegel'],
  [/elternabend|elterngespräch|parent.?teacher|parents.? evening/, 'elternabend'],
  [/kita|krippe|kindergarten|tagesmutter|daycare|nursery|preschool/, 'kita'],
  [/hausaufgabe|homework/, 'hausaufgaben'],
  [/prüfung|klausur|exam/, 'pruefung'],
  [/nachhilfe|sprachkurs|language class|tutor/, 'sprachkurs'],
  [/schule|school|einschulung/, 'schule'],
  [/spielplatz|playground/, 'spielplatz'],
  [/spielenachmittag|spieleabend|brettspiel|board ?game|game night/, 'gesellschaftsspiel'],
  [/krabbel|pekip|playgroup|babygruppe|baby ?group/, 'fussabdruck'],
  [/bibliothek|bücherei|library/, 'bibliothek'],
  // no bare "buch": "Flug buchen" and "Urlaub buchen" are bookings
  [/vorlesen|\blesen|\bbuch\b|bücher|\bbooks?\b(?!\s+(a\s+|the\s+)?(flights?|hotel|table|trip|tickets?|appointment))|reading/, 'buch'],
  [/musik|konzert|klavier|gitarre|geige|flöte|chor|music|concert|piano|guitar|violin|choir/, 'musik'],
  [/einladung|party|feier|fest\b|invitation|celebration/, 'einladung'],
  [/geschenk|present|gift/, 'geschenk'],
  [/frühstück|breakfast/, 'fruehstueck'], [/mittagessen|\blunch/, 'mittagessen'], [/abendessen|\bdinner|supper/, 'abendessen'],
  [/café|cafe|kaffee|coffee/, 'cafe'], [/\btee\b|\btea\b/, 'tee'],
  [/essen\b|kochen|grill|brunch|bbq|cook/, 'kochtopf'], [/\boma\b|\bopa\b|grandma|grandpa/, 'person-senior'],
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
  [/weihnachtsmarkt|christkindl/, 'weihnachten'],
  [/einkauf|markt|supermarkt|grocer|shopping/, 'einkauf'],

  // Arbeit und Termine
  [/videocall|videokonferenz|zoom|teams|video ?call/, 'videokonferenz'],
  [/meeting|besprechung|termin mit chef/, 'meeting'], [/präsentation|vortrag|presentation|talk\b/, 'praesentation'],
  [/homeoffice|home office|wfh/, 'homeoffice'], [/onlinekurs|webinar|online ?course/, 'onlinekurs'],
  [/anruf|telefon|\bcall\b|phone/, 'telefon'],

  // Amt und Geld
  [/steuer|\btax(es)?\b/, 'steuer'], [/kindergeld|elterngeld|child benefit/, 'kindergeld'], [/krankenkasse|health insurance/, 'krankenkasse'],
  [/versicherung|insurance/, 'versicherung'], [/rechnung|bezahlen|invoice|bill\b/, 'rechnung'], [/vertrag|kündig|contract/, 'vertrag'],
  // Codex 02.11.: the ID card has its own icon now (before Reisepass)
  [/personalausweis|\bperso\b|\bausweis|id card|identity card/, 'personalausweis'],
  [/urkunde|certificate/, 'urkunde'], [/reisepass|personalausweis|\bpass\b|ausweis|passport/, 'reisepass'],
  [/\bamt\b|behörde|bürgeramt|rathaus|standesamt|jugendamt|kundenzentrum|dmv|city hall/, 'amt'],
  // Codex icons 02.11.: Geld und Papiere (after Amt: "Antrag beim Bürgeramt" stays Amt)
  [/antrag|formular|beantrag|application form/, 'antrag'], [/unterlagen|dokumente|documents|paperwork/, 'dokumentenmappe'],
  [/überweis|ueberweis|dauerauftrag|bank transfer|wire transfer/, 'ueberweisung'], [/kreditkarte|credit card|karte sperren/, 'kreditkarte'],
  [/geldautomat|bargeld|\batm\b|\bcash\b/, 'geldautomat'], [/\blohn|gehalt|payslip|salary|payroll/, 'lohnabrechnung'],
  [/budget|haushaltsbuch|finanzen|finances/, 'budget'], [/geldbörse|geldboerse|portemonnaie|portmonee|wallet|taschengeld/, 'geldboerse'],
  [/spende|spenden|donat|charity|ehrenamt|volunteer/, 'spenden'], [/\bwahl\b|wahllokal|wählen gehen|briefwahl|election|\bvote|voting/, 'wahl'],
  [/\bbank\b|bankberat|bankterm|sparkasse|volksbank/, 'bank'],
  [/frist|deadline|abgabe|due\b/, 'frist'], [/\bbank\b|sparen|savings/, 'sparschwein'],

  // Unterwegs
  [/ausflug|zoo|tierpark|museum|outing|excursion/, 'ausflug'], [/flug|flughafen|flight|airport|\bfly\b/, 'flugzeug'], [/\bzug\b|\bbahn|-bahn|train/, 'zug'],
  [/urlaub|reise|ferien|vacation|holiday|trip/, 'reise'],
  [/spazier|kinderwagen|walk|stroller/, 'kinderwagen'], [/auto|werkstatt|tüv|reifen|car\b|garage|mot\b/, 'auto'],
  [/strand|beach|sonnencreme|sunscreen/, 'sonnencreme'],
  // Icons v1 emoji extension 03.11.: animals, plants, people and things, before the seasons.
  [/elefant|elephant/, 'elephant'], [/giraffe/, 'giraffe'], [/zebra/, 'zebra'], [/löwe|loewe|\blions?\b/, 'lion'], [/panda/, 'panda'], [/koala/, 'koala'],
  [/affe\b|affen|monkey/, 'monkey'], [/delfin|delphin|dolphin/, 'dolphin'], [/\bwal\b|wale\b|whale/, 'whale'], [/schildkröte|turtle/, 'turtle'],
  [/hamster/, 'hamster'], [/kaninchen|\bhasen?\b|rabbit|bunny/, 'rabbit'], [/\bigel|hedgehog/, 'hedgehog'], [/schmetterling|butterfl/, 'butterfly'],
  [/biene|bienen|\bbees?\b/, 'bee'], [/frosch|frog/, 'frog'],
  [/feuerwehr|firefighter|fire station/, 'person-firefighter'], [/polizei|police/, 'person-police'], [/lehrer|lehrerin|teacher/, 'person-teacher'],
  [/sonnenblume|sunflower/, 'sunflower'], [/tulpe|tulip/, 'tulip'], [/\brosen?\b|\broses?\b/, 'rose'], [/blumen|flower|blumenstrauß/, 'flower'],
  [/zimmerpflanze|umtopfen|houseplant|potted plant/, 'potted-plant'], [/kräuter|kraeuter|\bherbs?\b/, 'herb'], [/kaktus|cactus/, 'cactus'],
  [/lagerfeuer|campfire|bonfire|osterfeuer/, 'fire'], [/feuerwerk|fireworks/, 'fireworks'], [/sternschnuppe|shooting star|meteor/, 'shooting-star'],
  [/luftballon|ballon|balloon/, 'balloon'], [/verlobung|engagement|heiratsantrag/, 'ring'], [/valentinstag|valentine/, 'heart-with-arrow'],
  [/parfum|parfüm|perfume/, 'perfume'], [/nagellack|nail polish/, 'nail-polish'], [/gewitter|thunderstorm|\bblitz/, 'lightning-bolt'],
  [/siegerehrung|first place|1\. platz|erster platz/, 'medal-first'], [/geldsack|money bag/, 'money-bag'],
  // Codex 02.11.: holidays, seasons and weather last. They are often only the
  // time ("Kita ab Herbst", "bis Weihnachten"), so any real activity wins.
  // \bwind: no Windeln; no "laub": Urlaub.
  [/weihnacht|christmas|xmas|advent|nikolaus/, 'weihnachten'], [/ostern|easter|osterei|ostereier/, 'ostern'], [/halloween|kürbis|pumpkin/, 'halloween'],
  [/silvester|neujahr|new year|\bnye\b/, 'silvester'],
  [/\bschnee|snow|schlitten|sledding/, 'schnee'], [/\bwind\b|windig|sturm|storm|drachen steigen/, 'wind'],
  [/regenbogen|rainbow|\bcsd\b|pride/, 'regenbogen'], [/frühling|frühjahr|fruehling|spring ?break/, 'fruehling'],
  [/\bsommer(fest|ferien)?\b|\bsummer\b/, 'sommer'], [/herbst|autumn|laub ?(harken|rechen|fegen)/, 'herbst'],
];

export const iconFor = (text: string): ClayName => {
  const t = text.toLowerCase();
  return ICONS.find(([re]) => re.test(t))?.[1] ?? 'kalender';
};
