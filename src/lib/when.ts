/**
 * Schreibzeile (Canvas Zeile 7, freigegeben 26.10.): a date is written, not
 * scrolled. "Do 15 Uhr", "übermorgen", "12.11. 930-1015", "jeden Di 19-2030",
 * "20.-27.3." all become a When. Everything is relative to the fixed TODAY.
 */
import { EN, isEn, tx } from '../i18n/lang';
import { TODAY, addDays, weekday, year, daysBetween, short, long, hm, minutes, WD_LONG, MONTHS_SHORT, monthIdx, dayNum } from './dates';

export type When = {
  date: string;
  /** Last day of a multi-day entry (Ostsee). */
  endDate?: string;
  start?: string;
  end?: string;
  /** "Jeden Dienstag" */
  repeat?: string;
};

const WD: Record<string, number> = {
  so: 0, sonntag: 0, mo: 1, montag: 1, di: 2, dienstag: 2, mi: 3, mittwoch: 3,
  do: 4, donnerstag: 4, fr: 5, freitag: 5, sa: 6, samstag: 6,
};
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const valid = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Next day with this weekday, today included. */
function nextWd(wd: number, from = TODAY) {
  return addDays(from, (wd - weekday(from) + 7) % 7);
}

/** "930" → "09:30", "19" → "19:00", "2030" → "20:30", "9:30" → "09:30". */
function time(t: string): string | null {
  const m = t.match(/^(\d{1,2})(?::|\.)?(\d{2})?$/);
  if (!m) return null;
  let h: number, mi: number;
  if (!m[2] && m[1].length <= 2) { h = Number(m[1]); mi = 0; }
  else if (m[2]) { h = Number(m[1]); mi = Number(m[2]); }
  else return null;
  if (h > 23 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}
/** Also takes "930" and "1015" (three or four digits). */
function timeLoose(t: string): string | null {
  if (/^\d{3,4}$/.test(t)) return time(`${t.slice(0, -2)}:${t.slice(-2)}`);
  return time(t);
}

/**
 * Reads a When from text. `past` picks the last occurrence of a day without
 * year (birth dates), otherwise the next one.
 */
const MONTH_WORDS = ['jan', 'feb', 'mä', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];

const EN_MONTHS: Record<string, string> = {
  january: 'januar', jan: 'januar', february: 'februar', feb: 'februar', march: 'märz', mar: 'märz', april: 'april', apr: 'april',
  may: 'mai', june: 'juni', jun: 'juni', july: 'juli', jul: 'juli', august: 'august', aug: 'august', september: 'september',
  sept: 'september', sep: 'september', october: 'oktober', oct: 'oktober', november: 'november', nov: 'november', december: 'dezember', dec: 'dezember',
};
const EN_WD: Record<string, string> = {
  sunday: 'sonntag', sun: 'sonntag', monday: 'montag', mon: 'montag', tuesday: 'dienstag', tue: 'dienstag', tues: 'dienstag',
  wednesday: 'mittwoch', wed: 'mittwoch', thursday: 'donnerstag', thu: 'donnerstag', thur: 'donnerstag', thurs: 'donnerstag',
  friday: 'freitag', fri: 'freitag', saturday: 'samstag', sat: 'samstag',
};
const EN_MON = Object.keys(EN_MONTHS).join('|');

/**
 * English into the German forms below, so one reader serves both languages:
 * "next Friday at 3pm" → "nächsten freitag 15", "Nov 12th" → "12. november".
 * Only words that are never German are touched; "am" counts as a.m. on
 * English phones only, since "um 10 am Montag" is German.
 */
function fromEnglish(t: string): string {
  if (EN) {
    t = t.replace(/ (\d{1,2})(?::(\d{2}))? ?(a\.?m\.?|p\.?m\.?)(?= )/g, (_, h, m, ap) => {
      let hh = Number(h) % 12;
      if (ap.startsWith('p')) hh += 12;
      return ` ${hh}:${m ?? '00'}`;
    });
  } else {
    t = t.replace(/ (\d{1,2})(?::(\d{2}))? ?(p\.?m\.?)(?= )/g, (_, h, m) => ` ${(Number(h) % 12) + 12}:${m ?? '00'}`);
  }
  t = t.replace(/ noon /g, ' 12:00 ').replace(/ midnight /g, ' 0:00 ')
    .replace(/(\d)(st|nd|rd|th)(?= )/g, '$1')
    .replace(/ (?:the )?day after tomorrow /g, ' übermorgen ')
    .replace(/ tomorrow /g, ' morgen ').replace(/ (today|tonight|this evening) /g, ' heute ').replace(/ yesterday /g, ' gestern ')
    .replace(/ next week /g, ' nächste woche ').replace(/ (every week|weekly) /g, ' jede woche ').replace(/ all day /g, ' ganztägig ')
    .replace(/ in (a|an|one) (day|week)s? /g, ' in einer $2 ').replace(/ in (two|three) /g, (_, n) => ` in ${n === 'two' ? 'zwei' : 'drei'} `)
    .replace(/ in (\S+) days? /g, ' in $1 tagen ').replace(/ in (\S+) weeks? /g, ' in $1 wochen ')
    .replace(/ in einer day /g, ' in einer tag ').replace(/ in einer week /g, ' in einer woche ')
    .replace(/ every /g, ' jeden ').replace(/ (next|this coming) /g, ' nächsten ')
    .replace(/ (on|at|from|the|this) /g, ' ').replace(/ (until|till|to|through) /g, ' bis ');
  // "Nov 12", "November 12 2027" and "12 Nov"
  t = t.replace(new RegExp(` (${EN_MON})\\.? (\\d{1,2}),?(?: (\\d{4}))? `, 'g'), (_, m, d, y) => ` ${d}. ${EN_MONTHS[m]}${y ? ' ' + y : ''} `);
  t = t.replace(new RegExp(` (\\d{1,2}) (${EN_MON})\\.?(?= )`, 'g'), (_, d, m) => ` ${d}. ${EN_MONTHS[m]}`);
  t = t.replace(/ ([a-z]+)\.?(?= )/g, (w, x) => (EN_WD[x] ? ` ${EN_WD[x]}` : w));
  return t;
}

export function parseWhen(input: string, opts: { past?: boolean; base?: string } = {}): When | null {
  const base = opts.base ?? TODAY;
  let t = ` ${input.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (!t.trim()) return null;
  // Twice: one regex pass cannot see two neighbouring words that both need the shared space.
  t = fromEnglish(fromEnglish(t));
  t = t.replace(/ (um|am|ab|von) /g, ' ').replace(/ bis /g, '-').replace(/–/g, '-');
  let date: string | undefined;
  let endDate: string | undefined;
  let start: string | undefined;
  let end: string | undefined;
  let repeat: string | undefined;

  const yearFor = (m: number, d: number, y?: string) => {
    if (y) return y.length === 2 ? 2000 + Number(y) : Number(y);
    let yy = year(base);
    const cand = isoOf(yy, m, d);
    if (opts.past ? cand > base : cand < base) yy += opts.past ? -1 : 1;
    return yy;
  };

  // Range of days: "20.-27.3.", "20.3.-27.3.", "20.3.-2.4.2027"
  const range = t.match(/ (\d{1,2})\.(?:(\d{1,2})\.)?\s*-\s*(\d{1,2})\.(\d{1,2})\.?(\d{2,4})? /);
  if (range) {
    const m2 = Number(range[4]);
    const m1 = range[2] ? Number(range[2]) : m2;
    const y2 = yearFor(m2, Number(range[3]), range[5]);
    const y1 = m1 > m2 ? y2 - 1 : y2;
    if (valid(y1, m1, Number(range[1])) && valid(y2, m2, Number(range[3]))) {
      date = isoOf(y1, m1, Number(range[1]));
      endDate = isoOf(y2, m2, Number(range[3]));
      if (endDate <= date) endDate = undefined;
    }
    t = t.replace(range[0], ' ');
  }

  // One day: "12.11.", "12.11.26", "12.11.2026", "12.11"
  if (!date) {
    const dm = t.match(/ (\d{1,2})\.(\d{1,2})\.?(\d{2,4})? /);
    if (dm) {
      const d = Number(dm[1]); const m = Number(dm[2]);
      const y = yearFor(m, d, dm[3]);
      if (valid(y, m, d)) date = isoOf(y, m, d);
      t = t.replace(dm[0], ' ');
    }
  }

  // Month names: "12. November", "3 märz 2027"
  if (!date) {
    const mn = t.match(/ (\d{1,2})\.? (januar|jan|februar|feb|märz|maerz|mär|april|apr|mai|juni|jun|juli|jul|august|aug|september|sept|sep|oktober|okt|november|nov|dezember|dez)\.?(?: (\d{4}))? /);
    if (mn) {
      const d = Number(mn[1]);
      const m = MONTH_WORDS.findIndex((x) => mn[2].startsWith(x)) + 1;
      const y = yearFor(m, d, mn[3]);
      if (m && valid(y, m, d)) date = isoOf(y, m, d);
      t = t.replace(mn[0], ' ');
    }
  }

  // Words
  const words: [RegExp, () => string][] = [
    [/ übermorgen /, () => addDays(base, 2)],
    [/ morgen /, () => addDays(base, 1)],
    [/ heute /, () => base],
    [/ gestern /, () => addDays(base, -1)],
  ];
  for (const [re, fn] of words) {
    if (!date && re.test(t)) { date = fn(); t = t.replace(re, ' '); }
  }
  const inN = t.match(/ in (\d+|einer|einem|zwei|drei) (tag|tagen|woche|wochen) /);
  if (!date && inN) {
    const n = ({ einer: 1, einem: 1, zwei: 2, drei: 3 } as Record<string, number>)[inN[1]] ?? Number(inN[1]);
    date = addDays(base, inN[2].startsWith('w') ? n * 7 : n);
    t = t.replace(inN[0], ' ');
  }
  if (!date && / nächste woche /.test(t)) { date = addDays(nextWd(1, base), weekday(base) === 1 ? 7 : 0); t = t.replace(' nächste woche ', ' '); }

  // Weekday, optionally "jeden" or "nächsten"
  const wd = t.match(/ (jeden |jede |nächsten |nächste )?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)\.? /);
  if (wd) {
    const n = WD[wd[2]];
    if (!date) date = nextWd(n, wd[1]?.startsWith('n') ? addDays(base, 1) : base);
    if (wd[1]?.startsWith('jede')) repeat = tx(`Jeden ${WD_LONG[n]}`, `Every ${WD_LONG[n]}`);
    t = t.replace(wd[0], ' ');
  }
  if (/ (jede woche|wöchentlich) /.test(t)) { repeat = tx('Jede Woche', 'Every week'); t = t.replace(/ (jede woche|wöchentlich) /, ' '); }

  // Times: "930-1015", "9:30-10:15", "19-2030", "15 uhr", "15h", "9:30"
  t = t.replace(/ uhr /g, ' ').replace(/(\d)h /g, '$1 ').replace(/(\d) uhr/g, '$1');
  const tr = t.match(/ (\d{1,2}(?::\d{2})?|\d{3,4})\s*-\s*(\d{1,2}(?::\d{2})?|\d{3,4}) /);
  if (tr) {
    const a = timeLoose(tr[1]); const b = timeLoose(tr[2]);
    if (a && b) { start = a; end = minutes(b) > minutes(a) ? b : undefined; }
    t = t.replace(tr[0], ' ');
  } else {
    const one = t.match(/ (\d{1,2}:\d{2}|\d{3,4}|\d{1,2}) /);
    if (one) {
      const a = timeLoose(one[1]);
      if (a) start = a;
      t = t.replace(one[0], ' ');
    }
  }
  if (/ ganztägig /.test(t)) { start = undefined; end = undefined; t = t.replace(' ganztägig ', ' '); }

  if (!date && start) date = minutes(start) > minutes('08:50') ? base : addDays(base, 1);
  if (!date) return null;
  // Anything left over that is not a filler word means we did not understand.
  if (t.replace(/\b(den|der|dem|ab|und|,|\.)\b/g, '').trim().length > 0) return null;
  return { date, endDate, start, end, repeat };
}

const yearIfOther = (d: string) => (year(d) !== year(TODAY) ? ` ${year(d)}` : '');

/** Collapsed line: "Do 12. Nov · 9:30–10:15", "Sa 20. bis Sa 27. März 2027". */
export function whenLine(w: When): string {
  if (w.endDate) {
    const same = !isEn() && monthIdx(w.date) === monthIdx(w.endDate);
    const a = same ? `${short(w.date).split(' ').slice(0, 2).join(' ')}` : short(w.date);
    return `${a} ${tx('bis', 'to')} ${short(w.endDate)}${yearIfOther(w.endDate)}`;
  }
  const time = w.start ? ` · ${hm(w.start)}${w.end ? '–' + hm(w.end) : ''}` : '';
  return `${short(w.date)}${yearIfOther(w.date)}${time}${w.repeat ? ' · ' + w.repeat : ''}`;
}

function dur(a: string, b: string) {
  const m = minutes(b) - minutes(a);
  if (m < 60) return tx(`${m} Minuten`, `${m} minutes`);
  const h = Math.floor(m / 60); const r = m % 60;
  return r ? tx(`${h} Std ${r} Min`, `${h} h ${r} min`) : h === 1 ? tx('1 Stunde', '1 hour') : tx(`${h} Stunden`, `${h} hours`);
}

/** The sentence under the field: "Donnerstag, 12. November, 9:30 bis 10:15. 45 Minuten." */
export function whenSentence(w: When): string {
  if (w.endDate) {
    const n = daysBetween(w.date, w.endDate) + 1;
    return `${long(w.date)}${year(w.date) !== year(w.endDate) ? yearIfOther(w.date) : ''} ${tx('bis', 'to')} ${long(w.endDate)}${yearIfOther(w.endDate)}. ${tx(`Ganztägig, ${n} Tage.`, `All day, ${n} days.`)}`;
  }
  const d = `${long(w.date)}${yearIfOther(w.date)}`;
  const rel = w.date === TODAY ? tx('Heute, ', 'Today, ') : w.date === addDays(TODAY, 1) ? tx('Morgen, ', 'Tomorrow, ') : '';
  const day = rel ? rel + d.split(', ')[1] : d;
  if (!w.start) return `${day}. ${tx('Ganztägig.', 'All day.')}${w.repeat ? ' ' + w.repeat + '.' : ''}`;
  if (!w.end) return `${day}, ${hm(w.start)}. ${tx('Wie lange?', 'How long?')}${w.repeat ? ' ' + w.repeat + '.' : ''}`;
  return `${day}, ${hm(w.start)} ${tx('bis', 'to')} ${hm(w.end)}. ${dur(w.start, w.end)}.${w.repeat ? ' ' + w.repeat + '.' : ''}`;
}

/** Text that parses back to the same When, used to prefill the field. */
export function whenText(w: When): string {
  if (w.endDate) return `${dayNum(w.date)}.${monthIdx(w.date) + 1}.-${dayNum(w.endDate)}.${monthIdx(w.endDate) + 1}.`;
  const y = yearIfOther(w.date) || w.date < TODAY ? year(w.date) : '';
  const d = isEn() ? `${MONTHS_SHORT[monthIdx(w.date)]} ${dayNum(w.date)}${y ? ' ' + y : ''}` : `${dayNum(w.date)}.${monthIdx(w.date) + 1}.${y}`;
  const t = w.start ? ` ${hm(w.start)}${w.end ? (isEn() ? ' to ' : '-') + hm(w.end) : ''}` : '';
  const every = w.repeat?.match(/^(?:Jeden|Every) (\w{3})/);
  return `${every ? tx('jeden ', 'every ') + every[1].slice(0, isEn() ? 3 : 2) + ' ' : ''}${d}${t}`;
}

/** Task title with a deadline: "Passfotos machen bis Fr" → title + due. */
export function splitDue(text: string): { title: string; due?: string } {
  const m = text.match(/^(.*\S)\s+(?:bis|by|until|due)\s+(.+)$/i);
  if (!m) return { title: text.trim() };
  const w = parseWhen(m[2]);
  return w ? { title: m[1].trim(), due: w.date } : { title: text.trim() };
}

/** "bis Fr 30. Okt" */
export function dueLabel(due: string): string {
  return `${tx('bis', 'by')} ${short(due)}${yearIfOther(due)}`;
}

export const monthChip = (iso: string) => MONTHS_SHORT[monthIdx(iso)];
