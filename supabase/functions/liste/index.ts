/**
 * Listen, die mitwachsen (Julian 27.10.: "generative UI"). Two jobs:
 *
 * bauplan: Claude reads the name of a new list ("Filme, die wir sehen wollen",
 *   "Geschenke für Mia") and picks building blocks the app already draws.
 *   It never writes code. Counts as one sentence on the family's plan.
 *   Request { action: "bauplan", name, lang } → { blueprint | null }
 *
 * anreichern: finds cover, year and author or director for one entry.
 *   Books from Open Library (no key). Films from TMDB when the secret
 *   TMDB_TOKEN is set, else from Wikipedia. No Claude call, nothing paid.
 *   Request { action: "anreichern", source: "books" | "movies", q, lang } → { found | null }
 *
 * Signed in only (JWT checked by Supabase).
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.137.0';
import { z } from 'npm:zod@4.1.12';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.137.0/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const UA = { 'User-Agent': 'FamCal/0.1 (https://famcal.app)' };

const Bauplan = z.object({
  // plain: an ordinary checklist fits (packing, to-dos); no blocks needed.
  plain: z.boolean(),
  blocks: z.array(z.enum(['cover', 'stars', 'seen', 'year', 'by', 'link', 'date', 'price', 'place', 'note'])),
  source: z.enum(['books', 'movies']).nullable(),
  seen_label: z.string().nullable(),
});

const SYSTEM = `Eine Familie legt in ihrer Kalender App eine neue Liste an. Du bekommst nur den Namen der Liste.
Überlege wie ein guter Produktdesigner, was diese Liste braucht, damit sie wirklich nützlich ist, und wähle dafür Bausteine aus. Du schreibst keinen Code, du wählst nur.

Bausteine:
- cover: Bild zum Eintrag (Filmplakat, Buchcover)
- stars: Bewertung mit 1 bis 5 Sternen
- seen: erledigt Schalter mit eigenem Wort (Gesehen, Gelesen, Gekocht, Besorgt, Waren da)
- year: Jahr
- by: Autor, Regie, Laden oder Marke
- link: Link
- date: Datum
- price: Preis
- place: Ort
- note: kurze Notiz

Regeln:
- Höchstens fünf Bausteine, die wichtigsten zuerst. Weniger ist besser.
- source: books, wenn es um Bücher geht, movies bei Filmen oder Serien, sonst null. Nur dann kann der Server Cover und Infos finden; cover nur zusammen mit source.
- seen_label: ein Wort in der Sprache der App für den seen Baustein, sonst null.
- Ist eine normale Checkliste richtig (Packliste, Aufgaben, Einkauf), setze plain auf true und blocks leer.`;

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTROPHIC_API_KEY') });

type Found = { cover?: string; year?: string; by?: string; link?: string };

async function getJson(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(6000) });
  return r.ok ? r.json() : null;
}

async function book(q: string): Promise<Found | null> {
  const j = await getJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1&fields=key,title,author_name,first_publish_year,cover_i`);
  const d = j?.docs?.[0];
  if (!d) return null;
  return {
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
    year: d.first_publish_year ? String(d.first_publish_year) : undefined,
    by: d.author_name?.[0],
    link: d.key ? `https://openlibrary.org${d.key}` : undefined,
  };
}

async function movieTmdb(q: string, lang: string, token: string): Promise<Found | null> {
  const auth = { Authorization: `Bearer ${token}` };
  const j = await getJson(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(q)}&language=${lang === 'en' ? 'en-US' : 'de-DE'}&include_adult=false`, auth);
  const m = j?.results?.[0];
  if (!m) return null;
  const credits = await getJson(`https://api.themoviedb.org/3/movie/${m.id}/credits`, auth).catch(() => null);
  return {
    cover: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : undefined,
    year: m.release_date?.slice(0, 4) || undefined,
    by: credits?.crew?.find((c: { job: string }) => c.job === 'Director')?.name,
    link: `https://www.themoviedb.org/movie/${m.id}`,
  };
}

/** Without a TMDB key: the film's Wikipedia page, its image and short description ("2019 film by Greta Gerwig"). */
async function movieWiki(q: string): Promise<Found | null> {
  const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q + ' film')}&gsrlimit=1&prop=pageimages|description|info&inprop=url&piprop=thumbnail&pithumbsize=342`);
  const page = j?.query?.pages && Object.values(j.query.pages)[0] as { thumbnail?: { source: string }; description?: string; fullurl?: string } | undefined;
  if (!page) return null;
  const desc = page.description ?? '';
  return {
    cover: page.thumbnail?.source,
    year: desc.match(/\b(19|20)\d{2}\b/)?.[0],
    by: desc.match(/\bby ([^,;]+)$/)?.[1],
    link: page.fullurl,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  let input: { action?: string; name?: string; source?: string; q?: string; lang?: string };
  try { input = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const lang = input.lang === 'en' ? 'en' : 'de';

  if (input.action === 'anreichern') {
    const q = (input.q ?? '').trim().slice(0, 120);
    if (!q) return json({ error: 'empty' }, 400);
    try {
      const token = Deno.env.get('TMDB_TOKEN');
      const found = input.source === 'books' ? await book(q) : input.source === 'movies' ? (token ? await movieTmdb(q, lang, token) : await movieWiki(q)) : null;
      return json({ found });
    } catch (e) {
      console.error('anreichern', e);
      return json({ found: null });
    }
  }

  if (input.action !== 'bauplan') return json({ error: 'unknown_action' }, 400);
  const name = (input.name ?? '').trim().slice(0, 80);
  if (!name) return json({ error: 'empty' }, 400);

  // Same plan and cost guard as "verstehen": counted as the signed-in person.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY') ?? req.headers.get('apikey') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: allowed, error: countError } = await db.rpc('use_ai_call');
  if (countError) return json({ error: 'not_signed_in' }, 401);
  if (!allowed.ok) return json({ error: 'limit', reason: allowed.reason, tier: allowed.tier }, 429);

  try {
    const res = await client.messages.parse({
      model: 'claude-haiku-5-5',
      max_tokens: 400,
      system: SYSTEM,
      output_config: { effort: 'low', format: zodOutputFormat(Bauplan) },
      messages: [{ role: 'user', content: `Sprache der App: ${lang === 'en' ? 'Englisch' : 'Deutsch'}.\nName der Liste: ${name}` }],
    });
    const b = res.parsed_output;
    if (res.stop_reason === 'refusal' || !b || b.plain || !b.blocks.length) return json({ blueprint: null });
    const blocks = [...new Set(b.blocks)].filter((x) => x !== 'cover' || b.source).slice(0, 5);
    return json({ blueprint: { blocks, source: b.source, seenLabel: b.seen_label ?? undefined } });
  } catch (e) {
    console.error('bauplan', e);
    return json({ blueprint: null });
  }
});
