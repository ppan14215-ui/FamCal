/**
 * The small icon in front of a list line, as in the klar draft Julian approved (14.11.): every line of the
 * shopping list starts with what it is. The words here are things you buy or pack; a line nothing fits gets no
 * icon instead of a wrong one. Kept apart from iconWords.ts, whose words are about what you do ("Auto" there is
 * the workshop, not a toy car on a wish list).
 */
import type { ClayName } from './clayIcons';

const WORDS: [RegExp, ClayName][] = [
  // Baby
  [/windel|diaper|napp(y|ies)|pampers/, 'windeln'],
  [/feuchtt|wipes|wundcreme|\bcreme|lotion|shampoo|duschgel|seife|\bsoap|zahnpasta|toothpaste|deo\b|hautpflege|body ?wash/, 'hautpflege'],
  [/sonnencreme|sunscreen|sonnenmilch/, 'sonnencreme'],
  [/\bbrei\b|gläschen|glaeschen|baby ?food|porridge|haferbrei|grie[sß]/, 'brei'],
  [/schnuller|pacifier|dummy/, 'schnuller'],
  [/lätzchen|laetzchen|\bbibs?\b/, 'laetzchen'],
  [/strampler|\bbody\b|bodys|bodies|schlafanzug|pyjama|onesie|babykleidung|mütze|muetze|socken|socks/, 'strampler'],
  [/kuscheltier|teddy|stofftier|plush/, 'kuscheltier'],
  [/rassel|rattle|spielzeug|\btoys?\b/, 'rassel'],
  [/milchpumpe|breast ?pump|stilleinlage|nursing pad/, 'milchpumpe'],
  [/fläschchen|flaeschchen|pre ?milch|pre ?nahrung|milchpulver|formula|\bmilch\b|hafermilch|sojamilch|mandelmilch|\bmilk\b|sahne|cream\b|joghurt|yog(h)?urt|quark|kefir/, 'flaeschchen'],
  // Essen
  [/\bobst|fruit|äpfel|aepfel|\bapfel|apple|birne|pear|banane|banana|beere|berr(y|ies)|traube|grape|orange|zitrone|lemon|mango|melone|kiwi|pfirsich|peach|pflaume|kirsche|cherr/, 'obst'],
  [/salat|salad|rucola|spinat|spinach/, 'salat'],
  [/gemüse|gemuese|vegetable|veggie|karotte|möhre|moehre|carrot|brokkoli|broccoli|zucchini|tomate|tomato|gurke|cucumber|paprika|pepper|zwiebel|onion|knoblauch|garlic|kartoffel|potato|kürbis|pumpkin|lauch|sellerie|pilze|mushroom|avocado|\bmais\b|\bcorn\b|erbse|bohne|\bbeans?\b/, 'gemuese'],
  [/pizza/, 'pizza'],
  [/pasta|nudel|spaghetti|penne|lasagne|noodle|\breis\b|\brice\b|couscous|linsen|lentil/, 'pasta'],
  [/\bbrot\b|brötchen|broetchen|\bbread|toast|baguette|\bmehl\b|flour|hefe|yeast|backpulver|kuchen|\bcake|croissant|brezel/, 'backen'],
  [/\beier?\b|\beggs?\b|butter|käse|kaese|cheese|marmelade|\bjam\b|honig|honey|müsli|muesli|cereal|haferflocken|\boats?\b|cornflakes|aufschnitt|nutella/, 'fruehstueck'],
  [/fleisch|\bmeat\b|hähnchen|haehnchen|chicken|hackfleisch|mince|wurst|sausage|würstchen|steak|schinken|\bham\b|speck|bacon|fisch|\bfish\b|lachs|salmon/, 'grillen'],
  [/kaffee|coffee|espresso/, 'cafe'],
  [/\btee\b|\btea\b/, 'tee'],
  [/\bbier\b|\bbeer|\bwein\b|\bwine\b|sekt|prosecco/, 'bier'],
  [/wasser|\bwater\b|sprudel|saft|juice|limo|cola|schorle/, 'wassertrinken'],
  [/\böl\b|\boel\b|olivenöl|\boil\b|essig|vinegar|salz|\bsalt\b|pfeffer|gewürz|gewuerz|spice|zucker|sugar|brühe|bruehe|stock\b|soße|sosse|sauce|ketchup|senf|mustard|mayo|tomatenmark|passiert|konserve|\bdose\b/, 'kochtopf'],
  // Haushalt
  [/waschmittel|weichspüler|detergent|fleckenentferner/, 'waschmaschine'],
  [/spülmittel|spuelmittel|spültabs|spueltabs|dish ?(soap|tabs|washer)|klarspüler/, 'geschirrspueler'],
  [/putzmittel|reiniger|cleaner|schwamm|sponge|lappen|küchenrolle|kuechenrolle|paper towel|klopapier|toilettenpapier|toilet paper|taschent[uü]cher|tissues/, 'putzen'],
  [/müllbeutel|muellbeutel|mülltüte|bin bags?|trash bags?/, 'muell'],
  [/batterie|batter(y|ies)|akku/, 'batterie'],
  [/glühbirne|gluehbirne|leuchtmittel|light ?bulb|\blampe\b/, 'gluehbirne'],
  [/blume|flower|pflanze|\bplant\b|erde\b|dünger/, 'pflanze'],
  [/katzenfutter|hundefutter|tierfutter|cat food|dog food|katzenstreu|leckerli/, 'haustier'],
  // Gesundheit
  [/pflaster|plaster|band-?aid|verband|bandage/, 'verband'],
  [/vitamin|nahrungsergänzung|supplement|magnesium|folsäure|\beisen\b/, 'nahrungsergaenzung'],
  [/thermometer/, 'thermometer'],
  [/medizin|medikament|tablette|ibuprofen|paracetamol|nasenspray|hustensaft|medicine|\bpills?\b|zäpfchen/, 'medizin'],
  // Packen und Papiere
  [/mutterpass|u-?heft|impfpass|vaccination (card|record)/, 'u-heft'],
  [/versichertenkarte|krankenkassenkarte|insurance card/, 'krankenkasse'],
  [/ausweis|\bpass\b|passport|\bid\b/, 'personalausweis'],
  [/ladekabel|charger|ladegerät|powerbank|kopfhörer|headphones/, 'batterie'],
  [/\bbuch\b|bücher|\bbooks?\b|zeitschrift|magazine/, 'buch'],
  [/snack|riegel|\bbar\b|schokolade|chocolate|keks|cookie|chips|gummi|nüsse|nuesse|\bnuts\b|bonbon|candy|traubenzucker/, 'picknick'],
  [/hausschuhe|slippers|bademantel|bathrobe|handtuch|towel|nachthemd|still-?bh|unterwäsche|underwear|kleidung|clothes|wechsel/, 'waesche'],
  [/kamera|camera/, 'foto'],
  [/trinkflasche|water ?bottle|thermoskanne/, 'trinkflasche'],
  [/autositz|babyschale|car seat|maxi-?cosi/, 'babyschale'],
  [/geschenk|gift|present/, 'geschenk'],
  [/geld|\bcash\b|kleingeld|münzen|coins/, 'geldboerse'],
];

/** The icon for a thing on a list, or null when none fits. */
export function itemIcon(name: string): ClayName | null {
  const t = name.toLowerCase();
  return WORDS.find(([re]) => re.test(t))?.[1] ?? null;
}

/** A list shows icons when at least half of its lines have one; a few lone icons would only look ragged. */
export function listHasIcons(names: string[]): boolean {
  if (!names.length) return false;
  return names.filter((n) => itemIcon(n)).length * 2 >= names.length;
}
