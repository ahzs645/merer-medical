#!/usr/bin/env node
/**
 * The front door for turning a clinical document into a Mere `.emrpkg`.
 *
 *   node tools/transpose.mjs validate records.json
 *   node tools/transpose.mjs build records.json --output out.emrpkg
 *   node tools/transpose.mjs inspect out.emrpkg
 *
 * Transposing itself — reading a letter and deciding that "Platelets 141 (L)"
 * is one lab result with a low flag — is not something this file does. That is
 * the `transpose-clinical-document` skill's job. This is the mechanical half:
 * it checks that what the skill wrote is well-formed, builds the package, and
 * reads a built package back so the result can be checked without a browser.
 *
 * `validate` before `build` matters: the builder is forgiving by design (a
 * missing field usually becomes an absent FHIR element rather than a throw), so
 * a typo'd key would otherwise cost you a whole record with no diagnostic.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { validateRecords } from './lib/transpose-schema.mjs';
import {
  CONVENTIONS,
  conventionForRegion,
  resolveSourceDate,
} from './lib/source-dates.mjs';
import {
  mergePackages,
  readPackage,
  writePackage,
} from './lib/merge-packages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BUILDER = resolve(here, 'build-diabetes-records-emrpkg.mjs');

const [command, target, ...rest] = process.argv.slice(2);

if (!command || command === 'help' || command === '--help') {
  usage();
  process.exit(command ? 0 : 1);
}

const commands = { validate, build, inspect, date, merge };
if (!commands[command]) {
  console.error(`Unknown command: ${command}\n`);
  usage();
  process.exit(1);
}
if (!target) {
  console.error(`${command}: needs a file path\n`);
  usage();
  process.exit(1);
}

if (command === 'date') {
  date(target, parseFlags(rest));
} else if (command === 'merge') {
  merge(target, rest);
} else {
  commands[command](resolve(target), parseFlags(rest));
}

function validate(path) {
  const { errors, warnings, counts } = readAndValidate(path);
  report(errors, warnings, counts);
  process.exit(errors.length ? 1 : 0);
}

function build(path, flags) {
  const { errors, warnings, counts } = readAndValidate(path);
  report(errors, warnings, counts);
  if (errors.length) {
    console.error('\nNot building: fix the errors above first.');
    process.exit(1);
  }

  const output = flags.output || flags.o;
  if (!output) {
    console.error('build: --output <file.emrpkg> is required');
    process.exit(1);
  }

  const args = [BUILDER, '--source', path, '--output', resolve(output)];
  for (const [key, value] of Object.entries(flags)) {
    if (key === 'output' || key === 'o') continue;
    args.push(`--${camelToKebab(key)}`, value);
  }

  const run = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status ?? 1);
  console.log(`\nWrote ${resolve(output)}`);
}

function inspect(path) {
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) {
    console.error(
      `${path}: no manifest.json — an encrypted package cannot be inspected without its passphrase`,
    );
    process.exit(1);
  }
  const manifest = JSON.parse(strFromU8(manifestBytes));
  console.log(`format       ${manifest.format} v${manifest.version}`);
  console.log(`created      ${new Date(manifest.createdAt).toISOString()}`);
  console.log(`app version  ${manifest.app?.version ?? '(unset)'}`);
  console.log('');

  const rows = Object.entries(manifest.counts || {}).filter(([, n]) => n > 0);
  const width = Math.max(...rows.map(([name]) => name.length), 12);
  for (const [name, count] of rows) {
    console.log(`${name.padEnd(width)}  ${count}`);
  }

  const clinical = files['tables/clinical_documents.json'];
  if (clinical) {
    const docs = JSON.parse(strFromU8(clinical));
    const byType = {};
    for (const doc of docs) {
      const type = doc.data_record?.resource_type ?? '(none)';
      byType[type] = (byType[type] || 0) + 1;
    }
    console.log('\nclinical documents by resource type');
    for (const [type, count] of Object.entries(byType).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${type.padEnd(width + 8)}${count}`);
    }
    const overlong = docs.filter((doc) => (doc.id || '').length > 128);
    if (overlong.length) {
      console.log(
        `\nnote: ${overlong.length} document id(s) exceed the store's declared 128-char maxLength.`,
      );
      console.log(
        '      They import and query fine today (no document validator is registered),',
      );
      console.log(
        '      but shorter source ids would keep them inside the schema.',
      );
    }
  }
}

/**
 * Convert one date as the source wrote it, under a stated convention.
 *
 *   node tools/transpose.mjs date 03/08/2026 --convention DMY
 *   node tools/transpose.mjs date 03/08/2026 --region GB
 *
 * Here so that a transposer never does the arithmetic in its head. Reading
 * `3/8/2026` as March moves a result five months, and the wrong answer is still
 * a valid date, so nothing downstream can catch it.
 */
