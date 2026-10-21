// node tests/matchups.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const QUEUE = path.resolve(__dirname, '../data/kuyruk.txt');
const saved = fs.existsSync(QUEUE) ? fs.readFileSync(QUEUE, 'utf8') : null;
fs.writeFileSync(QUEUE, '# boş\n');
try {
  const { pickPair } = require('../scripts/lib/matchups');
  const S = require('../config/settings.json');
  const has = (p, id) => p.a === id || p.b === id;
  const key = p => [p.a, p.b].sort().join('-');
  // Last match without Türkiye: the next one must include Türkiye, never a blocked pair.
  for (let i = 0; i < 300; i++) {
    const p = pickPair([{ a: 'tr', b: 'de' }, { a: 'ua', b: 'gb' }], S, ['ua', 'gb']);
    assert(has(p, 'tr'), `Türkiye bekleniyordu: ${key(p)}`);
    assert.notStrictEqual(key(p), 'gr-tr');
  }
  // Last match with Türkiye: the next one is a normal pick, mostly without Türkiye.
  let withTr = 0;
  for (let i = 0; i < 1000; i++) if (has(pickPair([{ a: 'ar', b: 'nl' }, { a: 'tr', b: 'br' }], S, ['tr', 'br']), 'tr')) withTr++;
  assert(withTr < 200, `Türkiye art arda çok sık seçildi: ${withTr}/1000`);
  // Blocked pairs never come up.
  for (let i = 0; i < 2000; i++) {
    const k = key(pickPair([], { ...S, featuredEvery: 0 }));
    assert(!['ru-ua', 'in-pk', 'gr-tr'].includes(k), `engelli çift seçildi: ${k}`);
  }
  console.log('Eşleşme testleri geçti ✔');
} finally {
  if (saved !== null) fs.writeFileSync(QUEUE, saved);
}
