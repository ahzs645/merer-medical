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

assertCholeraConcreteRulePortsComplete();
assertCholeraUnder2NotRecommended();
assertCholeraAge2Through64Conditional();
assertCholeraAge65TooOld();
assertCholeraSupplementalText();
assertCholeraCompleteHasNoRecommendation();

console.log('ICE Cholera rule regression checks passed.');

function assertCholeraConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'CHOLERA');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Cholera rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluate({ birthDate, immunizations = [] }) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'CHOLERA_1_DOSE_RISK_SERIES',
    evaluationDate: '2026-06-01',
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Cholera forecast');
  return forecast;
}

function assertCholeraUnder2NotRecommended() {
  const forecast = evaluate({ birthDate: '2025-01-01' });

  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'CHOLERA_NOT_ROUTINE_SEE_ACIP',
  ]);
}

function assertCholeraAge2Through64Conditional() {
  const forecast = evaluate({ birthDate: '2020-01-01' });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function assertCholeraAge65TooOld() {
  const forecast = evaluate({ birthDate: '1960-01-01' });

  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['TOO_OLD']);
}

function assertCholeraSupplementalText() {
  const forecasts = [
    evaluate({ birthDate: '2025-01-01' }),
    evaluate({ birthDate: '2020-01-01' }),
    evaluate({ birthDate: '1960-01-01' }),
  ];

  for (const forecast of forecasts) {
    assert.deepEqual(forecast.recommendation?.supplementalText, [
      'CHOLERA_NOT_ROUTINE_SEE_ACIP',
    ]);
  }
}

function assertCholeraCompleteHasNoRecommendation() {
  const forecast = evaluate({
    birthDate: '2020-01-01',
    immunizations: [
      {
        id: 'cholera-dose-1',
        vaccineName: 'Cholera',
        vaccineCode: '174',
        date: '2026-01-01',
      },
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation, undefined);
}