function date(raw, flags) {
  let convention = flags.convention;
  if (!convention && flags.region) {
    convention = conventionForRegion(flags.region);
    if (!convention) {
      console.error(`date: could not map region "${flags.region}"`);
      process.exit(1);
    }
    console.log(`region ${flags.region.toUpperCase()} → ${convention}`);
  }
  if (!convention) {
    console.error(
      `date: pass --convention <${CONVENTIONS.join('|')}> or --region <ISO 3166 code>`,
    );
    process.exit(1);
  }

  const result = resolveSourceDate(raw, convention);
  if (result.error) {
    console.error(`error    ${result.error}`);
    process.exit(1);
  }
  console.log(result.iso);
  if (result.note) console.log(`warning  ${result.note}`);
  process.exit(0);
}

/**
 * Combine packages into one.
 *
 *   node tools/transpose.mjs merge base.emrpkg letter.emrpkg --output all.emrpkg
 *
 * Importing two packages one after another does not do this: the importer
 * replaces the receiving collections, so the second erases the first. And each
 * build derives its own user id, so the same person arrives twice as strangers.
 */
function merge(firstPath, rest) {
  const inputs = [resolve(firstPath)];
  const flagArgs = [];
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index].startsWith('--')) {
      flagArgs.push(...rest.slice(index));
      break;
    }
    inputs.push(resolve(rest[index]));
  }
  const flags = parseFlags(flagArgs);

  const output = flags.output || flags.o;
  if (!output) {
    console.error('merge: --output <file.emrpkg> is required');
    process.exit(1);
  }
  if (inputs.length < 2) {
    console.error('merge: needs at least two packages');
    process.exit(1);
  }

  let result;
  try {
    const packages = inputs.map((path) =>
      readPackage(new Uint8Array(readFileSync(path)), basename(path)),
    );
    result = mergePackages(packages, {
      userFrom: Number(flags.userFrom || 1),
      appVersion: flags.appVersion,
    });
  } catch (error) {
    console.error(`error    ${error.message}`);
    process.exit(1);
  }

  for (const [index, path] of inputs.entries()) {
    const from = result.manifest.mergedFrom[index];
    console.log(
      `  ${basename(path).padEnd(28)} ${String(from.clinicalDocuments).padStart(5)} clinical documents`,
    );
  }
  console.log('');
  console.log(
    `patient      ${result.user.first_name} ${result.user.last_name}`,
  );
  for (const [name, count] of Object.entries(result.manifest.counts)) {
    if (count > 0) console.log(`${name.padEnd(26)} ${count}`);
  }
  for (const note of result.notes) console.log(`\nnote     ${note}`);

  writeFileSync(resolve(output), writePackage(result));
  console.log(`\nWrote ${resolve(output)}`);
}

function readAndValidate(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`${path}: ${error.message}`);
    process.exit(1);
  }
  return validateRecords(parsed);
}

function report(errors, warnings, counts) {
  const rows = Object.entries(counts).filter(([, n]) => n > 0);
  if (rows.length) {
    console.log('sections');
    const width = Math.max(...rows.map(([name]) => name.length));
    for (const [name, count] of rows) {
      console.log(`  ${name.padEnd(width)}  ${count}`);
    }
    console.log('');
  }
  for (const warning of warnings) console.log(`warning  ${warning}`);
  for (const error of errors) console.error(`error    ${error}`);
  if (!errors.length)
    console.log(`\nOK — ${warnings.length} warning(s), 0 errors`);
}

function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg
      .slice(2)
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = 'true';
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return flags;
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function usage() {
  console.log(`Turn a transposed clinical document into a Mere .emrpkg.

  node tools/transpose.mjs validate <records.json>
      Check a transposed file against the format. Exits non-zero on errors.

  node tools/transpose.mjs build <records.json> --output <file.emrpkg>
      Validate, then build. Passes any other --flag through to the builder:
      --assets-dir, --first-name, --last-name, --profile-id, --connection-name,
      --app-version.

  node tools/transpose.mjs inspect <file.emrpkg>
      Print a built package's manifest, row counts and resource-type mix.

  node tools/transpose.mjs merge <base.emrpkg> <more.emrpkg…> --output <file>
      Combine packages for one person into one. Keeps every connection so a
      record still names the document it came from; re-points records onto the
      surviving user. --user-from <n> picks whose name and profile survive
      (default 1, the base).

  node tools/transpose.mjs date <value> --convention DMY|MDY|YMD|ISO
  node tools/transpose.mjs date <value> --region GB
      Resolve one source date to ISO. Warns when the value reads as a
      different real date under the other convention.

The records.json format is documented in docs/clinical-transpose-format.md.
Transposing a document into that format is the transpose-clinical-document
skill's job; this tool only checks and builds what the skill produces.`);
}
