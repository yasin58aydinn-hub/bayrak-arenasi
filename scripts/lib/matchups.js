// Chooses the next matchup: queue file first, otherwise a weighted random pair.
const fs = require('fs');
const path = require('path');
const COUNTRIES = require('../../config/countries.json');

const QUEUE = path.resolve(__dirname, '../../data/kuyruk.txt');
const key = (a, b) => [a, b].sort().join('-');

function takeFromQueue() {
  if (!fs.existsSync(QUEUE)) return null;
  const lines = fs.readFileSync(QUEUE, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.toLowerCase().match(/^([a-z]{2})\s*[-–\s]\s*([a-z]{2})$/);
    lines.splice(i, 1);
    fs.writeFileSync(QUEUE, lines.join('\n'));
    if (m && COUNTRIES[m[1]] && COUNTRIES[m[2]] && m[1] !== m[2]) return { a: m[1], b: m[2] };
    console.warn(`Kuyruktaki satır anlaşılamadı, atlandı: "${t}"`);
    i--;
  }
  return null;
}

function pickPair(history, settings, exclude = []) {
  const queued = takeFromQueue();
  if (queued) return queued;
  const ids = Object.keys(COUNTRIES);
  const blocked = new Set((settings.blockedPairs || []).map(([a, b]) => key(a, b)));
  const recent = new Set(history.slice(-(settings.avoidRepeatDays || 30)).map(h => key(h.a, h.b)));
  const lastTwo = new Set(history.slice(-2).flatMap(h => [h.a, h.b]).concat(exclude));
  const w = id => (settings.countryWeights?.[id] ?? 1) * (lastTwo.has(id) ? 0.25 : 1);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const k = key(ids[i], ids[j]);
    if (blocked.has(k)) continue;
    pairs.push({ a: ids[i], b: ids[j], w: w(ids[i]) * w(ids[j]) * (recent.has(k) ? 0.02 : 1) });
  }
  let r = Math.random() * pairs.reduce((s, p) => s + p.w, 0);
  for (const p of pairs) { r -= p.w; if (r <= 0) return Math.random() < 0.5 ? { a: p.a, b: p.b } : { a: p.b, b: p.a }; }
  return { a: pairs[0].a, b: pairs[0].b };
}

module.exports = { pickPair };
