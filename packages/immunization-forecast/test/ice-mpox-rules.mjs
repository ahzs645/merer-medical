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

assertMpoxNoDoseConditionalHighRisk();
assertMpoxDose1RecommendsCvx206();
assertMpoxSameDaySpecificProductBeatsNos();
assertMpoxSameDaySmallpoxProductBeatsNos();
assertMpoxNonAllowedProductAccepted();
assertMpoxSameDayAcceptedDoseBecomesInvalid();
assertMpoxDose2Under28DaysSupplemental();
assertMpoxBoosterAndExtraDoseHandling();
assertMpoxSeriesSelection();

console.log('ICE Mpox rule regression checks passed.');

function assertMpoxNoDoseConditionalHighRisk() {
  const forecast = evaluateMpox({ seriesId: 'MPOX_2_DOSE_SERIES' });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function assertMpoxDose1RecommendsCvx206() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_2_DOSE_SERIES',
    immunizations: [mpoxDose('mpox-dose-1', '206', '2026-01-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.recommendation?.status, 'recommended');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '206');
}

function assertMpoxSameDaySpecificProductBeatsNos() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_2_DOSE_SERIES',
    immunizations: [
      mpoxDose('mpox-nos-same-day', '325', '2026-01-01'),
      mpoxDose('mpox-specific-same-day', '206', '2026-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '206');
  assert.equal(forecast.invalidDoses.length, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '325');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertMpoxSameDaySmallpoxProductBeatsNos() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_1_DOSE_SERIES',
    immunizations: [
      mpoxDose('mpox-nos-same-day', '325', '2026-01-01'),
      mpoxDose('mpox-smallpox-same-day', '75', '2026-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '75');
  assert.equal(forecast.invalidDoses.length, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '325');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertMpoxNonAllowedProductAccepted() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_1_DOSE_SERIES',
    immunizations: [mpoxDose('mpox-wrong-series-product', '206', '2026-01-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
  ]);
}

function assertMpoxSameDayAcceptedDoseBecomesInvalid() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_1_DOSE_SERIES',
    immunizations: [
      mpoxDose('mpox-accepted-same-day', '206', '2026-01-01'),
      mpoxDose('mpox-valid-same-day', '75', '2026-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.acceptedDoses.length, 0);
  assert.equal(forecast.invalidDoses.length, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '206');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertMpoxDose2Under28DaysSupplemental() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_2_DOSE_SERIES',
    immunizations: [
      mpoxDose('mpox-dose-1', '206', '2026-01-01'),
      mpoxDose('mpox-dose-2-early', '206', '2026-01-08'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 2);
  assert.deepEqual(forecast.matchedDoses[1]?.supplementalText, [
    'MPOX_MIN_INTERVAL_28D',
  ]);
}

function assertMpoxBoosterAndExtraDoseHandling() {
  const forecast = evaluateMpox({
    seriesId: 'MPOX_2_DOSE_SERIES',
    immunizations: [
      mpoxDose('mpox-dose-1', '206', '2026-01-01'),
      mpoxDose('mpox-dose-2', '206', '2026-02-01'),
      mpoxDose('mpox-booster', '206', '2026-08-01'),
      mpoxDose('mpox-extra-after-booster', '206', '2026-09-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 2);
  assert.equal(forecast.matchedDoses.length, 3);
  assert.equal(forecast.matchedDoses[2]?.immunization.id, 'mpox-booster');
  assert.equal(forecast.matchedDoses[2]?.status, 'valid');
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, ['EXTRA_DOSE']);
}

function assertMpoxSeriesSelection() {
  assert.equal(
    selectMpox({ immunizations: [] })?.selected.series.id,
    'MPOX_2_DOSE_SERIES',
  );
  assert.equal(
    selectMpox({
      immunizations: [mpoxDose('mpox-dose-1-206', '206', '2026-01-01')],
    })?.selected.series.id,
    'MPOX_2_DOSE_SERIES',
  );
  assert.equal(
    selectMpox({
      immunizations: [mpoxDose('mpox-dose-1-75', '75', '2026-01-01')],
    })?.selected.series.id,
    'MPOX_1_DOSE_SERIES',
  );
}

function evaluateMpox({
  seriesId,
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
  assert.ok(forecast, 'Expected Mpox forecast');
  return forecast;
}

function selectMpox({
  birthDate = '2000-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'MPOX',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function mpoxDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Mpox',
    vaccineCode,
    date,
  };
}
