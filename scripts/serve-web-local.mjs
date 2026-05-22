#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('dist/apps/web');
const port = Number(process.env.PORT || 4300);
const basePath = normalizeBasePath(process.env.BASE_PATH || '/');

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

function normalizeBasePath(value) {
  if (!value || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

function stripBasePath(pathname) {
  if (basePath === '/') return pathname;
  if (pathname === basePath.slice(0, -1)) return '/';
  if (pathname.startsWith(basePath)) return `/${pathname.slice(basePath.length)}`;
  return null;
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
  const appPath = stripBasePath(url.pathname);

  if (appPath === null) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Not found under base path ${basePath}\n`);
    return;
  }

  if (appPath === '/api/v1/instance-config') {
    sendJson(res, {});
    return;
  }

  const staticPath = resolveStaticPath(appPath);
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
  console.log(`Base path: ${basePath}`);
  console.log(`Local web app: http://127.0.0.1:${port}${basePath}`);
});
