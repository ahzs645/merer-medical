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

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertDtpSeriesSelection();
assertDtpSameDayPertussisPreferred();
assertDtpSameDayNosPertussisPreferred();
assertDtpSameDaySamePertussisClassDuplicate();
assertDtpChildRecommendationUsesDtapNos();
assertDtpCatchupWithoutPertussisRecommendsTdap();
assertDtpCatchupWithPertussisRecommendsTd();
assertDtpCompletedSeriesRecommendsAdolescentTdap();
assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation();
assertDtpFirstAdolescentTdapAge7To10Valid();
assertDtpFirstAdolescentTdapAcceptedIfTooCloseToPertussis();
assertDtpRemainingAdolescentTdapAcceptedAsExtra();
assertDtpRecurringTdAfterAdolescentTdapIsValid();
assertDtpPertussisAge7To10RecommendsAdolescentTdapAt11();
assertDtpFiveDoseException1CompletesWithThreeDoses();
assertDtpFiveDoseException1ForecastSkipsToDose4();
assertDtpFiveDoseException2CompletesWithFourDoses();
assertDtpThreeDoseTdOnlySeriesRemainsIncomplete();
assertDtpThreeDosePertussisDoseCompletesSeries();
assertDtpCompletedNonPertussisSeriesRecommendsImmediateTdap();
assertDtpCompletedPertussisSeriesRecommendsTdapSixMonthsLater();

console.log('ICE DTP rule regression checks passed.');

function assertDtpSeriesSelection() {
  const childDefault = selectDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2026-01-01',
  });
  assert.equal(childDefault?.selected.series.id, 'DTP_5_DOSE_SERIES');
  assert.equal(childDefault?.selected.selectionReason, 'DTP_5_DOSE_DEFAULT');

  const adultNoDosesBefore7 = selectDtp({
    birthDate: '2010-01-01',
    evaluationDate: '2020-01-01',
  });
  assert.equal(adultNoDosesBefore7?.selected.series.id, 'DTP_3_DOSE_SERIES');
  assert.equal(
    adultNoDosesBefore7?.selected.selectionReason,
    'DTP_3_DOSE_NO_SHOTS_PRIOR_TO_7',
  );

  const adultWithDoseBefore7 = selectDtp({
    birthDate: '2010-01-01',
    evaluationDate: '2020-01-01',
    immunizations: [dtpDose('childhood-dtap', '20', '2011-03-01')],
  });
  assert.equal(adultWithDoseBefore7?.selected.series.id, 'DTP_5_DOSE_SERIES');
  assert.equal(adultWithDoseBefore7?.selected.selectionReason, 'DTP_5_DOSE_DEFAULT');
}

function assertDtpSameDayPertussisPreferred() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    immunizations: [
      dtpDose('non-pertussis-dt', '28', '2020-03-01'),
      dtpDose('pertussis-dtap', '20', '2020-03-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pertussis-dtap');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'non-pertussis-dt');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertDtpSameDayNosPertussisPreferred() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    immunizations: [
      dtpDose('td-nos', '139', '2020-03-01'),
      dtpDose('dtap-nos', '107', '2020-03-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'dtap-nos');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'td-nos');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertDtpSameDaySamePertussisClassDuplicate() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    immunizations: [
      dtpDose('dtap', '20', '2020-03-01'),
      dtpDose('dtap-5-antigen', '106', '2020-03-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'dtap');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'dtap-5-antigen');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertDtpChildRecommendationUsesDtapNos() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2020-02-01',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '107');
}

function assertDtpCatchupWithoutPertussisRecommendsTdap() {
  const forecast = evaluateDtp3({
    birthDate: '2010-01-01',
    evaluationDate: '2020-01-01',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.recommendedVaccine?.cvx, '115');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2017-01-01');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '115');
}

function assertDtpCatchupWithPertussisRecommendsTd() {
  const forecast = evaluateDtp3({
    birthDate: '2010-01-01',
    evaluationDate: '2020-01-01',
    immunizations: [dtpDose('tdap-age-8', '115', '2018-01-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.recommendedVaccine?.cvx, '09');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2017-01-01');
  assert.deepEqual(forecast.recommendation?.reasons, ['ADMINISTER_TDAP_OR_TD']);
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '09');
  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'SUPPLEMENTAL_TEXT_ADMINISTER_TDAP_OR_TD',
  ]);
}

function assertDtpCompletedSeriesRecommendsAdolescentTdap() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2030-02-01',
    immunizations: fiveDoseChildhoodDtpSeries(),
  });

  assert.equal(forecast.status, 'complete');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'ADOLESCENT_TDAP_NEEDED',
  ]);
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '115');
}

function assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2030-02-01',
    immunizations: [
      ...fiveDoseChildhoodDtpSeries(),
      dtpDose('adolescent-tdap', '115', '2030-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  const adolescentTdap = forecast.matchedDoses.find(
    (match) => match.immunization.id === 'adolescent-tdap',
  );
  assert.equal(adolescentTdap?.status, 'valid');
  assert.deepEqual(adolescentTdap?.reasons, ['ADOLESCENT_TDAP']);
  assert.deepEqual(forecast.recommendation?.reasons, ['ADMINISTER_TDAP_OR_TD']);
  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'SUPPLEMENTAL_TEXT_ADMINISTER_TDAP_OR_TD',
  ]);
}

function assertDtpFirstAdolescentTdapAge7To10Valid() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2029-03-01',
    immunizations: [
      ...fiveDoseChildhoodDtpSeries(),
      dtpDose('tdap-age-9', '115', '2029-01-01'),
    ],
  });

  const adolescentTdap = forecast.matchedDoses.find(
    (match) => match.immunization.id === 'tdap-age-9',
  );
  assert.equal(adolescentTdap?.status, 'valid');
  assert.deepEqual(adolescentTdap?.reasons, ['ADOLESCENT_TDAP']);
}

function assertDtpFirstAdolescentTdapAcceptedIfTooCloseToPertussis() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2029-03-01',
    immunizations: [
      ...fiveDoseChildhoodDtpSeries({ dose5Date: '2028-12-20' }),
      dtpDose('tdap-too-close', '115', '2029-01-01'),
    ],
  });

  const adolescentTdap = forecast.acceptedDoses.find(
    (match) => match.immunization.id === 'tdap-too-close',
  );
  assert.equal(adolescentTdap?.status, 'accepted');
  assert.deepEqual(adolescentTdap?.reasons, ['EXTRA_DOSE']);
}

function assertDtpRemainingAdolescentTdapAcceptedAsExtra() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2029-03-01',
    immunizations: [
      ...fiveDoseChildhoodDtpSeries(),
      dtpDose('tdap-age-9', '115', '2029-01-01'),
      dtpDose('tdap-extra', '115', '2029-02-01'),
    ],
  });

  const extraTdap = forecast.acceptedDoses.find(
    (match) => match.immunization.id === 'tdap-extra',
  );
  assert.equal(extraTdap?.status, 'accepted');
  assert.deepEqual(extraTdap?.reasons, ['EXTRA_DOSE']);
}

function assertDtpRecurringTdAfterAdolescentTdapIsValid() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2031-03-01',
    immunizations: [
      ...fiveDoseChildhoodDtpSeries(),
      dtpDose('adolescent-tdap', '115', '2030-01-01'),
      dtpDose('recurring-td', '09', '2031-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  const recurringTd = forecast.matchedDoses.find(
    (match) => match.immunization.id === 'recurring-td',
  );
  assert.equal(recurringTd?.status, 'valid');
  assert.deepEqual(recurringTd?.reasons, ['RECURRING_TD']);
}

function assertDtpPertussisAge7To10RecommendsAdolescentTdapAt11() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2029-03-01',
    immunizations: [
      ...fiveDoseChildhoodDtpSeries(),
      dtpDose('tdap-age-9', '115', '2029-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '115');
  assert.equal(forecast.recommendation?.earliestRecommendedDate, '2031-01-01');
  assert.equal(forecast.recommendation?.recommendedDate, '2031-01-01');
  assert.equal(forecast.recommendation?.overdueDate, '2033-01-29');
}

function assertDtpFiveDoseException1CompletesWithThreeDoses() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2027-02-01',
    immunizations: [
      dtpDose('dose-1', '20', '2021-01-10'),
      dtpDose('dose-2', '20', '2021-03-01'),
      dtpDose('dose-3-at-4y', '20', '2024-01-10'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 3);
  assert.equal(forecast.nextDoseForecast, undefined);
  assert.deepEqual(forecast.recommendation?.reasons, [
    'ADOLESCENT_TDAP_NEEDED',
  ]);
}

function assertDtpFiveDoseException1ForecastSkipsToDose4() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2027-02-01',
    immunizations: [
      dtpDose('dose-1', '20', '2021-01-10'),
      dtpDose('dose-2-at-4y', '20', '2024-01-10'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 2);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 4);
  assert.deepEqual(forecast.recommendation?.reasons, ['DUE']);
}

