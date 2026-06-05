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

assertVaricellaConcreteRulePortsComplete();
assertVaricellaTeenDose2AbsoluteMinimumInterval();
assertVaricellaTeenDose2ForecastInterval();
assertVaricellaInvalidDose1RetryForecast();
assertVaricellaBornBefore1980Conditional();

console.log('ICE Varicella rule regression checks passed.');

function assertVaricellaConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(
    dataset.ruleFiles,
    'VARICELLA',
  );
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Varicella rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluateVaricella({
  birthDate = '2010-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'VARICELLA_2_DOSE_SERIES',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Varicella forecast');
  return forecast;
}

function assertVaricellaTeenDose2AbsoluteMinimumInterval() {
  const validAt24Days = evaluateVaricella({
    birthDate: '2010-01-01',
    immunizations: [
      varicellaDose('varicella-dose-1', '2026-01-01'),
      varicellaDose('varicella-dose-2', '2026-01-25'),
    ],
  });

  assert.equal(validAt24Days.status, 'complete');
  assert.equal(validAt24Days.matchedDoses.length, 2);
  assert.equal(validAt24Days.invalidDoses.length, 0);

  const invalidAt23Days = evaluateVaricella({
    birthDate: '2010-01-01',
    immunizations: [
      varicellaDose('varicella-dose-1', '2026-01-01'),
      varicellaDose('varicella-dose-2', '2026-01-24'),
    ],
  });

  assert.equal(invalidAt23Days.status, 'not-complete');
  assert.equal(invalidAt23Days.matchedDoses.length, 1);
  assert.equal(invalidAt23Days.invalidDoses.length, 1);
  assert.deepEqual(invalidAt23Days.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertVaricellaTeenDose2ForecastInterval() {
  const forecast = evaluateVaricella({
    birthDate: '2010-01-01',
    evaluationDate: '2026-06-01',
    immunizations: [varicellaDose('varicella-dose-1', '2026-01-01')],
  });

  assert.equal(forecast.nextDose?.doseNumber, 2);
  assert.equal(
    forecast.nextDoseForecast?.earliestRecommendedDate,
    '2026-01-29',
  );
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-01-29');
}

function assertVaricellaInvalidDose1RetryForecast() {
  const forecast = evaluateVaricella({
    birthDate: '2025-06-01',
    evaluationDate: '2026-06-01',
    immunizations: [varicellaDose('varicella-invalid-dose-1', '2026-05-01')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.invalidDoses.length, 1);
  assert.equal(forecast.nextDose?.doseNumber, 1);
  assert.equal(
    forecast.nextDoseForecast?.earliestRecommendedDate,
    '2026-05-29',
  );
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-05-29');
}

function assertVaricellaBornBefore1980Conditional() {
  const forecast = evaluateVaricella({
    birthDate: '1979-12-31',
    evaluationDate: '2026-06-01',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function varicellaDose(id, date) {
  return {
    id,
    vaccineName: 'Varicella',
    vaccineCode: '21',
    date,
  };
}
