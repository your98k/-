#!/usr/bin/env node
/* 只用 Node 标准库，在与 Pages 一致的项目路径预览 _site/。 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '_site');
const BASE = '/k12-question-bank/';
const port = Number(process.env.PORT || process.argv[2] || 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'
};
if (!fs.existsSync(path.join(ROOT, 'build-info.js'))) {
  console.error('请先运行 npm run build');
  process.exit(1);
}
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { res.writeHead(400).end(); return; }
  if (pathname === '/' || pathname === BASE.slice(0, -1)) {
    res.writeHead(302, { Location: BASE }).end();
    return;
  }
  if (!pathname.startsWith(BASE)) { res.writeHead(404).end(); return; }
  const file = path.resolve(ROOT, pathname.slice(BASE.length) || 'index.html');
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
});
server.listen(port, '127.0.0.1', () => {
  console.log(`预览：http://127.0.0.1:${server.address().port}${BASE}`);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
