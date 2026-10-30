/**
 * Runs eval/assistent/faelle.ts against the real assistant (Julian 30.10.):
 * every sentence goes to the server exactly as the app sends it, the app's own
 * code carries out the answer on a copy of the family, and each case checks
 * what is in the calendar and on the lists afterwards. Only a run with all
 * cases passing may reach Julian's phone.
 *
 *   node scripts/eval/build.mjs && node --env-file=.env scripts/eval/.run.cjs [--variant sonnet] [case-id …]
 *
 * EVAL_TOKEN lives only in the .env of the machine that runs the list; the
 * function knows just its SHA-256 (scripts/make-assistent-eval.js).
 *
 * Talks to supabase/functions/assistent-eval (same prompt as assistent, see
 * scripts/make-assistent-eval.js). Writes eval/assistent/ergebnis-<variant>.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { agentBody, agentPlan, type AgentAnswer } from '../../src/lib/assistent';
import { get, set } from '../../src/state/store';
import { persons } from '../../src/theme/tokens';
import { termine, listen, aufgaben } from '../../eval/assistent/familie';
import { FAELLE, type Stand, type Ergebnis } from '../../eval/assistent/faelle';

const URL = process.env.EVAL_URL ?? 'https://jzfubxcdpznzxqtvnodm.supabase.co/functions/v1/assistent-eval';
const TOKEN = process.env.EVAL_TOKEN ?? '';
const args = process.argv.slice(2);
const vi = args.indexOf('--variant');
const variant = vi >= 0 ? args[vi + 1] : 'haiku';
const only = args.filter((a, i) => !a.startsWith('--') && i !== vi + 1 || (vi < 0 && !a.startsWith('--')));
if (TOKEN.length < 32) throw new Error('EVAL_TOKEN fehlt');

persons.J.name = 'Julian';
persons.T.name = 'Sophia';
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const stand = (): Stand => clone({ events: get().events, lists: get().lists, tasks: get().tasks });

async function ask(said: string, history: { said: string; app?: string }[]): Promise<{ r: AgentAnswer | null; ms: number; error?: string }> {
  const t0 = Date.now();
  for (let tries = 0; ; tries++) {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-eval-token': TOKEN, 'x-eval-variant': variant }, body: JSON.stringify(agentBody(said, history)) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { r: body as AgentAnswer, ms: Date.now() - t0 };
    if (tries < 2 && (res.status === 429 || res.status >= 500)) { await new Promise((r) => setTimeout(r, 3000 * (tries + 1))); continue; }
    return { r: null, ms: Date.now() - t0, error: `${res.status} ${body.error ?? ''}` };
  }
}

(async () => {
  const cases = FAELLE.filter((c) => !only.length || only.includes(c.id));
  const rows: string[] = [];
  let ok = 0;
  const times: number[] = [];
  for (const c of cases) {
    const base: Stand = { events: termine(), lists: listen(), tasks: aufgaben() };
    const start = c.start ? c.start(base) : base;
    set(() => ({ ...clone(start), people: [{ id: 'p_karlo', name: 'Karlo', kind: 'kind', color: 'Mint' }] as never }));
    const vorher = stand();
    const history: { said: string; app?: string }[] = [];
    let last: Omit<Ergebnis, 'stand' | 'vorher'> = { antwort: '', frage: null, tools: [], karte: null };
    let fail = '';
    for (const said of c.saetze) {
      const { r, ms, error } = await ask(said, history);
      times.push(ms);
      if (!r) { fail = `Server: ${error}`; break; }
      const antwort = String(r.actions.find((a) => a.tool === 'antworten')?.input?.text ?? '');
      const p = agentPlan(r, said);
      let karte: string | null = null;
      let frage: string | null = null;
      if (!p) karte = 'nicht verstanden';
      else if ('ask' in p) frage = p.ask;
      else {
        const res = p.run().result;
        karte = res?.kind ?? null;
        if (res?.kind === 'event' && res.ask) frage = res.ask;
        if (res?.kind === 'answer' && res.reply.kind === 'ask') frage = res.reply.text;
      }
      last = { antwort, frage, tools: r.actions.map((a) => a.tool), karte };
      history.push({ said, app: frage ?? (antwort || undefined) });
    }
    const bad = fail ? [fail] : c.pruefe({ ...last, stand: stand(), vorher });
    if (!bad.length) ok++;
    const line = `${bad.length ? '✗' : '✓'} ${c.id}${bad.length ? `: ${bad.join('; ')}` : ''}`;
    console.log(line);
    rows.push(`| ${bad.length ? '✗' : '✓'} | ${c.id} | ${c.saetze.join(' → ')} | ${(bad.join('; ') || last.antwort || last.frage || '').replace(/\|/g, '/')} |`);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)] ?? 0;
  const summary = `${ok} von ${cases.length} bestanden (${variant}), Antwortzeit Median ${(median / 1000).toFixed(1)} s, langsamster ${((times[times.length - 1] ?? 0) / 1000).toFixed(1)} s`;
  console.log(`\n${summary}`);
  const out = path.join(process.cwd(), `eval/assistent/ergebnis-${variant}.md`);
  fs.writeFileSync(out, `# Testliste Assistent: ${summary}\n\nStand ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC\n\n| | Fall | Satz | Fehler oder Antwort |\n|---|---|---|---|\n${rows.join('\n')}\n`);
  process.exit(ok === cases.length ? 0 : 1);
})();
