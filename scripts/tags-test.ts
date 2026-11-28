// Run: node --experimental-strip-types scripts/tags-test.ts
// @ts-ignore: node runs the .ts file directly, the app's tsconfig does not allow the extension.
import { tagSegments } from '../src/lib/tags.ts';
const names = [{ name: 'Julia', bg: '#D3DDEC', fg: '#34507A' }, { name: 'Tom', bg: '#E6D6E6', fg: '#6B3F6B' }, { name: 'Oma Gisela', bg: '#E4DACB', fg: '#5E5140' }, { name: 'Ben', bg: '#D6E3CF', fg: '#3E5E3A' }];
const cases: [string, string[], string][] = [
  ['Julia hat Dienstag um 16 Uhr Zahnarzt bei Dr. Weber', ['Zahnarzt'], '[person:Julia] hat [time:Dienstag um 16 Uhr] [event:Zahnarzt] bei [place:Dr. Weber]'],
  ['Tom holt Ben morgen um 8 vom Kindergarten ab', [], '[person:Tom] holt [person:Ben] [time:morgen um 8] vom [place:Kindergarten] ab'],
  ['Am 3. Dezember Weihnachtsfeier im Rathaus', ['Weihnachtsfeier'], '[time:Am 3. Dezember] [event:Weihnachtsfeier] im [place:Rathaus]'],
  ['Oma Gisela kommt am Samstag', [], '[person:Oma Gisela] kommt [time:am Samstag]'],
  ['Ich fahre Julia um 16 Uhr hin', [], 'Ich fahre [person:Julia] [time:um 16 Uhr] hin'],
  ['Julias Schwimmkurs nächste Woche', ['Schwimmkurs'], '[person:Julias] [event:Schwimmkurs] [time:nächste Woche]'],
  ['Dentist for Tom tomorrow at 4 pm at Lakeside Clinic', ['Dentist'], '[event:Dentist] for [person:Tom] [time:tomorrow at 4 pm] at [place:Lakeside Clinic]'],
  ['Tom hat Dienstag um 16 Uhr Zahnarzt bei Dr. Weber', ['Tom hat Zahnarzt bei Dr. Weber'], '[person:Tom] hat [time:Dienstag um 16 Uhr] [event:Zahnarzt] bei [place:Dr. Weber]'],
  ['Tom bringt Ben Dienstag um 16 Uhr zum Zahnarzt bei Dr. Weber', ['Zahnarzt bei Dr. Weber'], '[person:Tom] bringt [person:Ben] [time:Dienstag um 16 Uhr] zum [event:Zahnarzt] bei [place:Dr. Weber]'],
  ['Milch kaufen', [], 'Milch kaufen'],
  ['Tomaten und Bento kaufen', [], 'Tomaten und Bento kaufen'],
];
let bad = 0;
for (const [t, titles, want] of cases) {
  const got = tagSegments(t, { names, titles }).map((s) => (s.kind ? `[${s.kind}:${s.text}]` : s.text)).join('');
  const ok = got === want; if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', got, ok ? '' : `\n     want ${want}`);
}
console.log(bad ? `${bad} failed` : 'all passed'); if (bad) process.exit(1);
