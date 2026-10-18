#!/usr/bin/env node
// Daily flow. Usage: node scripts/daily.js sabah | aksam
//   sabah: picks the matchup, renders and uploads the voting Short.
//   aksam: counts the votes, renders the match, uploads the long video and the highlight Short.
// DRY_RUN=1 renders everything into out/ without touching YouTube.
const fs = require('fs');
const path = require('path');
const { Renderer } = require('./lib/render');
const { pickPair } = require('./lib/matchups');
const { countVotes } = require('./lib/votes');
const texts = require('./lib/texts');
const yt = require('./lib/youtube');
const { updateReport } = require('./lib/report');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const STATE = path.join(ROOT, 'data', 'state.json');
const S = JSON.parse(fs.readFileSync(process.env.SETTINGS_FILE || path.join(ROOT, 'config', 'settings.json'), 'utf8'));
const DRY = !!process.env.DRY_RUN;
const mode = process.argv[2];

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
const log = (...a) => console.log('•', ...a);

// Turkey has no daylight saving time: Istanbul is always UTC+3.
const TZ = 3;
const istanbulDate = (d = new Date()) => new Date(d.getTime() + TZ * 3600e3).toISOString().slice(0, 10);
function publishAt(hhmm) {
  if (!S.scheduledPublish || !hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const t = new Date(`${istanbulDate()}T00:00:00Z`).getTime() + ((h - TZ) * 60 + m) * 60e3;
  return t - Date.now() > 3 * 60e3 ? new Date(t).toISOString() : null;
}
const engineCfg = () => ({ mode: S.thresholdMode || 'auto', pct: S.thresholdPercent });

function summary(lines) {
  console.log('\n' + lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

async function upload(file, meta, thumb) {
  if (DRY) { log(`[deneme] yüklenmedi: ${meta.title}`); return null; }
  const id = await yt.uploadVideo(file, meta);
  log(`yüklendi: ${meta.title} → ${id}${meta.publishAt ? ` (yayın: ${meta.publishAt})` : ''}`);
  if (thumb) {
    try { await yt.setThumbnail(id, thumb); log('küçük resim eklendi'); }
    catch (e) { console.warn(`Küçük resim eklenemedi (kanalın telefonla doğrulanmış olması gerekir): ${e.message}`); }
  }
  try {
    const v = await yt.videoInfo(id);
    if (v && !meta.publishAt && meta.privacy === 'public' && v.status.privacyStatus !== 'public')
      console.warn('UYARI: Video herkese açık istendi ama özel kaldı. Google Cloud projesi henüz YouTube API denetiminden geçmemiş olabilir (README: "API denetimi").');
  } catch {}
  return id;
}

async function sabah() {
  const date = istanbulDate();
  if (state.today && state.today.date === date && state.today.pollId) { log('Bugünün oylama Shorts\'u zaten yüklenmiş, çıkılıyor.'); return; }
  const pair = state.next || pickPair(state.history, S);
  log(`Bugünün maçı: ${texts.names.n(pair.a)} vs ${texts.names.n(pair.b)}`);
  fs.mkdirSync(OUT, { recursive: true });
  const r = await Renderer.open();
  const file = path.join(OUT, 'sabah_oylama.mp4');
  try { await r.poll(pair, engineCfg(), file, Number(date.replace(/-/g, ''))); } finally { await r.close(); }
  log('oylama Shorts\'u hazır');
  const meta = { ...texts.poll(pair, S), tags: [...S.tags, texts.names.n(pair.a), texts.names.n(pair.b)], categoryId: S.categoryId, privacy: S.privacy, publishAt: publishAt(S.pollPublishTime) };
  const pollId = await upload(file, meta);
  state.today = { date, a: pair.a, b: pair.b, pollId };
  state.next = null;
  save();
  summary([`### Sabah · ${date}`, `Maç: **${texts.names.n(pair.a)} vs ${texts.names.n(pair.b)}**`, pollId ? `Oylama Shorts'u: https://youtube.com/shorts/${pollId}` : '_Deneme modu: yükleme yapılmadı, video "out" çıktısında._']);
}

async function aksam() {
  const date = istanbulDate();
  if (!state.today) {
    const pair = state.next || pickPair(state.history, S);
    console.warn('Bugün için oylama kaydı yok (sabah işi çalışmamış). Maç oylamasız oynanacak.');
    state.today = { date, a: pair.a, b: pair.b, pollId: null };
  }
  const t = state.today, pair = { a: t.a, b: t.b };

  let votes = { a: 0, b: 0, voters: 0, comments: 0 };
  if (DRY) votes = { a: 120 + Math.floor(Math.random() * 500), b: 60 + Math.floor(Math.random() * 400) };
  else if (t.pollId) {
    const [owner, comments] = await Promise.all([yt.myChannelId().catch(() => null), yt.listComments(t.pollId)]);
    votes = countVotes(comments, pair.a, pair.b, owner);
  }
  log(`Oylar: ${texts.names.n(pair.a)} ${votes.a} · ${texts.names.n(pair.b)} ${votes.b} (yorum: ${votes.comments ?? '-'})`);

  const next = pickPair(state.history.concat([{ a: pair.a, b: pair.b }]), S, [pair.a, pair.b]);
  const base = { a: pair.a, b: pair.b, ca: votes.a, cb: votes.b, rounds: S.rounds, arena: 'random', ...engineCfg() };
  const dayNum = Number(date.replace(/-/g, ''));
  const seeds = Array.from({ length: S.seedCandidates }, (_, i) => (dayNum % 100000) * 50 + i + 1);

  fs.mkdirSync(OUT, { recursive: true });
  const longFile = path.join(OUT, 'aksam_mac.mp4'), hlFile = path.join(OUT, 'aksam_ozet.mp4'), thumb = path.join(OUT, 'kapak.jpg');
  const r = await Renderer.open();
  let result;
  try {
    const best = await r.pickSeed(base, seeds, S.targetSeconds);
    log(`maç kodu ${best.seed} seçildi (tahmini ${Math.round(best.secs)} sn, skor ${best.wins.join('-')})`);
    const match = { ...base, seed: best.seed };
    await r.still(match, null, 'thumb', { thumbTop: 'KİM KAZANIR?' }, thumb, '1280:720');
    result = await r.match(match, longFile);
    log(`uzun video hazır (${Math.round(result.seconds)} sn)`);
    const hook = { text: `${texts.names.up(pair.a)} vs ${texts.names.up(pair.b)}`, sub: 'KİM KAZANDI?' };
    await r.highlight(match, result.events, next, hook, hlFile);
    log('öne çıkanlar Shorts\'u hazır');
  } finally { await r.close(); }

  const winner = result.winner === 0 ? pair.a : pair.b;
  const tags = [...S.tags, texts.names.n(pair.a), texts.names.n(pair.b)];
  const longId = await upload(longFile, { ...texts.match(pair, votes, next, t.pollId), tags, categoryId: S.categoryId, privacy: S.privacy, publishAt: publishAt(S.matchPublishTime) }, thumb);
  const hlId = await upload(hlFile, { ...texts.highlight(pair, longId, next), tags, categoryId: S.categoryId, privacy: S.privacy, publishAt: publishAt(S.highlightPublishTime) });
  if (!DRY && t.pollId && longId) {
    try { await yt.updateDescription(t.pollId, d => d + texts.pollResult(longId, winner, votes, pair)); log('oylama Shorts\'unun açıklamasına sonuç eklendi'); }
    catch (e) { console.warn(`Oylama açıklaması güncellenemedi: ${e.message}`); }
  }

  state.history.push({ date, a: pair.a, b: pair.b, votesA: votes.a, votesB: votes.b, winner, score: result.wins.join('-'), pollId: t.pollId, longId, highlightId: hlId });
  state.today = null;
  state.next = next;
  save();
  summary([
    `### Akşam · ${date}`,
    `**${texts.names.n(pair.a)} ${result.wins[0]} - ${result.wins[1]} ${texts.names.n(pair.b)}** · kazanan: **${texts.names.n(winner)}**`,
    `Oylar: ${votes.a} - ${votes.b}`,
    longId ? `Maç: https://youtu.be/${longId}` : '_Deneme modu: yükleme yapılmadı, videolar "out" çıktısında._',
    hlId ? `Öne çıkanlar: https://youtube.com/shorts/${hlId}` : '',
    `Yarınki maç: ${texts.names.n(next.a)} vs ${texts.names.n(next.b)}`,
    longId && t.pollId ? '\nHatırlatma: Studio\'da oylama Shorts\'una "İlgili video" olarak maç videosunu bağla (API bu ayarı desteklemiyor).' : '',
  ]);
}

async function rapor() {
  if (DRY) { log('[deneme] rapor atlandı'); return; }
  const r = await updateReport(state, yt, istanbulDate());
  if (!r) { log('Henüz raporlanacak video yok.'); return; }
  summary([`### Rapor · ${istanbulDate()}`, `${r.videos} videonun verisi güncellendi${r.analytics ? ' (izlenme süreleriyle birlikte)' : ''}. Ayrıntılar: data/rapor.md`]);
}

(async () => {
  if (!DRY && mode !== 'rapor' && !process.env.YT_REFRESH_TOKEN) {
    summary(['### İş atlandı', 'YouTube anahtarları (GitHub Secrets) henüz eklenmemiş. README\'deki kurulum adımlarını tamamlayınca iş kendiliğinden çalışmaya başlar.']);
    return;
  }
  if (mode === 'sabah') await sabah();
  else if (mode === 'aksam') await aksam();
  else if (mode === 'rapor') await rapor();
  else { console.error('Kullanım: node scripts/daily.js sabah|aksam|rapor'); process.exit(2); }
})().catch(e => { console.error('\nHATA:', e.message); process.exit(1); });
