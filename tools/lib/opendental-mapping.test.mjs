/**
 * Run with: node --test tools/lib/opendental-mapping.test.mjs
 *
 * The end-to-end cases build `tools/fixtures/opendental-mini` with the real
 * CLI and read the package back, so they cover the wiring as well as the
 * mapping rules.
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
  decodeSiteValue,
  procedureDisposition,
  selectPatients,
  summarizePerioMeasures,
} from './opendental-mapping.mjs';

const toolsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(toolsDir, 'fixtures', 'opendental-mini');

test('a treatment-planned procedure is planned, not completed', () => {
  assert.deepEqual(procedureDisposition('1'), {
    status: 'treatment-planned',
    resourceType: 'procedure',
    fhirStatus: 'preparation',
    subtype: 'treatmentPlan',
  });
});

test('deleted and inactive-plan procedures are skipped', () => {
  assert.equal(procedureDisposition('6').skip, true);
  assert.equal(procedureDisposition('8').skip, true);
});

test('a charted condition becomes a Condition', () => {
  const disposition = procedureDisposition('7');
  assert.equal(disposition.resourceType, 'condition');
  assert.equal(disposition.clinicalStatus, 'active');
});

test('completed hygiene is a cleaning; an unknown status is not "completed"', () => {
  assert.equal(
    procedureDisposition('2', { isHygiene: true }).subtype,
    'cleaning',
  );
  assert.equal(procedureDisposition('3').fhirStatus, 'completed');
  assert.equal(procedureDisposition('99').fhirStatus, 'unknown');
});

test('site values: -1 is unmeasured, 100+ is a negative margin', () => {
  assert.equal(decodeSiteValue('-1'), undefined);
  assert.equal(decodeSiteValue('4'), 4);
  assert.equal(decodeSiteValue('105'), -5);
});

test('each perio field carries only its own measurement type', () => {
  const site = (values) =>
    Object.fromEntries(
      ['MB', 'B', 'DB', 'ML', 'L', 'DL'].map((key, index) => [
        `${key}value`,
        `${values[index]}`,
      ]),
    );
  const summary = summarizePerioMeasures([
    { IntTooth: '3', SequenceType: '4', ...site([3, 2, 5, 3, 2, 4]) },
    { IntTooth: '3', SequenceType: '6', ...site([1, 0, 5, 0, 0, 2]) },
    { IntTooth: '3', SequenceType: '2', ...site([102, 1, 0, 0, 0, 0]) },
    {
      IntTooth: '3',
      SequenceType: '0',
      ToothValue: '2',
      ...site([-1, -1, -1, -1, -1, -1]),
    },
  ]);
  assert.equal(
    summary.perioPocketDepths,
    'tooth 3 MB:3/B:2/DB:5/ML:3/L:2/DL:4',
  );
  assert.equal(summary.perioRecession, 'tooth 3 MB:-2/B:1/DB:0/ML:0/L:0/DL:0');
  assert.equal(summary.perioBleeding, 'tooth 3 MB, DB');
  assert.equal(summary.perioPlaque, 'tooth 3 DB');
  assert.equal(summary.perioSuppuration, 'tooth 3 DL');
  assert.equal(summary.perioMobility, 'tooth 3 mobility 2');
  assert.equal(summary.perioDeepestPocket, '5');
  assert.equal(summary.perioSitesFourPlus, '2');
});

test('a multi-patient source needs an explicit patient choice', () => {
  const patients = [{ PatNum: '1' }, { PatNum: '2' }];
  assert.throws(() => selectPatients(patients, {}), /--patient/);
  assert.deepEqual(selectPatients(patients, { patientIds: ['2'] }), [
    { PatNum: '2' },
  ]);
  assert.equal(selectPatients(patients, { all: true }).length, 2);
  assert.throws(
    () => selectPatients(patients, { patientIds: ['9'] }),
    /PatNum 9/,
  );
});

function build(...extraArgs) {
  const output = join(mkdtempSync(join(tmpdir(), 'od-')), 'out.emrpkg');
  execFileSync(
    process.execPath,
    [
      join(toolsDir, 'build-opendental-emrpkg.mjs'),
      '--source',
      fixture,
      '--output',
      output,
      ...extraArgs,
    ],
    { stdio: 'pipe' },
  );
  const files = unzipSync(readFileSync(output));
  const read = (name) => JSON.parse(strFromU8(files[`tables/${name}.json`]));
  return {
    users: read('user_documents'),
    documents: read('clinical_documents'),
  };
}

test('the builder refuses a practice-wide build without --patient', () => {
  assert.throws(() => build(), /--patient/);
});

test('the built package holds one patient, with statuses intact', () => {
  const { users, documents } = build('--patient', '1');
  assert.equal(users.length, 1);

  const bySource = new Map(
    documents
      .filter((doc) => doc.metadata.manual_specialty_details?.sourceId)
      .map((doc) => [
        `${doc.metadata.manual_specialty_details.sourceTable}:${doc.metadata.manual_specialty_details.sourceId}`,
        doc,
      ]),
  );
  const resource = (key) => bySource.get(key)?.data_record.raw.resource;

  assert.equal(resource('procedurelog:10').status, 'preparation');
  assert.equal(resource('procedurelog:10').performedDateTime, undefined);
  assert.equal(bySource.has('procedurelog:11'), false, 'deleted is skipped');
  assert.equal(resource('procedurelog:12').resourceType, 'Condition');
  assert.equal(
    bySource.get('procedurelog:13').metadata.manual_subtype,
    'cleaning',
  );
  assert.equal(bySource.has('procedurelog:14'), false, 'inactive TP skipped');
  assert.equal(
    bySource.has('procedurelog:15'),
    false,
    'other patient left out',
  );

  const recall = bySource.get('recall:1');
  assert.equal(recall.metadata.manual_subtype, 'recall');
  assert.equal(
    recall.metadata.manual_specialty_details.recallDueDate,
    '2026-08-10',
  );

  const plan = bySource.get('treatplan:7').metadata.manual_specialty_details;
  assert.equal(plan.estimatedCost, '$250.00');
  assert.equal(plan.dentalTeeth, '30');

  const perio = bySource.get('perioexam:5').metadata;
  assert.equal(perio.manual_subtype, 'perio');
  assert.equal(perio.manual_specialty_details.perioDeepestPocket, '5');
  assert.equal(perio.manual_specialty_details.dentalTeeth, '3');
});
