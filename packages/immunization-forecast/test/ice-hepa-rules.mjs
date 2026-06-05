import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.argv[2] ?? process.cwd();
const compiledRoot = join(
  repoRoot,
  'dist/out-tsc/packages/immunization-forecast/src',
);

const { evaluateIceSeries, selectIceSeries, selectIceSeriesForGroups } = await import(
  pathToFileURL(join(compiledRoot, 'iceSeriesEvaluator.js'))
);
const { iceDatasetPathsFromRepoRoot } = await import(
  pathToFileURL(join(compiledRoot, 'icePaths.js'))
);
const { loadIceDataset } = await import(
  pathToFileURL(join(compiledRoot, 'iceYaml.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertHepASameDayAdultProductWinsForAdults();
assertHepASameDayPediatricProductWinsForChildren();
assertHepAAdultNoDoseConditionalHighRisk();
assertHepATwoDoseIgnoresInvalidDoseForDose1Interval();
assertHepAThreeDoseCompletesWithTwoChildDosesSixMonthsApart();
assertHepAThreeDoseDose3UsesDose1SixMonthInterval();
assertHepAAcceleratedTwinrixDose4UsesDose1TwelveMonthInterval();
assertHepAAcceleratedTwinrixRecommendation();
assertHepAThreeDoseTwinrixRecommendationSyncsWithHepB();
assertHepASeriesSelection();
assertHepATwinrixSwitchesToThreeDoseSeries();
assertHepASelectionAcceptedBacktracking();
assertHepAHepBTwinrixCoordination();

console.log('ICE HepA rule regression checks passed.');

function assertHepASameDayAdultProductWinsForAdults() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('ped-same-day', '83', '2026-01-01'),
      hepADose('adult-same-day', '52', '2026-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'adult-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'ped-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertHepASameDayPediatricProductWinsForChildren() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      hepADose('adult-same-day', '52', '2022-01-01'),
      hepADose('ped-same-day', '83', '2022-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'ped-same-day');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'adult-same-day');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertHepAAdultNoDoseConditionalHighRisk() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    birthDate: '1980-01-01',
    immunizations: [],
  });

  assert.deepEqual(forecast.recommendation, {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
  });
}

function assertHepATwoDoseIgnoresInvalidDoseForDose1Interval() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    birthDate: '2020-01-01',
    immunizations: [
      hepADose('dose-1', '83', '2022-01-01'),
      hepADose('invalid-too-early', '83', '2022-02-01'),
      hepADose('dose-2', '83', '2022-07-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 2);
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'invalid-too-early');

  const adultForecast = evaluateHepA({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('adult-dose-1', '52', '2025-01-01'),
      hepADose('pediatric-above-max', '83', '2025-02-01'),
      hepADose('adult-dose-2', '52', '2025-07-01'),
    ],
  });
  assert.equal(adultForecast.status, 'complete');
  assert.equal(adultForecast.completedDoses, 2);
  assert.equal(
    adultForecast.invalidDoses[0]?.immunization.id,
    'pediatric-above-max',
  );
  assert.equal(
    adultForecast.invalidDoses[0]?.reasons.includes('ABOVE_MAXIMUM_AGE_VACCINE'),
    true,
  );
}

function assertHepAThreeDoseCompletesWithTwoChildDosesSixMonthsApart() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_ADULT_3_DOSE_SERIES',
    birthDate: '2010-01-01',
    immunizations: [
      hepADose('dose-1', '83', '2022-01-01'),
      hepADose('dose-2', '83', '2022-07-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 2);
}

function assertHepAThreeDoseDose3UsesDose1SixMonthInterval() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_ADULT_3_DOSE_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('dose-1', '104', '2026-01-01'),
      hepADose('dose-2', '104', '2026-05-15'),
      hepADose('dose-3', '104', '2026-07-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 3);
}

function assertHepAAcceleratedTwinrixDose4UsesDose1TwelveMonthInterval() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('dose-1', '104', '2025-01-01'),
      hepADose('dose-2', '104', '2025-01-08'),
      hepADose('dose-3', '104', '2025-01-22'),
      hepADose('dose-4', '104', '2026-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 4);
}

function assertHepAAcceleratedTwinrixRecommendation() {
  const forecast = evaluateHepA({
    seriesId: 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES',
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('dose-1', '104', '2025-01-01'),
      hepADose('dose-2', '104', '2025-01-08'),
      hepADose('dose-3', '104', '2025-01-22'),
    ],
  });

  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 4);
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-01-01');
  assert.equal(forecast.recommendation?.recommendedVaccine?.cvx, '104');
  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'HEP_A_3DOSE_TWINRIX_ALT_VACCINE',
  ]);
}

