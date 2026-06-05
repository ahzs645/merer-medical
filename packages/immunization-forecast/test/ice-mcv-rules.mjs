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
const { loadIceDataset } = await import(
  pathToFileURL(join(compiledRoot, 'iceYaml.js'))
);
const { summarizeImplementedRulePorts } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertMcvConcreteRulePortsComplete();
assertMcvOneDoseAt16Through18CompletesSeries();
assertMcvBelowSeriesMinimumAccepted();
assertMcvBelowVaccineMinimumInvalid();
assertMcvAge22AcceptedAboveRecommended();
assertMcvDose1RecommendedAt16ForTeen();
assertMcvCompleteHighRisk();
assertMcvAge19ConditionalHighRisk();

console.log('ICE MCV rule regression checks passed.');

function assertMcvConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'MCV');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete MCV rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluateMcv({
  birthDate = '2010-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'MCV_42_DOSE_SERIES',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected MCV forecast');
  return forecast;
}

function assertMcvOneDoseAt16Through18CompletesSeries() {
  const forecast = evaluateMcv({
    birthDate: '2010-01-01',
    evaluationDate: '2026-06-01',
    immunizations: [mcvDose('mcv-dose-1', '114', '2026-01-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.nextDose, undefined);
}

function assertMcvBelowSeriesMinimumAccepted() {
  const forecast = evaluateMcv({
    birthDate: '2020-01-01',
    evaluationDate: '2026-06-01',
    immunizations: [
      mcvDose('mcv-dose-too-young-for-series', '136', '2026-01-01'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'BELOW_REC_AGE_SERIES',
  ]);
}

function assertMcvBelowVaccineMinimumInvalid() {
  const forecast = evaluateMcv({
    birthDate: '2025-12-01',
    evaluationDate: '2026-06-01',
    immunizations: [
      mcvDose('mcv-dose-too-young-for-vaccine', '136', '2026-01-01'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 0);
  assert.equal(forecast.invalidDoses.length, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_AGE',
  ]);
}

function assertMcvAge22AcceptedAboveRecommended() {
  const forecast = evaluateMcv({
    birthDate: '2000-01-01',
    evaluationDate: '2026-06-01',
    immunizations: [mcvDose('mcv-dose-after-22', '114', '2026-01-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'ABOVE_REC_AGE_SERIES',
  ]);
}

function assertMcvDose1RecommendedAt16ForTeen() {
  const forecast = evaluateMcv({
    birthDate: '2010-06-01',
    evaluationDate: '2026-06-05',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDose?.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-06-01');
  assert.equal(forecast.recommendation?.status, 'recommended');
}

function assertMcvCompleteHighRisk() {
  const forecast = evaluateMcv({
    birthDate: '2010-01-01',
    evaluationDate: '2026-06-01',
    immunizations: [mcvDose('mcv-dose-1', '114', '2026-01-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
}

function assertMcvAge19ConditionalHighRisk() {
  const forecast = evaluateMcv({
    birthDate: '2007-06-01',
    evaluationDate: '2026-06-05',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function mcvDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Meningococcal ACWY',
    vaccineCode,
    date,
  };
}
