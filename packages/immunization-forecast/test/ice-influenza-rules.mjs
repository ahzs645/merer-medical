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

assertInfluenzaConcreteRulePortsComplete();
assertInfluenzaOutsideSeasonInvalid();
assertInfluenzaPriorSeasonMinimumInterval();
assertInfluenzaCvx161InsufficientAntigen();
assertInfluenzaSouthernHemisphereNotAllowed();
assertInfluenzaSelectionRules();
assertInfluenzaIgnoresLiveVirusRecommendationInterval();

console.log('ICE Influenza rule regression checks passed.');

function assertInfluenzaConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'INFLUENZA');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Influenza rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function assertInfluenzaOutsideSeasonInvalid() {
  const forecast = evaluateInfluenza({
    seriesId: 'INFLUENZA_2_DOSE_SERIES',
    birthDate: '2010-01-01',
    immunizations: [fluDose('flu-outside-season', '150', '2012-06-30')],
  });

  assert.equal(forecast.invalidDoses.length, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['OUTSIDE_FLU_SEASON']);
}

function assertInfluenzaPriorSeasonMinimumInterval() {
  const forecast = evaluateInfluenza({
    seriesId: 'INFLUENZA_2_DOSE_SERIES',
    birthDate: '2010-01-01',
    immunizations: [
      fluDose('flu-prior-season', '150', '2012-06-30'),
      fluDose('flu-current-season-too-soon', '150', '2012-07-10'),
    ],
  });

  assert.equal(forecast.invalidDoses.length, 2);
  assert.deepEqual(forecast.invalidDoses.at(-1)?.reasons, [
    'BELOW_MINIMUM_INTERVAL',
  ]);
}

function assertInfluenzaCvx161InsufficientAntigen() {
  const forecast = evaluateInfluenza({
    seriesId: 'INFLUENZA_2_DOSE_SERIES',
    birthDate: '2009-01-01',
    immunizations: [fluDose('flu-cvx-161-age-3', '161', '2012-07-01')],
  });

  assert.equal(forecast.invalidDoses.length, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'INSUFFICIENT_ANTIGEN',
  ]);
}

function assertInfluenzaSouthernHemisphereNotAllowed() {
  const forecast = evaluateInfluenza({
    seriesId: 'INFLUENZA_2_DOSE_DEFAULT_SERIES',
    evaluationDate: '2026-01-01',
    immunizations: [fluDose('flu-southern-hemisphere', '194', '2026-01-01')],
  });

  assert.equal(forecast.invalidDoses.length, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_IN_US',
  ]);
}

function assertInfluenzaSelectionRules() {
  assert.equal(
    selectInfluenza({
      birthDate: '2020-01-01',
      evaluationDate: '2026-01-01',
    })?.selected.series.id,
    'INFLUENZA_2_DOSE_DEFAULT_SERIES',
  );
  assert.equal(
    selectInfluenza({
      birthDate: '2002-01-01',
      evaluationDate: '2012-10-01',
    })?.selected.series.id,
    'INFLUENZA_1_DOSE_SERIES',
  );
  assert.equal(
    selectInfluenza({
      birthDate: '2006-01-01',
      evaluationDate: '2012-10-01',
    })?.selected.series.id,
    'INFLUENZA_2_DOSE_SERIES',
  );
}

function assertInfluenzaIgnoresLiveVirusRecommendationInterval() {
  const forecasts = evaluateIceSeries({
    dataset,
    evaluationDate: '2026-01-02',
    patient: { birthDate: '2020-01-01' },
    immunizations: [yellowFeverDose('yellow-fever-dose-1', '37', '2026-01-01')],
  });
  const influenza = forecasts.find(
    (forecast) => forecast.series.id === 'INFLUENZA_2_DOSE_DEFAULT_SERIES',
  );

  assert.ok(influenza, 'Expected default influenza forecast');
  assert.equal(influenza.nextDoseForecast?.earliestRecommendedDate, '2020-07-01');
}

function evaluateInfluenza({
  seriesId,
  birthDate = '2020-01-01',
  evaluationDate = '2012-10-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Influenza forecast');
  return forecast;
}

function selectInfluenza({
  birthDate,
  evaluationDate,
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'INFLUENZA',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function fluDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Influenza',
    vaccineCode,
    date,
  };
}

function yellowFeverDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Yellow fever',
    vaccineCode,
    date,
  };
}
