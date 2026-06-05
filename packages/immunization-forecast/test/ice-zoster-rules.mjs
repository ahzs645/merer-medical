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

assertZosterConcreteRulePortsComplete();
assertZosterLegacyAcceptedNonCounting();
assertZosterLegacyToRecombinantMinimumInterval();
assertZosterLegacyToRecombinantSameDayInvalid();
assertZosterAlwaysRecommendsCvx187();
assertZosterAdultVaricellaIntervalForecast();
assertZosterLegacyIntervalForecast();

console.log('ICE Zoster rule regression checks passed.');

function assertZosterConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'ZOSTER');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Zoster rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluate({ patient = { birthDate: '1960-01-01' }, immunizations }) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'ZOSTER_SERIES',
    evaluationDate: '2026-06-01',
    patient,
    immunizations,
  });
  assert.ok(forecast, 'Expected Zoster forecast');
  return forecast;
}

function assertZosterLegacyAcceptedNonCounting() {
  const forecast = evaluate({
    immunizations: [zosterDose('legacy-live', '121', '2026-01-01')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_PART_OF_THIS_SERIES',
  ]);
}

function assertZosterLegacyToRecombinantMinimumInterval() {
  const forecast = evaluate({
    immunizations: [
      zosterDose('legacy-live', '121', '2026-01-01'),
      zosterDose('recombinant-too-soon', '187', '2026-02-20'),
    ],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.invalidDoses.at(-1)?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertZosterLegacyToRecombinantSameDayInvalid() {
  const forecast = evaluate({
    immunizations: [
      zosterDose('legacy-unspecified', '188', '2026-01-01'),
      zosterDose('recombinant-same-day', '187', '2026-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.invalidDoses.at(-1)?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertZosterAlwaysRecommendsCvx187() {
  const forecast = evaluate({ immunizations: [] });

  assert.equal(forecast.nextDoseForecast?.recommendedVaccine?.cvx, '187');
}

function assertZosterAdultVaricellaIntervalForecast() {
  const forecast = evaluate({
    immunizations: [
      {
        id: 'adult-varicella',
        vaccineName: 'Varicella',
        vaccineCode: '21',
        date: '2026-01-01',
      },
    ],
  });

  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2026-02-26');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-02-26');
}

function assertZosterLegacyIntervalForecast() {
  const forecast = evaluate({
    immunizations: [zosterDose('legacy-live', '121', '2026-01-01')],
  });

  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2026-02-26');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-02-26');
}

function zosterDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Zoster',
    vaccineCode,
    date,
  };
}
