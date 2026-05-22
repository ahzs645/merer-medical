#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('dist/apps/web');
const port = Number(process.env.PORT || 4300);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function sendJson(res, body) {
  res.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalized = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const candidate = resolve(join(root, normalized));
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }
  return candidate;
}

function serveFile(res, filePath) {
  const type = contentTypes.get(extname(filePath)) || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/v1/instance-config') {
    sendJson(res, {});
    return;
  }

  const staticPath = resolveStaticPath(url.pathname);
  if (staticPath && existsSync(staticPath) && statSync(staticPath).isFile()) {
    serveFile(res, staticPath);
    return;
  }

  const indexPath = join(root, 'index.html');
  if (existsSync(indexPath)) {
    serveFile(res, indexPath);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(`Build output not found at ${root}. Run: npm exec nx -- build web\n`);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root}`);
  console.log(`Local web app: http://127.0.0.1:${port}`);
});
