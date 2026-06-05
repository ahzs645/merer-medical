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

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertPneumococcalAdultPcv20CompletesSeries();
assertPneumococcalAdultPcv21CompletesSeries();
assertPneumococcalAdultPcv15AndPpsv23CompletesSeries();
assertPneumococcalAdultSameDayPcv21Preferred();
assertPneumococcalAdultSameDayPcv20PreferredOverPpsv23();
assertPneumococcalAdultSameDayPpsv23PreferredOverPcv15();
assertPneumococcalAdultSameDayPcv15PreferredOverPcv13();
assertPneumococcalSameDayPcv13PreferredOverPcv10();
assertPneumococcalChildSameDayPcv13PreferredOverPcv7After2010();
assertPneumococcalChildSameDayPcv7PreferredOverPcv13Before2010();
assertPneumococcalChildSameDayPcv10PreferredOverPcv7After2009();
assertPneumococcalChildSameDayPcv7PreferredOverPcv10Before2009();
assertPneumococcalAge5NoDosesTargetsAdultDose6At50Years();
assertPneumococcalAge19NoDosesTargetsAdultDose6();
assertPneumococcalAdultNoDosesRecommendsPcv15Pcv20OrPcv21();
assertPneumococcalAdultPcv13OnlyRecommendsPcv20OrPcv21();
assertPneumococcalAdultPcvThenPpsvRecommendation();
assertPneumococcalAdultPcvThenPpsvRecommendationInterval1Year();
assertPneumococcalAdultPpsvThenPcvThenPpsvRecommendationInterval5Years();
assertPneumococcalAdultPcv13Ppsv23At65ConditionalCompleteRecommendation();
assertPneumococcalAge5ShotEvaluatesAsAdultDose6();
assertPneumococcalAdultDose7AfterPpsvRequiresPcv();
assertPneumococcalAdultDose7AfterPcvRequiresPpsvOrPcv20Or21();
assertPneumococcalAdultDose8RejectsPcv13();
assertPneumococcalAdultDose8Pcv13AcceptedOutsideRoutine();
assertPneumococcalAdultPpsv23At65WithPcvCompletesSeries();
assertPneumococcalAdultPcv7AcceptedAtAge5();
assertPneumococcalAdultPcv7IgnoredForDoseProgressAtAge19();
assertPneumococcalAdultUnspecifiedCvx109InvalidWithSupplementalText();
assertPneumococcalAdultUnspecifiedCvx152InvalidWithSupplementalText();
assertPneumococcalChildPpsv23AcceptedNotPartOfSeries();
assertPneumococcalChildFourEffectiveDosesCompleteSeries();
assertPneumococcalChildCompleteExtraPpsv23AcceptedNotPartOfSeries();
assertPneumococcalChildPpsv23DoesNotBlockSameDayPcv();
assertPneumococcalChildPpsv23Under2RecommendationInterval0Days();
assertPneumococcalChildPpsv23Age2RecommendationInterval56Days();
assertPneumococcalChildExtraPcvAcceptedExtraDose();
assertPneumococcalChildModernPcvNeededAfterCompletionValidAt52Days();
assertPneumococcalChildModernPcvNeededAfterCompletionInvalidBefore52Days();
assertPneumococcalChildCompleteWithoutModernPcvRecommendsModernPcv();
assertPneumococcalChildCompleteWithoutModernPcvAfterAge5ConditionalHighRisk();
assertPneumococcalChildNoDoseAge7MonthsTargetsDose2();
assertPneumococcalChildOneDoseBefore7MonthsTargetsDose3();
assertPneumococcalChildNoDoseAge12MonthsTargetsDose3();
assertPneumococcalChildTwoDosesBefore12MonthsTargetsDose4();
assertPneumococcalChildNoDoseAge24MonthsTargetsDose4();
assertPneumococcalChildDoseAt7MonthsEvaluatesAsDose2();
assertPneumococcalChildDoseAt7MonthsAfterPriorInfantDoseEvaluatesAsDose3();
assertPneumococcalChildDoseAt12MonthsEvaluatesAsDose3();
assertPneumococcalChildDoseAt12MonthsAfterTwoInfantDosesEvaluatesAsDose4();
assertPneumococcalChildDoseAt24MonthsEvaluatesAsDose4();

