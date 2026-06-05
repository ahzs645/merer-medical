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

assertHepBNoDoseAgeSelectionAndRecommendation();
assertHepBMaximumAgeInsufficientAntigen();
assertHepBHeplisavSelectionRecommendationAndCompletion();
assertHepBHeplisavProgressSelection();
assertHepBAdultDoseAdolescentCompletion();
assertHepBAdult3DoseDose1ToDose3Interval();
assertHepBChild3DoseForecastUsesDose1Interval();
assertHepBChild4DoseUsesDose1AndDose2Intervals();
assertHepBTwinrixSelectionRecommendationAndIntervals();

console.log('ICE HepB rule regression checks passed.');

function assertHepBNoDoseAgeSelectionAndRecommendation() {
  assert.equal(
    selectHepB({ birthDate: '2020-01-01', immunizations: [] })?.selected.series.id,
    'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
  );
  const adult = selectHepB({ birthDate: '1950-01-01', immunizations: [] })?.selected;
  assert.equal(adult?.series.id, 'HEP_B_ADULT_3_DOSE_SERIES');
  assert.deepEqual(adult?.recommendation, {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
  });
}

function assertHepBMaximumAgeInsufficientAntigen() {
  const highRiskInfantUnderMaximumAge = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2006-01-02',
    immunizations: [hepBDose('high-risk-infant-under-max', '42', '2026-01-01')],
  });
  assert.equal(highRiskInfantUnderMaximumAge.matchedDoses.length, 1);

  const highRiskInfantAboveMaximumAge = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2006-01-01',
    immunizations: [hepBDose('high-risk-infant-above-max', '42', '2026-01-01')],
  });
  assert.deepEqual(highRiskInfantAboveMaximumAge.invalidDoses[0]?.reasons, [
    'INSUFFICIENT_ANTIGEN',
  ]);

  const pedsLessThan20AboveMaximumAge = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2006-01-01',
    immunizations: [hepBDose('peds-less-than-20-above-max', '08', '2026-01-01')],
  });
  assert.deepEqual(pedsLessThan20AboveMaximumAge.invalidDoses[0]?.reasons, [
    'INSUFFICIENT_ANTIGEN',
  ]);
}

function assertHepBHeplisavSelectionRecommendationAndCompletion() {
  const selected = selectHepB({
    birthDate: '1980-01-01',
    immunizations: [hepBDose('heplisav-1', '189', '2026-01-01')],
  })?.selected;
  assert.equal(selected?.series.id, 'HEP_B_ADULT_2_DOSE_SERIES');
  assert.equal(selected?.recommendation?.recommendedVaccine?.cvx, '189');

  const complete = evaluateHepB({
    seriesId: 'HEP_B_ADULT_2_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-01-01'),
      hepBDose('heplisav-2', '189', '2026-01-25'),
    ],
  });
  assert.equal(complete.status, 'complete');

  const completeWithInterveningDose = evaluateHepB({
    seriesId: 'HEP_B_ADULT_2_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-01-01'),
      hepBDose('intervening-hepb', '43', '2026-01-15'),
      hepBDose('heplisav-2', '189', '2026-01-29'),
    ],
  });
  assert.equal(completeWithInterveningDose.status, 'complete');
  assert.deepEqual(completeWithInterveningDose.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
  ]);
  assert.equal(
    completeWithInterveningDose.acceptedDoses[0]?.immunization.id,
    'intervening-hepb',
  );
}

