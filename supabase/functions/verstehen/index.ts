/**
 * Verstehen (Julian 27.10.: "Handy hört, Claude versteht"). The phone turns
 * speech into text on the device; this function turns one sentence, German
 * or English, into a Termin. The API key lives only here, as the secret
 * ANTHROPIC_API_KEY, never in the app.
 *
 * Request (signed in, JWT checked by Supabase):
 *   { text, today: "2026-10-27", now: "14:10", names: { J: "Julian", T: "Anna" }, lang: "de" | "en" }
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
  // termin: something to put in the calendar. frage: the sentence asks about the calendar. liste: items for a list. unklar: none of these.
  kind: z.enum(['termin', 'frage', 'liste', 'unklar']),
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
  list: z.enum(['einkauf', 'aufgaben']).nullable(),
  items: z.array(z.string()),
  // Julian 28.10.: one sentence can hold several Termine ("ab heute Urlaub bis Sonntag, danach Arbeit 8 bis 17 Uhr ab Dienstag").
  work: z.boolean(),
  more: z.array(z.object({
    title: z.string(),
    sub: z.string().nullable(),
    date: z.string(),
    end_date: z.string().nullable(),
    start: z.string().nullable(),
    end: z.string().nullable(),
    who: z.enum(['J', 'T', 'both']).nullable(),
    place: z.string().nullable(),
    repeat: z.string().nullable(),
    icon: z.string().nullable(),
    work: z.boolean(),
  })),
});

const WD = ['Sonntag (Sunday)', 'Montag (Monday)', 'Dienstag (Tuesday)', 'Mittwoch (Wednesday)', 'Donnerstag (Thursday)', 'Freitag (Friday)', 'Samstag (Saturday)'];

const SYSTEM = `Du trägst Termine für eine Familie mit zwei Eltern in einen geteilten Kalender ein.
Du bekommst einen gesprochenen oder getippten Satz auf Deutsch oder Englisch und gibst den Termin als JSON zurück, bei mehreren Terminen im Satz alle (siehe more).

Regeln:
- Datum als YYYY-MM-DD, Uhrzeiten als HH:MM (24 Stunden). Relative Angaben ("morgen", "nächsten Freitag", "in zwei Wochen", "am 12.", "tomorrow", "next Friday", "on the 12th") rechnest du vom heutigen Datum aus. "Nächsten Freitag" und "next Friday" sind der kommende Freitag, außer heute ist Freitag, dann eine Woche später. "3pm" ist 15:00.
- Ohne Uhrzeit bleiben start und end null (ganztägig). Mit Startzeit ohne Ende: end bleibt null, die App setzt die Dauer.
- title ist kurz wie in einem Kalender ("Zahnarzt", "Elternabend Kita", "Dentist", "Grandma visits"), in der Sprache des Satzes. Personen, Zeit und Ort gehören nicht in den Titel. sub ist ein optionaler Zusatz ("Kontrolle", "mit Ben").
- who: J oder T, wenn der Satz einen der beiden Eltern nennt (Namen stehen unten), both für "wir", "beide", "zusammen", sonst null. Kinder sind keine Eltern.
- place nur, wenn ein Ort genannt ist. repeat als kurzer Text in der Sprache der App ("Jeden Dienstag", "Every Tuesday"), sonst null.
- bring: Dinge, die mitgenommen werden sollen ("Impfpass mitnehmen" ergibt ["Impfpass"]).
- steps: ein bis zwei sehr kurze Sätze in der Sprache der App (steht unten), was du verstanden hast, für eine Liste unter dem Eingabefeld. Zum Beispiel "Zahnarzt am Freitag, 30. Oktober um 15 Uhr." und "Für Julian.". Keine Gedankenstriche.
- Fehlt etwas Wichtiges (kein Datum), setze kind auf termin, date auf null und stelle in question eine kurze Rückfrage in der Sprache der App.
- Ist der Satz eine Frage an den Kalender ("Was steht morgen an?", "What's on tomorrow?"), setze kind auf frage und lasse die Felder leer.
- Gehört der Satz auf eine Liste statt in den Kalender ("Nudeln auf die Einkaufsliste", "wir brauchen Windeln", "put pasta on the shopping list", "ich muss noch die Steuer machen"), setze kind auf liste, list auf einkauf (Dinge zum Kaufen) oder aufgaben (Dinge zu erledigen) und items auf die einzelnen Dinge, kurz und groß geschrieben ("Nudeln", "2 Hafermilch"). Ein Satz mit Uhrzeit oder festem Tag ist ein Termin, auch wenn "kaufen" vorkommt.
- icon: wähle für einen Termin den passendsten Namen aus der Liste unten ("Fußball mit Freunden" ergibt fussball, "Friseur" passt zu keinem, dann kalender). Nur Namen aus der Liste.
- Mehrere Termine in einem Satz ("ab heute Urlaub bis Sonntag, danach wieder Arbeit von 8 bis 17 Uhr ab Dienstag", "Montag Zahnarzt und Mittwoch Elternabend"): der erste steht in den Hauptfeldern, alle weiteren in more, in zeitlicher Reihenfolge. steps beschreibt alle zusammen in höchstens vier kurzen Sätzen. Sonst bleibt more leer.
- Urlaub, Reise oder Krankheit über mehrere Tage ist ein ganztägiger Termin mit date und end_date.
- work ist true für Arbeitszeiten ("Arbeit", "Schicht", "im Büro", "work"). Regelmäßige Arbeitszeiten ohne genannte Tage gelten Montag bis Freitag: lege dann für jeden Arbeitstag ab dem genannten Start bis einschließlich Freitag der Woche danach einen eigenen Eintrag an (höchstens 12), mit repeat "Montag bis Freitag" ("Mondays to Fridays"). Feiertage und Urlaubstage aus demselben Satz lässt du aus.
- Ist es nichts davon, setze kind auf unklar.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTROPHIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  let input: { text?: string; today?: string; now?: string; names?: { J?: string; T?: string }; lang?: string; icons?: string[] };
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
  // The app sends the icon names it has, so new icons need no change here.
  const icons = (Array.isArray(input.icons) ? input.icons : []).filter((x) => typeof x === 'string' && /^[a-z0-9-]{2,30}$/.test(x)).slice(0, 300).join(', ') || 'kalender';

  try {
    const res = await client.messages.parse({
      model: 'claude-haiku-5-5',
      max_tokens: 3000,
      system: SYSTEM,
      // Short answers matter more than depth here: the family waits with the orb spinning.
      output_config: { effort: 'low', format: zodOutputFormat(Termin) },
      messages: [{ role: 'user', content: `Heute ist ${wd}, ${today}, ${input.now ?? ''} Uhr. Eltern: ${names}. Sprache der App: ${input.lang === 'en' ? 'Englisch' : 'Deutsch'}.\nIcons: ${icons}\n\nSatz: ${text}` }],
    });
    if (res.stop_reason === 'refusal' || !res.parsed_output) return json({ error: 'not_understood' }, 422);
    return json({ ...res.parsed_output, left: allowed.left ?? null });
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
    console.error('verstehen', e);
    return json({ error: 'model_failed' }, status);
  }
});