console.log('ICE Pneumococcal rule regression checks passed.');

function assertPneumococcalAdultPcv20CompletesSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2024-02-01',
    immunizations: [pneumococcalDose('pcv20', '216', '2024-01-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.completedDoses, 1);
}

function assertPneumococcalAdultPcv21CompletesSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [pneumococcalDose('pcv21', '327', '2025-01-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.completedDoses, 1);
}

function assertPneumococcalAdultPcv15AndPpsv23CompletesSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [
      pneumococcalDose('pcv15', '215', '2024-01-01'),
      pneumococcalDose('ppsv23', '33', '2025-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 7);
  assert.equal(forecast.completedDoses, 2);
}

function assertPneumococcalAdultSameDayPcv21Preferred() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [
      pneumococcalDose('pcv20-same-day', '216', '2025-01-01'),
      pneumococcalDose('pcv21-same-day', '327', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv21-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv20-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalAdultSameDayPcv20PreferredOverPpsv23() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [
      pneumococcalDose('ppsv23-same-day', '33', '2025-01-01'),
      pneumococcalDose('pcv20-same-day', '216', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv20-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'ppsv23-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalAdultSameDayPpsv23PreferredOverPcv15() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [
      pneumococcalDose('pcv15-same-day', '215', '2025-01-01'),
      pneumococcalDose('ppsv23-same-day', '33', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'ppsv23-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv15-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalAdultSameDayPcv15PreferredOverPcv13() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [
      pneumococcalDose('pcv13-same-day', '133', '2025-01-01'),
      pneumococcalDose('pcv15-same-day', '215', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv15-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv13-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalSameDayPcv13PreferredOverPcv10() {
  const forecast = evaluatePneumococcal({
    birthDate: '2009-01-01',
    evaluationDate: '2009-05-01',
    immunizations: [
      pneumococcalDose('pcv10-same-day', '152', '2009-04-01'),
      pneumococcalDose('pcv13-same-day', '133', '2009-04-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv13-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv10-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalChildSameDayPcv13PreferredOverPcv7After2010() {
  const forecast = evaluatePneumococcal({
    birthDate: '2010-01-01',
    evaluationDate: '2010-08-01',
    immunizations: [
      pneumococcalDose('pcv7-same-day', '100', '2010-07-01'),
      pneumococcalDose('pcv13-same-day', '133', '2010-07-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv13-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv7-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalChildSameDayPcv7PreferredOverPcv13Before2010() {
  const forecast = evaluatePneumococcal({
    birthDate: '2009-01-01',
    evaluationDate: '2010-03-01',
    immunizations: [
      pneumococcalDose('pcv13-same-day', '133', '2010-02-01'),
      pneumococcalDose('pcv7-same-day', '100', '2010-02-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv7-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv13-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalChildSameDayPcv10PreferredOverPcv7After2009() {
  const forecast = evaluatePneumococcal({
    birthDate: '2009-01-01',
    evaluationDate: '2009-05-01',
    immunizations: [
      pneumococcalDose('pcv7-same-day', '100', '2009-04-01'),
      pneumococcalDose('pcv10-same-day', '152', '2009-04-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv10-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv7-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalChildSameDayPcv7PreferredOverPcv10Before2009() {
  const forecast = evaluatePneumococcal({
    birthDate: '2008-01-01',
    evaluationDate: '2009-03-01',
    immunizations: [
      pneumococcalDose('pcv10-same-day', '152', '2009-02-01'),
      pneumococcalDose('pcv7-same-day', '100', '2009-02-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv7-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv10-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertPneumococcalAge5NoDosesTargetsAdultDose6At50Years() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2025-01-01',
  });

  assert.equal(forecast.recommendation.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation.reasons, ['HIGH_RISK']);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 6);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2070-01-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2070-01-01');
}

function assertPneumococcalAge19NoDosesTargetsAdultDose6() {
  const forecast = evaluatePneumococcal({
    birthDate: '2006-01-01',
    evaluationDate: '2025-01-01',
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 6);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-01-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-01-01');
}

function assertPneumococcalAdultNoDosesRecommendsPcv15Pcv20OrPcv21() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.deepEqual(forecast.recommendation.reasons, [
    'ADMINISTER_PCV15_PCV20_OR_PCV21',
  ]);
  assert.equal(forecast.recommendation.recommendedVaccine, undefined);
}

function assertPneumococcalAdultPcv13OnlyRecommendsPcv20OrPcv21() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [pneumococcalDose('pcv13', '133', '2020-01-01')],
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.deepEqual(forecast.recommendation.reasons, [
    'ADMINISTER_PCV20_OR_PCV21',
  ]);
  assert.equal(forecast.recommendation.recommendedVaccine, undefined);
}

function assertPneumococcalAdultPcvThenPpsvRecommendation() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [pneumococcalDose('pcv15', '215', '2024-01-01')],
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.recommendation.recommendedVaccine?.cvx, '33');
  assert.deepEqual(forecast.recommendation.reasons, [
    'DUE',
    'SUPPLEMENTAL_TEXT',
  ]);
  assert.deepEqual(forecast.recommendation.supplementalText, [
    'PNEUMOCOCCAL_PPSV23_AFTER_PCV',
  ]);
}

function assertPneumococcalAdultPcvThenPpsvRecommendationInterval1Year() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [pneumococcalDose('pcv15', '215', '2024-03-01')],
  });

  assert.equal(forecast.recommendation.recommendedVaccine?.cvx, '33');
  assert.equal(forecast.recommendation.earliestRecommendedDate, '2025-03-01');
  assert.equal(forecast.recommendation.recommendedDate, '2025-03-01');
}

function assertPneumococcalAdultPpsvThenPcvThenPpsvRecommendationInterval5Years() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [
      pneumococcalDose('ppsv23', '33', '2020-03-01'),
      pneumococcalDose('pcv15', '215', '2024-03-01'),
    ],
  });

  assert.equal(forecast.recommendation.recommendedVaccine?.cvx, '33');
  assert.equal(forecast.recommendation.earliestRecommendedDate, '2025-03-01');
  assert.equal(forecast.recommendation.recommendedDate, '2025-03-01');
}

function assertPneumococcalAdultPcv13Ppsv23At65ConditionalCompleteRecommendation() {
  const forecast = evaluatePneumococcal({
    birthDate: '1950-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      pneumococcalDose('pcv13', '133', '2020-01-01'),
      pneumococcalDose('ppsv23-at-65', '33', '2016-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation.reasons, [
    'COMPLETE',
    'CLINICAL_PATIENT_DISCRETION',
    'SUPPLEMENTAL_TEXT',
  ]);
}

function assertPneumococcalAge5ShotEvaluatesAsAdultDose6() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [pneumococcalDose('pcv-age-5', '133', '2025-01-01')],
  });

  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 6);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_AGE',
  ]);
}

function assertPneumococcalAdultDose7AfterPpsvRequiresPcv() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2026-02-01',
    immunizations: [
      pneumococcalDose('ppsv-dose-6', '33', '2024-01-01'),
      pneumococcalDose('ppsv-dose-7', '33', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'ppsv-dose-7');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 7);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
}

function assertPneumococcalAdultDose7AfterPcvRequiresPpsvOrPcv20Or21() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2026-02-01',
    immunizations: [
      pneumococcalDose('pcv13-dose-6', '133', '2024-01-01'),
      pneumococcalDose('pcv13-dose-7', '133', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv13-dose-7');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 7);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
}

function assertPneumococcalAdultDose8RejectsPcv13() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2027-02-01',
    immunizations: [
      pneumococcalDose('pcv13-dose-6', '133', '2024-01-01'),
      pneumococcalDose('ppsv-dose-7', '33', '2025-01-01'),
      pneumococcalDose('pcv13-dose-8', '133', '2026-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 7);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv13-dose-8');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 8);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
}

function assertPneumococcalAdultDose8Pcv13AcceptedOutsideRoutine() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      pneumococcalDose('pcv13-dose-6', '133', '2009-01-01'),
      pneumococcalDose('ppsv-before-50-dose-7', '33', '2010-01-01'),
      pneumococcalDose('pcv13-dose-8', '133', '2011-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 7);
  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'pcv13-dose-8');
  assert.equal(forecast.acceptedDoses[0]?.dose.doseNumber, 8);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);
}

function assertPneumococcalAdultPpsv23At65WithPcvCompletesSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '1950-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      pneumococcalDose('ppsv-at-65', '33', '2016-01-01'),
      pneumococcalDose('pcv13', '133', '2020-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 7);
  assert.equal(forecast.completedDoses, 2);
}

function assertPneumococcalAdultPcv7AcceptedAtAge5() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [pneumococcalDose('pcv7-age5', '100', '2025-01-01')],
  });

  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'pcv7-age5');
  assert.equal(forecast.acceptedDoses[0]?.dose.doseNumber, 6);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
    'OUTSIDE_ROUTINE_SERIES',
  ]);
  assert.equal(forecast.completedDoses, 0);
}

function assertPneumococcalAdultPcv7IgnoredForDoseProgressAtAge19() {
  const forecast = evaluatePneumococcal({
    birthDate: '2000-01-01',
    evaluationDate: '2026-01-01',
    immunizations: [
      pneumococcalDose('pcv7-age20', '100', '2020-01-01'),
      pneumococcalDose('pcv13-after-pcv7', '133', '2021-01-01'),
    ],
  });

  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'pcv7-age20');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv13-after-pcv7');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 6);
}

function assertPneumococcalAdultUnspecifiedCvx109InvalidWithSupplementalText() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [pneumococcalDose('pneumo-nos', '109', '2024-01-01')],
  });

  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pneumo-nos');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 6);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
  assert.deepEqual(forecast.invalidDoses[0]?.supplementalText, [
    'PNEUMOCOCCAL_UNSPECIFIED_CVX',
  ]);
}

