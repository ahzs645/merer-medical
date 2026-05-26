#!/usr/bin/env node

import { createGzip } from 'node:zlib';
import { createWriteStream, promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const outDir = join(repoRoot, 'data', 'terminology-snapshots');
const tmpDir = join(repoRoot, '.tmp', 'terminology-snapshots');

const ccddFiles = [
  ['mp', 'https://health-products.canada.ca/ccdd/mp'],
  ['ntp', 'https://health-products.canada.ca/ccdd/ntp'],
  ['tm', 'https://health-products.canada.ca/ccdd/tm'],
  [
    'mp_ntp_tm_relationship_en',
    'https://health-products.canada.ca/ccdd/mp_ntp_tm_relationship_en',
  ],
  [
    'mp_ntp_tm_relationship_fr',
    'https://health-products.canada.ca/ccdd/mp_ntp_tm_relationship_fr',
  ],
  [
    'special_groupings',
    'https://health-products.canada.ca/ccdd/special_groupings',
  ],
  ['coded_attribute', 'https://health-products.canada.ca/ccdd/coded_attribute'],
  ['device_ntp', 'https://health-products.canada.ca/ccdd/device-ntp'],
];

const snapshots = {
  ccdd: {
    file: 'ccdd-main-20260505.csv.gz',
    source:
      'https://open.canada.ca/data/en/dataset/3e0a7b9e-a5e9-4131-bde4-ac685a1f1a38',
    license: 'Open Government Licence - Canada',
  },
  cdcCvx: {
    file: 'cdc-cvx-20260526.html.gz',
    source:
      'https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx',
    license: 'US government public health code set',
  },
  dpd: {
    file: 'health-canada-dpd-marketed-allfiles-20260504.zip',
    source:
      'https://www.canada.ca/content/dam/hc-sc/documents/services/drug-product-database/allfiles.zip',
    license: 'Health Canada DPD terms and conditions',
  },
  hl7Encounter: {
    file: 'hl7-terminology-r4-7.0.1-encounter-subset.tgz',
    source: 'https://packages.simplifier.net/hl7.terminology.r4/7.0.1',
    license: 'HL7 FHIR license terms',
  },
};

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status} ${url}`);
  }
  await pipeline(response.body, createWriteStream(path));
}

async function gzipUrl(url, path) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status} ${url}`);
  }
  await pipeline(response.body, createGzip({ level: 9 }), createWriteStream(path));
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function byteSize(path) {
  return (await fs.stat(path)).size;
}

async function fetchCcdd() {
  const rawDir = join(tmpDir, 'ccdd');
  await fs.mkdir(rawDir, { recursive: true });
  const output = join(outDir, snapshots.ccdd.file);
  const gzip = createGzip({ level: 9 });
  const writer = createWriteStream(output);
  gzip.pipe(writer);

  let rows = 0;
  for (const [name, url] of ccddFiles) {
    const path = join(rawDir, `${name}.csv`);
    await download(url, path);
    const content = await fs.readFile(path);
    rows += content.toString('utf8').split('\n').filter(Boolean).length;
    gzip.write(`# ${name}\n`);
    gzip.write(content);
    gzip.write('\n');
  }
  gzip.end();
  await new Promise((resolveWrite, reject) => {
    writer.on('finish', resolveWrite);
    writer.on('error', reject);
  });
  return { rows, bytes: await byteSize(output) };
}

async function fetchHl7EncounterSubset() {
  const fullPackage = join(tmpDir, 'hl7.terminology.r4-7.0.1.tgz');
  const extractDir = join(tmpDir, 'hl7-r4');
  const fileList = join(tmpDir, 'hl7-encounter-files.txt');
  const output = join(outDir, snapshots.hl7Encounter.file);

  await download(snapshots.hl7Encounter.source, fullPackage);
  await fs.rm(extractDir, { force: true, recursive: true });
  await fs.mkdir(extractDir, { recursive: true });
  await run('tar', ['-xzf', fullPackage, '-C', extractDir]);
  await run('sh', [
    '-c',
    `find ${JSON.stringify(extractDir)} -type f \\( -name '*Encounter*' -o -name '*encounter*' -o -name '*v3-Act*' -o -name '*ActCode*' -o -name '*service-type*' \\) -print > ${JSON.stringify(fileList)}`,
  ]);
  await run('tar', ['-czf', output, '-T', fileList]);
  const files = (await fs.readFile(fileList, 'utf8')).split('\n').filter(Boolean);
  return { files: files.length, bytes: await byteSize(output) };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });

  const ccdd = await fetchCcdd();
  await gzipUrl(
    snapshots.cdcCvx.source,
    join(outDir, snapshots.cdcCvx.file),
  );
  await download(snapshots.dpd.source, join(outDir, snapshots.dpd.file));
  const hl7 = await fetchHl7EncounterSubset();

  const manifest = {
    generatedAt: new Date().toISOString(),
    purpose:
      'Compressed terminology source snapshots for local-first pack generation.',
    snapshots: [
      {
        id: 'ccdd-main-20260505',
        ...snapshots.ccdd,
        bytes: ccdd.bytes,
        rows: ccdd.rows,
      },
      {
        id: 'cdc-cvx-20260526',
        ...snapshots.cdcCvx,
        bytes: await byteSize(join(outDir, snapshots.cdcCvx.file)),
      },
      {
        id: 'health-canada-dpd-marketed-allfiles-20260504',
        ...snapshots.dpd,
        bytes: await byteSize(join(outDir, snapshots.dpd.file)),
      },
      {
        id: 'hl7-terminology-r4-7.0.1-encounter-subset',
        ...snapshots.hl7Encounter,
        bytes: hl7.bytes,
        files: hl7.files,
      },
    ],
  };

  await fs.writeFile(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`Wrote terminology snapshots to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

