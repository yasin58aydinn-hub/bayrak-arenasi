// Titles, descriptions, hashtags and tags for the uploads. Edit freely.
const C = require('../../config/countries.json');
const n = id => C[id].name;
const up = id => C[id].name.toLocaleUpperCase('tr-TR');
const fmt = x => Number(x).toLocaleString('tr-TR');
const short = id => `https://youtube.com/shorts/${id}`;
const watch = id => `https://youtu.be/${id}`;
const slug = s => s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');
const tag = s => '#' + slug(s);

/**
 * Hashtags in priority order. YouTube shows the first three above the title and gives the
 * first ones the most weight, so the matchup itself always comes first.
 */
function hashtags(pair, kind) {
  const a = n(pair.a), b = n(pair.b);
  const first5 = [`${a}vs${b}`, a, b, 'countryball', 'bayrakarenası'];
  const rest = [`${C[pair.a].en}vs${C[pair.b].en}`, C[pair.a].en, C[pair.b].en, 'ülkesavaşı', 'yorumsavaşı', 'kılıçdövüşü', 'animasyon'];
  if (kind === 'short') rest.push('shorts');
  return [...first5, ...rest].map(tag);
}

/** Keyword tags (not shown to viewers, used by search). */
function keywords(pair, base) {
  const a = n(pair.a), b = n(pair.b), ea = C[pair.a].en, eb = C[pair.b].en;
  const list = [`${a} vs ${b}`, `${b} vs ${a}`, a, b, `${ea} vs ${eb}`, ea, eb, 'countryball', 'country balls', 'ülke topları', 'bayrak topu', ...base];
  const out = [];
  let len = 0;
  for (const t of list) { if (out.includes(t) || len + t.length + 3 > 480) continue; out.push(t); len += t.length + 3; }
  return out;
}

module.exports = {
  poll(pair, s) {
    const h = hashtags(pair, 'short');
    return {
      title: `${n(pair.a)} ${C[pair.a].q} ${n(pair.b)} ${C[pair.b].q}? Yorumunla güç ver ⚔️ ${h[1]} ${h[2]}`,
      description: [
        h.slice(0, 5).join(' '),
        '',
        `Bu akşam ${s.matchPublishTime}'de ${n(pair.a)} ile ${n(pair.b)} arenada karşılaşıyor!`,
        'Yorumlara desteklediğin ülkenin adını yaz. Toplam yorumlar içindeki payı arttıkça ülken kalkan, zırh, keskin kılıç, öfke ve süper vuruş gücü kazanır.',
        'Her kişinin ilk oyu sayılır. Oylama maç videosu hazırlanırken kapanır.',
        '',
        h.slice(5).join(' '),
      ].join('\n'),
    };
  },
  match(pair, votes, next, pollId) {
    const h = hashtags(pair, 'long');
    return {
      title: `${up(pair.a)} vs ${up(pair.b)} | ${fmt(votes.a)} Yorum vs ${fmt(votes.b)} Yorum: Kim Kazandı? ⚔️`,
      description: [
        h.slice(0, 5).join(' '),
        '',
        `${n(pair.a)} ve ${n(pair.b)} kılıç ve kalkanla arenada! Güçleri sizin yorumlarınız belirledi: ${fmt(votes.a)} yorum ${n(pair.a)}, ${fmt(votes.b)} yorum ${n(pair.b)}.`,
        '',
        pollId ? `Oylamanın yapıldığı Shorts: ${short(pollId)}` : null,
        next ? `Sıradaki maç: ${n(next.a)} vs ${n(next.b)}. Yarın sabah Shorts'ta oyunu ver!` : null,
        '',
        'Kanaldaki karakterler, animasyonlar ve müzikler Bayrak Arenası için özel olarak üretilmiştir. Videolar eğlence amaçlıdır; hiçbir ülkeyi, halkı ya da görüşü hedef almaz.',
        '',
        h.slice(5).join(' '),
      ].filter(x => x !== null).join('\n'),
    };
  },
  highlight(pair, longId, next) {
    const h = hashtags(pair, 'short');
    return {
      title: `${n(pair.a)} vs ${n(pair.b)}: K.O. anı! ⚔️ ${h[1]} ${h[2]}`,
      description: [
        h.slice(0, 5).join(' '),
        '',
        longId ? `Maçın tamamı: ${watch(longId)}` : 'Maçın tamamı kanalda.',
        next ? `Sıradaki maç: ${n(next.a)} vs ${n(next.b)}. Yorumlara ülkeni yaz!` : null,
        '',
        h.slice(5).join(' '),
      ].filter(x => x !== null).join('\n'),
    };
  },
  pollResult(longId, winner, votes, pair) {
    return `\n\nSONUÇ: ${n(winner)} kazandı! (${fmt(votes.a)} yorum ${n(pair.a)}, ${fmt(votes.b)} yorum ${n(pair.b)})\nMaçın tamamı: ${watch(longId)}`;
  },
  keywords,
  hashtags,
  names: { n, up },
};