function assertPneumococcalAdultUnspecifiedCvx152InvalidWithSupplementalText() {
  const forecast = evaluatePneumococcal({
    birthDate: '1970-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [pneumococcalDose('pcv-nos', '152', '2024-01-01')],
  });

  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pcv-nos');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 6);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
  assert.deepEqual(forecast.invalidDoses[0]?.supplementalText, [
    'PNEUMOCOCCAL_UNSPECIFIED_CVX',
  ]);
}

function assertPneumococcalChildPpsv23AcceptedNotPartOfSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-04-01',
    immunizations: [pneumococcalDose('ppsv23-child', '33', '2024-03-01')],
  });

  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'ppsv23-child');
  assert.equal(forecast.acceptedDoses[0]?.dose.doseNumber, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_PART_OF_THIS_SERIES',
  ]);
}

function assertPneumococcalChildFourEffectiveDosesCompleteSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2021-02-01',
    immunizations: [
      pneumococcalDose('pcv1', '133', '2020-03-01'),
      pneumococcalDose('pcv2', '133', '2020-05-01'),
      pneumococcalDose('pcv3', '133', '2020-07-01'),
      pneumococcalDose('pcv4', '133', '2021-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 4);
}

function assertPneumococcalChildCompleteExtraPpsv23AcceptedNotPartOfSeries() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2021-07-01',
    immunizations: [
      pneumococcalDose('pcv1', '133', '2020-03-01'),
      pneumococcalDose('pcv2', '133', '2020-05-01'),
      pneumococcalDose('pcv3', '133', '2020-07-01'),
      pneumococcalDose('pcv4', '133', '2021-01-01'),
      pneumococcalDose('ppsv-extra', '33', '2021-06-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'ppsv-extra');
  assert.equal(forecast.acceptedDoses[0]?.dose.doseNumber, 4);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_PART_OF_THIS_SERIES',
  ]);
}

