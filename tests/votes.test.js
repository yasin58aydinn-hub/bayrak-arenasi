// node tests/votes.test.js
const assert = require('assert');
const { countVotes, pick } = require('../scripts/lib/votes');

const cases = [
  ['Türkiye 🔥', 'a'], ['TÜRKİYE', 'a'], ['turkiye kazanır', 'a'], ["Türkiye'ye güç!", 'a'], ['🇹🇷🇹🇷🇹🇷', 'a'],
  ['Rusya', 'b'], ['RUSYAAA', 'b'], ['russia all the way', 'b'], ['🇷🇺', 'b'],
  ['Türkiye > Rusya', 'a'], ['Rusya değil Türkiye', 'b'],
  ['harika video', null], ['türkmenler', null], ['için', null],
];
for (const [text, want] of cases) assert.strictEqual(pick(text, 'tr', 'ru'), want, `"${text}" → ${want} bekleniyordu`);

assert.strictEqual(pick('ABD!!', 'us', 'cn'), 'a');
assert.strictEqual(pick('abdullah selam', 'us', 'cn'), null);
assert.strictEqual(pick('ÇİN', 'us', 'cn'), 'b');
assert.strictEqual(pick('ITALY', 'it', 'es'), 'a');
assert.strictEqual(pick('Güney Kore 🇰🇷', 'kr', 'jp'), 'a');

const comments = [
  { author: 'u1', text: 'Türkiye', publishedAt: '2026-10-19T08:00:00Z' },
  { author: 'u1', text: 'Türkiye Türkiye', publishedAt: '2026-10-19T08:01:00Z' },
  { author: 'u2', text: 'Rusya', publishedAt: '2026-10-19T08:02:00Z' },
  { author: 'u3', text: 'güzel', publishedAt: '2026-10-19T08:03:00Z' },
  { author: 'u3', text: 'rusya', publishedAt: '2026-10-19T08:04:00Z' },
  { author: 'owner', text: 'Türkiye mi Rusya mı?', publishedAt: '2026-10-19T07:00:00Z' },
  { author: 'u4', text: '🇹🇷', publishedAt: '2026-10-19T08:05:00Z' },
];
const v = countVotes(comments, 'tr', 'ru', 'owner');
assert.deepStrictEqual([v.a, v.b, v.voters], [2, 2, 4]);
console.log('Yorum sayma testleri geçti ✔');
