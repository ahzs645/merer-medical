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

assertTyphoidConcreteRulePortsComplete();
assertTyphoidUnder2NotRecommended();
assertTyphoidAge2PlusConditional();
assertTyphoidCompleteHighRisk();
assertTyphoidSupplementalText();

console.log('ICE Typhoid rule regression checks passed.');

function assertTyphoidConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'TYPHOID');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Typhoid rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluate({ birthDate, immunizations = [] }) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'TYPHOID_RISK_SERIES',
    evaluationDate: '2026-06-01',
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Typhoid forecast');
  return forecast;
}

function assertTyphoidUnder2NotRecommended() {
  const forecast = evaluate({ birthDate: '2025-01-01' });

  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'TYPHOID_NOT_ROUTINE_SEE_ACIP',
  ]);
}

function assertTyphoidAge2PlusConditional() {
  const forecast = evaluate({ birthDate: '2020-01-01' });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function assertTyphoidCompleteHighRisk() {
  const forecast = evaluate({
    birthDate: '2020-01-01',
    immunizations: [
      {
        id: 'typhoid-dose-1',
        vaccineName: 'Typhoid',
        vaccineCode: '25',
        date: '2026-01-01',
      },
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
}

function assertTyphoidSupplementalText() {
  const forecasts = [
    evaluate({ birthDate: '2025-01-01' }),
    evaluate({ birthDate: '2020-01-01' }),
    evaluate({
      birthDate: '2020-01-01',
      immunizations: [
        {
          id: 'typhoid-dose-1',
          vaccineName: 'Typhoid',
          vaccineCode: '101',
          date: '2026-01-01',
        },
      ],
    }),
  ];

  for (const forecast of forecasts) {
    assert.deepEqual(forecast.recommendation?.supplementalText, [
      'TYPHOID_NOT_ROUTINE_SEE_ACIP',
    ]);
  }
}
