import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateRecords } from './transpose-schema.mjs';

const base = () => ({
  subject: { sex: 'male' },
  audit: {
    sourceDocument: 'a.pdf',
    dateConvention: 'DMY',
    transposedAt: '2026-11-06',
  },
  conditions: [
    {
      id: 'bph',
      name: 'Benign prostatic hyperplasia',
      aliases: ['Prostatomegaly'],
    },
  ],
});

test('a link by id, name or alias passes; an unknown name warns', () => {
  const records = base();
  records.medicationPlans = [
    {
      id: 'meds',
      items: [
        { id: 'a', medication: 'tamsulosin', reasonConditions: ['bph'] },
        {
          id: 'b',
          medication: 'finasteride',
          reasonConditions: ['prostatomegaly'],
        },
        { id: 'c', medication: 'x', reasonConditions: ['Gout'] },
      ],
    },
  ];
  const { errors, warnings } = validateRecords(records);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /"Gout" is not a condition in this file/);
});

test('condition notes need text and ISO dates', () => {
  const records = base();
  records.conditions[0].notes = [
    { text: 'ok', date: '2026-01-20' },
    { text: '' },
    { text: 'x', date: '20/01/2026' },
  ];
  const { errors } = validateRecords(records);
  assert.equal(errors.length, 2);
});

test('a goal due date in the future is not read as a swapped date', () => {
  const records = base();
  records.goals = [
    {
      id: 'g',
      description: 'A1c < 6.5%',
      startDate: '2026-10-21',
      dueDate: '2027-01-21',
    },
  ];
  const { warnings } = validateRecords(records);
  assert.deepEqual(warnings, []);
});

test('dateConventionBySource replaces dateConvention and is checked', () => {
  const records = base();
  delete records.audit.dateConvention;
  records.audit.dateConventionBySource = { 'a.pdf': 'MDY', 'b.pdf': 'DMY' };
  assert.deepEqual(validateRecords(records).warnings, []);
  records.audit.dateConventionBySource['c.pdf'] = 'DDMM';
  assert.equal(validateRecords(records).errors.length, 1);
});

test('new sections are known to the validator', () => {
  const records = base();
  Object.assign(records, {
    carePlans: [
      {
        id: 'p',
        title: 'Plan',
        date: '2026-10-23',
        addressesConditions: ['bph'],
      },
    ],
    referrals: [{ id: 'r', name: 'Urology', date: '2026-10-23' }],
    careTeam: [{ id: 't', name: 'Team' }],
    devices: [{ id: 'd', name: 'Dexcom G7' }],
    immunizations: [{ id: 'i', vaccine: 'Flu', date: '2025-10-01' }],
  });
  const { errors, warnings } = validateRecords(records);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});
