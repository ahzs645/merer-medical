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
assertPneumococcalAge5NoDosesTargetsAdultDose6At50Years();
assertPneumococcalAge19NoDosesTargetsAdultDose6();
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

function assertPneumococcalAge5NoDosesTargetsAdultDose6At50Years() {
  const forecast = evaluatePneumococcal({
    birthDate: '2020-01-01',
    evaluationDate: '2025-01-01',
  });

  assert.equal(forecast.recommendation.status, 'recommended');
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
