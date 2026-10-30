/**
 * Assistent (Julian 30.10.: "Wir müssen wirklich eine Intelligenz davor
 * schalten, wie du, die versteht, was alles in der App möglich ist und ggf.
 * Funktionen ausführen kann"). Where verstehen fills one fixed form, this
 * gives Claude every function of the app as a tool. Claude reads the family's
 * calendar and lists from a snapshot the app sends, and answers with the
 * actions it wants done. Nothing is written here: the app runs the actions
 * and shows each as a card with Rückgängig, so it is always clear what the
 * machine did.
 *
 * Julian 30.10., the rule: if something is unclear, first ask or offer the
 * closest thing that is possible; once everything is clear, do it directly.
 *
 * Request (signed in, JWT checked by Supabase):
 *   { text, today, now, names: { J, T }, lang, icons: string[], snapshot: string,
 *     history?: [{ said, app? }], screen?: "Offen ist die Liste …" }
 * Response: { actions: [{ tool, input }], text, left } or { error }.
 *
 * Same plan and cost guard as verstehen (use_ai_call): one call per sentence.
 * The API key lives only here, as the secret ANTHROPIC_API_KEY.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.137.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Tool = Anthropic.Messages.Tool;
const str = (description: string) => ({ type: 'string', description });
const strs = (description: string) => ({ type: 'array', items: { type: 'string' }, description });
const who = { type: 'string', enum: ['J', 'T', 'both'], description: 'J oder T für einen der beiden Eltern, both für beide.' };
const obj = (description: string, properties: Record<string, unknown>, required: string[]): Omit<Tool, 'name'> =>
  ({ description, input_schema: { type: 'object', properties, required } as Tool['input_schema'] });

const TERMIN = {
  title: str('Kurz wie im Kalender ("Zahnarzt", "Elternabend Kita"). Ohne Personen, Zeit und Ort.'),
  sub: str('Optionaler Zusatz ("Kontrolle", "mit Ben").'),
  date: str('YYYY-MM-DD'),
  end_date: str('Letzter Tag bei mehreren Tagen, YYYY-MM-DD.'),
  start: str('HH:MM, 24 Stunden. Weglassen, wenn keine Uhrzeit genannt ist.'),
  end: str('HH:MM'),
  who,
  place: str('Nur wenn ein Ort genannt ist.'),
  repeat: str('Kurz in der Sprache des Satzes ("Jeden Dienstag", "Montag bis Freitag").'),
  icon: str('Ein Name aus der Icon-Liste.'),
  bring: strs('Was mitgenommen werden soll.'),
  work: { type: 'boolean', description: 'true für Arbeitszeiten.' },
};

const TOOLS: Tool[] = [
  { name: 'termin_neu', ...obj('Legt einen Termin im geteilten Kalender an. Für mehrere Termine mehrmals aufrufen.', {
    ...TERMIN,
    ask_time: str('Nur wenn die Uhrzeit fehlt und so etwas meist eine hat: eine kurze Rückfrage ("Um wie viel Uhr ist das Spiel? Oder ganztägig?"). Der Termin wird trotzdem ganztägig eingetragen.'),
    suggest_bring: strs('Höchstens drei Dinge, die man dazu üblicherweise braucht und die nicht genannt wurden (U3: U-Heft, Impfpass). Die App bietet sie nur an.'),
  }, ['title', 'date']) },
  { name: 'termin_aendern', ...obj('Ändert einen bestehenden Termin. Nur die Felder angeben, die sich ändern.', {
    id: str('id des Termins aus dem Kalender.'),
    ...TERMIN,
    all_day: { type: 'boolean', description: 'true macht ihn ganztägig.' },
    add_bring: strs('Dinge, die zusätzlich mitgenommen werden sollen.'),
    reminder: { type: 'string', enum: ['', '0m', '10m', '30m', '1h', '1d', '1w', 'vorabend'], description: 'Erinnerung vorher, "" für keine.' },
  }, ['id']) },
  { name: 'termin_loeschen', ...obj('Löscht einen Termin. Bei einer Serie mit date nur diesen einen Tag, ohne date die ganze Serie.', {
    id: str('id des Termins.'),
    date: str('Nur bei Serien: der eine Tag, der wegfällt, YYYY-MM-DD.'),
  }, ['id']) },
  { name: 'liste_eintragen', ...obj('Setzt Einträge auf eine bestehende Liste (Einkauf oder eine eigene Liste der Familie).', {
    list: str('id der Liste.'),
    items: strs('Jedes Ding einzeln, kurz und groß geschrieben ("Nudeln", "2 Hafermilch").'),
  }, ['list', 'items']) },
  { name: 'liste_neu', ...obj('Legt eine neue Liste an, mit ersten Einträgen oder leer.', {
    name: str('Kurzer Name in der Sprache des Satzes ("Watchlist", "Packliste Ostsee").'),
    items: strs('Erste Einträge.'),
  }, ['name', 'items']) },
  { name: 'rezept', ...obj('Für ein Gericht zum Kochen oder Backen: die App zeigt die Zutaten zum Abhaken und setzt sie auf die Einkaufsliste.', {
    dish: str('Name des Gerichts.'),
    items: strs('Nur was der Satz selbst als zu kaufen nennt.'),
    extra: strs('Alle übrigen üblichen Zutaten für vier Personen mit kurzer Menge ("500 g Hackfleisch"), ohne Salz, Pfeffer, Öl, Wasser. Leer, wenn variants gesetzt ist.'),
    variants: strs('Zwei bis vier Rezepte zur Wahl, nur wenn sehr verschiedene möglich sind und keins gewählt wurde.'),
    have: strs('Was der Satz als schon daheim nennt.'),
  }, ['dish', 'items', 'extra', 'variants', 'have']) },
  { name: 'eintrag_abhaken', ...obj('Hakt einen Listeneintrag ab oder nimmt den Haken weg.', {
    list: str('id der Liste.'), item: str('id des Eintrags.'), done: { type: 'boolean' },
  }, ['list', 'item', 'done']) },
  { name: 'eintrag_aendern', ...obj('Ändert den Text eines Listeneintrags ("3 Milch statt 2").', {
    list: str('id der Liste.'), item: str('id des Eintrags.'), text: str('Neuer Text.'),
  }, ['list', 'item', 'text']) },
  { name: 'eintrag_loeschen', ...obj('Nimmt einen Eintrag von einer Liste.', {
    list: str('id der Liste.'), item: str('id des Eintrags.'),
  }, ['list', 'item']) },
  { name: 'liste_loeschen', ...obj('Löscht eine ganze eigene Liste. Nie Einkauf.', { list: str('id der Liste.') }, ['list']) },
  { name: 'aufgabe_neu', ...obj('Legt eine Aufgabe oder Erinnerung an ("Erinnere mich …", "ich muss noch …").', {
    title: str('Kurz, ohne "ich muss".'), due: str('Bis wann, YYYY-MM-DD.'), who,
  }, ['title']) },
  { name: 'aufgabe_erledigt', ...obj('Hakt eine Aufgabe ab oder öffnet sie wieder.', { id: str('id der Aufgabe.'), done: { type: 'boolean' } }, ['id', 'done']) },
  { name: 'aufgabe_aendern', ...obj('Ändert eine Aufgabe: Titel, Frist oder wer sie macht.', {
    id: str('id der Aufgabe.'), title: str('Neuer Titel.'), due: str('YYYY-MM-DD, "" für keine Frist.'), who: { type: 'string', enum: ['J', 'T', 'both', ''], description: '"" für offen.' },
  }, ['id']) },
  { name: 'aufgabe_loeschen', ...obj('Löscht eine Aufgabe.', { id: str('id der Aufgabe.') }, ['id']) },
  { name: 'spiel_neu', ...obj('Startet eine Punkteliste für ein Spiel (Rommé, Kniffel, Skat …). Gibt es schon eine für das Spiel, nimm stattdessen spiel_runde oder liste_eintragen für neue Mitspieler.', {
    game: str('Name des Spiels.'), players: strs('Die Mitspieler.'),
  }, ['game', 'players']) },
  { name: 'spiel_runde', ...obj('Trägt eine Runde auf einer Punkteliste ein ("Julian 40, Sophia 25").', {
    list: str('id der Punkteliste.'),
    scores: { type: 'array', items: { type: 'object', properties: { who: { type: 'string' }, points: { type: 'number' } }, required: ['who', 'points'] } },
  }, ['list', 'scores']) },
  { name: 'partner_fragen', ...obj('Schickt dem anderen Elternteil eine Ja/Nein Frage in den Familienchat ("Passt Samstag?").', {
    question: str('Die Frage, kurz, in der Sprache des Satzes.'),
  }, ['question']) },
  { name: 'antworten', ...obj('Beantwortet eine Frage zum Kalender, zu Listen oder Aufgaben, oder sagt, was nicht geht.', {
    text: str('Kurze Antwort in der Sprache des Satzes, höchstens drei Sätze.'),
    events: strs('ids der Termine, um die es geht; die App zeigt sie.'),
  }, ['text']) },
  { name: 'nachfragen', ...obj('Fragt nach, wenn etwas unklar ist oder so nicht geht. Dann wird nichts anderes ausgeführt.', {
    question: str('Eine kurze Rückfrage in der Sprache des Satzes. Geht es so nicht, schlage das Nächstmögliche vor ("Einstellungen kann ich noch nicht ändern. Soll ich dich stattdessen erinnern?").'),
  }, ['question']) },
];

const WD = ['Sonntag (Sunday)', 'Montag (Monday)', 'Dienstag (Tuesday)', 'Mittwoch (Wednesday)', 'Donnerstag (Thursday)', 'Freitag (Friday)', 'Samstag (Saturday)'];

const SYSTEM = `Du bist der Assistent in FamCal, einer Familien-App mit geteiltem Kalender, geteilten Listen (Einkauf und eigene Listen wie Watchlist oder Packliste), Aufgaben, Punktelisten für Spiele und einem Familienchat der beiden Eltern.
Du bekommst einen gesprochenen oder getippten Satz, oft aus der Spracherkennung des Handys, und den aktuellen Stand der Familie. Du handelst über die Werkzeuge; die App führt sie aus und zeigt jede Änderung als Karte mit Rückgängig.

Grundregel (Julian):
- Ist klar, was gemeint ist, und geht es mit den Werkzeugen, führe es sofort aus, ohne nachzufragen. Auch Löschen und Ändern.
- Ist etwas unklar oder mehrdeutig (welcher Termin, welche Liste, fehlt das Datum), oder geht es so nicht, rufe nur nachfragen auf, mit einer kurzen Frage oder dem nächstmöglichen Vorschlag. Dann nichts anderes.
- Mehrere Dinge in einem Satz: mehrere Werkzeuge in einer Antwort.
- Fragen zum Kalender, zu Listen oder Aufgaben ("Was steht morgen an?", "Wann ist der Zahnarzt?", "Was fehlt noch auf der Einkaufsliste?") beantwortest du mit antworten, aus dem Stand unten.
- Was die App nicht kann (Einstellungen, Nachrichten an andere Menschen, Anrufe, Bezahlen), sagst du mit nachfragen und schlägst vor, was geht.
- Schreibe außerhalb der Werkzeuge keinen Text.

Verstehen:
- Sätze aus der Spracherkennung haben halbe Sätze und falsch erkannte Wörter. Lies sinngemäß ("Schatte Island" ist "Shutter Island"). Bekannte Namen schreibst du richtig.
- Bezieht sich ein Satz auf etwas Bestehendes ("verschieb den Zahnarzt auf Freitag", "Milch ist gekauft", "lösch das Training am Montag"), finde es im Stand unten und nimm dessen id. Passen mehrere gleich gut, frag nach.
- Steht ein Verlauf dabei, gehört der neue Satz meist dazu: eine Antwort auf deine Rückfrage, eine Korrektur oder Ergänzung des zuletzt Eingetragenen ("nein, um 16 Uhr", "Tom kommt auch mit", "jeden Mittwoch davon im Büro"). Dann änderst du das zuletzt Eingetragene mit termin_aendern oder löschst und legst neu an, statt etwas doppelt einzutragen.

Sprache, feste Regel: Titel, Einträge und Texte stehen immer in der Sprache, in der der Satz gesagt wurde, wörtlich und nie übersetzt ("Friseurtermin" bleibt "Friseur", "Dentist" bleibt "Dentist"). Fragen und Antworten auch. Bei gemischter Sprache die Sprache des größten Teils. Keine Gedankenstriche.

Termine:
- Relative Angaben rechnest du vom heutigen Datum aus. "Nächsten Freitag" ist der kommende Freitag, außer heute ist Freitag, dann eine Woche später. "3pm" ist 15:00.
- Ohne Uhrzeit: start weglassen. Hat so etwas meist eine Uhrzeit (Arzt, Friseur, Spiel, Treffen, Kurs), trotzdem eintragen und ask_time setzen. Urlaub, Reise, Krankheit, Geburtstag, Feiertag sind ganztägig ohne Rückfrage; über mehrere Tage mit end_date.
- Mit Startzeit ohne Ende setzt du end nach der üblichen Dauer (Arzt 45 Minuten, Friseur 1 Stunde, Fußballspiel 2 Stunden, Kino 2,5 Stunden, Elternabend 2 Stunden), sonst weglassen.
- who: J oder T, wenn einer der Eltern genannt ist oder "ich" sagt (wer spricht, steht unten), both für "wir", "beide", "zusammen". Kinder und Begleitung kommen in sub ("mit Ben").
- Fehlt das Datum ganz, frag mit nachfragen.
- Arbeit ("Arbeit", "Schicht", "im Büro"): work true, who die sprechende Person. Mit genanntem Ende ("bis Weihnachten"): EIN termin_neu mit date = erster Arbeitstag, end_date = letzter Arbeitstag ("bis Weihnachten" ist der 24.12.), repeat "Montag bis Freitag" oder die genannten Tage; die App legt jeden Tag an. Einzelne Wochentage ohne Ende ("jeden Mittwoch im Büro"): EIN termin_neu am nächsten dieser Tage mit repeat "Jeden Mittwoch", work false. Ohne Uhrzeit bei Arbeit: start weglassen und ask_time "Von wann bis wann arbeitest du?". Erfinde nie eine Uhrzeit.
- icon: der passendste Name aus der Icon-Liste, sonst kalender.

Listen und Aufgaben:
- Einkauf hat die id einkauf. Dinge zum Kaufen ("wir brauchen Windeln") kommen dorthin. Gesprochene Aufzählungen ohne Kommas trennst du ("Cornflakes Milchzucker Mehl" sind drei Dinge).
- Ein Film, eine Serie, ein Buch gehört auf die passende eigene Liste; gibt es keine, liste_neu ("Watchlist").
- Steht etwas schon offen auf der Liste, nimm eintrag_aendern statt doppelt einzutragen.
- "Erinnere mich …", "ich muss noch …", "remind me to …" ist aufgabe_neu, nie ein Termin. Ein Satz mit Uhrzeit oder festem Tag zum Hingehen ist ein Termin.
- Kochen oder Backen ("Heute koche ich Bolognese", "alles für einen Karottenkuchen") ist rezept, auch mit "heute Abend".
- Spiele: "Wir spielen Rommé mit …" ist spiel_neu. Punkte einer Runde ("Julian 40, Sophia 25") gehen mit spiel_runde auf die passende Punkteliste.
- "Frag Sophia, ob …" ist partner_fragen.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const NAMES = new Set(TOOLS.map((t) => t.name));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  let input: { text?: string; today?: string; now?: string; names?: { J?: string; T?: string }; me?: string; lang?: string; icons?: string[]; snapshot?: string; screen?: string; history?: { said?: string; app?: string }[] };
  try { input = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const text = (input.text ?? '').trim().slice(0, 500);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(input.today ?? '') ? input.today! : new Date().toISOString().slice(0, 10);
  if (!text) return json({ error: 'empty' }, 400);

  // Counted as the signed-in person, so nobody can spend someone else's quota.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY') ?? req.headers.get('apikey') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: allowed, error: countError } = await db.rpc('use_ai_call');
  if (countError) return json({ error: 'not_signed_in' }, 401);
  if (!allowed.ok) return json({ error: 'limit', reason: allowed.reason, tier: allowed.tier }, 429);

  const wd = WD[new Date(`${today}T12:00:00Z`).getUTCDay()];
  const names = `J = ${input.names?.J || 'Elternteil 1'}, T = ${input.names?.T || 'Elternteil 2'}`;
  const me = input.me === 'T' ? 'T' : 'J';
  // Bounded, so a long day in the chat never costs much more than one sentence.
  const history = (Array.isArray(input.history) ? input.history : []).slice(-6)
    .map((h) => [h?.said ? `Gesagt: ${String(h.said).slice(0, 300)}` : '', h?.app ? `App: ${String(h.app).slice(0, 300)}` : ''].filter(Boolean).join('\n'))
    .filter(Boolean).join('\n');
  const snapshot = typeof input.snapshot === 'string' ? input.snapshot.slice(0, 16000) : '';
  const screen = typeof input.screen === 'string' ? input.screen.replace(/[\n\r]/g, ' ').slice(0, 200) : '';
  const icons = (Array.isArray(input.icons) ? input.icons : []).filter((x) => typeof x === 'string' && /^[a-z0-9-]{2,30}$/.test(x)).slice(0, 300).join(', ') || 'kalender';

  const t0 = Date.now();
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 3000,
      // Rules, tools and icon names are cached; only the family's state and the sentence are read fresh.
      system: [{ type: 'text', text: SYSTEM }, { type: 'text', text: `Icons: ${icons}`, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      tool_choice: { type: 'any' },
      // Julian 28.10.: it must be quick. The family waits with the orb spinning.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      messages: [{
        role: 'user',
        content: `Heute ist ${wd}, ${today}, ${input.now ?? ''} Uhr. Eltern: ${names}. Es spricht: ${me}. Sprache der App: ${input.lang === 'en' ? 'Englisch' : 'Deutsch'}.\n\nStand der Familie:\n${snapshot || '(leer)'}${screen ? `\n\nBildschirm: ${screen}` : ''}${history ? `\n\nVerlauf:\n${history}` : ''}\n\nNeuer Satz: ${text}`,
      }],
    });
    const actions = res.content.flatMap((b) => (b.type === 'tool_use' && NAMES.has(b.name) ? [{ tool: b.name, input: b.input }] : []));
    const said = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    // Only timing and the tools used, never what was said.
    console.log(JSON.stringify({ ms: Date.now() - t0, tools: actions.map((a) => a.tool), follow: !!history, snap: snapshot.length, stop: res.stop_reason, out: res.usage.output_tokens, cached: res.usage.cache_read_input_tokens ?? 0 }));
    if (res.stop_reason === 'refusal' || (!actions.length && !said)) return json({ error: 'not_understood' }, 422);
    return json({ actions, text: said, left: allowed.left ?? null });
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
    console.error('assistent', Date.now() - t0, e);
    return json({ error: 'model_failed' }, status);
  }
});