function assertPneumococcalChildPpsv23DoesNotBlockSameDayPcv() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-04-01',
    immunizations: [
      pneumococcalDose('ppsv23-child', '33', '2024-03-01'),
      pneumococcalDose('pcv-same-day', '133', '2024-03-01'),
    ],
  });

  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'ppsv23-child');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pcv-same-day');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
}

function assertPneumococcalChildPpsv23Under2RecommendationInterval0Days() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-04-01',
    immunizations: [pneumococcalDose('ppsv23-child', '33', '2024-03-10')],
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2024-03-10');
  assert.equal(
    forecast.nextDoseForecast?.earliestRecommendedDate,
    '2024-03-10',
  );
}

function assertPneumococcalChildPpsv23Age2RecommendationInterval56Days() {
  const forecast = evaluatePneumococcal({
    birthDate: '2022-01-01',
    evaluationDate: '2024-04-01',
    immunizations: [pneumococcalDose('ppsv23-child', '33', '2024-03-01')],
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2024-04-26');
  assert.equal(
    forecast.nextDoseForecast?.earliestRecommendedDate,
    '2024-04-26',
  );
}

function assertPneumococcalChildExtraPcvAcceptedExtraDose() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2021-07-01',
    immunizations: [
      pneumococcalDose('pcv1', '133', '2020-03-01'),
      pneumococcalDose('pcv2', '133', '2020-05-01'),
      pneumococcalDose('pcv3', '133', '2020-07-01'),
      pneumococcalDose('pcv4', '133', '2021-01-01'),
      pneumococcalDose('pcv-extra', '133', '2021-06-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 4);
  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'pcv-extra');
  assert.equal(forecast.acceptedDoses[0]?.dose.doseNumber, 5);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, ['EXTRA_DOSE']);
}

function assertPneumococcalChildModernPcvNeededAfterCompletionValidAt52Days() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2021-04-01',
    immunizations: [
      pneumococcalDose('pcv7-1', '100', '2020-03-01'),
      pneumococcalDose('pcv7-2', '100', '2020-05-01'),
      pneumococcalDose('pcv7-3', '100', '2020-07-01'),
      pneumococcalDose('pcv7-4', '100', '2021-01-01'),
      pneumococcalDose('pcv13-needed', '133', '2021-03-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 5);
  assert.equal(forecast.matchedDoses[4]?.immunization.id, 'pcv13-needed');
  assert.equal(forecast.matchedDoses[4]?.dose.doseNumber, 5);
}

function assertPneumococcalChildModernPcvNeededAfterCompletionInvalidBefore52Days() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2021-02-01',
    immunizations: [
      pneumococcalDose('pcv7-1', '100', '2020-03-01'),
      pneumococcalDose('pcv7-2', '100', '2020-05-01'),
      pneumococcalDose('pcv7-3', '100', '2020-07-01'),
      pneumococcalDose('pcv7-4', '100', '2021-01-01'),
      pneumococcalDose('pcv13-needed-too-soon', '133', '2021-01-15'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(
    forecast.invalidDoses[0]?.immunization.id,
    'pcv13-needed-too-soon',
  );
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 5);
  assert.ok(
    forecast.invalidDoses[0]?.reasons.includes('BELOW_MINIMUM_INTERVAL'),
  );
}

function assertPneumococcalChildCompleteWithoutModernPcvRecommendsModernPcv() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2021-03-01',
    immunizations: [
      pneumococcalDose('pcv7-1', '100', '2020-03-01'),
      pneumococcalDose('pcv7-2', '100', '2020-05-01'),
      pneumococcalDose('pcv7-3', '100', '2020-07-01'),
      pneumococcalDose('pcv7-4', '100', '2021-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation.status, 'recommended');
  assert.deepEqual(forecast.recommendation.reasons, ['DUE']);
  assert.equal(forecast.recommendation.recommendedDate, '2021-02-22');
}

function assertPneumococcalChildCompleteWithoutModernPcvAfterAge5ConditionalHighRisk() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2024-12-20',
    immunizations: [
      pneumococcalDose('pcv7-1', '100', '2020-03-01'),
      pneumococcalDose('pcv7-2', '100', '2020-05-01'),
      pneumococcalDose('pcv7-3', '100', '2020-07-01'),
      pneumococcalDose('pcv7-4-late', '100', '2024-12-15'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation.reasons, ['HIGH_RISK']);
}

function assertPneumococcalChildNoDoseAge7MonthsTargetsDose2() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-08-15',
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2024-08-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2024-08-01');
}

function assertPneumococcalChildNoDoseAge12MonthsTargetsDose3() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2025-01-15',
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 3);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-01-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-01-01');
}