function assertHepBHeplisavProgressSelection() {
  const childWinsForLateAdolescent = selectHepB({
    birthDate: '2007-06-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-05-28'),
      hepBDose('child-progress-2', '08', '2026-06-25'),
    ],
  })?.selected;
  assert.equal(
    childWinsForLateAdolescent?.series.id,
    'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
  );
  assert.equal(
    childWinsForLateAdolescent?.selectionReason,
    'HEPB_CVX189_CHILD_MORE_PROGRESS',
  );

  const adult2WinsTieForLateAdolescent = selectHepB({
    birthDate: '2007-06-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-05-28'),
      hepBDose('heplisav-2-too-early', '189', '2026-06-10'),
    ],
  })?.selected;
  assert.equal(
    adult2WinsTieForLateAdolescent?.series.id,
    'HEP_B_ADULT_2_DOSE_SERIES',
  );
  assert.equal(
    adult2WinsTieForLateAdolescent?.selectionReason,
    'HEPB_CVX189_ADULT_2_MORE_OR_EQUAL_PROGRESS_18_TO_19',
  );

  const adult3WinsForAdult = selectHepB({
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-01-01'),
      hepBDose('adult-progress-2', '43', '2026-02-01'),
    ],
  })?.selected;
  assert.equal(adult3WinsForAdult?.series.id, 'HEP_B_ADULT_3_DOSE_SERIES');
  assert.equal(
    adult3WinsForAdult?.selectionReason,
    'HEPB_CVX189_ADULT_3_MORE_PROGRESS',
  );

  const adult2WinsTieForAdult = selectHepB({
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-01-01'),
      hepBDose('heplisav-2-too-early', '189', '2026-01-10'),
    ],
  })?.selected;
  assert.equal(adult2WinsTieForAdult?.series.id, 'HEP_B_ADULT_2_DOSE_SERIES');
  assert.equal(
    adult2WinsTieForAdult?.selectionReason,
    'HEPB_CVX189_ADULT_2_MORE_OR_EQUAL_PROGRESS',
  );

  const heplisavPriorInvalidIntervalException = evaluateHepB({
    seriesId: 'HEP_B_ADULT_2_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-01-01'),
      hepBDose('heplisav-2-too-early', '189', '2026-01-10'),
      hepBDose('heplisav-2-final', '189', '2026-02-05'),
    ],
  });
  assert.equal(heplisavPriorInvalidIntervalException.status, 'complete');
  assert.equal(heplisavPriorInvalidIntervalException.completedDoses, 2);
  assert.equal(heplisavPriorInvalidIntervalException.invalidDoses.length, 0);
  assert.equal(
    heplisavPriorInvalidIntervalException.matchedDoses.some(
      (match) =>
        match.immunization.id === 'heplisav-2-too-early' &&
        match.status === 'valid' &&
        match.reasons.length === 0,
    ),
    true,
  );

  const latestAdult2NonAllowedDose = evaluateHepB({
    seriesId: 'HEP_B_ADULT_2_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('heplisav-1', '189', '2026-01-01'),
      hepBDose('adult-hepb-not-allowed-latest', '43', '2026-02-01'),
    ],
  });
  assert.equal(latestAdult2NonAllowedDose.invalidDoses.length, 1);
  assert.deepEqual(latestAdult2NonAllowedDose.invalidDoses[0]?.reasons, []);

  const earlierAdult2NonAllowedDose = evaluateHepB({
    seriesId: 'HEP_B_ADULT_2_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('adult-hepb-not-allowed-earlier', '43', '2026-01-01'),
      hepBDose('heplisav-1', '189', '2026-02-01'),
    ],
  });
  assert.deepEqual(earlierAdult2NonAllowedDose.invalidDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
}

function assertHepBAdultDoseAdolescentCompletion() {
  const forecast = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2010-01-01',
    immunizations: [
      hepBDose('adult-dose-1', '43', '2022-01-01'),
      hepBDose('adult-dose-2', '43', '2022-05-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 2);
}

function assertHepBAdult3DoseDose1ToDose3Interval() {
  const invalid = evaluateHepB({
    seriesId: 'HEP_B_ADULT_3_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('dose-1', '43', '2026-01-01'),
      hepBDose('dose-2', '43', '2026-02-01'),
      hepBDose('dose-3-too-early', '43', '2026-03-01'),
    ],
  });
  assert.equal(invalid.completedDoses, 2);
  assert.deepEqual(invalid.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const valid = evaluateHepB({
    seriesId: 'HEP_B_ADULT_3_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('dose-1', '43', '2026-01-01'),
      hepBDose('dose-2', '43', '2026-02-01'),
      hepBDose('dose-3', '43', '2026-05-01'),
    ],
  });
  assert.equal(valid.status, 'complete');

  const enoughIsEnough = evaluateHepB({
    seriesId: 'HEP_B_ADULT_3_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('dose-1', '43', '2026-01-01'),
      hepBDose('dose-2', '43', '2026-02-01'),
      hepBDose('dose-3-invalid', '43', '2026-03-01'),
      hepBDose('dose-3-final', '43', '2026-05-01'),
    ],
  });
  assert.equal(enoughIsEnough.status, 'complete');
  assert.equal(enoughIsEnough.completedDoses, 3);
  assert.deepEqual(enoughIsEnough.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertHepBChild3DoseForecastUsesDose1Interval() {
  const forecast = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      hepBDose('dose-1', '08', '2025-01-01'),
      hepBDose('dose-2', '08', '2025-02-01'),
    ],
  });

  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 3);
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-04-23');

  const switched = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      hepBDose('dose-1', '08', '2025-01-01'),
      hepBDose('dose-2', '08', '2025-02-01'),
      hepBDose('dose-3-extra', '08', '2025-02-20'),
    ],
  });
  assert.equal(switched.invalidDoses.length, 0);
  assert.equal(switched.status, 'complete');
  assert.deepEqual(
    switched.matchedDoses.find(
      (match) => match.immunization.id === 'dose-3-extra',
    )?.reasons,
    ['EXTRA_DOSE'],
  );
}

function assertHepBChild4DoseUsesDose1AndDose2Intervals() {
  const forecast = evaluateHepB({
    seriesId: 'HEP_B_4_DOSE_CHILD_ADOLESCENT_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      hepBDose('dose-1', '08', '2025-01-01'),
      hepBDose('dose-2', '08', '2025-01-25'),
      hepBDose('dose-3', '08', '2025-02-18'),
      hepBDose('dose-4', '08', '2025-04-20'),
    ],
  });

  assert.equal(forecast.status, 'complete');
}

