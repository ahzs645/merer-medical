#!/usr/bin/env node
/**
 * Turn a LibreView glucose export into a `.emrpkg` that merges with a
 * transposed records package.
 *
 *   node tools/build-libre-emrpkg.mjs \
 *     --source glucose_readings.csv --output libre.emrpkg \
 *     --profile-id eisa --device "FreeStyle Libre 3" [--from 2026-05-11 --to 2026-05-24]
 *
 * A CGM trace is thousands of readings, not a document, so it is not a section
 * of `records.json`: a person cannot review 3,000 rows, and there is no
 * judgement in them to review. What the app needs is the same records its own
 * FreeStyle Libre import writes — one interstitial-glucose Observation per
 * reading under a `freestyle_libre` connection — because that connection's
 * source is what the Labs page looks for when it draws the glucose chart.
 * Writing them in that shape here means a merged package charts exactly as a
 * file imported by hand would.
 *
 * Accepts the CSV LibreView exports (`timestamp,datetime,glucose_mgdl,…`) or a
 * JSON export with a `readings` array of the same fields. Only glucose values
 * and times are read; any account identifiers in a JSON export are ignored.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const GLUCOSE_LOINC_CODE = '2339-0';
const GLUCOSE_DISPLAY = 'Interstitial glucose';

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.output || !args.profileId) {
  console.error(
    'Usage: node tools/build-libre-emrpkg.mjs --source <csv|json> --output <file.emrpkg> --profile-id <id> [--device <name>] [--from YYYY-MM-DD] [--to YYYY-MM-DD]',
  );
  process.exit(1);
}

const text = readFileSync(resolve(args.source), 'utf8').trim();
let readings = args.source.toLowerCase().endsWith('.csv')
  ? parseCsv(text)
  : parseJson(text);
if (args.from) readings = readings.filter((r) => r.datetime >= args.from);
if (args.to)
  readings = readings.filter((r) => r.datetime.slice(0, 10) <= args.to);
if (!readings.length) {
  console.error('No glucose readings found.');
  process.exit(1);
}
readings.sort((a, b) => a.datetime.localeCompare(b.datetime));

const now = Date.now();
const profileId = stableId(args.profileId);
const userId = `manual-patient-${profileId}`;
const connectionId = `libre-connection-${profileId}`;
const device = args.device || 'FreeStyle Libre';

const connection = {
  id: connectionId,
  user_id: userId,
  source: 'freestyle_libre',
  name: device,
  location: 'freestyle-libre://local',
  access_token: 'local-libre-import',
  expires_at: now + 1000 * 60 * 60 * 24 * 365 * 20,
  last_refreshed: new Date(now).toISOString(),
  _meta: { lwt: now },
  _deleted: false,
};

const seen = new Set();
const clinicalDocuments = [];
for (const reading of readings) {
  const sourceId = `libre|${reading.datetime}`;
  if (seen.has(sourceId)) continue;
  seen.add(sourceId);
  clinicalDocuments.push({
    id: `${connectionId}|${userId}|${sourceId}`,
    connection_record_id: connectionId,
    user_id: userId,
    data_record: {
      format: 'FHIR.DSTU2',
      content_type: 'application/fhir+json',
      resource_type: 'observation',
      version_history: [],
      raw: {
        resource: {
          resourceType: 'Observation',
          id: sourceId,
          status: 'final',
          category: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory',
              },
            ],
            text: 'Continuous glucose monitoring',
          },
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: GLUCOSE_LOINC_CODE,
                display: GLUCOSE_DISPLAY,
              },
            ],
            text: GLUCOSE_DISPLAY,
          },
          effectiveDateTime: reading.datetime,
          issued: reading.datetime,
          valueQuantity: {
            value: reading.glucose,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL',
          },
          referenceRange: [
            {
              low: { value: 70, unit: 'mg/dL' },
              high: { value: 180, unit: 'mg/dL' },
              text: 'Target range 70-180 mg/dL',
            },
          ],
          device: { display: device },
        },
      },
    },
    metadata: {
      id: sourceId,
      date: reading.datetime,
      display_name: GLUCOSE_DISPLAY,
      loinc_coding: [GLUCOSE_LOINC_CODE],
    },
    _meta: { lwt: now },
    _deleted: false,
  });
}

const tables = {
  user_documents: [
    {
      id: userId,
      is_selected_user: true,
      is_default_user: false,
      first_name: args.firstName || 'Imported',
      last_name: args.lastName || 'Patient',
      _meta: { lwt: now },
      _deleted: false,
    },
  ],
  user_preferences: [],
  connection_documents: [connection],
  clinical_documents: clinicalDocuments,
  summary_page_preferences: [],
  instance_config: [],
  uspstf_recommendation_documents: [],
  vector_storage: [],
};

const files = {};
const counts = {};
for (const [name, rows] of Object.entries(tables)) {
  files[`tables/${name}.json`] = strToU8(JSON.stringify(rows));
  counts[name] = rows.length;
}
files['manifest.json'] = strToU8(
  JSON.stringify(
    {
      format: 'mere-emr-package',
      version: 1,
      createdAt: now,
      app: { name: 'mere-medical', version: 'libre-cgm-import' },
      schema: { version: 1 },
      tables: Object.keys(tables),
      counts,
      attachmentCount: 0,
    },
    null,
    2,
  ),
);
const outputPath = resolve(args.output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, zipSync(files, { level: 6 }));
console.log(
  `Wrote ${outputPath}: ${clinicalDocuments.length} readings, ${clinicalDocuments[0].metadata.date} → ${clinicalDocuments.at(-1).metadata.date}`,
);

function parseCsv(csv) {
  const [header, ...lines] = csv.split(/\r?\n/).filter(Boolean);
  const cols = header.split(',').map((c) => c.trim());
  return lines
    .map((line) => {
      const values = line.split(',');
      const row = Object.fromEntries(cols.map((c, i) => [c, values[i]]));
      return toReading(row);
    })
    .filter(Boolean);
}

function parseJson(json) {
  const data = JSON.parse(json);
  const rows =
    data.readings ||
    data.reports?.Daily_Log?.cgmReadings ||
    data.reports?.Weekly_Summary?.cgmReadings ||
    [];
  return rows.map(toReading).filter(Boolean);
}

function toReading(row) {
  const datetime = row.datetime;
  const glucose = Number(row.glucose_mgdl ?? row.value_mgdl);
  if (!datetime || !Number.isFinite(glucose)) return undefined;
  return { datetime, glucose };
}

function stableId(value) {
  return `${value}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i]
      .slice(2)
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = argv[i + 1];
    i += 1;
  }
  return out;
}
