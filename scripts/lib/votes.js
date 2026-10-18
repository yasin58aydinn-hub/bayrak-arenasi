// Counts one vote per commenter from the poll Short's comments.
const COUNTRIES = require('../../config/countries.json');

const norm = s => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const isEmoji = a => /\p{Regional_Indicator}/u.test(a);
const LETTER = /[\p{L}\p{N}]/u;

// Earliest position where one of the country's aliases appears, or -1.
function firstIndex(text, normText, id) {
  let best = -1;
  for (const raw of COUNTRIES[id].aliases) {
    let idx = -1;
    if (isEmoji(raw)) idx = text.indexOf(raw);
    else {
      const a = norm(raw), strict = a.length <= 4;
      let from = 0;
      while ((from = normText.indexOf(a, from)) !== -1) {
        const before = from === 0 ? '' : normText[from - 1];
        const after = normText[from + a.length] || '';
        // short aliases (tr, abd, çin, türk) must stand alone; longer ones may carry suffixes (türkiye'ye, rusyaaa)
        if (!LETTER.test(before) && (!strict || !LETTER.test(after))) { idx = from; break; }
        from += 1;
      }
    }
    if (idx !== -1 && (best === -1 || idx < best)) best = idx;
  }
  return best;
}

function pick(text, a, b) {
  const n = norm(text);
  const ia = firstIndex(text, n, a), ib = firstIndex(text, n, b);
  if (ia === -1 && ib === -1) return null;
  if (ia === -1) return 'b';
  if (ib === -1) return 'a';
  return ia <= ib ? 'a' : 'b';
}

/**
 * comments: [{author, text, publishedAt}] — author is the channel id of the commenter.
 * Each person counts once: their earliest comment that names one of the two countries.
 */
function countVotes(comments, a, b, ownerId) {
  const res = { a: 0, b: 0, voters: 0, comments: comments.length };
  const seen = new Set();
  const sorted = comments.slice().sort((x, y) => String(x.publishedAt).localeCompare(String(y.publishedAt)));
  for (const c of sorted) {
    if (!c.author || c.author === ownerId || seen.has(c.author)) continue;
    const side = pick(c.text || '', a, b);
    if (!side) continue;
    seen.add(c.author);
    res[side]++;
  }
  res.voters = res.a + res.b;
  return res;
}

module.exports = { countVotes, pick, norm };
