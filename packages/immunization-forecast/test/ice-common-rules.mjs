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

assertCommonConcreteRulePortsComplete();
assertSelectAdjuvantRecommendationSpacing();
assertBeforeBirthDefensiveHandling();

console.log('ICE common rule regression checks passed.');

function assertCommonConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles);
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete ICE rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function assertSelectAdjuvantRecommendationSpacing() {
  const forecasts = evaluateIceSeries({
    dataset,
    patient: { birthDate: '1970-01-01' },
    evaluationDate: '2026-06-01',
    immunizations: [
      {
        id: 'recent-heplisav-b',
        vaccineCode: '189',
        vaccineName: 'Hep B, adjuvanted',
        date: '2026-05-20',
      },
    ],
  });

  const influenza = forecasts.find(
    (forecast) => forecast.series.id === 'INFLUENZA_1_DOSE_SERIES',
  );
  assert.equal(influenza?.nextDoseForecast?.earliestRecommendedDate, '2026-06-17');
  assert.equal(influenza?.nextDoseForecast?.recommendedDate, '2026-06-17');
  assert.equal(influenza?.recommendation?.earliestRecommendedDate, '2026-06-17');
  assert.equal(influenza?.recommendation?.recommendedDate, '2026-06-17');
}

function assertBeforeBirthDefensiveHandling() {
  const forecasts = evaluateIceSeries({
    dataset,
    patient: { birthDate: '1980-01-01' },
    evaluationDate: '2026-01-01',
    seriesId: 'HEP_B_ADULT_3_DOSE_SERIES',
    immunizations: [
      {
        id: 'pre-birth-hepb',
        vaccineCode: '43',
        vaccineName: 'Hep B, adult',
        date: '1979-12-31',
      },
    ],
  });

  const hepB = forecasts[0];
  assert.deepEqual(hepB.invalidDoses[0]?.reasons, ['PRIOR_TO_DOB']);
  assert.equal(hepB.matchedDoses.length, 0);
  assert.notEqual(hepB.nextDoseForecast?.earliestRecommendedDate, '1980-01-28');
  assert.notEqual(hepB.nextDoseForecast?.recommendedDate, '1980-01-28');
}