function assertHepBTwinrixSelectionRecommendationAndIntervals() {
  assert.equal(
    selectHepB({
      birthDate: '1980-01-01',
      immunizations: [hepBDose('twinrix-1', '104', '2026-01-01')],
    })?.selected.series.id,
    'HEP_B_3_DOSE_TWINRIX_SERIES',
  );
  assert.equal(
    selectHepB({
      birthDate: '1980-01-01',
      immunizations: [
        hepBDose('twinrix-1', '104', '2026-01-01'),
        hepBDose('twinrix-2', '104', '2026-01-08'),
      ],
    })?.selected.series.id,
    'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES',
  );
  assert.equal(
    selectHepB({
      birthDate: '1980-01-01',
      immunizations: [
        hepBDose('accelerated-twinrix-1', '104', '2026-01-01'),
        hepBDose('accelerated-twinrix-2', '104', '2026-01-08'),
      ],
    })?.selected.selectionReason,
    'HEPB_ACCELERATED_TWINRIX',
  );

  const childThreeDoseOverride = selectHepB({
    birthDate: '2007-06-01',
    immunizations: [
      hepBDose('child-twinrix-1', '104', '2026-05-28'),
      hepBDose('child-twinrix-2', '104', '2026-06-04'),
      hepBDose('child-dose-2-progress', '08', '2026-07-02'),
      hepBDose('child-dose-3-progress', '08', '2026-10-01'),
    ],
  })?.selected;
  assert.equal(
    childThreeDoseOverride?.series.id,
    'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
  );

  const adultThreeDoseOverride = selectHepB({
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('adult-twinrix-1', '104', '2026-01-01'),
      hepBDose('adult-twinrix-2', '104', '2026-01-08'),
      hepBDose('adult-dose-2-progress', '43', '2026-02-05'),
      hepBDose('adult-dose-3-progress', '43', '2026-05-01'),
    ],
  })?.selected;
  assert.equal(adultThreeDoseOverride?.series.id, 'HEP_B_ADULT_3_DOSE_SERIES');

  const childOverride = selectHepB({
    birthDate: '2007-06-01',
    immunizations: [
      hepBDose('twinrix-1', '104', '2026-05-28'),
      hepBDose('twinrix-2', '104', '2026-06-04'),
      hepBDose('child-dose-2', '08', '2026-07-02'),
    ],
  })?.selected;
  assert.equal(
    childOverride?.series.id,
    'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
  );
  assert.equal(
    childOverride?.selectionReason,
    'HEPB_TWINRIX_OVERRIDE_CHILD_FEWER_REMAINING',
  );
  assert.equal(
    childOverride?.acceptedDoses.some(
      (match) =>
        match.immunization.id === 'twinrix-2' &&
        match.reasons.includes(
          'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
        ),
    ),
    true,
  );

  const adultOverride = selectHepB({
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('twinrix-1', '104', '2026-01-01'),
      hepBDose('twinrix-2', '104', '2026-01-08'),
      hepBDose('adult-dose-2', '43', '2026-02-05'),
    ],
  })?.selected;
  assert.equal(adultOverride?.series.id, 'HEP_B_ADULT_3_DOSE_SERIES');
  assert.equal(
    adultOverride?.selectionReason,
    'HEPB_TWINRIX_OVERRIDE_ADULT_3_FEWER_REMAINING',
  );
  assert.equal(
    adultOverride?.acceptedDoses.some(
      (match) =>
        match.immunization.id === 'twinrix-2' &&
        match.reasons.includes(
          'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
        ),
    ),
    true,
  );

  const twinrix3 = evaluateHepB({
    seriesId: 'HEP_B_3_DOSE_TWINRIX_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('twinrix-1', '104', '2026-01-01'),
      hepBDose('twinrix-2', '104', '2026-02-01'),
    ],
  });
  assert.equal(twinrix3.nextDoseForecast?.recommendedDate, '2026-07-01');
  assert.equal(twinrix3.recommendation?.recommendedVaccine?.cvx, '104');
  assert.deepEqual(twinrix3.recommendation?.supplementalText, [
    'HEP_B_3DOSE_TWINRIX_ALT_VACCINE',
  ]);

  const twinrix4 = evaluateHepB({
    seriesId: 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepBDose('twinrix-1', '104', '2025-01-01'),
      hepBDose('twinrix-2', '104', '2025-01-08'),
      hepBDose('twinrix-3', '104', '2025-01-22'),
    ],
  });
  assert.equal(twinrix4.nextDoseForecast?.recommendedDate, '2026-01-01');
  assert.equal(twinrix4.recommendation?.recommendedVaccine?.cvx, '104');
}

function evaluateHepB({
  seriesId,
  birthDate = '2000-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected HepB forecast');
  return forecast;
}

function selectHepB({
  birthDate = '1980-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'HEP_B',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function hepBDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Hep B',
    vaccineCode,
    date,
  };
}
