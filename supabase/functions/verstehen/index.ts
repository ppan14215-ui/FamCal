/**
 * Verstehen (Julian 27.10.: "Handy hört, Claude versteht"). The phone turns
 * speech into text on the device; this function turns one German sentence
 * into a Termin. The API key lives only here, as the secret
 * ANTHROPIC_API_KEY, never in the app.
 *
 * Request (signed in, JWT checked by Supabase):
 *   { text, today: "2026-10-27", now: "14:10", names: { J: "Julian", T: "Anna" } }
 * Response: the shape of `Termin` below, or { error }.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.137.0';
import { z } from 'npm:zod@4.1.12';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.137.0/helpers/zod';

const Termin = z.object({
  // termin: something to put in the calendar. frage: the sentence asks about the calendar. unklar: neither.
  kind: z.enum(['termin', 'frage', 'unklar']),
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
});

const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const SYSTEM = `Du trägst Termine für eine Familie mit zwei Eltern in einen geteilten Kalender ein.
Du bekommst einen gesprochenen oder getippten deutschen Satz und gibst genau einen Termin als JSON zurück.

Regeln:
- Datum als YYYY-MM-DD, Uhrzeiten als HH:MM (24 Stunden). Relative Angaben ("morgen", "nächsten Freitag", "in zwei Wochen", "am 12.") rechnest du vom heutigen Datum aus. "Nächsten Freitag" ist der kommende Freitag, außer heute ist Freitag, dann eine Woche später.
- Ohne Uhrzeit bleiben start und end null (ganztägig). Mit Startzeit ohne Ende: end bleibt null, die App setzt die Dauer.
- title ist kurz wie in einem Kalender ("Zahnarzt", "Elternabend Kita", "Oma kommt"). Personen, Zeit und Ort gehören nicht in den Titel. sub ist ein optionaler Zusatz ("Kontrolle", "mit Ben").
- who: J oder T, wenn der Satz einen der beiden Eltern nennt (Namen stehen unten), both für "wir", "beide", "zusammen", sonst null. Kinder sind keine Eltern.
- place nur, wenn ein Ort genannt ist. repeat als kurzer deutscher Text ("Jeden Dienstag"), sonst null.
- bring: Dinge, die mitgenommen werden sollen ("Impfpass mitnehmen" ergibt ["Impfpass"]).
- steps: zwei bis vier sehr kurze deutsche Sätze, was du verstanden hast, für eine Liste unter dem Eingabefeld. Zum Beispiel "Zahnarzt am Freitag, 30. Oktober um 15 Uhr." und "Für Julian.". Keine Gedankenstriche.
- Fehlt etwas Wichtiges (kein Datum), setze kind auf termin, date auf null und stelle in question eine kurze Rückfrage.
- Ist der Satz eine Frage an den Kalender ("Was steht morgen an?"), setze kind auf frage und lasse die Felder leer.
- Ist es weder Termin noch Frage, setze kind auf unklar.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  let input: { text?: string; today?: string; now?: string; names?: { J?: string; T?: string } };
  try { input = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const text = (input.text ?? '').trim().slice(0, 500);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(input.today ?? '') ? input.today! : new Date().toISOString().slice(0, 10);
  if (!text) return json({ error: 'empty' }, 400);

  const wd = WD[new Date(`${today}T12:00:00Z`).getUTCDay()];
  const names = `J = ${input.names?.J || 'Elternteil 1'}, T = ${input.names?.T || 'Elternteil 2'}`;

  try {
    const res = await client.messages.parse({
      model: 'claude-haiku-5-5',
      max_tokens: 2000,
      system: SYSTEM,
      // Short answers matter more than depth here: the family waits with the orb spinning.
      output_config: { effort: 'low', format: zodOutputFormat(Termin) },
      messages: [{ role: 'user', content: `Heute ist ${wd}, ${today}, ${input.now ?? ''} Uhr. Eltern: ${names}.\n\nSatz: ${text}` }],
    });
    if (res.stop_reason === 'refusal' || !res.parsed_output) return json({ error: 'not_understood' }, 422);
    return json(res.parsed_output);
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
    console.error('verstehen', e);
    return json({ error: 'model_failed' }, status);
  }
});
