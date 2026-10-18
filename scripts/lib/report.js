// Collects performance numbers for every uploaded video into data/istatistik.json and data/rapor.md.
const fs = require('fs');
const path = require('path');
const C = require('../../config/countries.json');

const DATA = path.resolve(__dirname, '../../data');
const TYPES = { pollId: 'oylama', longId: 'maç', highlightId: 'özet' };
const pct = x => (x === undefined || x === null ? '-' : `%${Math.round(x)}`);
const num = x => (x === undefined || x === null ? '-' : Number(x).toLocaleString('tr-TR'));
const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

async function updateReport(state, yt, today) {
  const days = state.history.slice(-60);
  const ids = days.flatMap(h => Object.keys(TYPES).map(k => h[k]).filter(Boolean));
  if (!ids.length) return null;
  const stats = await yt.videoStats(ids);
  let ana = {}, anaNote = '';
  try {
    ana = await yt.videoAnalytics(ids, days[0].date, today);
  } catch (e) {
    anaNote = `İzlenme süresi verisi alınamadı (${e.message.slice(0, 120)}). README'deki "YouTube Analytics API" adımını kontrol et.`;
  }
  const rows = days.map(h => {
    const r = { date: h.date, a: h.a, b: h.b, votesA: h.votesA, votesB: h.votesB, winner: h.winner, score: h.score };
    for (const [k, t] of Object.entries(TYPES)) if (h[k]) r[t] = { id: h[k], ...(stats[h[k]] || {}), ...(ana[h[k]] || {}) };
    return r;
  });
  fs.writeFileSync(path.join(DATA, 'istatistik.json'), JSON.stringify({ updated: new Date().toISOString(), days: rows }, null, 2) + '\n');

  const last7 = rows.slice(-7);
  const tot = t => last7.reduce((s, r) => s + (r[t]?.views || 0), 0);
  const name = id => C[id]?.name || id;
  const best = rows.filter(r => r['maç']?.views).sort((x, y) => y['maç'].views - x['maç'].views).slice(0, 5);
  const md = [
    '# Bayrak Arenası performans raporu',
    `Son güncelleme: ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    '',
    '## Son 7 gün',
    `- Oylama Shorts'ları: ${num(tot('oylama'))} izlenme, ortalama ${num(Math.round(avg(last7.map(r => (r.votesA || 0) + (r.votesB || 0)))))} oy`,
    `- Maç videoları: ${num(tot('maç'))} izlenme, ortalama izlenme oranı ${pct(avg(last7.map(r => r['maç']?.avgViewPct).filter(x => x !== undefined)) || null)}`,
    `- Özet Shorts'ları: ${num(tot('özet'))} izlenme`,
    `- Kazanılan abone (videolardan): ${num(last7.reduce((s, r) => s + Object.values(TYPES).reduce((q, t) => q + (r[t]?.subsGained || 0), 0), 0))}`,
    anaNote ? `\n> ${anaNote}` : '',
    '',
    '## Günlük',
    '| Tarih | Maç | Oy | Skor | Oylama izl. | Maç izl. | Maç ort. izlenme | Özet izl. | Yorum (oylama) |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.slice().reverse().map(r => `| ${r.date} | ${name(r.a)} - ${name(r.b)} | ${num(r.votesA)}-${num(r.votesB)} | ${r.score} | ${num(r['oylama']?.views)} | ${num(r['maç']?.views)} | ${pct(r['maç']?.avgViewPct)} | ${num(r['özet']?.views)} | ${num(r['oylama']?.comments)} |`),
    '',
    '## En çok izlenen maçlar',
    ...best.map((r, i) => `${i + 1}. ${name(r.a)} - ${name(r.b)} (${r.date}): ${num(r['maç'].views)} izlenme`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DATA, 'rapor.md'), md);
  return { videos: ids.length, analytics: !anaNote };
}

module.exports = { updateReport };
