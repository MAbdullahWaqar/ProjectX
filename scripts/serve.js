/*
 * Minimal static server for the RealDoor demo with security headers.
 * The CSP mirrors the <meta> tag in index.html; everything is same-origin,
 * so the "no network calls at runtime" property is enforced, not just claimed.
 * Run: npm start
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2'
};

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

http.createServer(function (req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.readFile(file, function (err, body) {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'cross-origin-opener-policy': 'same-origin',
      'cache-control': 'no-store'
    });
    res.end(body);
  });
}).listen(PORT, function () { console.log('RealDoor running at http://localhost:' + PORT); });
