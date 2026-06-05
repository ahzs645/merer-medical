import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const repoRoot = process.argv[2] ?? process.cwd();
const compiledRoot = join(
  repoRoot,
  'dist/out-tsc/packages/immunization-forecast/src',
);

const { evaluateIceSeries } = await import(
  pathToFileURL(join(compiledRoot, 'iceSeriesEvaluator.js'))
);
const { iceDatasetPathsFromRepoRoot } = await import(
  pathToFileURL(join(compiledRoot, 'icePaths.js'))
);
const { loadIceDataset } = await import(pathToFileURL(join(compiledRoot, 'iceYaml.js')));
const { summarizeImplementedRulePorts } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);
const { summarizeRulePortCoverageByVaccineGroup } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertImplementedRulePortsExist();
assertHpvConcreteRulePortsComplete();
assertHpvCoverageSummaryComplete();
assertHpvMaleCvx118Accepted();
assertHpvAge46AcceptedAndNotRecommended();
assertHpvAge27ConditionalRecommendation();
assertHpv3DoseForecastOverride();
assertHpv3DosePre2016IntervalOverride();
assertHpv2DoseInvalidDose2RepeatInterval();
assertHpv2DoseInvalidDose2Forecast();
assertHpv2DoseDose1IntervalEvaluation();
assertHpv2DoseDose1IntervalForecast();
assertHpv3DoseAge15LatestRecommendedOverride();

console.log('ICE HPV rule regression checks passed.');

function assertImplementedRulePortsExist() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles);
  assert.equal(
    coverage.missing.length,
    0,
    `Implemented rule ports missing from ICE catalog: ${coverage.missing
      .map((port) => port.ruleName)
      .join(', ')}`,
  );
}

function assertHpvConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'HPV');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete HPV rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 3);
}

function assertHpvCoverageSummaryComplete() {
  const hpv = summarizeRulePortCoverageByVaccineGroup(dataset.ruleFiles).find(
    (summary) => summary.filter === 'HPV',
  );
  assert.ok(hpv, 'Expected HPV rule coverage summary');
  assert.equal(hpv.concreteUnported, 0);
  assert.equal(hpv.abstractRules, 3);
}

function evaluate({ seriesId, patient, immunizations, evaluationDate = '2026-06-01' }) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient,
    immunizations,
  });
  assert.ok(forecast, `Expected forecast for ${seriesId}`);
  return forecast;
}

function assertHpvMaleCvx118Accepted() {
  const forecast = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01', sex: 'male' },
    immunizations: [
      {
        id: 'male-cvx-118',
        vaccineName: 'HPV2',
        vaccineCode: '118',
        date: '2026-01-01',
      },
    ],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_LICENSED_FOR_MALES',
  ]);
}

function assertHpvAge46AcceptedAndNotRecommended() {
  const forecast = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '1980-01-01' },
    immunizations: [
      {
        id: 'age-46-dose',
        vaccineName: 'HPV9',
        vaccineCode: '165',
        date: '2026-01-01',
      },
    ],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'ABOVE_REC_AGE_SERIES',
  ]);
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['TOO_OLD']);
}

function assertHpvAge27ConditionalRecommendation() {
  const forecast = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '1999-01-01' },
    immunizations: [],
  });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'CLINICAL_PATIENT_DISCRETION',
  ]);
  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'HPV_NOT_ROUTINE_27_THROUGH_45',
  ]);
}

function assertHpv3DoseForecastOverride() {
  const before15 = evaluate({
    seriesId: 'HPV_3_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-02-01'),
  });
  assert.equal(before15.nextDoseForecast?.earliestRecommendedDate, '2026-06-01');
  assert.equal(before15.nextDoseForecast?.recommendedDate, '2026-07-01');
  assert.equal(before15.nextDoseForecast?.overdueDate, '2027-03-01');

  const after15 = evaluate({
    seriesId: 'HPV_3_DOSE_SERIES',
    patient: { birthDate: '2010-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-02-01'),
  });
  assert.equal(after15.nextDoseForecast?.earliestRecommendedDate, '2026-06-01');
  assert.equal(after15.nextDoseForecast?.recommendedDate, '2026-07-01');
  assert.equal(after15.nextDoseForecast?.overdueDate, '2026-08-29');
}

function assertHpv3DosePre2016IntervalOverride() {
  const valid = evaluate({
    seriesId: 'HPV_3_DOSE_SERIES',
    patient: { birthDate: '2000-01-01' },
    immunizations: hpvDoses('2016-01-01', '2016-02-01', '2016-05-01'),
  });
  assert.equal(valid.status, 'complete');
  assert.equal(valid.completedDoses, 3);

  const tooSoon = evaluate({
    seriesId: 'HPV_3_DOSE_SERIES',
    patient: { birthDate: '2000-01-01' },
    immunizations: hpvDoses('2016-01-01', '2016-02-01', '2016-04-01'),
  });
  assert.equal(tooSoon.completedDoses, 2);
  assert.deepEqual(tooSoon.invalidDoses.at(-1)?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertHpv2DoseInvalidDose2RepeatInterval() {
  const tooSoon = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-03-01', '2026-04-01'),
  });
  assert.equal(tooSoon.completedDoses, 1);
  assert.equal(tooSoon.invalidDoses.length, 2);

  const validRepeat = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-03-01', '2026-06-01'),
  });
  assert.equal(validRepeat.status, 'complete');
  assert.equal(validRepeat.completedDoses, 2);
  assert.equal(validRepeat.invalidDoses.length, 1);
}

function assertHpv2DoseInvalidDose2Forecast() {
  const forecast = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-03-01', '2026-04-01'),
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.invalidDoses.length, 2);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2026-06-24');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-06-24');
}

function assertHpv2DoseDose1IntervalEvaluation() {
  const valid = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-05-28'),
  });
  assert.equal(valid.status, 'complete');
  assert.equal(valid.completedDoses, 2);

  const invalid = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01', '2026-05-27'),
  });
  assert.equal(invalid.completedDoses, 1);
  assert.deepEqual(invalid.invalidDoses.at(-1)?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertHpv2DoseDose1IntervalForecast() {
  const forecast = evaluate({
    seriesId: 'HPV_2_DOSE_SERIES',
    patient: { birthDate: '2015-01-01' },
    immunizations: hpvDoses('2026-01-01'),
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.nextDoseForecast?.absoluteMinimumDate, '2026-05-28');
  assert.equal(forecast.nextDoseForecast?.minimumDate, '2026-06-01');
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2026-07-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-07-01');
  assert.equal(forecast.nextDoseForecast?.overdueDate, '2027-03-01');
}

function assertHpv3DoseAge15LatestRecommendedOverride() {
  const noDoses = evaluate({
    seriesId: 'HPV_3_DOSE_SERIES',
    patient: { birthDate: '2010-01-01' },
    immunizations: [],
  });
  assert.equal(noDoses.completedDoses, 0);
  assert.equal(noDoses.nextDoseForecast?.overdueDate, '2025-01-01');

  const oneDose = evaluate({
    seriesId: 'HPV_3_DOSE_SERIES',
    patient: { birthDate: '2010-01-01' },
    immunizations: hpvDoses('2026-01-01'),
  });
  assert.equal(oneDose.completedDoses, 1);
  assert.equal(oneDose.nextDoseForecast?.overdueDate, '2026-04-23');
}

function hpvDoses(...dates) {
  return dates.map((date, index) => ({
    id: `hpv-dose-${index + 1}`,
    vaccineName: 'HPV9',
    vaccineCode: '165',
    date,
  }));
}
