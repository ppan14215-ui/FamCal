/**
 * Kalender Abo (Julian 28.10., Lücke zu TimeTree): the family's Termine as an
 * iCalendar feed. Apple and Google Kalender subscribe to
 *   https://<project>.supabase.co/functions/v1/kalender?t=<token>
 * and the same link downloads the file for export. The token is the only key
 * (families.ics_token, renewable in the app); the database function only
 * returns shared Termine, never work blocks or phone calendars.
 * Deployed without JWT check, because calendar apps send no login.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

type Row = {
  id: string; title: string; sub: string | null; place: string | null; note: string | null; date: string; end_date: string | null;
  start_time: string; end_time: string | null; all_day: boolean; repeat: string | null; repeat_until: string | null;
  skip_dates: string[] | null; updated_at: string; family_name: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WD: Record<string, string> = { sonntag: 'SU', montag: 'MO', dienstag: 'TU', mittwoch: 'WE', donnerstag: 'TH', freitag: 'FR', samstag: 'SA', sunday: 'SU', monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH', friday: 'FR', saturday: 'SA' };

/** Same reading as src/lib/repeat.ts ruleOf, written as an RRULE. */
function rrule(text: string | null, until: string | null): string | null {
  if (!text) return null;
  const t = ` ${text.toLowerCase().replace(/[.,]/g, ' ')} `;
  const n = Number(t.match(/(?:alle|every)\s+(\d+)/)?.[1]) || ({ zwei: 2, drei: 3, vier: 4, two: 2, three: 3, four: 4, other: 2 } as Record<string, number>)[t.match(/(?:alle|every)\s+(zwei|drei|vier|two|three|four|other)\b/)?.[1] ?? ''] || 1;
  const end = until ? `;UNTIL=${until.replace(/-/g, '')}T235959` : '';
  const iv = n > 1 ? `;INTERVAL=${n}` : '';
  if (/(montag bis freitag|werktags|wochentags|weekdays|mondays? to fridays?|monday to friday)/.test(t)) return `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR${end}`;
  const days = Object.keys(WD).filter((d) => new RegExp(`\\b${d}s?\\b`).test(t)).map((d) => WD[d]);
  if (/(täglich|jeden tag|daily|every day|tage\b|days\b)/.test(t)) return `FREQ=DAILY${iv}${end}`;
  if (/(jährlich|jedes jahr|year|jahr)/.test(t)) return `FREQ=YEARLY${iv}${end}`;
  if (/(monatlich|jeden monat|month|monat)/.test(t)) return `FREQ=MONTHLY${iv}${end}`;
  if (days.length || /(wöchentlich|jede woche|week|woche)/.test(t)) return `FREQ=WEEKLY${iv}${days.length ? `;BYDAY=${[...new Set(days)].join(',')}` : ''}${end}`;
  return null;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Lines longer than 75 octets are folded, as RFC 5545 asks. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}
const day = (d: string) => d.replace(/-/g, '');
const nextDay = (d: string) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
const local = (d: string, t: string) => `${day(d)}T${t.replace(':', '')}00`;
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function vevent(r: Row): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${r.id}@famcal.app`, `DTSTAMP:${stamp(r.updated_at)}`, `LAST-MODIFIED:${stamp(r.updated_at)}`];
  if (r.all_day || !r.start_time || r.start_time === '00:00' && !r.end_time) {
    lines.push(`DTSTART;VALUE=DATE:${day(r.date)}`, `DTEND;VALUE=DATE:${day(nextDay(r.end_date ?? r.date))}`);
  } else {
    const endDay = r.end_date ?? r.date;
    const endTime = r.end_time ?? r.start_time;
    lines.push(`DTSTART;TZID=Europe/Berlin:${local(r.date, r.start_time)}`, `DTEND;TZID=Europe/Berlin:${local(endDay, endTime < r.start_time && endDay === r.date ? r.start_time : endTime)}`);
  }
  lines.push(`SUMMARY:${esc(r.title)}`);
  const where = r.place ?? r.sub;
  if (where) lines.push(`LOCATION:${esc(where)}`);
  if (r.note) lines.push(`DESCRIPTION:${esc(r.note)}`);
  const rule = rrule(r.repeat, r.repeat_until);
  if (rule) {
    lines.push(`RRULE:${rule}`);
    for (const s of r.skip_dates ?? []) lines.push(r.all_day ? `EXDATE;VALUE=DATE:${day(s)}` : `EXDATE;TZID=Europe/Berlin:${local(s, r.start_time)}`);
  }
  lines.push('END:VEVENT');
  return lines;
}

const TZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const t = new URL(req.url).searchParams.get('t') ?? '';
  if (!UUID.test(t)) return new Response('Not found', { status: 404 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await db.rpc('ics_feed', { token: t });
  if (error) { console.warn('[kalender] feed failed'); return new Response('Error', { status: 500 }); }
  const rows = (data ?? []) as Row[];
  // A wrong or renewed token looks the same as a family without Termine, so nobody can probe for tokens.
  const name = rows[0]?.family_name ?? 'FamCal';
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FamCal//Familienkalender//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(`FamCal ${name}`)}`, 'X-WR-TIMEZONE:Europe/Berlin', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', ...TZ, ...rows.flatMap(vevent), 'END:VCALENDAR']
    .map(fold).join('\r\n') + '\r\n';
  return new Response(req.method === 'HEAD' ? null : body, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="famcal.ics"', 'Cache-Control': 'private, max-age=900' },
  });
});
