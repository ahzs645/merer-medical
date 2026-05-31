#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_TABLES = [
  'patient',
  'patientnote',
  'patplan',
  'inssub',
  'insplan',
  'benefit',
  'carrier',
  'appointment',
  'procedurelog',
  'procedurecode',
  'procnote',
  'claim',
  'claimproc',
  'claimpayment',
  'recall',
  'recalltype',
  'treatplan',
  'treatplanattach',
  'allergy',
  'allergydef',
  'disease',
  'diseasedef',
  'medication',
  'medicationpat',
  'rxpat',
  'vitalsign',
  'vaccinepat',
  'ehrpatient',
  'medicalorder',
  'labpanel',
  'labresult',
  'document',
  'sheet',
  'sheetfield',
  'commlog',
  'patfield',
  'patfielddef',
];

function usage() {
  console.error(`Usage:
  node tools/export-open-dental-demo-json.mjs \\
    --database opendental_demo \\
    --output data/open-dental-demo-json \\
    [--mysql mysql|mariadb] [--host 127.0.0.1] [--port 3306] [--user root] \\
    [--defaults-extra-file /path/to/mysql.cnf] [--tables patient,procedurelog] \\
    [--include-empty]

Notes:
  - This script does not parse .MYD files directly.
  - First load or expose the Open Dental MyISAM demo directory through MySQL/MariaDB.
  - Use MYSQL_PWD or --defaults-extra-file for passwords; avoid putting passwords in shell history.
`);
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const database = arg('database');
const output = arg('output');
const mysqlBin = arg('mysql') || 'mysql';
const tables = (arg('tables') || DEFAULT_TABLES.join(','))
  .split(',')
  .map((table) => table.trim())
  .filter(Boolean);
const includeEmpty = hasFlag('include-empty');

if (hasFlag('help')) {
  usage();
  process.exit(0);
}

if (!database || !output) {
  usage();
  process.exit(1);
}

function mysqlArgs(sql, { databaseName = database } = {}) {
  const args = ['--batch', '--raw', '--skip-column-names'];
  const defaultsExtraFile = arg('defaults-extra-file');
  if (defaultsExtraFile) args.push(`--defaults-extra-file=${defaultsExtraFile}`);
  const host = arg('host');
  const port = arg('port');
  const user = arg('user');
  if (host) args.push('--host', host);
  if (port) args.push('--port', port);
  if (user) args.push('--user', user);
  args.push(databaseName, '--execute', sql);
  return args;
}

function runMysql(sql, opts) {
  const result = spawnSync(mysqlBin, mysqlArgs(sql, opts), {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 200,
  });
  if (result.error) {
    throw new Error(
      `Could not run ${mysqlBin}. Install MySQL/MariaDB client or pass --mysql /path/to/mysql.\n${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `mysql exited with status ${result.status}`);
  }
  return result.stdout;
}

function parseTsv(text) {
  if (!text.trim()) return [];
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) =>
      line.split('\t').map((value) => (value === 'NULL' ? null : value)),
    );
}

function quoteIdent(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function tableExists(table) {
  const rows = parseTsv(
    runMysql(
      `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${JSON.stringify(table)}`,
    ),
  );
  return Number(rows[0]?.[0] || 0) > 0;
}

function describeTable(table) {
  const rows = parseTsv(
    runMysql(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ${JSON.stringify(table)}
       ORDER BY ORDINAL_POSITION`,
    ),
  );
  return rows.map(([name, dataType, nullable, key, defaultValue, extra]) => ({
    name,
    dataType,
    nullable: nullable === 'YES',
    key: key || undefined,
    defaultValue,
    extra: extra || undefined,
  }));
}

function exportTable(table, columns) {
  if (!columns.length) return [];
  const selectList = columns.map((column) => quoteIdent(column.name)).join(', ');
  const rows = parseTsv(runMysql(`SELECT ${selectList} FROM ${quoteIdent(table)}`));
  return rows.map((values) =>
    Object.fromEntries(columns.map((column, index) => [column.name, values[index]])),
  );
}

mkdirSync(output, { recursive: true });
mkdirSync(join(output, 'tables'), { recursive: true });
mkdirSync(join(output, 'schema'), { recursive: true });

const manifest = {
  source: 'open-dental-demo',
  database,
  exportedAt: new Date().toISOString(),
  exporter: 'tools/export-open-dental-demo-json.mjs',
  tables: [],
};

for (const table of tables) {
  if (!tableExists(table)) {
    manifest.tables.push({ table, exists: false, rows: 0 });
    continue;
  }
  const schema = describeTable(table);
  const rows = exportTable(table, schema);
  if (rows.length || includeEmpty) {
    writeFileSync(
      join(output, 'tables', `${table}.json`),
      `${JSON.stringify(rows, null, 2)}\n`,
    );
  }
  writeFileSync(
    join(output, 'schema', `${table}.json`),
    `${JSON.stringify(schema, null, 2)}\n`,
  );
  manifest.tables.push({
    table,
    exists: true,
    rows: rows.length,
    columns: schema.length,
  });
}

writeFileSync(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Exported ${manifest.tables.length} table entries to ${output}`);
