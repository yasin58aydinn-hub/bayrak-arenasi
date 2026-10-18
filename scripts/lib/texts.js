// Titles and descriptions for the uploads. Edit freely.
const C = require('../../config/countries.json');
const n = id => C[id].name;
const up = id => C[id].name.toLocaleUpperCase('tr-TR');
const fmt = x => Number(x).toLocaleString('tr-TR');
const short = id => `https://youtube.com/shorts/${id}`;
const watch = id => `https://youtu.be/${id}`;

module.exports = {
  poll(pair, s) {
    return {
      title: `${n(pair.a)} ${C[pair.a].q} ${n(pair.b)} ${C[pair.b].q}? Yorumunla güç ver ⚔️ #shorts`,
      description: [
        `Bu akşam ${s.matchPublishTime}'de ${n(pair.a)} ile ${n(pair.b)} arenada karşılaşıyor!`,
        '',
        'Yorumlara desteklediğin ülkenin adını yaz. Toplam yorumlar içindeki payı arttıkça ülken kalkan, zırh, keskin kılıç, öfke ve süper vuruş gücü kazanır.',
        'Her kişinin ilk oyu sayılır. Oylama maç videosu hazırlanırken kapanır.',
        '',
        `#bayrakarenası #countryball #${n(pair.a).replace(/\s/g, '')} #${n(pair.b).replace(/\s/g, '')}`,
      ].join('\n'),
    };
  },
  match(pair, votes, next, pollId) {
    return {
      title: `${up(pair.a)} vs ${up(pair.b)} | ${fmt(votes.a)} Yorum vs ${fmt(votes.b)} Yorum: Kim Kazandı? ⚔️`,
      description: [
        `${n(pair.a)} ve ${n(pair.b)} kılıç ve kalkanla arenada! Güçleri sizin yorumlarınız belirledi: ${fmt(votes.a)} yorum ${n(pair.a)}, ${fmt(votes.b)} yorum ${n(pair.b)}.`,
        '',
        pollId ? `Oylamanın yapıldığı Shorts: ${short(pollId)}` : null,
        next ? `Sıradaki maç: ${n(next.a)} vs ${n(next.b)}. Yarın sabah Shorts'ta oyunu ver!` : null,
        '',
        'Kanaldaki karakterler, animasyonlar ve müzikler Bayrak Arenası için özel olarak üretilmiştir. Videolar eğlence amaçlıdır; hiçbir ülkeyi, halkı ya da görüşü hedef almaz.',
        '',
        '#bayrakarenası #countryball #yorumsavaşı',
      ].filter(x => x !== null).join('\n'),
    };
  },
  highlight(pair, longId, next) {
    return {
      title: `${n(pair.a)} vs ${n(pair.b)}: K.O. anı! ⚔️ #shorts`,
      description: [
        longId ? `Maçın tamamı: ${watch(longId)}` : 'Maçın tamamı kanalda.',
        next ? `Sıradaki maç: ${n(next.a)} vs ${n(next.b)}. Yorumlara ülkeni yaz!` : null,
        '',
        '#bayrakarenası #countryball #shorts',
      ].filter(x => x !== null).join('\n'),
    };
  },
  pollResult(longId, winner, votes, pair) {
    return `\n\nSONUÇ: ${n(winner)} kazandı! (${fmt(votes.a)} yorum ${n(pair.a)}, ${fmt(votes.b)} yorum ${n(pair.b)})\nMaçın tamamı: ${watch(longId)}`;
  },
  names: { n, up },
};
