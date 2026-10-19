// Renders the game (index.html) frame by frame in headless Chromium and encodes MP4s with ffmpeg.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TRACKS = ['muzik1_kolezyum', 'muzik2_volkan', 'muzik3_kiraz', 'muzik4_son_round', 'muzik5_sampiyon'];
const track = i => path.join(ROOT, 'music', TRACKS[((i % TRACKS.length) + TRACKS.length) % TRACKS.length] + '.mp3');
const VERTICAL = { w: 1080, h: 1920 };

function encoder(file, crf = 20) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', file]);
  ff.stderr.on('data', d => process.stderr.write(d));
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error(`ffmpeg ${c} koduyla çıktı`))));
  return {
    async write(frames) { for (const s of frames) if (!ff.stdin.write(Buffer.from(s, 'base64'))) await new Promise(r => ff.stdin.once('drain', r)); },
    async end() { ff.stdin.end(); await done; },
  };
}

/** Synthesises the sound effects from the event list and mixes them with a music track. */
function finishAudio(silentVideo, events, duration, music, out) {
  const base = out.replace(/\.mp4$/, '');
  fs.writeFileSync(base + '.events.json', JSON.stringify({ duration, events }));
  execFileSync('python3', [path.join(ROOT, 'scripts', 'synth.py'), base + '.events.json', base + '.sfx.wav']);
  const fc = `[2:a]volume=0.32,afade=t=in:d=1,afade=t=out:st=${Math.max(0, duration - 2.5)}:d=2.5[m];[1:a][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silentVideo, '-i', base + '.sfx.wav', '-stream_loop', '-1', '-i', music,
    '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart', out]);
  for (const f of [base + '.events.json', base + '.sfx.wav', silentVideo]) fs.rmSync(f, { force: true });
}

class Renderer {
  static async open() {
    const r = new Renderer();
    r.browser = await chromium.launch();
    r.page = await r.browser.newPage({ viewport: { width: 900, height: 700 } });
    r.page.on('pageerror', e => console.error('[oyun hatası]', e.message));
    await r.page.route('**/*', q => q.request().url().startsWith('file:') ? q.continue() : q.abort());
    await r.page.addInitScript(() => { window.__RENDER__ = true; });
    await r.page.goto('file://' + path.join(ROOT, 'index.html'));
    const font = 'file://' + path.join(ROOT, 'fonts', 'Poppins-Bold.ttf');
    await r.page.addStyleTag({ content: `@font-face{font-family:'Lilita One';src:url('${font}');}` });
    await r.page.evaluate(() => document.fonts.load('40px "Lilita One"'));
    return r;
  }
  close() { return this.browser.close(); }

  grab(n) { return this.page.evaluate(n => { const a = []; for (let i = 0; i < n; i++) { BA.tick(2); a.push(BA.frame(0.9).slice(23)); } return a; }, n); }

  /** Plays matches without drawing and returns the most watchable seed. */
  async pickSeed(match, seeds, [minS, maxS]) {
    const results = await this.page.evaluate(([m, seeds]) => seeds.map(seed => {
      BA.setup({ ...m, seed }); BA.begin('intro');
      let n = 0; const G = BA.G;
      while (G.state !== 'matchEnd' && n < 60 * 60 * 9) { BA.tick(1); n++; }
      const ev = {}; G.events.forEach(([, e]) => ev[e] = (ev[e] || 0) + 1);
      return { seed, secs: n / 60 + 8, wins: G.fighters.map(f => f.wins), ev };
    }), [match, seeds]);
    const need = Math.ceil(match.rounds / 2);
    const score = r => {
      const played = r.wins[0] + r.wins[1];
      let s = played === match.rounds ? 4 : played === match.rounds - 1 ? 2 : 0;
      s -= r.secs < minS ? (minS - r.secs) / 15 : r.secs > maxS ? (r.secs - maxS) / 15 : 0;
      for (const k of ['clash', 'parry', 'slam', 'super', 'break', 'rage']) s += Math.min(3, r.ev[k] || 0) * 0.3;
      return Math.max(...r.wins) === need ? s : s - 10;
    };
    results.sort((x, y) => score(y) - score(x));
    return results[0];
  }

  async still(match, view, state, extra, out, scale) {
    await this.page.evaluate(([m, v, s, e]) => { BA.setup(m, v); BA.begin(s, e); BA.tick(40); }, [match, view, state, extra]);
    const b64 = await this.page.evaluate(() => BA.frame(0.95).slice(23));
    const tmp = out + '.tmp.jpg';
    fs.writeFileSync(tmp, Buffer.from(b64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', `scale=${scale}:flags=lanczos`, '-q:v', '2', out]);
    fs.rmSync(tmp);
  }

  /** Morning Short: matchup announcement and the power table (10 s, vertical). */
  async poll(pair, cfg, out, musicIndex) {
    const tmp = out + '.silent.mp4', enc = encoder(tmp);
    await this.page.evaluate(([p, c, day]) => {
      BA.setup({ a: p.a, b: p.b, format: 'v', arena: ['colosseum', 'volcano', 'garden'][day % 3], seed: 5, mode: c.mode, pct: c.pct });
      BA.begin('poll', { pollWhen: 'BU AKŞAM DÖVÜŞÜYORLAR' });
    }, [pair, cfg, musicIndex]);
    const frames = 30 * 10;
    for (let i = 0; i < frames; i += 15) await enc.write(await this.grab(15));
    await enc.end();
    const ev = await this.page.evaluate(() => BA.G.events.map(([t, n]) => [(t - 2) / 60, n]));
    finishAudio(tmp, ev, frames / 30, track(musicIndex), out);
  }

  /** Evening long video (16:9). Returns the event log and the result. */
  async match(match, out) {
    const tmp = out + '.silent.mp4', enc = encoder(tmp);
    await this.page.evaluate(m => { BA.setup(m); BA.begin('intro'); }, match);
    let frames = 0;
    for (;;) {
      await enc.write(await this.grab(15)); frames += 15;
      const [st, t] = await this.page.evaluate(() => [BA.G.state, BA.G.stateT]);
      if (st === 'matchEnd' && t > 7500) break;
      if (frames % 1800 === 0) console.log(`  uzun video: ${frames / 30} sn işlendi`);
    }
    await enc.end();
    const res = await this.page.evaluate(() => ({ events: BA.G.events, wins: BA.G.fighters.map(f => f.wins), winner: BA.G.winner.side }));
    finishAudio(tmp, res.events.map(([t, n]) => [(t - 2) / 60, n]), frames / 30, track(match.seed), out);
    return { ...res, seconds: frames / 30 };
  }

  /** Evening highlight Short: three key moments plus an end card (vertical). */
  async highlight(match, events, next, hook, out) {
    const at = n => events.filter(e => e[1] === n).map(e => e[0]);
    const kos = at('ko'), win = at('win')[0] ?? events[events.length - 1][0];
    const finalT = kos.length && kos[kos.length - 1] > win - 60 * 8 ? kos[kos.length - 1] : win - 270;
    const early = t => t < finalT - 60 * 16;
    const m1 = at('clash').filter(early).pop() ?? at('parry').filter(early).pop() ?? at('heavy').filter(early).pop();
    const mid = t => t < finalT - 60 * 9 && (m1 === undefined || t > m1 + 60 * 6);
    const m2 = at('super').filter(mid).pop() ?? at('slam').filter(mid).pop() ?? at('break').filter(mid).pop();
    const wins = [];
    if (m1 !== undefined) wins.push([m1 - 120, m1 + 120]);
    if (m2 !== undefined) wins.push([m2 - 30, m2 + 210]);
    wins.push([finalT - 150, finalT + 360]);
    const evenW = wins.map(([a, b]) => [Math.max(0, a - (a % 2)), b - (b % 2)]);

    const tmp = out + '.silent.mp4', enc = encoder(tmp);
    await this.page.evaluate(([m, v]) => { BA.setup(m, v); BA.begin('intro'); }, [match, VERTICAL]);
    const audio = []; let outT = 0;
    for (let w = 0; w < evenW.length; w++) {
      const [a, b] = evenW[w];
      await this.page.evaluate(a => { const G = BA.G; while (G.tk < a) BA.tick(1); }, a);
      if (w === 0) await this.page.evaluate(h => { BA.G.hook = { text: h.text, sub: h.sub, t: 0, dur: 2600 }; }, hook);
      const n = (b - a) / 2;
      for (let i = 0; i < n; i += 15) await enc.write(await this.grab(Math.min(15, n - i)));
      const evs = await this.page.evaluate(([a, b]) => BA.G.events.filter(e => e[0] > a && e[0] <= b), [a, b]);
      evs.forEach(([t, nm]) => audio.push([outT + (t - a - 2) / 60, nm]));
      outT += n / 30;
    }
    await this.page.evaluate(([m, v, nx]) => { BA.setup({ ...m, arena: 'colosseum' }, v); BA.begin('card', { cardNext: nx }); }, [match, VERTICAL, next ? [next.a, next.b] : null]);
    const card = 30 * 5;
    for (let i = 0; i < card; i += 15) await enc.write(await this.grab(15));
    audio.push([outT + 0.05, 'go']); audio.push([outT + 1.35, 'beep']); audio.push([outT + 2.35, 'beep']);
    outT += card / 30;
    await enc.end();
    finishAudio(tmp, audio, outT, track(match.seed + 3), out);
    return outT;
  }
}

module.exports = { Renderer };
