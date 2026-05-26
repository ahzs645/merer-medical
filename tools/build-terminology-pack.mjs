#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header = [], ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] || ''])),
  );
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const input = arg('input');
const output = arg('output');
const profile = arg('profile') || 'canada';
const domain = arg('domain');
const system = arg('system');
const source = arg('source') || basename(input || 'terminology');
const sourceUrl = arg('source-url') || '';
const sourceVersion = arg('source-version') || 'unknown';
const license = arg('license') || 'Verify source license before distribution.';
const codeColumn = arg('code-column') || 'code';
const displayEnColumn = arg('display-en-column') || 'displayEn';
const displayFrColumn = arg('display-fr-column');

if (!input || !output || !domain || !system) {
  console.error(
    'Usage: node tools/build-terminology-pack.mjs --input in.csv --output pack.json --profile canada --domain lab --system http://loinc.org --code-column LOINC_NUM --display-en-column LONG_COMMON_NAME',
  );
  process.exit(1);
}

const sourceText = readFileSync(input, 'utf8');
const checksum = createHash('sha256').update(sourceText).digest('hex');
const rows = parseCsv(sourceText);
const packId = `term_pack_${profile}_${domain}_${sourceVersion}`.replace(
  /[^a-zA-Z0-9_-]/g,
  '_',
);
const now = Date.now();

const entries = rows
  .map((row, index) => {
    const code = row[codeColumn]?.trim();
    const displayEn = row[displayEnColumn]?.trim();
    const displayFr = displayFrColumn ? row[displayFrColumn]?.trim() : '';
    if (!code || !displayEn) return null;
    return {
      id: `${packId}_${index}_${code}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      createdAt: now,
      updatedAt: now,
      packId,
      profile,
      domain,
      system,
      code,
      displayEn,
      displayFr: displayFr || undefined,
      source,
      sourceVersion,
      license,
      active: true,
    };
  })
  .filter(Boolean);

const pack = {
  pack: {
    id: packId,
    createdAt: now,
    updatedAt: now,
    profile,
    name: `${source} ${domain}`,
    source,
    sourceUrl,
    sourceVersion,
    license,
    languageCoverage: displayFrColumn ? ['en', 'fr'] : ['en'],
    importedAt: now,
    checksum,
  },
  entries,
};

writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`);
