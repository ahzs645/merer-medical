/**
 * Run with: node --test tools/lib/dental-transpose.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

import {
  buildDentalRow,
  toFdi,
  toUniversal,
  validateDentalRow,
} from './dental-transpose.mjs';
import { validateRecords } from './transpose-schema.mjs';

const toolsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const example = join(toolsDir, 'fixtures', 'example-dental-transpose.json');

test('converts between Universal and FDI, permanent and primary', () => {
  assert.equal(toFdi('1', 'universal'), '18');
  assert.equal(toFdi('19', 'universal'), '36');
  assert.equal(toFdi('30', 'universal'), '46');
  assert.equal(toFdi('A', 'universal'), '55');
  assert.equal(toFdi('T', 'universal'), '85');
  assert.equal(toUniversal('26', 'fdi'), '14');
  assert.equal(toUniversal('26', 'universal'), '26');
  assert.equal(toUniversal('61', 'fdi'), 'F');
  assert.equal(toFdi('49', 'fdi'), undefined);
});

test('teeth without a numbering system are an error', () => {
  const errors = validateDentalRow(
    { id: 'x', kind: 'finding', name: 'Caries', teeth: ['26'] },
    'dentalRecords[0]',
  );
  assert.match(errors.join('\n'), /numberingSystem: required/);
});

test('a tooth that does not exist in the stated system is an error', () => {
  const errors = validateDentalRow(
    {
      id: 'x',
      kind: 'finding',
      name: 'Caries',
      teeth: ['36'],
      numberingSystem: 'universal',
    },
    'at',
  );
  assert.match(errors.join('\n'), /"36" is not a tooth in universal/);
});

test('status words are checked per kind', () => {
  const errors = validateDentalRow(
    { id: 'x', kind: 'finding', name: 'Caries', status: 'done' },
    'at',
  );
  assert.match(errors.join('\n'), /expected one of active, resolved/);
});

test('teeth are written as FDI-coded body sites, whatever the source used', () => {
  const { resource, details } = buildDentalRow({
    id: 'x',
    kind: 'procedure',
    name: 'Composite',
    teeth: ['19'],
    surfaces: ['M', 'O'],
    numberingSystem: 'universal',
    status: 'planned',
  });
  assert.equal(resource.status, 'preparation');
  assert.equal(resource.bodySite[0].coding[0].code, '36');
  assert.equal(resource.bodySite[1].coding[0].code, 'MO');
  assert.equal(details.numberingSystem, 'universal');
  assert.equal(details.subtype, 'procedure');
});

test('a perio exam names only its teeth of concern, keyed by Universal id', () => {
  const { details } = buildDentalRow({
    id: 'p',
    kind: 'perioExam',
    name: 'Perio charting',
    numberingSystem: 'fdi',
    perio: {
      sites: [
        { tooth: '16', MB: 3, DB: 5 },
        { tooth: '26', MB: 2, DB: 3 },
      ],
      bleeding: [{ tooth: '16', sites: ['DB'] }],
    },
  });
  assert.equal(details.dentalTeeth, '3');
  assert.equal(
    details.perioPocketDepths,
    'tooth 3 MB:3/DB:5; tooth 14 MB:2/DB:3',
  );
  assert.equal(details.perioBleeding, 'tooth 3 DB');
  assert.equal(details.perioDeepestPocket, '5');
});

test('the example file validates, recall date in the future and all', () => {
  const records = JSON.parse(readFileSync(example, 'utf8'));
  const { errors, warnings } = validateRecords(records);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('the example builds into dental records the app can read', () => {
  const output = join(mkdtempSync(join(tmpdir(), 'dental-')), 'out.emrpkg');
  execFileSync(
    process.execPath,
    [
      join(toolsDir, 'transpose.mjs'),
      'build',
      example,
      '--output',
      output,
      '--profile-id',
      'dental-example',
    ],
    { stdio: 'pipe' },
  );
  const files = unzipSync(readFileSync(output));
  const docs = JSON.parse(strFromU8(files['tables/clinical_documents.json']));
  const dental = docs.filter(
    (doc) => doc.metadata.manual_specialty === 'dental',
  );
  assert.equal(dental.length, 5);
  const byName = (name) =>
    dental.find((doc) => doc.metadata.display_name === name);
  assert.equal(
    byName('Hygiene recall').metadata.manual_specialty_details.recallDueDate,
    '2027-03-15',
  );
  assert.equal(
    byName('Occlusal caries').data_record.raw.resource.bodySite.coding[0].code,
    '36',
  );
});
