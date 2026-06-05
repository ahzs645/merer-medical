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

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertMeningBNoDoseRecommendationBands();
assertMeningBNoDoseHasNoSpecificVaccine();
assertMeningBProductRecommendation();
assertMeningBWrongFamilyAccepted();
assertMeningBSameDayDuplicateFavorsSeriesFamily();
assertMeningB4cPre2024OneMonthInterval();
assertMeningB4cPost2024SixMonthInterval();
assertMeningBThreeDoseDose1ToDose3Interval();
assertMeningBSeriesSelection();

console.log('ICE MenB rule regression checks passed.');

function assertMeningBNoDoseRecommendationBands() {
  assert.deepEqual(evaluateMeningB({ birthDate: '2018-01-01' }).recommendation, {
    status: 'not-recommended',
    reasons: ['BELOW_MINIMUM_AGE_HIGH_RISK_SERIES'],
  });
  assert.deepEqual(evaluateMeningB({ birthDate: '2012-01-01' }).recommendation, {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
  });
  assert.deepEqual(evaluateMeningB({ birthDate: '2008-01-01' }).recommendation, {
    status: 'conditionally-recommended',
    reasons: ['CLINICAL_PATIENT_DISCRETION'],
  });
  assert.deepEqual(evaluateMeningB({ birthDate: '1990-01-01' }).recommendation, {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
  });
}

function assertMeningBNoDoseHasNoSpecificVaccine() {
  const forecast = evaluateMeningB({});
  assert.equal(forecast.recommendation?.recommendedVaccine, undefined);
}

function assertMeningBProductRecommendation() {
  const fourC = evaluateMeningB({
    seriesId: 'MEN_B_4_C_2_DOSE_SERIES',
    immunizations: [menBDose('4c-dose-1', '163', '2026-01-01')],
  });
  assert.equal(fourC.recommendation?.recommendedVaccine?.cvx, '163');

  const fhbp = evaluateMeningB({
    seriesId: 'MEN_BF_HBP_2_DOSE_SERIES',
    immunizations: [menBDose('fhbp-dose-1', '162', '2026-01-01')],
  });
  assert.equal(fhbp.recommendation?.recommendedVaccine?.cvx, '162');
}

function assertMeningBWrongFamilyAccepted() {
  const forecast = evaluateMeningB({
    seriesId: 'MEN_B_4_C_2_DOSE_SERIES',
    immunizations: [menBDose('fhbp-in-4c', '162', '2026-01-01')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
  ]);
}

function assertMeningBSameDayDuplicateFavorsSeriesFamily() {
  const fourC = evaluateMeningB({
    seriesId: 'MEN_B_4_C_2_DOSE_SERIES',
    immunizations: [
      menBDose('fhbp-same-day', '162', '2026-01-01'),
      menBDose('4c-same-day', '163', '2026-01-01'),
    ],
  });
  assert.equal(fourC.completedDoses, 1);
  assert.equal(fourC.matchedDoses[0]?.immunization.id, '4c-same-day');
  assert.equal(fourC.invalidDoses[0]?.immunization.id, 'fhbp-same-day');
  assert.deepEqual(fourC.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);

  const fhbp = evaluateMeningB({
    seriesId: 'MEN_BF_HBP_2_DOSE_SERIES',
    immunizations: [
      menBDose('4c-same-day', '163', '2023-01-01'),
      menBDose('fhbp-same-day', '162', '2023-01-01'),
    ],
  });
  assert.equal(fhbp.completedDoses, 1);
  assert.equal(fhbp.matchedDoses[0]?.immunization.id, 'fhbp-same-day');
  assert.equal(fhbp.invalidDoses[0]?.immunization.id, '4c-same-day');
  assert.deepEqual(fhbp.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertMeningB4cPre2024OneMonthInterval() {
  const forecast = evaluateMeningB({
    seriesId: 'MEN_B_4_C_2_DOSE_SERIES',
    immunizations: [
      menBDose('dose-1', '163', '2023-01-01'),
      menBDose('dose-2', '163', '2023-02-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 2);
}

function assertMeningB4cPost2024SixMonthInterval() {
  const invalid = evaluateMeningB({
    seriesId: 'MEN_B_4_C_2_DOSE_SERIES',
    immunizations: [
      menBDose('dose-1', '163', '2025-01-01'),
      menBDose('dose-2-too-early', '163', '2025-04-01'),
    ],
  });
  assert.equal(invalid.completedDoses, 1);
  assert.deepEqual(invalid.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const valid = evaluateMeningB({
    seriesId: 'MEN_B_4_C_2_DOSE_SERIES',
    immunizations: [
      menBDose('dose-1', '163', '2025-01-01'),
      menBDose('dose-2', '163', '2025-07-01'),
    ],
  });
  assert.equal(valid.status, 'complete');
}

function assertMeningBThreeDoseDose1ToDose3Interval() {
  const forecast = evaluateMeningB({
    seriesId: 'MEN_BF_HBP_3_DOSE_SERIES',
    immunizations: [
      menBDose('dose-1', '162', '2025-01-01'),
      menBDose('dose-2', '162', '2025-05-15'),
      menBDose('dose-3', '162', '2025-07-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 3);
}

function assertMeningBSeriesSelection() {
  assert.equal(selectMeningB({ immunizations: [] })?.selected.series.id, 'MEN_B_4_C_2_DOSE_SERIES');
  assert.equal(
    selectMeningB({ immunizations: [menBDose('fhbp-dose-1', '162', '2026-01-01')] })
      ?.selected.series.id,
    'MEN_BF_HBP_2_DOSE_SERIES',
  );
  assert.equal(
    selectMeningB({ immunizations: [menBDose('4c-dose-1', '163', '2026-01-01')] })
      ?.selected.series.id,
    'MEN_B_4_C_2_DOSE_SERIES',
  );
}

function evaluateMeningB({
  seriesId = 'MEN_B_4_C_2_DOSE_SERIES',
  birthDate = '2000-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected MenB forecast');
  return forecast;
}

function selectMeningB({
  birthDate = '2000-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'MENINGOCOCCAL_B',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function menBDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Meningococcal B',
    vaccineCode,
    date,
  };
}
