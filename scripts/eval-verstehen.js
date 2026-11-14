/**
 * Testliste für "verstehen" (Julian 28.10.: "Hat das Auswirkungen auf die
 * Qualität?"). Sends every sentence in eval/verstehen-cases.json to the
 * deployed function as the test account and checks what comes back.
 * One run is about 26 Claude calls, 2 to 3 cent, and counts against the test
 * family's daily limit of 60.
 *
 *   node --env-file=.env scripts/eval-verstehen.js [case-id ...]
 *   FN=verstehen-neu node --env-file=.env scripts/eval-verstehen.js   (a version before it goes live)
 *
 * Needs EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
 * EXPO_PUBLIC_TEST_EMAIL, EXPO_PUBLIC_TEST_PASSWORD. Never prints them.
 * Writes eval/results-<date>.md with one line per case.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.join(__dirname, '..');
const suite = JSON.parse(fs.readFileSync(path.join(root, 'eval/verstehen-cases.json'), 'utf8'));
const icons = (fs.readFileSync(path.join(root, 'src/lib/clayIcons.ts'), 'utf8').match(/^\s+['"]?([a-z0-9-]+)['"]?:/gm) || [])
  .map((l) => l.trim().replace(/['":]/g, '')).filter((k) => !k.includes('__'));

const low = (v) => String(v ?? '').toLowerCase();
const empty = (v) => v === null || v === undefined || v === '';

/** Every failed expectation, as short text. */
function check(e, r) {
  const bad = [];
  const eq = (k, want, got) => { if (want === null ? !empty(got) : got !== want) bad.push(`${k}: ${JSON.stringify(got)} statt ${JSON.stringify(want)}`); };
  if (e.kind) eq('kind', e.kind, r.kind);
  if (e.kindIn && !e.kindIn.includes(r.kind)) bad.push(`kind: ${r.kind} statt ${e.kindIn.join('/')}`);
  if (e.title && !new RegExp(e.title, 'i').test(r.title)) bad.push(`title: "${r.title}"`);
  if (e.notTitle && new RegExp(e.notTitle, 'i').test(r.title)) bad.push(`title übersetzt: "${r.title}"`);
  for (const k of ['date', 'end_date', 'start', 'end', 'who', 'list']) if (k in e) eq(k, e[k], empty(r[k]) ? null : r[k]);
  if (e.question === true && empty(r.question)) bad.push('keine Rückfrage');
  if (e.question === false && !empty(r.question)) bad.push(`unnötige Rückfrage: "${r.question}"`);
  if (e.sub && !low(r.sub).includes(e.sub)) bad.push(`sub: "${r.sub}"`);
  if (e.repeat && empty(r.repeat)) bad.push('keine Wiederholung');
  if (e.dish && !low(r.dish).includes(e.dish)) bad.push(`dish: "${r.dish}"`);
  if (e.listName && !new RegExp(e.listName, 'i').test(r.list_name)) bad.push(`list_name: "${r.list_name}"`);
  for (const k of ['items', 'extra', 'bring']) for (const w of e[k] || []) if (!(r[k] || []).some((x) => low(x).includes(w))) bad.push(`${k} ohne "${w}"`);
  if ('variants' in e && (r.variants || []).length !== e.variants) bad.push(`variants: ${(r.variants || []).length}`);
  if (e.variantsMin && (r.variants || []).length < e.variantsMin) bad.push(`variants: ${(r.variants || []).length}`);
  if (e.moreMin && (r.more || []).length < e.moreMin) bad.push(`more: ${(r.more || []).length}`);
  if (e.moreWork && !(r.more || []).some((m) => m.work)) bad.push('keine Arbeitszeiten');
  return bad;
}

(async () => {
  const env = process.env;
  for (const k of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_TEST_EMAIL', 'EXPO_PUBLIC_TEST_PASSWORD']) if (!env[k]) throw new Error(`${k} fehlt`);
  const db = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email: env.EXPO_PUBLIC_TEST_EMAIL, password: env.EXPO_PUBLIC_TEST_PASSWORD });
  if (error) throw new Error(`Anmeldung fehlgeschlagen: ${error.message}`);

  const only = process.argv.slice(2);
  const cases = suite.cases.filter((c) => !only.length || only.includes(c.id));
  const rows = [];
  let ok = 0;
  for (const c of cases) {
    const t0 = Date.now();
    const { data, error: err } = await db.functions.invoke(process.env.FN || 'verstehen', {
      body: { text: c.text, today: suite.today, now: suite.now, names: suite.names, lang: c.lang || 'de', icons, history: c.history, draft: c.draft, lists: c.lists || suite.lists },
    });
    const ms = Date.now() - t0;
    const bad = err || !data ? [`Fehler: ${err?.message || 'keine Antwort'}`] : check(c.expect, data);
    if (!bad.length) ok++;
    rows.push(`| ${bad.length ? '✗' : '✓'} | ${c.id} | ${(ms / 1000).toFixed(1)} s | ${bad.join('; ').replace(/\|/g, '/')} |`);
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${c.id} (${ms} ms) ${bad.join('; ')}`);
  }
  const day = new Date().toISOString().slice(0, 10);
  const out = [`# verstehen Testliste ${day}`, '', `${ok} von ${cases.length} richtig.`, '', '| | Fall | Zeit | Abweichung |', '|---|---|---|---|', ...rows, ''].join('\n');
  fs.writeFileSync(path.join(root, `eval/results-${day}.md`), out);
  console.log(`\n${ok}/${cases.length} richtig, eval/results-${day}.md`);
})().catch((e) => { console.error(e.message); process.exit(1); });