function assertPneumococcalChildOneDoseBefore7MonthsTargetsDose3() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-08-15',
    immunizations: [pneumococcalDose('pcv-before-7m', '133', '2024-03-01')],
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 3);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2024-08-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2024-08-01');
}

function assertPneumococcalChildNoDoseAge24MonthsTargetsDose4() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2026-01-15',
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 4);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2026-01-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-01-01');
}

function assertPneumococcalChildTwoDosesBefore12MonthsTargetsDose4() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2025-01-15',
    immunizations: [
      pneumococcalDose('pcv-before-12m-a', '133', '2024-03-01'),
      pneumococcalDose('pcv-before-12m-b', '133', '2024-05-01'),
    ],
  });

  assert.equal(forecast.recommendation.status, 'recommended');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 4);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-01-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-01-01');
}

function assertPneumococcalChildDoseAt7MonthsEvaluatesAsDose2() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-09-01',
    immunizations: [pneumococcalDose('pcv-at-7m', '133', '2024-08-01')],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 2);
  assert.equal(forecast.completedDoses, 1);
}

function assertPneumococcalChildDoseAt7MonthsAfterPriorInfantDoseEvaluatesAsDose3() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2024-09-01',
    immunizations: [
      pneumococcalDose('pcv-before-7m', '133', '2024-03-01'),
      pneumococcalDose('pcv-at-7m', '133', '2024-08-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 3);
  assert.equal(forecast.completedDoses, 2);
}

function assertPneumococcalChildDoseAt12MonthsEvaluatesAsDose3() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [pneumococcalDose('pcv-at-12m', '133', '2025-01-01')],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 3);
  assert.equal(forecast.completedDoses, 1);
}

function assertPneumococcalChildDoseAt12MonthsAfterTwoInfantDosesEvaluatesAsDose4() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2025-02-01',
    immunizations: [
      pneumococcalDose('pcv-before-12m-a', '133', '2024-03-01'),
      pneumococcalDose('pcv-before-12m-b', '133', '2024-05-01'),
      pneumococcalDose('pcv-at-12m', '133', '2025-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[2]?.dose.doseNumber, 4);
  assert.equal(forecast.completedDoses, 3);
}

function assertPneumococcalChildDoseAt24MonthsEvaluatesAsDose4() {
  const forecast = evaluatePneumococcal({
    birthDate: '2024-01-01',
    evaluationDate: '2026-02-01',
    immunizations: [pneumococcalDose('pcv-at-24m', '133', '2026-01-01')],
  });

  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 4);
  assert.equal(forecast.completedDoses, 1);
}

function evaluatePneumococcal({
  birthDate = '1970-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'PNEUMOCOCCAL_SERIES',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Pneumococcal forecast');
  return forecast;
}

function pneumococcalDose(id, cvx, date) {
  return { id, vaccineCode: cvx, date };
}
