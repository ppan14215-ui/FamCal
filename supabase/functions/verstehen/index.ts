/**
 * Verstehen (Julian 27.10.: "Handy hört, Claude versteht"). The phone turns
 * speech into text on the device; this function turns one sentence, German
 * or English, into what the app should do: a Termin, list items, a new list. The API key lives only here, as the secret
 * ANTHROPIC_API_KEY, never in the app.
 *
 * Request (signed in, JWT checked by Supabase):
 *   { text, today: "2026-10-27", now: "14:10", names: { J: "Julian", T: "Anna" }, lang: "de" | "en",
 *     history?: [{ said, app? }], draft?: "<what is on the card, JSON>", stream?: true,
 *     lists?: [{ id, name }] (the family's lists, Julian 29.10.) }
 * With stream the answer comes as server-sent events: { t } pieces of the JSON, then { done } or { error }.
 * With history the sentence answers or corrects the card that is still open
 * (Julian 28.10.: "die Konversation müsste weitergehen").
 * Response: the shape of `Termin` below, or { error }.
 *
 * Plan and cost guard (Julian 27.10.): use_ai_call checks the family's plan
 * before Claude is asked. Every family starts with 14 days of Plus, then 30
 * sentences a month stay free; Plus is unlimited. Nobody gets more than 60 a
 * day. When a limit is reached the function answers 429 with the reason, and
 * the app falls back to its own rules. One call costs about 0.03 cent.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.137.0';
import { z } from 'npm:zod@4.1.12';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.137.0/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@2';

const Termin = z.object({
  // termin: something to put in the calendar. frage: the sentence asks about the calendar. liste: items for a list.
  // abgebrochen: the sentence stops mid-thought, the app keeps listening. unklar: none of these.
  kind: z.enum(['termin', 'frage', 'liste', 'abgebrochen', 'unklar']),
  title: z.string(),
  sub: z.string().nullable(),
  date: z.string().nullable(),
  end_date: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  who: z.enum(['J', 'T', 'both']).nullable(),
  place: z.string().nullable(),
  repeat: z.string().nullable(),
  bring: z.array(z.string()),
  steps: z.array(z.string()),
  question: z.string().nullable(),
  icon: z.string().nullable(),
  // einkauf, aufgaben, the id of one of the family's lists, or neu (Julian 29.10.: "Erstelle eine Watchlist").
  list: z.string().nullable(),
  // Only with list neu: the new list's name in the language of the sentence, otherwise "".
  list_name: z.string(),
  items: z.array(z.string()),
  // Julian 28.10.: a dish brings its ingredients. dish "" when none, extra = what the recipe needs beyond what was said, variants = recipes to choose from.
  dish: z.string(),
  extra: z.array(z.string()),
  variants: z.array(z.string()),
  // Julian 28.10.: "habe nur ein paar Tomaten daheim" — said as already at home, kept off the list.
  have: z.array(z.string()),
  // Julian 28.10.: one sentence can hold several Termine ("ab heute Urlaub bis Sonntag, danach Arbeit 8 bis 17 Uhr ab Dienstag").
  work: z.boolean(),
  // Plain strings, "" for none: the API allows only a few nullable fields per schema (it refused 19 on 28.10.).
  more: z.array(z.object({
    title: z.string(),
    sub: z.string(),
    date: z.string(),
    end_date: z.string(),
    start: z.string(),
    end: z.string(),
    who: z.enum(['J', 'T', 'both', 'none']),
    place: z.string(),
    repeat: z.string(),
    icon: z.string(),
    work: z.boolean(),
  })),
});

const WD = ['Sonntag (Sunday)', 'Montag (Monday)', 'Dienstag (Tuesday)', 'Mittwoch (Wednesday)', 'Donnerstag (Thursday)', 'Freitag (Friday)', 'Samstag (Saturday)'];

const SYSTEM = `Du bist der Assistent einer Familien-App mit einem geteilten Kalender und geteilten Listen (Einkauf, Aufgaben und eigene Listen der Familie wie eine Watchlist oder eine Packliste).
Du bekommst einen gesprochenen oder getippten Satz in irgendeiner Sprache, oft Deutsch oder Englisch, manchmal gemischt, und gibst als JSON zurück, was die App tun soll.

So gehst du vor:
1. Verstehe zuerst, was die Person meint, so wie ein aufmerksamer Mensch im Chat. Sätze kommen oft aus der Spracherkennung des Handys: halbe Sätze, Tippfehler und falsch erkannte Wörter sind normal. Lies sie sinngemäß ("Schatte Island" ist der Film "Shutter Island", "Kakau und Mel" ist "Kakao und Mehl"). Bekannte Namen von Filmen, Serien, Büchern, Orten und Marken schreibst du richtig.
2. Dann ordne es genau einer Sache zu: ein Termin, eine Frage an den Kalender, Einträge auf eine Liste (auch eine neue Liste anlegen), ein abgebrochener Satz oder unklar. Ein Termin ist es nur, wenn etwas zu einer Zeit oder an einem Tag stattfindet. Wer eine Liste anlegen oder etwas auf eine Liste setzen will, meint nie einen Termin.

Regeln für Listen:
- Die Listen der Familie stehen unten mit id und Name. Nennt der Satz eine davon oder passt etwas klar dazu (ein Film auf die Watchlist oder Filmliste, ein Buch auf die Leseliste), setze kind auf liste, list auf deren id und items auf die Einträge. Kleine Abweichungen im Namen sind dieselbe Liste ("Watch List", "Filmliste" für "Filme").
- Will der Satz eine neue Liste ("Erstelle eine Watchlist für Filme", "Leg eine Packliste für die Ostsee an", "make a list of books to read"), oder nennt er eine Liste, die es noch nicht gibt ("Shutter Island auf die Watchlist", wenn es keine gibt), setze kind auf liste, list auf neu, list_name auf einen kurzen Namen in der Sprache des Satzes ("Watchlist", "Packliste Ostsee") und items auf die genannten Einträge, sonst leer. "Erstelle eine Watchlist für Shutter Island" ist eine neue Watchlist mit dem Eintrag "Shutter Island".
- Ein Film, eine Serie, ein Buch oder ein Spiel ohne genannte Liste ("Den Film Inception wollen wir noch schauen") gehört auf die passende Liste der Familie. Gibt es keine, setze list auf neu und list_name auf einen passenden Namen ("Watchlist", "Leseliste"). Nennt der Satz ausdrücklich die Einkaufsliste, bleibt es dort.
- Sonst ist list_name immer "".

Regeln für Termine:
- Datum als YYYY-MM-DD, Uhrzeiten als HH:MM (24 Stunden). Relative Angaben ("morgen", "nächsten Freitag", "in zwei Wochen", "am 12.", "tomorrow", "next Friday", "on the 12th") rechnest du vom heutigen Datum aus. "Nächsten Freitag" und "next Friday" sind der kommende Freitag, außer heute ist Freitag, dann eine Woche später. "3pm" ist 15:00.
- Ohne Uhrzeit bleiben start und end null. Hat so etwas meist eine feste Uhrzeit (Spiel, Arzt, Friseur, Treffen, Kurs, Kino), trägst du es trotzdem ein und stellst in question genau eine kurze Rückfrage in der Sprache des Satzes, zum Beispiel "Um wie viel Uhr ist das Spiel? Oder ganztägig?". Ganztägig ohne Rückfrage, also question null, nur bei Urlaub, Reise, Ferien, Krankheit, Geburtstag, Feiertag und Ähnlichem.
- Mit Startzeit ohne Ende setzt du end nach der üblichen Dauer (Fußballspiel 2 Stunden, Kino 2,5 Stunden, Arzt 45 Minuten, Friseur 1 Stunde, Elternabend 2 Stunden). Weißt du es nicht, bleibt end null, dann setzt die App eine Stunde.
- Begleitung: Namen, mit denen jemand hingeht ("mit Annie und Irene", "mit Ben"), gehören in sub als "mit Annie und Irene", in der Sprache des Satzes. Sie sind nie J oder T, außer es sind die Namen der Eltern.
- Sprache, feste Regel: title, sub, place, bring, items und alles in more stehen immer in der Sprache, in der der Satz gesagt wurde, wörtlich wie gesagt und nie übersetzt, auch wenn die App auf Englisch steht. "Friseurtermin am Freitag" ergibt den Titel "Friseur", nie "Hairdresser". "Dentist on Friday" ergibt "Dentist", nie "Zahnarzt". Auch steps, question, repeat und variants stehen in der Sprache, in der der Satz gesagt wurde; mischt der Satz Sprachen, nimm die Sprache, in der der größte Teil gesagt wurde. Die Sprache der App gilt nur, wenn der Satz keine klare Sprache hat.
- title ist kurz wie in einem Kalender ("Zahnarzt", "Elternabend Kita", "Dentist", "Grandma visits"). Personen, Zeit und Ort gehören nicht in den Titel, und der Titel ist nie der ganze Satz. sub ist ein optionaler Zusatz ("Kontrolle", "mit Ben").
- who: J oder T, wenn der Satz einen der beiden Eltern nennt (Namen stehen unten), both für "wir", "beide", "zusammen", sonst null. Kinder sind keine Eltern.
- place nur, wenn ein Ort genannt ist. repeat als kurzer Text in der Sprache des Satzes ("Jeden Dienstag", "Every Tuesday"), sonst null.
- bring: Dinge, die mitgenommen werden sollen ("Impfpass mitnehmen" ergibt ["Impfpass"]).
- steps: ein sehr kurzer Satz in der Sprache des Satzes, was du verstanden hast, zum Beispiel "Zahnarzt am Freitag, 30. Oktober um 15 Uhr, für Julian.". Keine Gedankenstriche.
- Fehlt etwas Wichtiges (kein Datum), setze kind auf termin, date auf null und stelle in question eine kurze Rückfrage in der Sprache des Satzes.
- Ist der Satz eine Frage an den Kalender ("Was steht morgen an?", "What's on tomorrow?"), setze kind auf frage und lasse die Felder leer.
- Gehört der Satz auf eine Liste statt in den Kalender ("Nudeln auf die Einkaufsliste", "wir brauchen Windeln", "put pasta on the shopping list", "ich muss noch die Steuer machen"), setze kind auf liste, list auf einkauf (Dinge zum Kaufen) oder aufgaben (Dinge zu erledigen) und items auf die einzelnen Dinge, kurz und groß geschrieben ("Nudeln", "2 Hafermilch"). Gesprochene Aufzählungen haben oft keine Kommas: "Cornflakes Milchzucker Mehl" sind drei Dinge, also ["Cornflakes", "Milchzucker", "Mehl"]. Trenne jedes einzelne Ding, außer Wörter gehören zusammen ("Rote Bete", "Griechischer Joghurt", "2 Liter Milch"). Ein Satz mit Uhrzeit oder festem Tag ist ein Termin, auch wenn "kaufen" vorkommt. "Erinnere mich an …", "Aufgabe: …", "remind me to …" sind immer eine Aufgabe (kind liste, list aufgaben), nie ein Termin; ein genannter Tag kommt als "bis <Tag>" ans Ende des Eintrags ("Kita Anmeldung bis Freitag").
- Gerichte und Rezepte: Nennt der Satz etwas zum Kochen oder Backen ("Ich will heute Abend Bolognese kochen", "Zucker, Mehl und Milch, alles was man für einen Karottenkuchen braucht"), ist es eine liste mit list einkauf, auch mit "heute Abend". dish ist der Name des Gerichts, items sind nur die Dinge, die der Satz selbst nennt, extra sind alle übrigen üblichen Zutaten für vier Personen mit kurzer Menge ("500 g Hackfleisch", "2 Karotten"), ohne Salz, Pfeffer, Öl und Wasser, und ohne was schon in items steht. Gibt es sehr verschiedene Rezepte und hat der Satz keins gewählt (Bolognese, Curry, Kuchen ohne Sorte), setze variants auf zwei bis vier kurze Varianten in der Sprache des Satzes ("Klassisch", "Schnell", "Vegetarisch"), extra leer und question auf "Welches Rezept, und für wie viele?". Beim Karottenkuchen oder anderen klaren Rezepten bleiben variants leer und extra wird gefüllt. Antwortet der neue Satz im Gespräch mit einer Variante oder Personenzahl, füllst du extra passend dazu. Was der Satz als schon da nennt ("habe Nudeln und Parmesan daheim", "Tomaten haben wir", "nur ein paar Tomaten daheim"), kommt in have und steht weder in items noch in extra; "alles andere" heißt dann: der Rest des Rezepts kommt in extra. Ohne so etwas ist have leer. Ohne Gericht sind dish "", extra und variants leer.
- icon: wähle für einen Termin den passendsten Namen aus der Icon-Liste ("Fußball mit Freunden" ergibt fussball, "Friseur" passt zu keinem, dann kalender). Nur Namen aus der Liste.
- Mehrere Termine in einem Satz ("ab heute Urlaub bis Sonntag, danach wieder Arbeit von 8 bis 17 Uhr ab Dienstag", "Montag Zahnarzt und Mittwoch Elternabend"): der erste steht in den Hauptfeldern, alle weiteren in more, in zeitlicher Reihenfolge. In more steht "" für leer und who "none" für niemanden. steps beschreibt alle zusammen in höchstens vier kurzen Sätzen. Sonst bleibt more leer.
- Urlaub, Reise oder Krankheit über mehrere Tage ist ein ganztägiger Termin mit date und end_date.
- work ist true für Arbeitszeiten ("Arbeit", "Schicht", "im Büro", "work"). Regelmäßige Arbeitszeiten ohne genannte Tage gelten Montag bis Freitag: lege dann für jeden Arbeitstag ab dem genannten Start bis einschließlich Freitag der Woche danach einen eigenen Eintrag an (höchstens 12), mit repeat "Montag bis Freitag" ("Mondays to Fridays"). Feiertage und Urlaubstage aus demselben Satz lässt du aus. Arbeit ohne Uhrzeit ("Dienstag arbeite ich wieder jeden Tag", "ab Montag wieder im Büro"): title "Arbeit" (oder "Work"), work true, start und end null, die Arbeitstage wie oben, und question fragt kurz nach der Zeit ("Von wann bis wann arbeitest du?"). Erfinde nie eine Uhrzeit und nimm nie die aktuelle Uhrzeit als Beginn.
- Bricht der Satz mitten im Gedanken ab ("Wir sind seit Sonntag", "Am Freitag haben wir", "Ben hat morgen und"), setze kind auf abgebrochen. Die App hört dann weiter und schickt den ganzen Satz noch einmal.
- Steht ein bisheriges Gespräch dabei, ist der neue Satz eine Antwort auf die Rückfrage oder eine Korrektur oder Ergänzung des Entwurfs ("Freitag um drei", "nein, um 16 Uhr", "Tom kommt auch mit", "und Impfpass mitnehmen"). Gib dann den vollständigen neuen Stand zurück, mit allen Terminen aus dem Entwurf, auch den unveränderten, und ändere nur, was der neue Satz sagt. steps beschreibt nur die Änderung. Will der neue Satz offensichtlich etwas ganz anderes, behandle ihn wie einen neuen Satz.
- Ist es nichts davon, setze kind auf unklar und stelle in question eine kurze Rückfrage, ob es in den Kalender oder auf eine Liste gehört.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  let input: { text?: string; today?: string; now?: string; names?: { J?: string; T?: string }; lang?: string; icons?: string[]; history?: { said?: string; app?: string }[]; draft?: string; stream?: boolean; lists?: { id?: string; name?: string }[] };
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
  // Bounded, so a follow-up never costs much more than a first sentence.
  const history = (Array.isArray(input.history) ? input.history : []).slice(-4)
    .map((h) => [h?.said ? `Gesagt: ${String(h.said).slice(0, 300)}` : '', h?.app ? `App: ${String(h.app).slice(0, 200)}` : ''].filter(Boolean).join('\n'))
    .filter(Boolean).join('\n');
  const draft = typeof input.draft === 'string' ? input.draft.slice(0, 3000) : '';
  const talk = history ? `\n\nBisheriges Gespräch:\n${history}${draft ? `\nEntwurf auf der Karte: ${draft}` : ''}\n\nNeuer Satz dazu: ${text}` : `\n\nSatz: ${text}`;
  // The family's own lists (Julian 29.10.), so Claude can pick one or make a new one.
  const lists = (Array.isArray(input.lists) ? input.lists : []).slice(0, 40)
    .filter((l) => l && typeof l.id === 'string' && typeof l.name === 'string')
    .map((l) => `${String(l.id).slice(0, 60)}: ${String(l.name).slice(0, 60).replace(/[\n\r]/g, ' ')}`).join('; ') || 'einkauf: Einkauf';
  // The app sends the icon names it has, so new icons need no change here.
  const icons = (Array.isArray(input.icons) ? input.icons : []).filter((x) => typeof x === 'string' && /^[a-z0-9-]{2,30}$/.test(x)).slice(0, 300).join(', ') || 'kalender';

  const params = {
    model: 'claude-haiku-5-5',
    max_tokens: 3000,
    // The fixed part (rules and the app's icon names) is cached, so only the sentence is read fresh.
    system: [{ type: 'text' as const, text: SYSTEM }, { type: 'text' as const, text: `Icons: ${icons}`, cache_control: { type: 'ephemeral' as const } }],
    // Julian 28.10.: it must be quick. No thinking, short answers; the family waits with the orb spinning.
    thinking: { type: 'disabled' as const },
    output_config: { effort: 'low' as const, format: zodOutputFormat(Termin) },
    messages: [{ role: 'user' as const, content: `Heute ist ${wd}, ${today}, ${input.now ?? ''} Uhr. Eltern: ${names}. Sprache der App: ${input.lang === 'en' ? 'Englisch' : 'Deutsch'}. Listen der Familie (id: Name): aufgaben: Aufgaben; ${lists}.${talk}` }],
  };
  const t0 = Date.now();
  // Only timing and kind, never what was said (Julian 28.10.: why was Claude too slow?).
  const log = (out: z.infer<typeof Termin> | null | undefined, stop: string | null, usage?: { output_tokens?: number; cache_read_input_tokens?: number | null }, first?: number) =>
    console.log(JSON.stringify({ ms: Date.now() - t0, first: first ?? null, kind: out?.kind ?? null, dish: !!out?.dish, follow: !!history, stop, out: usage?.output_tokens, cached: usage?.cache_read_input_tokens ?? 0 }));

  // Julian 28.10.: show live what Claude is reading. The answer arrives piece by piece as server-sent events.
  if (input.stream) {
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        const send = (o: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
        let first: number | undefined;
        try {
          const stream = client.messages.stream(params);
          stream.on('text', (t) => { first ??= Date.now() - t0; send({ t }); });
          const msg = await stream.finalMessage();
          const raw = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
          let out: z.infer<typeof Termin> | null = null;
          try { out = Termin.parse(JSON.parse(raw)); } catch { out = null; }
          log(out, msg.stop_reason, msg.usage, first);
          send(msg.stop_reason === 'refusal' || !out ? { error: 'not_understood' } : { done: { ...out, left: allowed.left ?? null } });
        } catch (e) {
          console.error('verstehen', Date.now() - t0, e);
          send({ error: 'model_failed' });
        }
        ctrl.close();
      },
    });
    return new Response(body, { headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }

  try {
    const res = await client.messages.parse(params);
    log(res.parsed_output, res.stop_reason, res.usage);
    if (res.stop_reason === 'refusal' || !res.parsed_output) return json({ error: 'not_understood' }, 422);
    return json({ ...res.parsed_output, left: allowed.left ?? null });
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
    console.error('verstehen', Date.now() - t0, e);
    return json({ error: 'model_failed' }, status);
  }
});
