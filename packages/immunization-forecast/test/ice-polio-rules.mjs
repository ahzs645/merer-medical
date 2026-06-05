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

assertPolioConcreteRulePortsComplete();
assertPolioSeriesSelection();
assertPolioOpvSameDayDuplicate();
assertPolioMissingAntigenRules();
assertPolioCvx324InvalidInFourDoseSeries();
assertPolioCvx89Supplemental();
assertPolioCompletionShortcuts();
assertPolioExtraDoseBeforeAge4();
assertPolioAdultRecommendations();
assertPolioForecastOverrides();

console.log('ICE Polio rule regression checks passed.');

function assertPolioConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'POLIO');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Polio rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function assertPolioSeriesSelection() {
  const defaultSelection = selectPolio({
    birthDate: '2020-01-01',
    evaluationDate: '2026-01-01',
  });
  assert.equal(defaultSelection?.selected.series.id, 'POLIO_4_DOSE_SERIES');
  assert.equal(defaultSelection?.selected.selectionReason, 'POLIO_4_DOSE_DEFAULT');

  const fipvSelection = selectPolio({
    birthDate: '2020-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      polioDose('fipv-dose-1', '324', '2020-03-01'),
      polioDose('fipv-dose-2', '324', '2020-04-01'),
    ],
  });
  assert.equal(fipvSelection?.selected.series.id, 'POLIO_FRACTIONAL_IPV_SERIES');
  assert.equal(fipvSelection?.selected.selectionReason, 'POLIO_FIPV_PRODUCT');
}

function assertPolioOpvSameDayDuplicate() {
  const forecast = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2014-01-01',
    immunizations: [
      polioDose('opv-same-day', '02', '2014-03-01'),
      polioDose('ipv-same-day', '10', '2014-03-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '10');
  assert.equal(forecast.invalidDoses.length, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '02');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPolioMissingAntigenRules() {
  const bivalent = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2014-01-01',
    immunizations: [polioDose('bopv', '178', '2015-01-01')],
  });
  assert.deepEqual(bivalent.invalidDoses[0]?.reasons, ['MISSING_ANTIGEN']);

  const opvAfterSwitch = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2014-01-01',
    immunizations: [polioDose('opv-after-switch', '02', '2016-04-01')],
  });
  assert.deepEqual(opvAfterSwitch.invalidDoses[0]?.reasons, [
    'MISSING_ANTIGEN',
  ]);

  const opv182AfterSwitch = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2014-01-01',
    immunizations: [polioDose('opv182-after-switch', '182', '2016-04-01')],
  });
  assert.deepEqual(opv182AfterSwitch.invalidDoses[0]?.reasons, [
    'MISSING_ANTIGEN',
  ]);
}

function assertPolioCvx324InvalidInFourDoseSeries() {
  const forecast = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    immunizations: [polioDose('fipv-in-four-dose', '324', '2020-03-01')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_PART_OF_THIS_SERIES',
  ]);
}

function assertPolioCvx89Supplemental() {
  const forecast = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2014-01-01',
    immunizations: [polioDose('polio-nos-after-switch', '89', '2016-04-01')],
  });

  assert.equal(forecast.matchedDoses[0]?.status, 'valid');
  assert.deepEqual(forecast.matchedDoses[0]?.supplementalText, ['POLIO_CVX_89']);
}

function assertPolioCompletionShortcuts() {
  const threeDoseComplete = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      polioDose('dose-1', '10', '2020-03-01'),
      polioDose('dose-2', '10', '2020-05-01'),
      polioDose('dose-3-final', '10', '2024-01-01'),
    ],
  });
  assert.equal(threeDoseComplete.status, 'complete');
  assert.equal(threeDoseComplete.completedDoses, 3);

  const fipvFourDoseComplete = evaluatePolio({
    seriesId: 'POLIO_FRACTIONAL_IPV_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      polioDose('fipv-1', '324', '2020-03-01'),
      polioDose('fipv-2', '324', '2020-04-01'),
      polioDose('fipv-3', '10', '2020-05-01'),
      polioDose('fipv-4-final', '10', '2024-01-01'),
    ],
  });
  assert.equal(fipvFourDoseComplete.status, 'complete');
  assert.equal(fipvFourDoseComplete.completedDoses, 4);
}

