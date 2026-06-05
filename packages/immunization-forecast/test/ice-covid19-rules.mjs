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
const { IMPLEMENTED_ICE_RULE_PORTS } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertCovid19Aug2025MappedRulePorts();
assertCovid19Aug2025SeriesSelection();
assertCovid19Aug2025Lt2RecommendsCvx311();
assertCovid19Aug2025PriorDoseInterval();
assertCovid19Aug2025CompleteRecommendation();

console.log('ICE COVID-19 Aug 2025 rule regression checks passed.');

function assertCovid19Aug2025MappedRulePorts() {
  const mappedRules = [
    'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (< 2 years) if patient is < 2 years of age as of evaluation date, or patient is >= 2 years and has a shot administered in current season at < 2 years of age',
    'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 1-dose COVID-19 Series (>= 2 - 64 years) if patient has no in-season shots and is >= 2 years and < 65 years as of evaluation date',
    'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (>= 65 years) if patient has no in-season shots and is >= 65 years as of evaluation date',
    'COVID-19(Aug2025): If the patient is complete for the season, the recommendation is Not_Recommended/Complete_High_Risk',
    'COVID-19(Aug2025 2–64y/GTE65yr)->TargetDose 1: If ≥1 prior COVID-19 shot, set earliest & recommended interval to 56d',
    'COVID-19(Aug2025 < 2yrs Series): When a shot is recommended for this series, specifically recommend CVX 311',
  ];

  for (const ruleName of mappedRules) {
    assert.ok(
      dataset.ruleFiles.some((file) =>
        file.rules.some((rule) => rule.name === ruleName),
      ),
      `Expected ICE rule catalog to contain ${ruleName}`,
    );
    assert.ok(
      IMPLEMENTED_ICE_RULE_PORTS.some((rule) => rule.ruleName === ruleName),
      `Expected TS rule ports to map ${ruleName}`,
    );
  }
}

function assertCovid19Aug2025SeriesSelection() {
  assert.equal(
    selectCovid19({ birthDate: '2024-09-01' })?.selected.series.id,
    'COVID_19_AUG_2025_LT_2_SERIES',
  );
  assert.equal(
    selectCovid19({ birthDate: '2020-01-01' })?.selected.series.id,
    'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
  );
  assert.equal(
    selectCovid19({ birthDate: '1950-01-01' })?.selected.series.id,
    'COVID_19_AUG_2025_GTE_65_SERIES',
  );
}

function assertCovid19Aug2025Lt2RecommendsCvx311() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.recommendedVaccine?.cvx, '311');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '311');
}

function assertCovid19Aug2025PriorDoseInterval() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2020-01-01',
    immunizations: [covidDose('prior-covid', '208', '2025-06-01')],
  });

  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-07-27');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-07-27');
  assert.equal(forecast.recommendation?.status, 'recommended');
}

function assertCovid19Aug2025CompleteRecommendation() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2020-01-01',
    immunizations: [covidDose('dose-1', '311', '2025-08-27')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
}

function evaluateCovid19({
  seriesId,
  birthDate,
  evaluationDate = '2025-08-27',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected COVID-19 forecast');
  return forecast;
}

function selectCovid19({
  birthDate,
  evaluationDate = '2025-08-27',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'COVID_19',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function covidDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'COVID-19',
    vaccineCode,
    date,
  };
}