function assertDtpFiveDoseException2CompletesWithFourDoses() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2024-02-01',
    immunizations: [
      dtpDose('dose-1', '20', '2020-03-01'),
      dtpDose('dose-2', '20', '2020-05-01'),
      dtpDose('dose-3', '20', '2020-07-01'),
      dtpDose('dose-4-at-4y', '20', '2024-01-10'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 4);
  assert.equal(forecast.nextDoseForecast, undefined);
  assert.deepEqual(forecast.recommendation?.reasons, [
    'ADOLESCENT_TDAP_NEEDED',
  ]);
}

function assertDtpThreeDoseTdOnlySeriesRemainsIncomplete() {
  const forecast = evaluateDtp3({
    birthDate: '2010-01-01',
    evaluationDate: '2020-04-01',
    immunizations: [
      dtpDose('td-1', '09', '2017-01-01'),
      dtpDose('td-2', '09', '2018-01-01'),
      dtpDose('td-3', '09', '2020-01-01'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.completedDoses, 3);
  assert.equal(forecast.nextDoseForecast, undefined);
  assert.deepEqual(forecast.recommendation?.reasons, ['DUE']);
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '115');
}

function assertDtpThreeDosePertussisDoseCompletesSeries() {
  const forecast = evaluateDtp3({
    birthDate: '2010-01-01',
    evaluationDate: '2020-04-01',
    immunizations: [
      dtpDose('td-1', '09', '2017-01-01'),
      dtpDose('td-2', '09', '2018-01-01'),
      dtpDose('td-3', '09', '2020-01-01'),
      dtpDose('tdap-final', '115', '2020-02-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  const finalTdap = forecast.matchedDoses.find(
    (match) => match.immunization.id === 'tdap-final',
  );
  assert.equal(finalTdap?.status, 'valid');
  assert.deepEqual(finalTdap?.reasons, ['PERTUSSIS_COMPLETES_3_DOSE_SERIES']);
}

function assertDtpCompletedNonPertussisSeriesRecommendsImmediateTdap() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2024-04-01',
    immunizations: [
      dtpDose('dt-1', '28', '2020-03-01'),
      dtpDose('dt-2', '28', '2020-05-01'),
      dtpDose('dt-3', '28', '2020-07-01'),
      dtpDose('dt-4', '28', '2021-01-01'),
      dtpDose('dt-5', '28', '2024-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '115');
  assert.equal(forecast.recommendation?.earliestRecommendedDate, '2024-01-01');
  assert.equal(forecast.recommendation?.recommendedDate, '2024-01-01');
}

function assertDtpCompletedPertussisSeriesRecommendsTdapSixMonthsLater() {
  const forecast = evaluateDtp({
    birthDate: '2020-01-01',
    evaluationDate: '2024-04-01',
    immunizations: fiveDoseChildhoodDtpSeries(),
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '115');
  assert.equal(forecast.recommendation?.earliestRecommendedDate, '2024-07-01');
  assert.equal(forecast.recommendation?.recommendedDate, '2024-07-01');
}

function evaluateDtp({
  birthDate = '2020-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'DTP_5_DOSE_SERIES',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected DTP forecast');
  return forecast;
}

function evaluateDtp3({
  birthDate = '2010-01-01',
  evaluationDate = '2020-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'DTP_3_DOSE_SERIES',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected DTP 3-dose forecast');
  return forecast;
}

function selectDtp({
  birthDate = '2020-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'DTP',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function dtpDose(id, cvx, date) {
  return { id, vaccineCode: cvx, date };
}

function fiveDoseChildhoodDtpSeries({ dose5Date = '2024-01-01' } = {}) {
  return [
    dtpDose('dose-1', '20', '2020-03-01'),
    dtpDose('dose-2', '20', '2020-05-01'),
    dtpDose('dose-3', '20', '2020-07-01'),
    dtpDose('dose-4', '20', '2021-01-01'),
    dtpDose('dose-5', '20', dose5Date),
  ];
}
