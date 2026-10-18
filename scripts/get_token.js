#!/usr/bin/env node
// Run ONCE on your own computer to get the YouTube refresh token:
//   node scripts/get_token.js CLIENT_ID CLIENT_SECRET
// A Google sign-in page opens in your browser; sign in with the channel's account and allow access.
// The refresh token is printed at the end — paste it into GitHub Secrets as YT_REFRESH_TOKEN.
const http = require('http');
const { exec } = require('child_process');

const [clientId, clientSecret] = process.argv.slice(2);
if (!clientId || !clientSecret) {
  console.error('Kullanım: node scripts/get_token.js CLIENT_ID CLIENT_SECRET');
  process.exit(2);
}
const PORT = 8765, redirect = `http://localhost:${PORT}`;
const scope = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/yt-analytics.readonly'].join(' ');
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId, redirect_uri: redirect, response_type: 'code', scope, access_type: 'offline', prompt: 'consent',
});

http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) { res.end('Kod bulunamadı.'); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  });
  const j = await r.json();
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (j.refresh_token) {
    res.end('<h2>Tamam! Bu sekmeyi kapatıp terminale dönebilirsin.</h2>');
    console.log('\nYT_REFRESH_TOKEN (GitHub Secrets içine bunu yapıştır):\n\n' + j.refresh_token + '\n');
  } else {
    res.end('<h2>Yenileme anahtarı alınamadı, terminaldeki mesaja bak.</h2>');
    console.error('Hata:', j);
  }
  process.exit(j.refresh_token ? 0 : 1);
}).listen(PORT, () => {
  console.log('Tarayıcıda şu adresi aç (otomatik açılmazsa kopyala):\n\n' + url + '\n');
  const open = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(open, () => {});
});
