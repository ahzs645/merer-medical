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
const { summarizeImplementedRulePorts } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertH1n1ConcreteRulePortsComplete();
assertH1n1OutsideSeasonInvalid();
assertH1n1RecommendationDateAfterSeasonEnd();
assertH1n1CompleteNotRecommended();
assertH1n1AfterSeasonEndNotRecommended();
assertH1n1SelectOnlySeries();
assertH1n1Under10SelectsTwoDose();
assertH1n1Age10SelectsOneDose();
assertH1n1ValidDose2Before10SelectsTwoDose();

console.log('ICE H1N1 rule regression checks passed.');

function assertH1n1ConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'H1N1');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete H1N1 rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluateH1n1({
  seriesId = 'H1N1_1_DOSE_SERIES',
  birthDate = '2000-01-01',
  evaluationDate = '2009-11-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected H1N1 forecast');
  return forecast;
}

function assertH1n1OutsideSeasonInvalid() {
  const forecast = evaluateH1n1({
    immunizations: [h1n1Dose('h1n1-outside-season', '128', '2010-07-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses.length, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['OUTSIDE_FLU_SEASON']);
}

function assertH1n1RecommendationDateAfterSeasonEnd() {
  const forecast = evaluateH1n1({
    birthDate: '2010-01-15',
    evaluationDate: '2010-06-15',
  });

  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2010-07-15');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'VAC_GROUP_NO_LONGER_REC',
  ]);
}

function assertH1n1CompleteNotRecommended() {
  const forecast = evaluateH1n1({
    immunizations: [h1n1Dose('h1n1-dose-1', '128', '2009-11-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE']);
}

function assertH1n1AfterSeasonEndNotRecommended() {
  const forecast = evaluateH1n1({
    evaluationDate: '2010-07-01',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'VAC_GROUP_NO_LONGER_REC',
  ]);
}

function assertH1n1SelectOnlySeries() {
  const selected = selectIceSeries({
    dataset,
    seriesId: 'H1N1_1_DOSE_SERIES',
    vaccineGroup: 'INFLUENZA_H1N1',
    evaluationDate: '2009-11-01',
    patient: { birthDate: '2000-01-01' },
    immunizations: [],
  });

  assert.equal(selected?.selected.series.id, 'H1N1_1_DOSE_SERIES');
  assert.equal(selected?.selected.selectionReason, 'H1N1_ONLY_SERIES');
}

function assertH1n1Under10SelectsTwoDose() {
  const selected = selectH1n1({ birthDate: '2005-01-01' });

  assert.equal(selected?.selected.series.id, 'H1N1_2_DOSE_SERIES');
  assert.equal(
    selected?.selected.selectionReason,
    'H1N1_2009_TWO_DOSE_UNDER_10',
  );
}

function assertH1n1Age10SelectsOneDose() {
  const selected = selectH1n1({ birthDate: '1999-01-01' });

  assert.equal(selected?.selected.series.id, 'H1N1_1_DOSE_SERIES');
  assert.equal(
    selected?.selected.selectionReason,
    'H1N1_2009_ONE_DOSE_10_OR_OLDER',
  );
}

function assertH1n1ValidDose2Before10SelectsTwoDose() {
  const selected = selectH1n1({
    birthDate: '2005-01-01',
    immunizations: [
      h1n1Dose('h1n1-dose-1', '128', '2009-11-01'),
      h1n1Dose('h1n1-dose-2', '128', '2009-12-01'),
    ],
  });

  assert.equal(selected?.selected.series.id, 'H1N1_2_DOSE_SERIES');
  assert.equal(
    selected?.selected.selectionReason,
    'H1N1_2009_TWO_DOSE_VALID_DOSE2_BEFORE_10',
  );
}

function selectH1n1({
  birthDate,
  evaluationDate = '2009-11-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'INFLUENZA_H1N1',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function h1n1Dose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'H1N1',
    vaccineCode,
    date,
  };
}
