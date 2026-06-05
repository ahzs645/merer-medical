import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.argv[2] ?? process.cwd();
const compiledRoot = join(
  repoRoot,
  'dist/out-tsc/packages/immunization-forecast/src',
);

const { evaluateIceSeries, selectIceSeries } = await import(
  pathToFileURL(join(compiledRoot, 'iceSeriesEvaluator.js'))
);
const { iceDatasetPathsFromRepoRoot } = await import(
  pathToFileURL(join(compiledRoot, 'icePaths.js'))
);
const { loadIceDataset } = await import(
  pathToFileURL(join(compiledRoot, 'iceYaml.js'))
);
const { summarizeImplementedRulePorts } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertHibConcreteRulePortsComplete();
assertHibSeriesSelection();
assertHibCvx49DuplicateSameDay();
assertHibCatchupDoseTargeting();
assertHibBoosterOnlyRules();
assertHibAge5AcceptedAndConditional();
assertHibFinalDoseMinimumAge();

console.log('ICE Hib rule regression checks passed.');

function assertHibConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'HIB');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Hib rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function assertHibSeriesSelection() {
  const ompSelection = selectHib({
    birthDate: '2024-01-01',
    immunizations: [hibDose('omp-dose', '49', '2024-03-01')],
  });
  assert.equal(ompSelection?.selected.series.id, 'HIB_OMP_SERIES');
  assert.equal(ompSelection?.selected.selectionReason, 'HIB_OMP_PRODUCT');

  const fourDoseSelection = selectHib({
    birthDate: '2024-01-01',
    immunizations: [hibDose('prp-t-dose', '48', '2024-03-01')],
  });
  assert.equal(fourDoseSelection?.selected.series.id, 'HIB_4_DOSE_SERIES');
}

function assertHibCvx49DuplicateSameDay() {
  const forecast = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    immunizations: [
      hibDose('omp-same-day', '49', '2024-03-01'),
      hibDose('specified-same-day', '48', '2024-03-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '48');
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '49');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertHibCatchupDoseTargeting() {
  const sevenMonths = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    evaluationDate: '2024-08-01',
  });
  assert.equal(sevenMonths.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(sevenMonths.nextDoseForecast?.recommendedDate, '2024-08-01');

  const firstDoseAt15Months = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    immunizations: [hibDose('catchup-final', '48', '2025-04-01')],
    evaluationDate: '2025-04-02',
  });
  assert.equal(firstDoseAt15Months.status, 'complete');
  assert.equal(firstDoseAt15Months.completedDoses, 4);
  assert.equal(firstDoseAt15Months.matchedDoses[0]?.dose.doseNumber, 4);

  const twoDosesBefore12Months = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    immunizations: [
      hibDose('early-1', '48', '2024-03-01'),
      hibDose('early-2', '48', '2024-05-01'),
    ],
    evaluationDate: '2025-01-15',
  });
  assert.equal(twoDosesBefore12Months.nextDoseForecast?.dose.doseNumber, 4);
  assert.equal(twoDosesBefore12Months.nextDoseForecast?.recommendedDate, '2025-01-01');
}

function assertHibBoosterOnlyRules() {
  const boosterTooYoung = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    immunizations: [hibDose('booster-too-young', '50', '2024-08-01')],
  });
  assert.deepEqual(boosterTooYoung.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);

  const boosterFinalDose = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    immunizations: [
      hibDose('early-dose', '48', '2024-03-01'),
      hibDose('booster-final', '50', '2025-01-01'),
    ],
  });
  assert.equal(boosterFinalDose.matchedDoses.at(-1)?.immunization.vaccineCode, '50');
  assert.equal(boosterFinalDose.invalidDoses.length, 0);
}

function assertHibAge5AcceptedAndConditional() {
  const forecast = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2018-01-01',
    immunizations: [hibDose('age-5-shot', '48', '2024-01-01')],
    evaluationDate: '2024-01-02',
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses[0]?.status, 'accepted');
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'ABOVE_REC_AGE_SERIES',
  ]);
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function assertHibFinalDoseMinimumAge() {
  const forecast = evaluateHib({
    seriesId: 'HIB_4_DOSE_SERIES',
    birthDate: '2024-01-01',
    immunizations: [
      hibDose('catchup-1', '48', '2024-08-01'),
      hibDose('catchup-2', '48', '2024-09-01'),
      hibDose('catchup-3', '48', '2024-10-01'),
      hibDose('too-early-final-catchup', '48', '2024-12-15'),
    ],
  });

  assert.equal(forecast.invalidDoses.length, 1);
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 4);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_AGE',
  ]);
}

function evaluateHib({
  seriesId,
  birthDate = '2024-01-01',
  evaluationDate = '2026-01-01',
  immunizations = [],
}) {
  return evaluateIceSeries({
    dataset,
    vaccineGroup: 'HIB',
    seriesId,
    patient: { birthDate },
    immunizations,
    evaluationDate,
  })[0];
}

function selectHib({
  birthDate,
  evaluationDate = '2026-01-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'HIB',
    patient: { birthDate },
    immunizations,
    evaluationDate,
  });
}

function hibDose(id, vaccineCode, date) {
  return {
    id,
    vaccineCode,
    date,
  };
}
