#!/usr/bin/env node
/**
 * Polls the web (4200) and api (4201) dev servers and prints a sentinel
 * line once both respond. `web:serve-all` uses that sentinel as its
 * `readyWhen` marker so dependent tasks (the Playwright e2e executor)
 * know when to start. Matching on server log output is too fragile —
 * vite writes its banner with ANSI codes spliced mid-word, which is why
 * the previous marker ("No errors found.", a webpack-era message) never
 * matched and e2e runs hung until the CI timeout.
 */
import { request } from 'node:https';

const targets = [
  { name: 'web', url: 'https://localhost:4200/' },
  { name: 'api', url: 'https://localhost:4201/api/health' },
];
const timeoutMs = Number(process.env.DEV_SERVER_WAIT_TIMEOUT_MS || 600_000);
const intervalMs = 2_000;
const startedAt = Date.now();

function probe(url) {
  return new Promise((resolvePromise) => {
    const req = request(
      url,
      { method: 'GET', rejectUnauthorized: false, timeout: 5_000 },
      (res) => {
        res.resume();
        resolvePromise(res.statusCode !== undefined && res.statusCode < 500);
      },
    );
    req.on('error', () => resolvePromise(false));
    req.on('timeout', () => {
      req.destroy();
      resolvePromise(false);
    });
    req.end();
  });
}

const pending = new Set(targets.map((target) => target.name));
for (;;) {
  for (const target of targets) {
    if (!pending.has(target.name)) continue;
    if (await probe(target.url)) {
      pending.delete(target.name);
      console.log(`${target.name} dev server is up at ${target.url}`);
    }
  }
  if (pending.size === 0) break;
  if (Date.now() - startedAt > timeoutMs) {
    console.error(
      `Timed out waiting for dev servers: ${[...pending].join(', ')}`,
    );
    process.exit(1);
  }
  await new Promise((resolveSleep) => setTimeout(resolveSleep, intervalMs));
}

console.log('DEV_SERVERS_READY');
