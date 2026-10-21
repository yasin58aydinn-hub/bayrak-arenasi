// Fake YouTube/Google endpoints for local end-to-end tests: node tests/mock-youtube.js 9911
const http = require('http');
const fs = require('fs');
const port = +process.argv[2] || 9911, base = `http://localhost:${port}`;
const videos = {}, log = [];
let n = 0;
const comments = [
  ['OWNER', 'Hangisi kazanır? Yorumla!'], ['u1', 'Türkiye 🇹🇷'], ['u2', 'Rusya'], ['u1', 'TÜRKİYE TÜRKİYE'], ['u3', 'turkiye kazanır'],
  ['u4', 'russia'], ['u5', 'harika video'], ['u6', '🇹🇷🇹🇷'], ['u7', 'Rusya değil Türkiye'], ['u8', 'Türkiye'],
];
const body = req => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, base), b = await body(req);
  const auth = req.headers.authorization || '';
  log.push(`${req.method} ${u.pathname}${u.search} ${b.length}b`);
  const json = (o, code = 200, h = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/token') {
    const f = new URLSearchParams(b.toString());
    return f.get('refresh_token') === 'RT' ? json({ access_token: 'AT', expires_in: 3600 }) : json({ error: 'invalid_grant' }, 400);
  }
  if (auth !== 'Bearer AT') return json({ error: { message: 'bad auth' } }, 401);
  if (u.pathname === '/upload/videos' && req.method === 'POST') {
    const meta = JSON.parse(b.toString()); const id = 'VID' + (++n);
    videos[id] = { meta, size: 0, declared: +req.headers['x-upload-content-length'] };
    return json({}, 200, { Location: `${base}/session/${id}` });
  }
  if (u.pathname.startsWith('/session/') && req.method === 'PUT') {
    const id = u.pathname.split('/').pop(); videos[id].size = b.length;
    return json({ id, status: videos[id].meta.status });
  }
  if (u.pathname === '/upload/thumbnails/set') { videos[u.searchParams.get('videoId')].thumb = b.length; return json({}); }
  if (u.pathname === '/api/channels') return json({ items: [{ id: 'OWNER' }] });
  if (u.pathname === '/api/commentThreads' && req.method === 'POST') {
    const m = JSON.parse(b.toString()), v = videos[m.snippet.videoId];
    if (v) (v.seeded = v.seeded || []).push(m.snippet.topLevelComment.snippet.textOriginal);
    else (videos.external = videos.external || []).push([m.snippet.videoId, m.snippet.topLevelComment.snippet.textOriginal]);
    return json({ id: 'CMT' + (++n), snippet: m.snippet });
  }
  if (u.pathname === '/api/commentThreads') {
    const page = u.searchParams.get('pageToken') ? 1 : 0, slice = comments.slice(page * 5, page * 5 + 5);
    return json({ items: slice.map(([a, t], i) => ({ snippet: { topLevelComment: { snippet: { authorChannelId: { value: a }, textOriginal: t, publishedAt: `2026-10-19T08:0${page * 5 + i}:00Z` } } } })), nextPageToken: page ? undefined : 'P2' });
  }
  if (u.pathname === '/api/videos' && req.method === 'GET' && u.searchParams.get('part').includes('statistics')) {
    return json({ items: u.searchParams.get('id').split(',').map((id, i) => ({ id, statistics: { viewCount: String(1000 * (i + 1)), likeCount: String(40 * (i + 1)), commentCount: String(12 * (i + 1)) }, snippet: { title: 'Video ' + id, publishedAt: '2026-10-18T07:00:00Z' } })) });
  }
  if (u.pathname === '/analytics/reports') {
    const ids = u.searchParams.get('filters').replace('video==', '').split(',');
    return json({ rows: ids.map((id, i) => [id, 1000 * (i + 1), 300 + i, 45 + i, 62.5 - i * 3, i]) });
  }
  if (u.pathname === '/api/videos' && req.method === 'GET') {
    const v = videos[u.searchParams.get('id')];
    return json({ items: v ? [{ id: u.searchParams.get('id'), snippet: { ...v.meta.snippet, description: v.desc ?? v.meta.snippet.description }, status: v.meta.status }] : [] });
  }
  if (u.pathname === '/api/videos' && req.method === 'PUT') {
    const m = JSON.parse(b.toString()); videos[m.id].desc = m.snippet.description; return json(m);
  }
  json({ error: { message: 'unknown ' + u.pathname } }, 404);
}).listen(port, () => console.log('mock listening', port));
process.on('SIGTERM', () => { fs.writeFileSync(process.env.MOCK_REPORT || 'mock-report.json', JSON.stringify({ videos, log }, null, 2)); process.exit(0); });