function assertHepAThreeDoseTwinrixRecommendationSyncsWithHepB() {
  const forecasts = evaluateIceSeries({
    dataset,
    evaluationDate: '2025-01-10',
    patient: { birthDate: '1980-01-01' },
    immunizations: [hepADose('twinrix-dose-1', '104', '2025-01-01')],
  });
  const hepAThreeDose = forecasts.find(
    (forecast) => forecast.series.id === 'HEP_A_ADULT_3_DOSE_SERIES',
  );

  assert.equal(hepAThreeDose?.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(hepAThreeDose?.nextDoseForecast?.recommendedDate, '2025-01-29');
  assert.equal(hepAThreeDose?.recommendation?.recommendedVaccine?.cvx, '104');
  assert.deepEqual(hepAThreeDose?.recommendation?.supplementalText, [
    'HEP_A_3DOSE_TWINRIX_ALT_VACCINE',
  ]);
}

function assertHepASeriesSelection() {
  assert.equal(selectHepA({ immunizations: [] })?.selected.series.id, 'HEP_A_2_DOSE_CHILD_ADULT_SERIES');
  assert.equal(
    selectHepA({
      immunizations: [hepADose('twinrix-dose-1', '104', '2026-01-01')],
    })?.selected.series.id,
    'HEP_A_ADULT_3_DOSE_SERIES',
  );
  assert.equal(
    selectHepA({
      immunizations: [
        hepADose('twinrix-dose-1', '104', '2026-01-01'),
        hepADose('twinrix-dose-2', '104', '2026-01-08'),
      ],
    })?.selected.series.id,
    'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES',
  );
  assert.equal(
    selectHepA({
      immunizations: [
        hepADose('accelerated-twinrix-dose-1', '104', '2026-01-01'),
        hepADose('accelerated-twinrix-dose-2', '104', '2026-01-08'),
      ],
    })?.selected.selectionReason,
    'HEPA_ACCELERATED_TWINRIX',
  );
}

function assertHepATwinrixSwitchesToThreeDoseSeries() {
  assert.equal(
    selectHepA({
      birthDate: '1980-01-01',
      immunizations: [hepADose('adult-twinrix-dose-1', '104', '2025-01-01')],
    })?.selected.series.id,
    'HEP_A_ADULT_3_DOSE_SERIES',
  );

  assert.equal(
    selectHepA({
      birthDate: '1980-01-01',
      immunizations: [
        hepADose('adult-dose-1', '52', '2025-01-01'),
        hepADose('adult-twinrix-dose-2', '104', '2025-02-01'),
      ],
    })?.selected.series.id,
    'HEP_A_ADULT_3_DOSE_SERIES',
  );

  assert.equal(
    selectHepA({
      birthDate: '2007-01-01',
      immunizations: [
        hepADose('near-adult-twinrix-dose-1', '104', '2024-12-29'),
        hepADose('near-adult-twinrix-dose-2', '104', '2025-01-22'),
      ],
    })?.selected.series.id,
    'HEP_A_ADULT_3_DOSE_SERIES',
  );
}

function assertHepASelectionAcceptedBacktracking() {
  const threeDoseSelected = selectHepA({
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('twinrix-dose-1', '104', '2026-01-01'),
      hepADose('accelerated-twinrix-dose-2', '104', '2026-01-08'),
      hepADose('adult-three-dose-dose-2', '52', '2026-02-05'),
      hepADose('adult-three-dose-dose-3', '52', '2026-07-01'),
    ],
  })?.selected;
  assert.equal(threeDoseSelected?.series.id, 'HEP_A_ADULT_3_DOSE_SERIES');
  assert.equal(
    threeDoseSelected?.acceptedDoses.some(
      (match) =>
        match.immunization.id === 'accelerated-twinrix-dose-2' &&
        match.reasons.includes(
          'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
        ),
    ),
    true,
  );

  const twoDoseSelected = selectHepA({
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('adult-dose-1', '52', '2026-01-01'),
      hepADose('adult-too-early-dose-2', '52', '2026-01-08'),
      hepADose('twinrix-invalid-in-two-dose', '104', '2026-01-15'),
    ],
  })?.selected;
  assert.equal(twoDoseSelected?.series.id, 'HEP_A_2_DOSE_CHILD_ADULT_SERIES');
  assert.equal(
    twoDoseSelected?.acceptedDoses.some(
      (match) =>
        match.immunization.id === 'twinrix-invalid-in-two-dose' &&
        match.reasons.includes(
          'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
        ),
    ),
    true,
  );
}

function assertHepAHepBTwinrixCoordination() {
  const childTwinrix = selectHepAHepB({
    birthDate: '2020-01-01',
    immunizations: [hepADose('child-twinrix-dose-1', '104', '2026-01-01')],
  });
  assert.equal(
    selectionFor(childTwinrix, 'HEP_A')?.selected.series.id,
    'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
  );
  assert.notEqual(
    selectionFor(childTwinrix, 'HEP_B')?.selected.series.id,
    'HEP_B_3_DOSE_TWINRIX_SERIES',
  );

  const adultTwinrix3 = selectHepAHepB({
    birthDate: '1980-01-01',
    immunizations: [hepADose('adult-twinrix-dose-1', '104', '2026-01-01')],
  });
  assert.equal(
    selectionFor(adultTwinrix3, 'HEP_A')?.selected.series.id,
    'HEP_A_ADULT_3_DOSE_SERIES',
  );
  assert.equal(
    selectionFor(adultTwinrix3, 'HEP_B')?.selected.series.id,
    'HEP_B_3_DOSE_TWINRIX_SERIES',
  );

  const adultTwinrix4 = selectHepAHepB({
    birthDate: '1980-01-01',
    immunizations: [
      hepADose('adult-twinrix-dose-1', '104', '2026-01-01'),
      hepADose('adult-twinrix-dose-2', '104', '2026-01-08'),
    ],
  });
  assert.equal(
    selectionFor(adultTwinrix4, 'HEP_A')?.selected.series.id,
    'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES',
  );
  assert.equal(
    selectionFor(adultTwinrix4, 'HEP_B')?.selected.series.id,
    'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES',
  );
}

function evaluateHepA({
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
  assert.ok(forecast, 'Expected HepA forecast');
  return forecast;
}

function selectHepA({
  birthDate = '1980-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'HEP_A',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function selectHepAHepB({
  birthDate = '1980-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeriesForGroups({
    dataset,
    vaccineGroups: ['HEP_A', 'HEP_B'],
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function selectionFor(selections, vaccineGroup) {
  return selections.find((selection) => selection.vaccineGroup === vaccineGroup);
}

function hepADose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Hep A',
    vaccineCode,
    date,
  };
}
