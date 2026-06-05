import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertYellowFeverConcreteRulePortsComplete();
assertYellowFeverUnder6MonthsNotRecommended();
assertYellowFeverSixThroughEightMonthsConditional();
assertYellowFeverNineMonthsPlusConditional();
assertYellowFeverCompleteHighRisk();
assertYellowFeverSupplementalText();
assertYellowFeverAdjustsOtherLiveVirusEarliestDate();

console.log('ICE Yellow Fever rule regression checks passed.');

function assertYellowFeverConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'YELLOWFEVER');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Yellow Fever rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluateYellowFever({ birthDate, immunizations = [] }) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'YELLOW_FEVER_RISK_SERIES',
    evaluationDate: '2026-06-01',
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Yellow Fever forecast');
  return forecast;
}

function assertYellowFeverUnder6MonthsNotRecommended() {
  const forecast = evaluateYellowFever({ birthDate: '2026-01-01' });

  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP',
  ]);
}

function assertYellowFeverSixThroughEightMonthsConditional() {
  const forecast = evaluateYellowFever({ birthDate: '2025-11-01' });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'BELOW_REC_AGE_SERIES',
    'HIGH_RISK',
  ]);
}

function assertYellowFeverNineMonthsPlusConditional() {
  const forecast = evaluateYellowFever({ birthDate: '2025-01-01' });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function assertYellowFeverCompleteHighRisk() {
  const forecast = evaluateYellowFever({
    birthDate: '2025-01-01',
    immunizations: [yellowFeverDose('yellow-fever-dose-1', '37', '2026-01-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
}

function assertYellowFeverSupplementalText() {
  const forecasts = [
    evaluateYellowFever({ birthDate: '2026-01-01' }),
    evaluateYellowFever({ birthDate: '2025-11-01' }),
    evaluateYellowFever({ birthDate: '2025-01-01' }),
    evaluateYellowFever({
      birthDate: '2025-01-01',
      immunizations: [yellowFeverDose('yellow-fever-dose-1', '37', '2026-01-01')],
    }),
  ];

  for (const forecast of forecasts) {
    assert.deepEqual(forecast.recommendation?.supplementalText, [
      'YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP',
    ]);
  }
}

function assertYellowFeverAdjustsOtherLiveVirusEarliestDate() {
  const forecasts = evaluateIceSeries({
    dataset,
    evaluationDate: '2026-06-01',
    patient: { birthDate: '2025-01-01' },
    immunizations: [yellowFeverDose('yellow-fever-dose-1', '37', '2026-01-01')],
  });
  const varicella = forecasts.find(
    (forecast) => forecast.series.id === 'VARICELLA_2_DOSE_SERIES',
  );

  assert.ok(varicella, 'Expected Varicella forecast');
  assert.equal(varicella.nextDoseForecast?.earliestRecommendedDate, '2026-01-31');
}

function yellowFeverDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Yellow fever',
    vaccineCode,
    date,
  };
}
