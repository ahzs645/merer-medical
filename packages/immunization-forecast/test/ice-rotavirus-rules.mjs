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

assertRotavirusConcreteRulePortsComplete();
assertRotavirusPost2000Cvx74DuplicateInvalid();
assertRotavirusPost2000Cvx119DuplicateInvalid();
assertRotavirusPre2000Cvx74Wins();
assertRotavirusPre2000Cvx119DuplicateInvalid();
assertRotavirusAfter8MonthsAccepted();
assertRotavirusInvalidSeriesVaccineNoVaccineNotAllowedReason();
assertRotavirusTooOldToInitiate();
assertRotavirusTooOldByRecommendedDate();

console.log('ICE Rotavirus rule regression checks passed.');

function assertRotavirusConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(
    dataset.ruleFiles,
    'ROTAVIRUS',
  );
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Rotavirus rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluateRotavirus({
  seriesId = 'ROTAVIRUS_3_DOSE_SERIES',
  birthDate = '2020-01-01',
  evaluationDate = '2020-03-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Rotavirus forecast');
  return forecast;
}

function assertRotavirusPost2000Cvx74DuplicateInvalid() {
  const forecast = evaluateRotavirus({
    immunizations: [
      rotavirusDose('rv-74', '74', '2020-03-01'),
      rotavirusDose('rv-116', '116', '2020-03-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '116');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '74');
}

function assertRotavirusPost2000Cvx119DuplicateInvalid() {
  const forecast = evaluateRotavirus({
    immunizations: [
      rotavirusDose('rv-119', '119', '2020-03-01'),
      rotavirusDose('rv-116', '116', '2020-03-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '116');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '119');
}

function assertRotavirusPre2000Cvx74Wins() {
  const forecast = evaluateRotavirus({
    birthDate: '1999-01-01',
    evaluationDate: '1999-03-01',
    immunizations: [
      rotavirusDose('rv-116', '116', '1999-03-01'),
      rotavirusDose('rv-74', '74', '1999-03-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '74');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '116');
}

function assertRotavirusPre2000Cvx119DuplicateInvalid() {
  const forecast = evaluateRotavirus({
    birthDate: '1999-01-01',
    evaluationDate: '1999-03-01',
    immunizations: [
      rotavirusDose('rv-119', '119', '1999-03-01'),
      rotavirusDose('rv-116', '116', '1999-03-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '116');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '119');
}

function assertRotavirusAfter8MonthsAccepted() {
  const forecast = evaluateRotavirus({
    birthDate: '2020-01-01',
    evaluationDate: '2020-09-02',
    immunizations: [rotavirusDose('rv-after-8m', '116', '2020-09-02')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'ABOVE_REC_AGE_SERIES',
  ]);
}

function assertRotavirusInvalidSeriesVaccineNoVaccineNotAllowedReason() {
  const forecast = evaluateRotavirus({
    seriesId: 'ROTAVIRUS_2_DOSE_SERIES',
    immunizations: [rotavirusDose('rv-wrong-product', '116', '2020-03-01')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.invalidDoses.length, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, []);
}

function assertRotavirusTooOldToInitiate() {
  const forecast = evaluateRotavirus({
    birthDate: '2020-01-01',
    evaluationDate: '2020-04-15',
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['TOO_OLD_TO_INITIATE']);
}

function assertRotavirusTooOldByRecommendedDate() {
  const forecast = evaluateRotavirus({
    birthDate: '2020-01-01',
    evaluationDate: '2020-08-16',
    immunizations: [rotavirusDose('rv-dose-1', '116', '2020-08-15')],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2020-09-12');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['TOO_OLD']);
}

function rotavirusDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Rotavirus',
    vaccineCode,
    date,
  };
}