function assertPolioExtraDoseBeforeAge4() {
  const forecast = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      polioDose('dose-1', '10', '2020-03-01'),
      polioDose('dose-2', '10', '2020-05-01'),
      polioDose('dose-3', '10', '2020-07-01'),
      polioDose('dose-4-extra', '10', '2021-01-01'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[3]?.status, 'valid');
  assert.deepEqual(forecast.matchedDoses[3]?.reasons, ['EXTRA_DOSE']);
  assert.equal(forecast.nextDose?.doseNumber, 5);
}

function assertPolioAdultRecommendations() {
  const noHistoryAdult = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '1980-01-01',
    evaluationDate: '2026-01-01',
  });
  assert.equal(noHistoryAdult.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(noHistoryAdult.recommendation?.reasons, ['HIGH_RISK']);
  assert.deepEqual(noHistoryAdult.recommendation?.supplementalText, [
    'POLIO_ASSUME_VACCINATED',
  ]);

  const completeAdult = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '1980-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      polioDose('adult-dose-1', '10', '1980-03-01'),
      polioDose('adult-dose-2', '10', '1980-05-01'),
      polioDose('adult-dose-3', '10', '1984-01-01'),
    ],
  });
  assert.equal(completeAdult.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(completeAdult.recommendation?.reasons, [
    'COMPLETE_HIGH_RISK',
  ]);
  assert.deepEqual(completeAdult.recommendation?.supplementalText, [
    'POLIO_COMPLETE_HIGH_RISK',
  ]);

  const adultWithBooster = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '1980-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      polioDose('adult-dose-1', '10', '1980-03-01'),
      polioDose('adult-dose-2', '10', '1980-05-01'),
      polioDose('adult-dose-3', '10', '1984-01-01'),
      polioDose('adult-booster', '10', '2020-01-01'),
    ],
  });
  assert.equal(adultWithBooster.recommendation?.status, 'not-recommended');
  assert.deepEqual(adultWithBooster.recommendation?.reasons, ['COMPLETE']);
  assert.deepEqual(adultWithBooster.matchedDoses.at(-1)?.reasons, [
    'BOOSTER_DOSE',
  ]);
}

function assertPolioForecastOverrides() {
  const pre2009 = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2008-01-01',
    evaluationDate: '2008-08-01',
    immunizations: [
      polioDose('dose-1', '10', '2008-03-01'),
      polioDose('dose-2', '10', '2008-05-01'),
      polioDose('dose-3', '10', '2008-07-01'),
    ],
  });
  assert.equal(pre2009.nextDoseForecast?.recommendedDate, '2008-07-29');

  const finalDoseAtAge4 = evaluatePolio({
    seriesId: 'POLIO_4_DOSE_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2024-01-01',
    immunizations: [
      polioDose('dose-1', '10', '2020-03-01'),
      polioDose('dose-2', '10', '2020-05-01'),
    ],
  });
  assert.equal(finalDoseAtAge4.nextDose?.doseNumber, 3);
  assert.equal(finalDoseAtAge4.nextDoseForecast?.recommendedDate, '2024-01-01');
}

function evaluatePolio({
  seriesId,
  birthDate = '2020-01-01',
  evaluationDate = '2026-01-01',
  immunizations = [],
}) {
  return evaluateIceSeries({
    dataset,
    vaccineGroup: 'POLIO',
    seriesId,
    patient: { birthDate },
    immunizations,
    evaluationDate,
  })[0];
}

function selectPolio({
  birthDate,
  evaluationDate,
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'POLIO',
    patient: { birthDate },
    immunizations,
    evaluationDate,
  });
}

function polioDose(id, vaccineCode, date) {
  return {
    id,
    vaccineCode,
    date,
  };
}
