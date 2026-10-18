// Minimal YouTube Data API v3 client (plain fetch, no extra packages).
const fs = require('fs');

const TOKEN_URL = process.env.YT_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const API = process.env.YT_API_BASE || 'https://www.googleapis.com/youtube/v3';
const UPLOAD = process.env.YT_UPLOAD_BASE || 'https://www.googleapis.com/upload/youtube/v3';
const ANALYTICS = process.env.YT_ANALYTICS_BASE || 'https://youtubeanalytics.googleapis.com/v2';

let cached = null;
async function token() {
  if (cached && cached.exp > Date.now() + 60e3) return cached.value;
  const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) throw new Error('YouTube anahtarları eksik: YT_CLIENT_ID, YT_CLIENT_SECRET ve YT_REFRESH_TOKEN GitHub Secrets içinde tanımlı olmalı.');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google oturumu yenilenemedi (${res.status}): ${j.error_description || j.error || 'bilinmeyen hata'}. Yenileme anahtarının süresi dolmuş olabilir, README'deki "Yenileme anahtarı" adımını tekrarla.`);
  cached = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.value;
}

async function call(method, url, { json, body, headers = {}, expect = 'json' } = {}, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    const h = { Authorization: `Bearer ${await token()}`, ...headers };
    if (json !== undefined) h['Content-Type'] = 'application/json; charset=UTF-8';
    const res = await fetch(url, { method, headers: h, body: json !== undefined ? JSON.stringify(json) : body });
    if (res.ok) return expect === 'json' ? (res.status === 204 ? {} : res.json()) : res;
    const text = await res.text();
    if (res.status >= 500 && attempt < tries) { await new Promise(r => setTimeout(r, 3000 * attempt)); continue; }
    let reason = text;
    try { const e = JSON.parse(text).error; reason = `${e.message}${e.errors?.[0]?.reason ? ` [${e.errors[0].reason}]` : ''}`; } catch {}
    throw new Error(`YouTube isteği başarısız (${method} ${url.split('?')[0]} → ${res.status}): ${reason}`);
  }
}

/** Uploads a video with the resumable protocol. Returns the new video id. */
async function uploadVideo(file, meta) {
  const size = fs.statSync(file).size;
  const status = { privacyStatus: meta.privacy || 'public', selfDeclaredMadeForKids: false, embeddable: true };
  if (meta.publishAt) { status.privacyStatus = 'private'; status.publishAt = meta.publishAt; }
  const snippet = { title: meta.title.slice(0, 100), description: meta.description.slice(0, 4900), tags: meta.tags || [], categoryId: meta.categoryId || '20', defaultLanguage: 'tr', defaultAudioLanguage: 'tr' };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const init = await call('POST', `${UPLOAD}/videos?uploadType=resumable&part=snippet,status`, {
        json: { snippet, status }, expect: 'raw',
        headers: { 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) },
      });
      const location = init.headers.get('location');
      if (!location) throw new Error('YouTube yükleme adresi vermedi.');
      const res = await call('PUT', location, { body: fs.readFileSync(file), headers: { 'Content-Type': 'video/mp4' } }, 1);
      if (!res.id) throw new Error('YouTube video kimliği döndürmedi.');
      return res.id;
    } catch (e) {
      if (attempt === 3 || /\b4\d\d\b/.test(e.message)) throw e;
      console.warn(`Yükleme denemesi ${attempt} başarısız, tekrar deneniyor: ${e.message}`);
      await new Promise(r => setTimeout(r, 10000 * attempt));
    }
  }
}

async function setThumbnail(videoId, jpg) {
  const data = fs.readFileSync(jpg);
  return call('POST', `${UPLOAD}/thumbnails/set?videoId=${videoId}&uploadType=media`, { body: data, headers: { 'Content-Type': 'image/jpeg' } });
}

async function myChannelId() {
  const j = await call('GET', `${API}/channels?part=id&mine=true`);
  return j.items?.[0]?.id || null;
}

/** All top-level comments of a video as [{author, text, publishedAt}]. */
async function listComments(videoId, max = 20000) {
  const out = [];
  let page = '';
  do {
    const j = await call('GET', `${API}/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&textFormat=plainText&order=time${page ? `&pageToken=${page}` : ''}`);
    for (const it of j.items || []) {
      const s = it.snippet.topLevelComment.snippet;
      out.push({ author: s.authorChannelId?.value || s.authorDisplayName, text: s.textOriginal || s.textDisplay || '', publishedAt: s.publishedAt });
    }
    page = j.nextPageToken || '';
  } while (page && out.length < max);
  return out;
}

async function videoInfo(videoId) {
  const j = await call('GET', `${API}/videos?part=snippet,status&id=${videoId}`);
  return j.items?.[0] || null;
}

/** Rewrites a video's description with fn(oldDescription). */
async function updateDescription(videoId, fn) {
  const v = await videoInfo(videoId);
  if (!v) throw new Error(`Video bulunamadı: ${videoId}`);
  const { title, description, tags, categoryId, defaultLanguage } = v.snippet;
  return call('PUT', `${API}/videos?part=snippet`, { json: { id: videoId, snippet: { title, description: fn(description || ''), tags, categoryId, defaultLanguage } } });
}

/** Public counters for many videos: {id: {views, likes, comments, title, publishedAt}} */
async function videoStats(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await call('GET', `${API}/videos?part=statistics,snippet&id=${ids.slice(i, i + 50).join(',')}`);
    for (const v of j.items || []) out[v.id] = { views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0, comments: +v.statistics.commentCount || 0, title: v.snippet.title, publishedAt: v.snippet.publishedAt };
  }
  return out;
}

/** Watch-time metrics from the YouTube Analytics API (needs the yt-analytics.readonly scope). */
async function videoAnalytics(ids, startDate, endDate) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const q = new URLSearchParams({ ids: 'channel==MINE', startDate, endDate, metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained', dimensions: 'video', filters: `video==${ids.slice(i, i + 50).join(',')}`, maxResults: '200' });
    const j = await call('GET', `${ANALYTICS}/reports?${q}`);
    for (const [id, views, minutes, avgSec, avgPct, subs] of j.rows || []) out[id] = { watchMinutes: minutes, avgViewSec: avgSec, avgViewPct: avgPct, subsGained: subs };
  }
  return out;
}

module.exports = { uploadVideo, setThumbnail, myChannelId, listComments, videoInfo, updateDescription, videoStats, videoAnalytics };
