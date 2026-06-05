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

assertRsvConcreteRulePortsComplete();
assertRsvSelectionRules();
assertRsvVaccineAvailabilityDates();
assertRsvInfantOutsideSeasonValidReason();
assertRsvAge8MonthsThrough49YearsAccepted();
assertRsvPreSupportRecommendation();
assertRsvInfantSummer2023Forecast();
assertRsvInfantHighRiskRecommendations();
assertRsvAdultRecommendationRules();

console.log('ICE RSV rule regression checks passed.');

function assertRsvConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'RSV');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete RSV rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 1);
}

function assertRsvSelectionRules() {
  const infantSelection = selectRsv({
    birthDate: '2025-01-01',
    evaluationDate: '2025-06-01',
  });
  assert.equal(infantSelection?.selected.series.id, 'RSV_INFANT_SERIES');
  assert.equal(infantSelection?.selected.selectionReason, 'RSV_INFANT_DEFAULT');

  const adultSelection = selectRsv({
    birthDate: '2020-01-01',
    evaluationDate: '2026-06-01',
  });
  assert.equal(adultSelection?.selected.series.id, 'RSV_ADULT_SERIES');
  assert.equal(
    adultSelection?.selected.selectionReason,
    'RSV_ADULT_PATIENT_20_MONTHS_OR_OLDER',
  );
}

function assertRsvVaccineAvailabilityDates() {
  const adultUnavailable = evaluateRsv({
    seriesId: 'RSV_ADULT_SERIES',
    birthDate: '1950-01-01',
    immunizations: [rsvDose('adult-before-available', '303', '2023-06-20')],
  });
  assert.deepEqual(adultUnavailable.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
  ]);

  const infant332Unavailable = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2025-01-01',
    immunizations: [rsvDose('infant-332-before-available', '332', '2025-06-08')],
  });
  assert.deepEqual(infant332Unavailable.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
  ]);

  const infant306Unavailable = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2023-01-01',
    immunizations: [rsvDose('infant-306-before-available', '306', '2023-08-02')],
  });
  assert.deepEqual(infant306Unavailable.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
  ]);
}

function assertRsvInfantOutsideSeasonValidReason() {
  const forecast = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2024-05-01',
    immunizations: [rsvDose('infant-outside-season', '306', '2024-09-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.status, 'valid');
  assert.deepEqual(forecast.matchedDoses[0]?.reasons, ['OUTSIDE_SEASON']);
}

function assertRsvAge8MonthsThrough49YearsAccepted() {
  const forecast = evaluateRsv({
    seriesId: 'RSV_ADULT_SERIES',
    birthDate: '2020-01-01',
    immunizations: [rsvDose('outside-routine', '303', '2026-01-01')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);
}

function assertRsvPreSupportRecommendation() {
  const forecast = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2023-01-01',
    evaluationDate: '2023-06-20',
  });

  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['NOT_SUPPORTED']);
}

function assertRsvInfantSummer2023Forecast() {
  const forecast = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2023-07-01',
    evaluationDate: '2023-08-01',
  });

  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2023-10-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2023-10-01');
  assert.equal(forecast.recommendation?.status, 'recommended');
  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'MATERNAL_UNK_OR_WITHIN_14D_RSV_MAB',
  ]);
}

function assertRsvInfantHighRiskRecommendations() {
  const incomplete = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2024-01-01',
    evaluationDate: '2024-09-01',
  });
  assert.equal(incomplete.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(incomplete.recommendation?.reasons, ['HIGH_RISK']);

  const completeUnder8Months = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2024-05-01',
    immunizations: [rsvDose('infant-complete', '306', '2024-10-01')],
    evaluationDate: '2024-10-15',
  });
  assert.equal(completeUnder8Months.recommendation?.status, 'not-recommended');
  assert.deepEqual(completeUnder8Months.recommendation?.reasons, [
    'COMPLETE_HIGH_RISK',
  ]);

  const complete8Through19Months = evaluateRsv({
    seriesId: 'RSV_INFANT_SERIES',
    birthDate: '2024-05-01',
    immunizations: [rsvDose('infant-complete-high-risk', '306', '2024-10-01')],
    evaluationDate: '2025-01-15',
  });
  assert.equal(
    complete8Through19Months.recommendation?.status,
    'conditionally-recommended',
  );
  assert.deepEqual(complete8Through19Months.recommendation?.reasons, [
    'COMPLETE_HIGH_RISK',
  ]);
}

function assertRsvAdultRecommendationRules() {
  const adult50Through74 = evaluateRsv({
    seriesId: 'RSV_ADULT_SERIES',
    birthDate: '1970-01-01',
    evaluationDate: '2026-01-01',
  });
  assert.equal(adult50Through74.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(adult50Through74.recommendation?.reasons, ['HIGH_RISK']);
  assert.deepEqual(adult50Through74.recommendation?.supplementalText, [
    'RSV_75PLUS_50_74_AT_RISK',
  ]);

  const youngerAdult = evaluateRsv({
    seriesId: 'RSV_ADULT_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2026-01-01',
  });
  assert.equal(youngerAdult.recommendation?.status, 'recommended');
  assert.deepEqual(youngerAdult.recommendation?.supplementalText, [
    'RSV_75PLUS_50_74_AT_RISK_SINGLE_DOSE',
  ]);
  assert.equal(youngerAdult.nextDoseForecast?.recommendedDate, '2095-01-01');

  const adult75 = evaluateRsv({
    seriesId: 'RSV_ADULT_SERIES',
    birthDate: '1950-01-01',
    evaluationDate: '2026-01-01',
  });
  assert.equal(adult75.recommendation?.status, 'recommended');
  assert.equal(adult75.nextDoseForecast?.recommendedDate, '2025-01-01');
}

function evaluateRsv({
  seriesId,
  birthDate = '2024-01-01',
  evaluationDate = '2026-01-01',
  immunizations = [],
}) {
  return evaluateIceSeries({
    dataset,
    vaccineGroup: 'RSV',
    seriesId,
    patient: { birthDate },
    immunizations,
    evaluationDate,
  })[0];
}

function selectRsv({
  birthDate,
  evaluationDate,
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'RSV',
    patient: { birthDate },
    immunizations,
    evaluationDate,
  });
}

function rsvDose(id, vaccineCode, date) {
  return {
    id,
    vaccineCode,
    date,
  };
}
