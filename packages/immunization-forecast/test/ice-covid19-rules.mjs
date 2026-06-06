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
assertCovid19DoseNumberResultShape();
assertCovid19Aug2025SeriesSelection();
assertCovid19Aug2025Lt2RecommendsCvx311();
assertCovid19Aug2025Lt2BelowMinimumAgeNextAttempt28Days();
assertCovid19Aug2025Lt2PriorModernaSkipsToDose2Forecast();
assertCovid19Aug2025Lt2PriorModernaCurrentShotTargetsDose2();
assertCovid19Aug2025Lt2PriorModernaInvalidPfizerForecast21Days();
assertCovid19Aug2025Lt2PriorModernaInvalidOtherForecast28Days();
assertCovid19Aug2025Lt2PriorModernaInvalidPfizerCurrentShotBelow17DaysInvalid();
assertCovid19Aug2025Lt2PriorModernaInvalidPfizerCurrentShotAfter17DaysValid();
assertCovid19Aug2025Lt2PriorModernaInvalidOtherCurrentShotBelow24DaysInvalid();
assertCovid19Aug2025Lt2InvalidPfizerOnlyForecast21Days();
assertCovid19Aug2025Lt2InvalidOtherOnlyForecast28Days();
assertCovid19Aug2025Lt2InvalidPfizerOnlyCurrentShotBelow17DaysInvalid();
assertCovid19Aug2025Lt2InvalidPfizerOnlyCurrentShotAfter17DaysValid();
assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotBelow24DaysInvalid();
assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotAfter24DaysValid();
assertCovid19Aug2025Lt2NonModernaPriorForecast21Days();
assertCovid19Aug2025Lt2NonModernaPriorWithOtherPriorForecast28Days();
assertCovid19Aug2025Lt2NonModernaPriorCurrentShotBelow17DaysInvalid();
assertCovid19Aug2025Lt2NonModernaPriorCurrentShotAfter17DaysValid();
assertCovid19Aug2025Lt2NonModernaPriorOtherCurrentShotBelow24DaysInvalid();
assertCovid19Aug2025Lt2NonModernaPriorOtherCurrentShotAfter24DaysValid();
assertCovid19Aug2025Lt2TwoPreSeasonDosesForecastDose2();
assertCovid19Aug2025Lt2TwoPreSeasonDosesCurrentShotTargetsDose2();
assertCovid19Aug2025Lt2TwoPreSeasonDosesCurrentShotBelowIntervalInvalid();
assertCovid19Aug2025PriorDoseInterval();
assertCovid19Aug2025AdultCvx313To313Below17DaysInvalid();
assertCovid19Aug2025AdultCvx313To313At17DaysValid();
assertCovid19Aug2025AdultNon313PriorBelow8WeeksMinus4DaysInvalid();
assertCovid19Aug2025AdultNon313PriorAt8WeeksMinus4DaysValid();
assertCovid19Aug2025AdultCvx313ToNon313Below8WeeksMinus4DaysInvalid();
assertCovid19Aug2025AdultCvx313ToNon313At8WeeksMinus4DaysValid();
assertCovid19Aug2025Turns65Within12MonthsSwitchesToGte65();
assertCovid19Aug2025Under19PreSeasonDoseConditionalRecommendation();
assertCovid19Aug2025Age12RecentDoseSupplementalText();
assertCovid19Aug2025Gte65RecentDoseSupplementalText();
assertCovid19Aug2025Gte65Dose2SupplementalText();
assertCovid19Aug2025CompleteRecommendation();
assertCovid19SeasonalCompleteFutureSeasonRecommendation();
assertCovid19Sep2023SeriesSelection();
assertCovid19Sep2023CompletedSeriesSelection();
assertCovid19Sep2023Cvx213PreferredOverSameDayCvx313();
assertCovid19Dec2020PfizerModernaNovavaxPreferredOverSameDayJanssen();
assertCovid19Dec2020ModernaPreferredOverSameDayPfizer();
assertCovid19Dec2020FdaPreferredOverSameDayWhoOnly();
assertCovid19Dec2020SeriesSelection();
assertCovid19AcceptedSameDayDoseBecomesInvalidDuplicate();
assertCovid19InvalidNotAllowedSameDayDoseBecomesDuplicate();
assertCovid19Sep2023PriorFormulationInvalidVaccineNotAllowed();
assertCovid19Sep2023NotAllowedReasonCleanup();
assertCovid19AboveMaximumAgeInvalidPriorIgnoredForIntervals();
assertCovid19Sep2023NonCountingPriorBelow8WeeksMinus4DaysInvalid();
assertCovid19Sep2023NonCountingPriorAt8WeeksMinus4DaysValid();
assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid();
assertCovid19Sep2023Gte5Dose1ToDose2Interval();
assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose();
assertCovid19Sep2023Lt5CompletionShortcuts();
assertCovid19Sep2023Lt5TwentyFourDayIntervals();
assertCovid19Sep2023Cvx308Dose2Dose3NoMaximumAge();
assertCovid19Sep2023ModernaSkipDose2PriorSeasonInterval();
assertCovid19Sep2023ModernaCvx213TwentyFourDayIntervals();
assertCovid19Sep2023Cvx211OnOrAfterCutoffInvalid();
assertCovid19Dec2020NotApprovedInUsOrWhoInvalid();
assertCovid19Dec2020WrongSeriesPriorAcceptedWithLaterShot();
assertCovid19Dec2020BivalentBeforeAvailabilityInvalid();
assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions();
assertCovid19Dec2020PostBivalentAdditionalBoosterPermissions();
assertCovid19Dec2020PostCompletionIntervalSupplementalText();
assertCovid19Dec2020PreSep2022FirstBoosterRecommendations();
assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations();
assertCovid19Dec2020PreSep2022TwoExtraDoseCompleteRecommendation();
assertCovid19Dec2020JanssenAge5ToUnder12CompleteHighRiskRecommendation();
assertCovid19Dec2020BivalentEraRecommendations();
assertCovid19Dec2020BivalentEraCompletionRecommendations();
assertCovid19Dec2020PostApr2023BivalentRecommendations();
assertCovid19Dec2020NoDoseRecommendations();
assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations();
assertCovid19Dec2020IncompleteWhoIntervalRecommendations();
assertCovid19Dec2020BivalentInvalidPriorIgnoredForIntervals();
assertCovid19Dec2020IncompleteNotAllowedReasonCleanup();
assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals();
assertCovid19Dec2020PfizerCvx302Dose3NoMaximumAge();
assertCovid19Dec2020Age65SecondBivalentValidAndIntervalSupplemental();
assertCovid19Dec2020PostApr2023IncompleteSeriesCompletion();
assertCovid19Dec2020TwoDoseIncompleteSeriesCompletion();
assertCovid19Dec2020MinimumAgeOverrides();
assertCovid19Dec2020CustomIntervalOverrides();
assertCovid19Dec2020ModernaCvx213TwentyFourDayIntervals();
assertCovid19Sep2023RecommendationProducts();
assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException();
assertCovid19Sep2023Cvx211AcceptedException();
assertCovid19Sep2023Dose2Under65AcceptedOutsideRoutine();
assertCovid19Sep2023NovavaxCvx313SkipsDose3();
assertCovid19Sep2023NovavaxIntervals();

console.log('ICE COVID-19 Aug 2025 rule regression checks passed.');

function assertCovid19Aug2025MappedRulePorts() {
  const mappedRules = [
    'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (< 2 years) if patient is < 2 years of age as of evaluation date, or patient is >= 2 years and has a shot administered in current season at < 2 years of age',
    'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 1-dose COVID-19 Series (>= 2 - 64 years) if patient has no in-season shots and is >= 2 years and < 65 years as of evaluation date',
    'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (>= 65 years) if patient has no in-season shots and is >= 65 years as of evaluation date',
    'COVID-19(Aug2025): If the patient is complete for the season, the recommendation is Not_Recommended/Complete_High_Risk',
    'COVID-19(Aug2025 2–64y/GTE65yr)->TargetDose 1: If ≥1 prior COVID-19 shot, set earliest & recommended interval to 56d',
    'COVID-19(Aug2025 2–64y): If the patient is >= 12 years - 8 weeks and the most recent shot was <= 12 weeks from the assessment date, include SUPPLEMENTAL_TEXT describing interval options',
    'COVID-19(GTE65 Series): If the most recent shot was <= 12 weeks from the assessment date, include SUPPLEMENTAL_TEXT describing interval options',
    'COVID-19(Aug2025 2–64y Series): If <19y, ≥1 pre-season valid dose and no in-season dose, recommend CONDITIONAL / HIGH_RISK and CLINICAL_PATIENT_DISCRETION',
    'COVID-19(Aug2025 GTE65 Series): If age >= 12y-8w, include SUPPLEMENTAL_TEXT describing interval options',
    'COVID-19(Aug2025 < 2yrs Series): When a shot is recommended for this series, specifically recommend CVX 311',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If a prior shot for target dose 1 was evaluated as Invalid / BELOW_MINIMUM_AGE, then absolute minimum interval from that shot to the next attempt is 24 days',
    'COVID-19(Aug2025 < 2yrs Series): If a shot was previously administered and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES, the minimum/recommended interval from that shot to the next shot is 28 days (*recommendationIntervalCheck*)',
    'COVID-19(Aug2025 LT2y Series): If 0 shots in current season and exactly one prior valid CVX 311/312 before season start, skip to target dose 2',
    'COVID-19(Aug2025 LT2y Series): If evaluating a shot in current season and one prior valid CVX 311/312 before season start, set current to dose 2 and skip to target dose 2',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior invalid Pfizer, Novavax or Unspecified before season start and interval < 17 days, evaluate as Invalid / BELOW_MINIMUM_INTERVAL',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior invalid Pfizer, Novavax or Unspecified before season start and interval >= 17 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior is not Pfizer, Novavax or Unspecified before season start and interval < 24 days, evaluate as Invalid / BELOW_MINIMUM_INTERVAL',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior invalid Pfizer, Novavax or Unspecified before season start, minimal and recommended intervals are 21 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior is not Pfizer, Novavax or Unspecified before season start, minimal and recommended intervals are 28 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 208, 217, 218, 219, 300, 301, 302, 308, 309, 310, 211, 313, 213 administered prior to the season start date, then absolute minimum interval is 17 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 208, 217, 218, 219, 300, 301, 302, 308, 309, 310, 211, 313, 213 administered prior to the season start date, then absolute minimum interval is 17 days mark interval override satisfied',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any other invalid COVID-19 shot administered prior to the season start date, then absolute minimum interval from that shot to the next attempt is 24 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any other invalid COVID-19 shot administered prior to the season start date, then absolute minimum interval from that shot to the next attempt is 24 days mark interval override satisfied',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 208, 217, 218, 219, 300, 301, 302, 308, 309, 310, 211, 313, 213 administered prior to the season start date, then minimum and recommended intervals are 21 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any other invalid COVID-19 shot administered prior to the season start date, then minimum and recommended intervals are 28 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior Pfizer, Novavax or Unspecified shot to the next attempt is 17 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior Pfizer, Novavax or Unspecified shot mark interval override satisfied (*doseIntervalCheck*)',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior other than Pfizer, Novavax or Unspecified shot to the next attempt is 24 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior other than Pfizer, Novavax or Unspecified shot mark interval override satisfied (*doseIntervalCheck*)',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then minimum interval from prior Pfizer, Novavax or Unspecified shot to the next attempt is 21 days',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then minimum interval from prior other than Pfizer, Novavax or Unspecified shot to the first dose is 28 days',
    'COVID-19(Aug2025 LT2y Series): If 0 shots in current season and ≥2 valid pre-season doses (CVX 213,308,309,310,311,312,313), skip to target dose 2',
    'COVID-19(Aug2025 LT2y Series): If evaluating a shot in current season and ≥2 valid pre-season doses exist, set current to dose 2 and skip to target dose 2',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If ≥2 valid pre-season doses and interval < 8w-4d, evaluate as Invalid / BELOW_MINIMUM_INTERVAL',
    'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If ≥2 valid pre-season doses, set earliest & recommended interval to 8w',
    'COVID-19(Aug2025 2-64yrs/65+ Series): If prior is CVX 313 and current is CVX 313 for target dose 1 and interval < 17 days, evaluate as Invalid / BELOW_MINIMUM_INTERVAL (*doseIntervalCheck*)',
    'COVID-19(Aug2025 2-64yrs/65+ Series): If prior is CVX 313 and current is CVX 313 for target dose 1 and interval >= 17 days, mark interval override satisfied (*doseIntervalCheck*)',
    'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is NOT CVX 313 and interval < 8w-4d to target dose 1, evaluate as Invalid / BELOW_MINIMUM_INTERVAL (*doseIntervalCheck*)',
    'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is NOT CVX 313 and interval >= 8w-4d to target dose 1, mark interval override satisfied (*doseIntervalCheck*)',
    'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is CVX 313 and interval < 8w-4d to non-313 target dose 1, evaluate as Invalid / BELOW_MINIMUM_INTERVAL (*doseIntervalCheck*)',
    'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is CVX 313 and interval >= 8w-4d to non-313 target dose 1, mark interval override satisfied (*doseIntervalCheck*)',
    'COVID-19(Aug2025): Switch from 1-Dose 2-64yrs series to 2-Dose 65+ series if dose 1 is administered to a patient that will turn 65 within 12 months of season start date',
    'Duplicate Shots/Same Day (Sep2023/Aug2024 >= 5yrs): If a CVX 213 and CVX 313 are administered on the same day and both would be considered valid, evaluate the CVX 213 as valid',
    'Duplicate Shots/Same Day (COVID-19): If a Moderna shot and Pfizer shot are both Valid on the same day (after 10/25/2021 as per above), mark the Moderna shot Valid and the other shot Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day (COVID-19): If an FDA-approved vaccine and a WHO-only approved vaccine are both Valid on the same day (after 10/25/2021 as per above), mark the FDA-approved shot as Valid and the other shot Invalid / DUPLICATE_SAME_DAY',
    'COVID-19(9/12/2023+): For any prior formulation administered in a COVID-19 series (excluding CVX 211), override the absolute vaccine minimum age check',
    'COVID-19(9/12/2023+): If a prior formulation is administered (excluding CVX 211), mark the shot Invalid / VACCINE_NOT_ALLOWED (overrides VACCINE_NOT_ALLOWED_FOR_THIS_DOSE rules)',
    'COVID-19(9/12/2023+): If a COVID-19 shot that does not count towards U.S. vaccination is administered (for any Sept 2023+ COVID-19 Series) is < 8w-4d, evaluate the shot as Invalid',
    'COVID-19(9/12/2023+): If a COVID-19 shot that does not count towards U.S. vaccination is administered (for any Sept 2023+ COVID-19 Series) is between 8w-4d and the series table interval, override the doseIntervalCheck',
    'COVID-19(9/12/2023+): For the 2023-2024 season, if the patient has >= 1 (invalid) COVID-19 shot(s) administered prior to 9/12/2023, and there are no doses on record, the absolute minimum interval from (invalid) dose 1 is 8w-4d (*doseIntervalCheck*)',
    'COVID-19: If the vaccine administered is authorized neither by the FDA nor WHO, evaluate the shot as INVALID/VACCINE_NOT_APPROVED_IN_US_OR_BY_WHO',
    'COVID-19: If an FDA-approved, NOS or WHO-approved vaccine, the vaccine is not permitted be default for the Dec2020 seasonal series and there are other shots following it, and the series is not complete, evaluate it as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
    'COVID-19: If a bivalent vaccine was administered prior to 9/2/2022, evaluate the shot as Invalid / VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
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

function assertCovid19DoseNumberResultShape() {
  const dec2020Primary = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-01-01',
    immunizations: [
      covidDose('primary-1', '208', '2021-04-01'),
      covidDose('primary-2', '208', '2021-04-22'),
    ],
  });

  assert.deepEqual(
    dec2020Primary.matchedDoses.map((match) => [
      match.immunization.id,
      match.dose.doseNumber,
    ]),
    [
      ['primary-1', 1],
      ['primary-2', 2],
    ],
  );

  const sep2023Seasonal = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('seasonal-1', '213', '2023-09-12')],
  });

  assert.deepEqual(
    sep2023Seasonal.matchedDoses.map((match) => [
      match.immunization.id,
      match.dose.doseNumber,
    ]),
    [['seasonal-1', 1]],
  );
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

  const age2To64WithDose1 = selectCovid19({
    birthDate: '2020-01-01',
    immunizations: [covidDose('dose-1', '311', '2025-08-27')],
  });

  assert.equal(
    age2To64WithDose1?.selected.series.id,
    'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
  );
  assert.equal(
    age2To64WithDose1?.selected.selectionReason,
    'COVID_19_AUG_2025_AGE_2_TO_64',
  );

  const gte65WithDose1 = selectCovid19({
    birthDate: '1950-01-01',
    immunizations: [covidDose('dose-1', '311', '2025-08-27')],
  });

  assert.equal(
    gte65WithDose1?.selected.series.id,
    'COVID_19_AUG_2025_GTE_65_SERIES',
  );
  assert.equal(
    gte65WithDose1?.selected.selectionReason,
    'COVID_19_AUG_2025_AGE_65_OR_OLDER',
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

function assertCovid19Aug2025Lt2BelowMinimumAgeNextAttempt28Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [covidDose('too-early', '311', '2025-02-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.status, 'invalid');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_AGE',
  ]);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-03-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-03-01');
  assert.equal(forecast.recommendation?.recommendedDate, '2025-03-01');
}

function assertCovid19Aug2025Lt2PriorModernaSkipsToDose2Forecast() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [covidDose('prior-moderna', '311', '2025-07-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-07-29');
}

function assertCovid19Aug2025Lt2PriorModernaCurrentShotTargetsDose2() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-moderna', '311', '2025-07-01'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 2);
  assert.equal(forecast.matchedDoses[1]?.immunization.id, 'in-season');
}

function assertCovid19Aug2025Lt2PriorModernaInvalidPfizerForecast21Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-moderna', '311', '2025-07-01'),
      covidDose('prior-pfizer', '208', '2025-08-10'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-08-31');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-08-31');
}

function assertCovid19Aug2025Lt2PriorModernaInvalidOtherForecast28Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-moderna', '311', '2025-07-01'),
      covidDose('prior-other', '999', '2025-08-10'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-09-07');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-09-07');
}

function assertCovid19Aug2025Lt2PriorModernaInvalidPfizerCurrentShotBelow17DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-moderna', '311', '2025-07-01'),
      covidDose('prior-pfizer', '208', '2025-08-20'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  const inSeason = invalidDoseById(forecast, 'in-season');
  assert.equal(inSeason?.dose.doseNumber, 2);
  assert.deepEqual(inSeason?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025Lt2PriorModernaInvalidPfizerCurrentShotAfter17DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-moderna', '311', '2025-07-01'),
      covidDose('prior-pfizer', '208', '2025-08-10'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[1]?.immunization.id, 'in-season');
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 2);
}

function assertCovid19Aug2025Lt2PriorModernaInvalidOtherCurrentShotBelow24DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-moderna', '311', '2025-07-01'),
      covidDose('prior-other', '999', '2025-08-10'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 2);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025Lt2InvalidPfizerOnlyForecast21Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [covidDose('prior-pfizer', '208', '2025-08-10')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-08-31');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-08-31');
}

function assertCovid19Aug2025Lt2InvalidOtherOnlyForecast28Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [covidDose('prior-other', '999', '2025-08-10')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-09-07');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-09-07');
}

function assertCovid19Aug2025Lt2InvalidPfizerOnlyCurrentShotBelow17DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-pfizer', '208', '2025-08-20'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  const inSeason = invalidDoseById(forecast, 'in-season');
  assert.equal(inSeason?.dose.doseNumber, 1);
  assert.deepEqual(inSeason?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025Lt2InvalidPfizerOnlyCurrentShotAfter17DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-pfizer', '208', '2025-08-10'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
}

function assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotBelow24DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-other', '999', '2025-08-10'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotAfter24DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-other', '999', '2025-08-01'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
}

function assertCovid19Aug2025Lt2NonModernaPriorForecast21Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [covidDose('prior-non-moderna', '313', '2025-08-10')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses.length, 0);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-08-31');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-08-31');
}

function assertCovid19Aug2025Lt2NonModernaPriorWithOtherPriorForecast28Days() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-non-moderna', '313', '2025-08-01'),
      covidDose('prior-other', '999', '2025-08-10'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses.length, 0);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-09-07');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-09-07');
}

function assertCovid19Aug2025Lt2NonModernaPriorCurrentShotBelow17DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-non-moderna', '313', '2025-08-20'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025Lt2NonModernaPriorCurrentShotAfter17DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-non-moderna', '313', '2025-08-10'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
}

function assertCovid19Aug2025Lt2NonModernaPriorOtherCurrentShotBelow24DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-non-moderna', '313', '2025-08-01'),
      covidDose('prior-other', '999', '2025-08-10'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.invalidDoses[0]?.dose.doseNumber, 1);
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025Lt2NonModernaPriorOtherCurrentShotAfter24DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('prior-non-moderna', '313', '2025-08-01'),
      covidDose('prior-other', '999', '2025-08-01'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'in-season');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
}

function assertCovid19Aug2025Lt2TwoPreSeasonDosesForecastDose2() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('pre-season-1', '311', '2025-06-01'),
      covidDose('pre-season-2', '313', '2025-07-01'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.matchedDoses.length, 1);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-08-27');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-08-27');
  assert.equal(forecast.recommendation?.recommendedDate, '2025-08-27');
}

function assertCovid19Aug2025Lt2TwoPreSeasonDosesCurrentShotTargetsDose2() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('pre-season-1', '311', '2025-06-01'),
      covidDose('pre-season-2', '313', '2025-07-01'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(forecast.matchedDoses[1]?.dose.doseNumber, 2);
  assert.equal(forecast.matchedDoses[1]?.immunization.id, 'in-season');
}

function assertCovid19Aug2025Lt2TwoPreSeasonDosesCurrentShotBelowIntervalInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_LT_2_SERIES',
    birthDate: '2024-09-01',
    immunizations: [
      covidDose('pre-season-1', '311', '2025-06-01'),
      covidDose('pre-season-2', '313', '2025-08-20'),
      covidDose('in-season', '311', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  const inSeason = invalidDoseById(forecast, 'in-season');
  assert.equal(inSeason?.dose.doseNumber, 2);
  assert.deepEqual(inSeason?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025PriorDoseInterval() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [covidDose('prior-covid', '208', '2025-06-01')],
  });

  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2025-07-27');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2025-07-27');
  assert.equal(forecast.recommendation?.status, 'recommended');
}

function assertCovid19Aug2025AdultCvx313To313Below17DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [
      covidDose('prior-313', '313', '2025-08-11'),
      covidDose('current-313', '313', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'current-313');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025AdultCvx313To313At17DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [
      covidDose('prior-313', '313', '2025-08-10'),
      covidDose('current-313', '313', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'current-313');
}

function assertCovid19Aug2025AdultNon313PriorBelow8WeeksMinus4DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [
      covidDose('prior-208', '208', '2025-07-10'),
      covidDose('current-312', '312', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'current-312');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025AdultNon313PriorAt8WeeksMinus4DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [
      covidDose('prior-208', '208', '2025-07-06'),
      covidDose('current-312', '312', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'current-312');
}

function assertCovid19Aug2025AdultCvx313ToNon313Below8WeeksMinus4DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [
      covidDose('prior-313', '313', '2025-07-10'),
      covidDose('current-312', '312', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'current-312');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Aug2025AdultCvx313ToNon313At8WeeksMinus4DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '1990-01-01',
    immunizations: [
      covidDose('prior-313', '313', '2025-07-06'),
      covidDose('current-312', '312', '2025-08-27'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'current-312');
}

function assertCovid19Aug2025Turns65Within12MonthsSwitchesToGte65() {
  const selection = selectCovid19({
    birthDate: '1960-10-01',
    immunizations: [covidDose('dose-1-before-65', '312', '2025-08-27')],
  });

  assert.equal(
    selection?.selected.series.id,
    'COVID_19_AUG_2025_GTE_65_SERIES',
  );
  assert.equal(
    selection?.selected.selectionReason,
    'COVID_19_AUG_2025_TURNS_65_WITHIN_12_MONTHS',
  );
  assert.equal(selection?.selected.status, 'not-complete');
  assert.equal(selection?.selected.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(
    selection?.selected.matchedDoses[0]?.immunization.id,
    'dose-1-before-65',
  );
  assert.equal(selection?.selected.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(
    selection?.selected.recommendation?.supplementalText?.[0],
    'TARGET_DOSE2_6MO_MIN_8_12W_BY_PRODUCT',
  );

  const outsideWindowSelection = selectCovid19({
    birthDate: '1961-10-01',
    immunizations: [covidDose('dose-1-before-65', '312', '2025-08-27')],
  });

  assert.equal(
    outsideWindowSelection?.selected.series.id,
    'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
  );
}

function assertCovid19Aug2025Under19PreSeasonDoseConditionalRecommendation() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2010-01-01',
    immunizations: [covidDose('prior-covid', '208', '2025-06-01')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, [
    'HIGH_RISK',
    'CLINICAL_PATIENT_DISCRETION',
  ]);
  assert.equal(forecast.recommendation?.earliestRecommendedDate, '2025-07-27');
  assert.equal(forecast.recommendation?.recommendedDate, '2025-07-27');
}

function assertCovid19Aug2025Age12RecentDoseSupplementalText() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2010-01-01',
    immunizations: [covidDose('prior-covid', '208', '2025-08-01')],
  });

  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'TARGET_DOSE1_NOVAVAX_3W_OTHERS_8_12W',
  ]);
}

function assertCovid19Aug2025Gte65RecentDoseSupplementalText() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_GTE_65_SERIES',
    birthDate: '1950-01-01',
    immunizations: [covidDose('prior-covid', '208', '2025-08-01')],
  });

  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'TARGET_DOSE1_NOVAVAX_3W_OTHERS_8_12W_V2',
  ]);
}

function assertCovid19Aug2025Gte65Dose2SupplementalText() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_GTE_65_SERIES',
    birthDate: '1950-01-01',
    evaluationDate: '2025-09-01',
    immunizations: [covidDose('dose-1', '312', '2025-08-27')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.deepEqual(forecast.recommendation?.supplementalText, [
    'TARGET_DOSE2_6MO_MIN_8_12W_BY_PRODUCT',
  ]);
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

function assertCovid19SeasonalCompleteFutureSeasonRecommendation() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2018-01-01',
    evaluationDate: '2024-01-01',
    immunizations: [covidDose('pfizer-age-5', '309', '2023-09-12')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE']);
}

function assertCovid19Sep2023SeriesSelection() {
  assert.equal(
    selectCovid19({
      birthDate: '2010-01-01',
      evaluationDate: '2023-09-12',
    })?.selected.series.id,
    'COVID_19_SEP_2023_GTE_5_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '2020-01-01',
      evaluationDate: '2023-09-12',
    })?.selected.series.id,
    'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '2020-01-01',
      evaluationDate: '2023-09-12',
      immunizations: [covidDose('pfizer-current', '308', '2023-09-12')],
    })?.selected.series.id,
    'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '2020-01-01',
      evaluationDate: '2023-09-12',
      immunizations: [covidDose('moderna-current', '311', '2023-09-12')],
    })?.selected.series.id,
    'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '2020-01-01',
      evaluationDate: '2023-09-12',
      immunizations: [
        covidDose('pfizer-current', '308', '2023-09-12'),
        covidDose('moderna-current', '311', '2023-10-10'),
      ],
    })?.selected.series.id,
    'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2023-09-12',
      immunizations: [covidDose('novavax-current', '313', '2023-09-12')],
    })?.selected.series.id,
    'COVID_19_SEP_2023_NOVAVAX_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2023-10-20',
      immunizations: [
        covidDose('novavax-1', '313', '2023-09-12'),
        covidDose('novavax-2', '313', '2023-10-20'),
      ],
    })?.selected.series.id,
    'COVID_19_SEP_2023_NOVAVAX_SERIES',
  );
}

function assertCovid19Dec2020SeriesSelection() {
  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2021-06-01',
    })?.selected.series.id,
    'COVID_19_MIXED_PRODUCT_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2021-06-01',
      immunizations: [covidDose('pfizer-1', '208', '2021-04-01')],
    })?.selected.series.id,
    'COVID_19_PFIZER_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2021-06-01',
      immunizations: [covidDose('moderna-1', '207', '2021-04-01')],
    })?.selected.series.id,
    'COVID_19_MODERNA_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2022-08-01',
      immunizations: [covidDose('novavax-1', '211', '2022-07-13')],
    })?.selected.series.id,
    'COVID_19_NOVAVAX_2_DOSE_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2021-06-01',
      immunizations: [covidDose('janssen-1', '212', '2021-04-01')],
    })?.selected.series.id,
    'COVID_19_JANSSEN_1_DOSE_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2021-06-01',
      immunizations: [
        covidDose('pfizer-1', '208', '2021-04-01'),
        covidDose('moderna-1', '207', '2021-05-01'),
      ],
    })?.selected.series.id,
    'COVID_19_MIXED_PRODUCT_SERIES',
  );

  assert.equal(
    selectCovid19({
      birthDate: '1990-01-01',
      evaluationDate: '2021-06-01',
      immunizations: [covidDose('astrazeneca-1', '210', '2021-04-01')],
    })?.selected.series.id,
    'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  );
}

function assertCovid19Sep2023CompletedSeriesSelection() {
  const completedGte5 = selectCovid19({
    birthDate: '1990-01-01',
    evaluationDate: '2023-11-20',
    immunizations: [covidDose('updated-mrna', '213', '2023-09-12')],
  });

  assert.equal(
    completedGte5?.selected.series.id,
    'COVID_19_SEP_2023_GTE_5_SERIES',
  );
  assert.equal(completedGte5?.selected.status, 'complete');
  assert.equal(
    completedGte5?.selected.selectionReason,
    'COVID_19_SEP_2023_GTE_5_COMPLETE',
  );

  const completedNovavax = selectCovid19({
    birthDate: '1990-01-01',
    evaluationDate: '2023-11-20',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-20'),
    ],
  });

  assert.equal(
    completedNovavax?.selected.series.id,
    'COVID_19_SEP_2023_NOVAVAX_SERIES',
  );
  assert.equal(completedNovavax?.selected.status, 'complete');
  assert.equal(
    completedNovavax?.selected.selectionReason,
    'COVID_19_SEP_2023_NOVAVAX_COMPLETE',
  );
}

function assertCovid19Sep2023Cvx213PreferredOverSameDayCvx313() {
  for (const immunizations of [
    [
      covidDose('unspecified', '213', '2023-09-12'),
      covidDose('novavax', '313', '2023-09-12'),
    ],
    [
      covidDose('novavax', '313', '2023-09-12'),
      covidDose('unspecified', '213', '2023-09-12'),
    ],
  ]) {
    const forecast = evaluateCovid19({
      seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
      birthDate: '1990-01-01',
      evaluationDate: '2023-09-12',
      immunizations,
    });

    assert.equal(forecast.matchedDoses[0]?.immunization.id, 'unspecified');
    assert.equal(forecast.matchedDoses[0]?.status, 'valid');
    assert.equal(forecast.invalidDoses[0]?.immunization.id, 'novavax');
    assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  }
}

function assertCovid19Dec2020ModernaPreferredOverSameDayPfizer() {
  for (const immunizations of [
    [
      covidDose('pfizer', '208', '2021-11-01'),
      covidDose('moderna', '207', '2021-11-01'),
    ],
    [
      covidDose('moderna', '207', '2021-11-01'),
      covidDose('pfizer', '208', '2021-11-01'),
    ],
  ]) {
    const forecast = evaluateCovid19({
      seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
      birthDate: '1990-01-01',
      evaluationDate: '2021-11-01',
      immunizations,
    });

    assert.equal(forecast.matchedDoses[0]?.immunization.id, 'moderna');
    assert.equal(forecast.invalidDoses[0]?.immunization.id, 'pfizer');
    assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  }

  const preBypassForecast = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-10-24',
    immunizations: [
      covidDose('pfizer', '208', '2021-10-24'),
      covidDose('moderna', '207', '2021-10-24'),
    ],
  });

  assert.equal(preBypassForecast.matchedDoses[0]?.immunization.id, 'pfizer');
  assert.notDeepEqual(preBypassForecast.invalidDoses[0]?.reasons, [
    'DUPLICATE_SAME_DAY',
  ]);
}

function assertCovid19Dec2020PfizerModernaNovavaxPreferredOverSameDayJanssen() {
  for (const [preferredId, preferredCvx] of [
    ['pfizer', '208'],
    ['moderna', '207'],
    ['novavax', '211'],
    ['unspecified', '213'],
  ]) {
    for (const immunizations of [
      [
        covidDose('janssen', '212', '2021-11-01'),
        covidDose(preferredId, preferredCvx, '2021-11-01'),
      ],
      [
        covidDose(preferredId, preferredCvx, '2021-11-01'),
        covidDose('janssen', '212', '2021-11-01'),
      ],
    ]) {
      const forecast = evaluateCovid19({
        seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
        birthDate: '1990-01-01',
        evaluationDate: '2021-11-01',
        immunizations,
      });

      assert.equal(forecast.matchedDoses[0]?.immunization.id, preferredId);
    }
  }
}

function assertCovid19Dec2020FdaPreferredOverSameDayWhoOnly() {
  for (const immunizations of [
    [
      covidDose('fda', '208', '2021-11-01'),
      covidDose('who-only', '210', '2021-11-01'),
    ],
    [
      covidDose('who-only', '210', '2021-11-01'),
      covidDose('fda', '208', '2021-11-01'),
    ],
  ]) {
    const forecast = evaluateCovid19({
      seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
      birthDate: '1990-01-01',
      evaluationDate: '2021-11-01',
      immunizations,
    });

    assert.equal(forecast.matchedDoses[0]?.immunization.id, 'fda');
    assert.equal(forecast.invalidDoses[0]?.immunization.id, 'who-only');
    assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  }
}

function assertCovid19AcceptedSameDayDoseBecomesInvalidDuplicate() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-01-01',
    immunizations: [
      covidDose('wrong-series-moderna', '207', '2021-01-01'),
      covidDose('pfizer', '208', '2021-01-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pfizer');
  assert.equal(forecast.acceptedDoses.length, 0);
  const duplicate = invalidDoseById(forecast, 'wrong-series-moderna');
  assert.deepEqual(duplicate?.reasons, ['DUPLICATE_SAME_DAY']);
}

function assertCovid19InvalidNotAllowedSameDayDoseBecomesDuplicate() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-09-02',
    immunizations: [
      covidDose('invalid-bivalent', '229', '2022-09-02'),
      covidDose('pfizer', '208', '2022-09-02'),
    ],
  });

  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pfizer');
  assert.equal(
    forecast.invalidDoses.some(
      (match) =>
        match.immunization.id === 'invalid-bivalent' &&
        match.dose.doseNumber === 1 &&
        match.reasons.length === 1 &&
        match.reasons[0] === 'DUPLICATE_SAME_DAY',
    ),
    true,
  );
}

function assertCovid19Sep2023PriorFormulationInvalidVaccineNotAllowed() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2020-01-01',
    immunizations: [covidDose('prior-formulation', '208', '2025-08-27')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.invalidDoses[0]?.immunization.id, 'prior-formulation');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['VACCINE_NOT_ALLOWED']);
  assert.equal(forecast.matchedDoses.length, 0);
}

function assertCovid19Sep2023NotAllowedReasonCleanup() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('prior-formulation', '208', '2023-09-12')],
  });

  const invalid = invalidDoseById(forecast, 'prior-formulation');
  assert.deepEqual(invalid?.reasons, ['VACCINE_NOT_ALLOWED']);
}

function assertCovid19AboveMaximumAgeInvalidPriorIgnoredForIntervals() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-20',
    immunizations: [
      covidDose('too-old-pediatric-product', '310', '2023-09-12'),
      covidDose('current-updated-product', '213', '2023-09-20'),
    ],
  });

  const tooOld = invalidDoseById(forecast, 'too-old-pediatric-product');
  assert.equal(tooOld?.dose.doseNumber, 1);
  assert.deepEqual(tooOld?.reasons, ['ABOVE_MAXIMUM_AGE_VACCINE']);
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'current-updated-product');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(
    invalidDoseById(forecast, 'current-updated-product')?.reasons.includes(
      'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
    ),
    undefined,
  );
}

function assertCovid19Sep2023NonCountingPriorBelow8WeeksMinus4DaysInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2025-08-27',
    immunizations: [
      covidDose('non-counting', '500', '2025-08-01'),
      covidDose('current', '311', '2025-08-27'),
    ],
  });

  const current = invalidDoseById(forecast, 'current');
  assert.equal(forecast.status, 'not-complete');
  assert.equal(current?.dose.doseNumber, 1);
  assert.deepEqual(current?.reasons, ['BELOW_ABSOLUTE_MINIMUM_INTERVAL']);
}

function assertCovid19Sep2023NonCountingPriorAt8WeeksMinus4DaysValid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2025-09-22',
    immunizations: [
      covidDose('non-counting', '500', '2025-08-01'),
      covidDose('current', '311', '2025-09-22'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'current');
  assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 1);
}

function assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid() {
  const belowInterval = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('pre-season', '208', '2023-08-15'),
      covidDose('current', '213', '2023-09-12'),
    ],
  });

  const current = invalidDoseById(belowInterval, 'current');
  assert.equal(belowInterval.status, 'not-complete');
  assert.equal(current?.dose.doseNumber, 1);
  assert.deepEqual(current?.reasons, ['BELOW_ABSOLUTE_MINIMUM_INTERVAL']);

  const intervalMet = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('pre-season', '208', '2023-07-10'),
      covidDose('current', '213', '2023-09-12'),
    ],
  });

  assert.equal(intervalMet.status, 'complete');
  assert.equal(intervalMet.matchedDoses[0]?.immunization.id, 'current');
  assert.equal(intervalMet.matchedDoses[0]?.dose.doseNumber, 1);

  const priorOnlyForecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('pre-season', '208', '2023-08-01')],
  });

  assert.equal(priorOnlyForecast.recommendation?.recommendedDate, '2023-09-26');
  assert.equal(
    priorOnlyForecast.recommendation?.earliestRecommendedDate,
    '2023-09-26',
  );

  const turnsFiveAfterPriorInterval = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2018-10-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('pre-season', '208', '2023-07-01')],
  });

  assert.equal(
    turnsFiveAfterPriorInterval.recommendation?.recommendedDate,
    '2023-10-01',
  );
}

function assertCovid19Sep2023Gte5Dose1ToDose2Interval() {
  const invalidDose1RetryTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2018-09-20',
    evaluationDate: '2023-10-01',
    immunizations: [
      covidDose('invalid-age', '213', '2023-09-12'),
      covidDose('current', '213', '2023-10-01'),
    ],
  });

  assert.deepEqual(invalidDoseById(invalidDose1RetryTooSoon, 'current')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const invalidDose1RetryAtInterval = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2018-09-20',
    evaluationDate: '2024-01-20',
    immunizations: [
      covidDose('invalid-age', '213', '2023-09-12'),
      covidDose('current', '213', '2024-01-20'),
    ],
  });

  assert.equal(
    invalidDose1RetryAtInterval.matchedDoses[0]?.immunization.id,
    'current',
  );

  const validDose2TooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-10-01',
    immunizations: [
      covidDose('dose-1', '213', '2023-09-12'),
      covidDose('dose-2', '213', '2023-10-01'),
    ],
  });

  assert.ok(
    invalidDoseById(validDose2TooSoon, 'dose-2')?.reasons.includes(
      'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
    ),
  );

  const dose2Forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('dose-1', '213', '2023-09-12')],
  });

  assert.equal(dose2Forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(dose2Forecast.recommendation?.reasons, ['COMPLETE']);

  const validDose2AtInterval = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2024-01-20',
    immunizations: [
      covidDose('dose-1', '213', '2023-09-12'),
      covidDose('dose-2', '213', '2024-01-20'),
    ],
  });

  assert.equal(validDose2AtInterval.acceptedDoses[0]?.immunization.id, 'dose-2');
  assert.deepEqual(validDose2AtInterval.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);
}

function assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose() {
  const pfizerOnePriorForecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('prior-pfizer', '208', '2023-08-01')],
  });
  assert.equal(pfizerOnePriorForecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(
    pfizerOnePriorForecast.recommendation?.recommendedDate,
    '2023-09-26',
  );

  const pfizerTwoPriorForecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('prior-pfizer-1', '208', '2023-07-01'),
      covidDose('prior-pfizer-2', '208', '2023-08-01'),
    ],
  });
  assert.equal(pfizerTwoPriorForecast.nextDoseForecast?.dose.doseNumber, 3);
  assert.equal(
    pfizerTwoPriorForecast.recommendation?.recommendedDate,
    '2023-09-26',
  );

  const pfizerCurrentShot = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('prior-pfizer', '208', '2023-08-01'),
      covidDose('current-pfizer', '308', '2023-09-12'),
    ],
  });
  assert.equal(pfizerCurrentShot.matchedDoses[0]?.immunization.id, 'current-pfizer');
  assert.equal(pfizerCurrentShot.matchedDoses[0]?.dose.doseNumber, 2);

  const mixedTwoPriorForecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('prior-moderna', '207', '2023-07-01'),
      covidDose('prior-pfizer', '208', '2023-08-01'),
    ],
  });
  assert.equal(mixedTwoPriorForecast.nextDoseForecast?.dose.doseNumber, 3);
  assert.equal(
    mixedTwoPriorForecast.recommendation?.recommendedDate,
    '2023-09-26',
  );

  const mixedCurrentShot = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('prior-moderna', '207', '2023-08-01'),
      covidDose('current-mixed', '311', '2023-09-12'),
    ],
  });
  assert.equal(mixedCurrentShot.matchedDoses[0]?.immunization.id, 'current-mixed');
  assert.equal(mixedCurrentShot.matchedDoses[0]?.dose.doseNumber, 2);

  const modernaForecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('prior-moderna', '207', '2023-08-01')],
  });
  assert.equal(modernaForecast.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(modernaForecast.recommendation?.recommendedDate, '2023-09-26');

  const modernaCurrentShot = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [
      covidDose('prior-moderna', '207', '2023-08-01'),
      covidDose('current-moderna', '311', '2023-09-12'),
    ],
  });
  assert.equal(modernaCurrentShot.matchedDoses[0]?.immunization.id, 'current-moderna');
  assert.equal(modernaCurrentShot.matchedDoses[0]?.dose.doseNumber, 2);
}

function assertCovid19Sep2023Lt5CompletionShortcuts() {
  const pfizerAge5Dose = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2018-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('pfizer-age-5', '309', '2023-09-12')],
  });
  assert.equal(pfizerAge5Dose.status, 'complete');

  const mixedMrnaAge5Dose = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
    birthDate: '2018-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('moderna-age-5', '312', '2023-09-12')],
  });
  assert.equal(mixedMrnaAge5Dose.status, 'complete');

  const mixedUnder5ThenNovavaxAge5 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2025-01-01',
    immunizations: [
      covidDose('under-5-dose', '311', '2023-08-01'),
      covidDose('novavax-age-5', '313', '2025-01-01'),
    ],
  });
  assert.equal(mixedUnder5ThenNovavaxAge5.status, 'complete');

  const mixedTwoNovavax = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
    birthDate: '2018-01-01',
    evaluationDate: '2023-10-15',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-15'),
    ],
  });
  assert.equal(mixedTwoNovavax.status, 'complete');
}

function assertCovid19Sep2023Lt5TwentyFourDayIntervals() {
  for (const [seriesId, cvx] of [
    ['COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES', '308'],
    ['COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES', '311'],
    ['COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES', '311'],
  ]) {
    const retryForecast = evaluateCovid19({
      seriesId,
      birthDate: '2023-04-01',
      evaluationDate: '2023-09-12',
      immunizations: [covidDose('below-age', cvx, '2023-09-12')],
    });

    assert.equal(retryForecast.recommendation?.recommendedDate, '2023-10-10');

    const forecast = evaluateCovid19({
      seriesId,
      birthDate: '2023-04-01',
      evaluationDate: '2023-09-20',
      immunizations: [
        covidDose('below-age', cvx, '2023-09-12'),
        covidDose('retry-too-soon', cvx, '2023-09-20'),
      ],
    });

    const retry = invalidDoseById(forecast, 'retry-too-soon');
    assert.equal(retry?.dose.doseNumber, 1);
    assert.ok(
      retry?.reasons.includes('BELOW_ABSOLUTE_MINIMUM_INTERVAL'),
      `${seriesId} retry should be below minimum interval`,
    );
  }

  const pfizerPriorNonPfizer = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-10-01',
    immunizations: [
      covidDose('non-pfizer-prior', '311', '2023-09-12'),
      covidDose('pfizer-retry', '308', '2023-10-01'),
    ],
  });

  const retry = invalidDoseById(pfizerPriorNonPfizer, 'pfizer-retry');
  assert.ok(retry?.reasons.includes('BELOW_ABSOLUTE_MINIMUM_INTERVAL'));

  const mixedNovavaxUnder5 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
    birthDate: '2023-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('novavax-under-5', '313', '2023-09-12')],
  });

  assert.deepEqual(mixedNovavaxUnder5.recommendation?.reasons, [
    'ADMINISTER_mRNA_VACCINE',
  ]);
}

function assertCovid19Sep2023Cvx308Dose2Dose3NoMaximumAge() {
  for (const [seriesId, secondPriorCvx] of [
    ['COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES', '208'],
    ['COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES', '207'],
  ]) {
    const forecast = evaluateCovid19({
      seriesId,
      birthDate: '2018-08-01',
      evaluationDate: '2023-09-12',
      immunizations: [
        covidDose('prior-1', '208', '2023-04-01'),
        covidDose('prior-2', secondPriorCvx, '2023-06-01'),
        covidDose('current-308', '308', '2023-09-12'),
      ],
    });

    assert.equal(forecast.matchedDoses[0]?.immunization.id, 'current-308');
    assert.equal(forecast.matchedDoses[0]?.dose.doseNumber, 3);
    assert.equal(invalidDoseById(forecast, 'current-308'), undefined);
  }
}

function assertCovid19Sep2023ModernaSkipDose2PriorSeasonInterval() {
  const tooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
    birthDate: '2021-01-01',
    evaluationDate: '2023-10-01',
    immunizations: [
      covidDose('prior-moderna-1', '207', '2023-05-01'),
      covidDose('prior-moderna-2', '207', '2023-08-15'),
      covidDose('current-moderna', '311', '2023-10-01'),
    ],
  });

  const current = invalidDoseById(tooSoon, 'current-moderna');
  assert.equal(current?.dose.doseNumber, 2);
  assert.ok(current?.reasons.includes('BELOW_ABSOLUTE_MINIMUM_INTERVAL'));

  const atInterval = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
    birthDate: '2021-01-01',
    evaluationDate: '2023-10-15',
    immunizations: [
      covidDose('prior-moderna-1', '207', '2023-05-01'),
      covidDose('prior-moderna-2', '207', '2023-08-15'),
      covidDose('current-moderna', '311', '2023-10-15'),
    ],
  });

  assert.equal(
    invalidDoseById(atInterval, 'current-moderna')?.reasons.includes(
      'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
    ),
    undefined,
  );
}

function assertCovid19Sep2023ModernaCvx213TwentyFourDayIntervals() {
  const fromPriorModerna = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2000-01-01',
    evaluationDate: '2024-01-10',
    immunizations: [
      covidDose('dose-1-moderna', '312', '2024-01-01'),
      covidDose('dose-2-pfizer', '309', '2024-01-10'),
    ],
  });

  const currentAfterModerna = invalidDoseById(fromPriorModerna, 'dose-2-pfizer');
  assert.equal(currentAfterModerna?.dose.doseNumber, 2);
  assert.ok(
    currentAfterModerna?.reasons.includes('BELOW_ABSOLUTE_MINIMUM_INTERVAL'),
  );

  const pediatricToCurrentModerna = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2024-01-10',
    immunizations: [
      covidDose('dose-1-pfizer', '309', '2024-01-01'),
      covidDose('dose-2-moderna', '312', '2024-01-10'),
    ],
  });

  const currentModerna = invalidDoseById(
    pediatricToCurrentModerna,
    'dose-2-moderna',
  );
  assert.equal(currentModerna?.dose.doseNumber, 2);
  assert.ok(currentModerna?.reasons.includes('BELOW_ABSOLUTE_MINIMUM_INTERVAL'));

  const adultToCurrentModerna = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2000-01-01',
    evaluationDate: '2024-05-01',
    immunizations: [
      covidDose('dose-1-pfizer', '309', '2024-01-01'),
      covidDose('dose-2-moderna', '312', '2024-05-01'),
    ],
  });

  assert.equal(
    invalidDoseById(adultToCurrentModerna, 'dose-2-moderna')?.reasons.includes(
      'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
    ),
    undefined,
  );
}

function assertCovid19Sep2023Cvx211OnOrAfterCutoffInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-10-04',
    immunizations: [covidDose('novavax-old', '211', '2023-10-04')],
  });

  const invalid = invalidDoseById(forecast, 'novavax-old');
  assert.equal(forecast.status, 'not-complete');
  assert.deepEqual(invalid?.reasons, ['VACCINE_NOT_ALLOWED']);
}

function assertCovid19Dec2020NotApprovedInUsOrWhoInvalid() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-11-01',
    immunizations: [covidDose('not-approved', '500', '2021-11-01')],
  });

  const notApproved = invalidDoseById(forecast, 'not-approved');
  assert.equal(forecast.status, 'not-complete');
  assert.equal(notApproved?.dose.doseNumber, 1);
  assert.deepEqual(notApproved?.reasons, [
    'VACCINE_NOT_APPROVED_IN_US_OR_BY_WHO',
  ]);
  assert.equal(forecast.matchedDoses.length, 0);
}

function assertCovid19Dec2020WrongSeriesPriorAcceptedWithLaterShot() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-02-01',
    immunizations: [
      covidDose('wrong-series-moderna', '207', '2021-01-01'),
      covidDose('pfizer', '208', '2021-02-01'),
    ],
  });

  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'wrong-series-moderna');
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
  ]);
  assert.equal(forecast.matchedDoses[0]?.immunization.id, 'pfizer');

  const noLaterShot = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-01-01',
    immunizations: [covidDose('wrong-series-moderna', '207', '2021-01-01')],
  });

  assert.equal(noLaterShot.acceptedDoses.length, 0);
}

function assertCovid19Dec2020BivalentBeforeAvailabilityInvalid() {
  const beforeAvailability = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-15',
    immunizations: [covidDose('bivalent', '229', '2022-08-15')],
  });

  const bivalent = invalidDoseById(beforeAvailability, 'bivalent');
  assert.equal(beforeAvailability.status, 'not-complete');
  assert.equal(bivalent?.dose.doseNumber, 1);
  assert.deepEqual(bivalent?.reasons, [
    'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
  ]);
  assert.equal(beforeAvailability.matchedDoses.length, 0);

  const onAvailability = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-09-02',
    immunizations: [covidDose('bivalent', '229', '2022-09-02')],
  });

  assert.equal(onAvailability.matchedDoses[0]?.immunization.id, 'bivalent');
  assert.equal(onAvailability.invalidDoses.length, 0);

  const postCompletionBeforeAvailability = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-15',
    immunizations: [
      covidDose('m1', '207', '2021-01-01'),
      covidDose('m2', '207', '2021-02-01'),
      covidDose('bivalent-extra', '229', '2022-08-15'),
    ],
  });

  const bivalentExtra = invalidDoseById(
    postCompletionBeforeAvailability,
    'bivalent-extra',
  );
  assert.deepEqual(bivalentExtra?.reasons, [
    'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
  ]);
}

function assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions() {
  const modernaChild = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2021-12-01',
    immunizations: [
      covidDose('m1', '207', '2021-01-01'),
      covidDose('m2', '207', '2021-02-01'),
      covidDose('additional', '207', '2021-12-01'),
      covidDose('too-many', '207', '2022-01-01'),
    ],
  });

  assert.equal(modernaChild.matchedDoses.at(-1)?.immunization.id, 'additional');
  assert.equal(
    modernaChild.matchedDoses.some(
      (match) => match.immunization.id === 'too-many',
    ),
    false,
  );

  const modernaAdult = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-01-01',
    immunizations: [
      covidDose('m1', '207', '2021-01-01'),
      covidDose('m2', '207', '2021-02-01'),
      covidDose('additional', '207', '2021-12-01'),
      covidDose('booster-1', '207', '2022-01-01'),
      covidDose('too-many', '207', '2022-02-01'),
    ],
  });

  assert.deepEqual(
    modernaAdult.matchedDoses.map((match) => match.immunization.id),
    ['m1', 'm2', 'additional', 'booster-1'],
  );

  const pfizerAdult = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-01-01',
    immunizations: [
      covidDose('p1', '208', '2021-01-01'),
      covidDose('p2', '208', '2021-02-01'),
      covidDose('additional', '208', '2021-12-01'),
      covidDose('booster-1', '208', '2022-01-01'),
    ],
  });

  assert.deepEqual(
    pfizerAdult.matchedDoses.map((match) => match.immunization.id),
    ['p1', 'p2', 'additional', 'booster-1'],
  );

  const janssenAge50 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1960-01-01',
    evaluationDate: '2022-03-01',
    immunizations: [
      covidDose('j1', '212', '2021-01-01'),
      covidDose('additional', '212', '2021-12-01'),
      covidDose('booster-1', '212', '2022-01-01'),
      covidDose('booster-2', '212', '2022-03-01'),
      covidDose('too-many', '212', '2022-04-01'),
    ],
  });

  assert.deepEqual(
    janssenAge50.matchedDoses.map((match) => match.immunization.id),
    ['j1', 'additional', 'booster-1', 'booster-2'],
  );
}

function assertCovid19Dec2020PostBivalentAdditionalBoosterPermissions() {
  const age12 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-10-01',
    immunizations: [
      covidDose('p1', '208', '2021-01-01'),
      covidDose('p2', '208', '2021-02-01'),
      covidDose('monovalent-additional', '208', '2022-09-02'),
      covidDose('bivalent-booster', '300', '2022-09-15'),
      covidDose('too-many', '300', '2022-10-01'),
    ],
  });

  assert.deepEqual(
    age12.matchedDoses.map((match) => match.immunization.id),
    ['p1', 'p2', 'monovalent-additional', 'bivalent-booster'],
  );

  const age5 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2022-10-12',
    immunizations: [
      covidDose('p1', '208', '2021-01-01'),
      covidDose('p2', '208', '2021-02-01'),
      covidDose('bivalent-age5', '300', '2022-10-12'),
    ],
  });

  assert.equal(age5.matchedDoses.at(-1)?.immunization.id, 'bivalent-age5');

  const modernaInfant = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2022-12-08',
    immunizations: [
      covidDose('m1', '207', '2022-07-01'),
      covidDose('m2', '207', '2022-08-01'),
      covidDose('bivalent-infant', '229', '2022-12-08'),
    ],
  });

  assert.equal(
    modernaInfant.matchedDoses.at(-1)?.immunization.id,
    'bivalent-infant',
  );
}

function assertCovid19Dec2020PostCompletionIntervalSupplementalText() {
  const janssenFirstBooster = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-12-01',
    immunizations: [
      covidDose('j1', '212', '2021-11-01'),
      covidDose('booster', '212', '2021-12-01'),
    ],
  });

  assert.deepEqual(janssenFirstBooster.matchedDoses.at(-1)?.supplementalText, [
    'COVID19_MIN_INTERVAL_8W_1ST_BOOSTER',
  ]);

  const pfizerPreBivalentFirstBooster = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-04-01',
    immunizations: [
      covidDose('p1', '208', '2021-01-01'),
      covidDose('p2', '208', '2021-02-01'),
      covidDose('booster', '208', '2021-04-01'),
    ],
  });

  assert.deepEqual(
    pfizerPreBivalentFirstBooster.matchedDoses.at(-1)?.supplementalText,
    ['COVID19_MIN_INTERVAL_5M_1ST_BOOSTER'],
  );

  const pfizerPostBivalentFirstBooster = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-10-06',
    immunizations: [
      covidDose('p1', '208', '2022-07-01'),
      covidDose('p2', '208', '2022-08-15'),
      covidDose('booster', '208', '2022-10-06'),
    ],
  });

  assert.deepEqual(
    pfizerPostBivalentFirstBooster.matchedDoses.at(-1)?.supplementalText,
    ['COVID19_MIN_INTERVAL_8W_1ST_BOOSTER'],
  );

  const janssenSecondBooster = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1960-01-01',
    evaluationDate: '2022-05-01',
    immunizations: [
      covidDose('j1', '212', '2021-01-01'),
      covidDose('additional', '212', '2022-04-01'),
      covidDose('second-booster', '212', '2022-05-01'),
    ],
  });

  assert.deepEqual(janssenSecondBooster.matchedDoses.at(-1)?.supplementalText, [
    'COVID19_MIN_INTERVAL_4M_2ND_BOOSTER',
  ]);

  const pfizerPostBivalentSecondBooster = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-10-20',
    immunizations: [
      covidDose('p1', '208', '2022-07-01'),
      covidDose('p2', '208', '2022-08-15'),
      covidDose('additional', '208', '2022-10-06'),
      covidDose('second-booster', '300', '2022-10-20'),
    ],
  });

  assert.deepEqual(
    pfizerPostBivalentSecondBooster.matchedDoses.at(-1)?.supplementalText,
    ['COVID19_MIN_INTERVAL_8W_2ND_BOOSTER'],
  );
}

function assertCovid19Dec2020PreSep2022FirstBoosterRecommendations() {
  const modernaChild = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('m1', '207', '2022-01-15'),
      covidDose('m2', '207', '2022-02-15'),
    ],
  });

  assert.deepEqual(modernaChild.recommendation, {
    status: 'conditionally-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });

  const modernaAdult = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('m1', '207', '2022-01-15'),
      covidDose('m2', '207', '2022-02-15'),
    ],
  });

  assert.equal(modernaAdult.recommendation?.status, 'recommended');
  assert.deepEqual(modernaAdult.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(modernaAdult.recommendation?.recommendedDate, '2022-07-15');
  assert.equal(
    modernaAdult.recommendation?.earliestRecommendedDate,
    '2022-07-15',
  );

  const pfizerAge5 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2016-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('p1', '208', '2022-01-15'),
      covidDose('p2', '208', '2022-02-15'),
    ],
  });

  assert.equal(pfizerAge5.recommendation?.status, 'recommended');
  assert.deepEqual(pfizerAge5.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(pfizerAge5.recommendation?.recommendedDate, '2022-07-15');

  const mixedAge5 = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2016-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('m1', '207', '2022-01-15'),
      covidDose('p2', '208', '2022-02-15'),
    ],
  });

  assert.equal(mixedAge5.recommendation?.status, 'recommended');
  assert.deepEqual(mixedAge5.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(mixedAge5.recommendation?.recommendedDate, '2022-07-15');

  const janssenAge12 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '2009-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [covidDose('j1', '212', '2022-01-15')],
  });

  assert.equal(janssenAge12.recommendation?.status, 'recommended');
  assert.deepEqual(janssenAge12.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(janssenAge12.recommendation?.recommendedDate, '2022-03-12');

  const novavaxAge12 = evaluateCovid19({
    seriesId: 'COVID_19_NOVAVAX_2_DOSE_SERIES',
    birthDate: '2009-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('n1', '211', '2022-01-15'),
      covidDose('n2', '211', '2022-02-15'),
    ],
  });

  assert.equal(novavaxAge12.recommendation?.status, 'recommended');
  assert.deepEqual(novavaxAge12.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(novavaxAge12.recommendation?.recommendedDate, '2022-07-15');

  const whoAge5 = evaluateCovid19({
    seriesId: 'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('az1', '210', '2022-01-15'),
      covidDose('az2', '210', '2022-02-15'),
    ],
  });

  assert.equal(whoAge5.recommendation?.status, 'recommended');
  assert.deepEqual(whoAge5.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(whoAge5.recommendation?.recommendedDate, '2022-07-15');
}

function assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations() {
  const modernaAdultUnder50 = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('m1', '207', '2022-01-15'),
      covidDose('m2', '207', '2022-02-15'),
      covidDose('extra', '207', '2022-05-01'),
    ],
  });

  assert.deepEqual(modernaAdultUnder50.recommendation, {
    status: 'conditionally-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });

  const pfizerChild = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('p1', '208', '2022-01-15'),
      covidDose('p2', '208', '2022-02-15'),
      covidDose('extra', '208', '2022-05-01'),
    ],
  });

  assert.deepEqual(pfizerChild.recommendation, {
    status: 'conditionally-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });

  const mixedAge50 = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1970-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('m1', '207', '2022-01-15'),
      covidDose('p2', '208', '2022-02-15'),
      covidDose('extra', '208', '2022-05-01'),
    ],
  });

  assert.equal(mixedAge50.recommendation?.status, 'recommended');
  assert.deepEqual(mixedAge50.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(mixedAge50.recommendation?.recommendedDate, '2022-09-01');
  assert.equal(
    mixedAge50.recommendation?.earliestRecommendedDate,
    '2022-09-01',
  );

  const janssenNonMrnaAge18 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('j1', '212', '2022-01-15'),
      covidDose('extra', '212', '2022-04-01'),
    ],
  });

  assert.equal(janssenNonMrnaAge18.recommendation?.status, 'recommended');
  assert.deepEqual(janssenNonMrnaAge18.recommendation?.reasons, [
    'BOOSTER_DOSE',
  ]);
  assert.equal(janssenNonMrnaAge18.recommendation?.recommendedDate, '2022-08-01');

  const janssenMrnaUnder50 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('j1', '212', '2022-01-15'),
      covidDose('extra-mrna', '208', '2022-04-01'),
    ],
  });

  assert.deepEqual(janssenMrnaUnder50.recommendation, {
    status: 'conditionally-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });

  const janssenMrnaAge50 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1970-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('j1', '212', '2022-01-15'),
      covidDose('extra-mrna', '208', '2022-04-01'),
    ],
  });

  assert.equal(janssenMrnaAge50.recommendation?.status, 'recommended');
  assert.deepEqual(janssenMrnaAge50.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(janssenMrnaAge50.recommendation?.recommendedDate, '2022-08-01');
}

function assertCovid19Dec2020PreSep2022TwoExtraDoseCompleteRecommendation() {
  const pfizerTwoExtras = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1970-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('p1', '208', '2022-01-15'),
      covidDose('p2', '208', '2022-02-15'),
      covidDose('extra-1', '208', '2022-05-01'),
      covidDose('extra-2', '208', '2022-07-01'),
    ],
  });

  assert.deepEqual(pfizerTwoExtras.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const whoTwoExtras = evaluateCovid19({
    seriesId: 'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
    birthDate: '1970-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('az1', '210', '2022-01-15'),
      covidDose('az2', '210', '2022-02-15'),
      covidDose('extra-1', '208', '2022-05-01'),
      covidDose('extra-2', '208', '2022-07-01'),
    ],
  });

  assert.deepEqual(whoTwoExtras.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });
}

function assertCovid19Dec2020JanssenAge5ToUnder12CompleteHighRiskRecommendation() {
  const noExtra = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [covidDose('j1', '212', '2022-01-15')],
  });

  assert.deepEqual(noExtra.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });

  const oneExtraAfterBivalentStart = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2022-10-01',
    immunizations: [
      covidDose('j1', '212', '2022-01-15'),
      covidDose('extra', '212', '2022-04-01'),
    ],
  });

  assert.deepEqual(oneExtraAfterBivalentStart.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });
}

function assertCovid19Dec2020BivalentEraRecommendations() {
  const modernaInfant = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2022-12-08',
    immunizations: [
      covidDose('m1', '207', '2022-08-01'),
      covidDose('m2', '207', '2022-09-01'),
    ],
  });

  assert.equal(modernaInfant.recommendation?.status, 'recommended');
  assert.deepEqual(modernaInfant.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(modernaInfant.recommendation?.recommendedDate, '2022-12-08');

  const modernaAge5 = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2022-10-12',
    immunizations: [
      covidDose('m1', '207', '2022-06-01'),
      covidDose('m2', '207', '2022-07-01'),
    ],
  });

  assert.equal(modernaAge5.recommendation?.status, 'recommended');
  assert.deepEqual(modernaAge5.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(modernaAge5.recommendation?.recommendedDate, '2022-10-12');

  const pfizerAge5 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2022-10-12',
    immunizations: [
      covidDose('p1', '208', '2022-06-01'),
      covidDose('p2', '208', '2022-07-01'),
    ],
  });

  assert.equal(pfizerAge5.recommendation?.status, 'recommended');
  assert.deepEqual(pfizerAge5.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(pfizerAge5.recommendation?.recommendedDate, '2022-10-12');

  const janssenAge12 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '2000-01-01',
    evaluationDate: '2022-09-02',
    immunizations: [covidDose('j1', '212', '2022-06-01')],
  });

  assert.equal(janssenAge12.recommendation?.status, 'recommended');
  assert.deepEqual(janssenAge12.recommendation?.reasons, ['BOOSTER_DOSE']);
  assert.equal(janssenAge12.recommendation?.recommendedDate, '2022-09-02');
}

function assertCovid19Dec2020BivalentEraCompletionRecommendations() {
  const modernaAfterDec8 = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2023-01-01',
    immunizations: [
      covidDose('m1', '207', '2022-08-01'),
      covidDose('m2', '207', '2022-09-01'),
      covidDose('bivalent', '229', '2022-12-08'),
    ],
  });

  assert.deepEqual(modernaAfterDec8.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const pfizerAfterOct12 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2023-01-01',
    immunizations: [
      covidDose('p1', '208', '2022-06-01'),
      covidDose('p2', '208', '2022-07-01'),
      covidDose('bivalent', '300', '2022-10-12'),
    ],
  });

  assert.deepEqual(pfizerAfterOct12.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const mixedAfterOct12 = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2023-01-01',
    immunizations: [
      covidDose('m1', '207', '2022-06-01'),
      covidDose('p2', '208', '2022-07-01'),
      covidDose('bivalent', '300', '2022-10-12'),
    ],
  });

  assert.deepEqual(mixedAfterOct12.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const pfizerAfterSep2Age12 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2000-01-01',
    evaluationDate: '2023-01-01',
    immunizations: [
      covidDose('p1', '208', '2022-06-01'),
      covidDose('p2', '208', '2022-07-01'),
      covidDose('booster', '300', '2022-09-02'),
    ],
  });

  assert.deepEqual(pfizerAfterSep2Age12.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const janssenAfterSep2Age12 = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '2000-01-01',
    evaluationDate: '2023-01-01',
    immunizations: [
      covidDose('j1', '212', '2022-06-01'),
      covidDose('booster', '300', '2022-09-02'),
    ],
  });

  assert.deepEqual(janssenAfterSep2Age12.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });
}

function assertCovid19Dec2020PostApr2023BivalentRecommendations() {
  const olderAdultTwoCurrentEraDoses = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1950-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [
      covidDose('m1', '207', '2022-06-01'),
      covidDose('m2', '207', '2022-07-01'),
      covidDose('bivalent', '229', '2022-12-08'),
      covidDose('current-era', '229', '2023-04-19'),
    ],
  });

  assert.deepEqual(olderAdultTwoCurrentEraDoses.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const olderAdultOneCurrentEraDose = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1950-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [
      covidDose('m1', '207', '2022-06-01'),
      covidDose('m2', '207', '2022-07-01'),
      covidDose('current-era', '229', '2023-04-19'),
    ],
  });

  assert.deepEqual(olderAdultOneCurrentEraDose.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE_HIGH_RISK'],
  });

  const youngerAdultOneCurrentEraDose = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [
      covidDose('j1', '212', '2022-06-01'),
      covidDose('current-era', '229', '2023-04-19'),
    ],
  });

  assert.deepEqual(youngerAdultOneCurrentEraDose.recommendation, {
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });

  const modernaNeedsBivalent = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [
      covidDose('m1', '207', '2022-06-01'),
      covidDose('m2', '207', '2022-07-01'),
    ],
  });

  assert.equal(modernaNeedsBivalent.recommendation?.status, 'recommended');
  assert.deepEqual(modernaNeedsBivalent.recommendation?.reasons, [
    'ADMINISTER_COVID19_BIVALENT_VACCINE',
  ]);
  assert.equal(modernaNeedsBivalent.recommendation?.recommendedDate, '2023-04-19');

  const pfizerNeedsBivalent = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [
      covidDose('p1', '208', '2022-06-01'),
      covidDose('p2', '208', '2022-07-01'),
    ],
  });

  assert.equal(pfizerNeedsBivalent.recommendation?.status, 'recommended');
  assert.deepEqual(pfizerNeedsBivalent.recommendation?.reasons, [
    'ADMINISTER_COVID19_BIVALENT_VACCINE',
  ]);
  assert.equal(pfizerNeedsBivalent.recommendation?.recommendedDate, '2022-09-02');

  const pfizerUnder5NeedsBivalent = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2023-03-17',
    immunizations: [
      covidDose('p1', '219', '2022-06-01'),
      covidDose('p2', '219', '2022-07-01'),
      covidDose('p3', '219', '2022-09-01'),
    ],
  });

  assert.equal(pfizerUnder5NeedsBivalent.recommendation?.status, 'recommended');
  assert.deepEqual(pfizerUnder5NeedsBivalent.recommendation?.reasons, [
    'ADMINISTER_COVID19_BIVALENT_VACCINE',
  ]);
  assert.equal(
    pfizerUnder5NeedsBivalent.recommendation?.recommendedDate,
    '2023-03-17',
  );
}

function assertCovid19Dec2020NoDoseRecommendations() {
  const alreadySixMonths = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [],
  });

  assert.equal(alreadySixMonths.recommendation?.status, 'recommended');
  assert.deepEqual(alreadySixMonths.recommendation?.reasons, ['DUE']);
  assert.equal(alreadySixMonths.recommendation?.recommendedDate, '2022-08-01');
  assert.equal(
    alreadySixMonths.recommendation?.earliestRecommendedDate,
    '2022-08-01',
  );

  const underSixMonths = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2022-01-01',
    evaluationDate: '2022-05-01',
    immunizations: [],
  });

  assert.equal(underSixMonths.recommendation?.status, 'recommended');
  assert.deepEqual(underSixMonths.recommendation?.reasons, ['DUE']);
  assert.equal(underSixMonths.recommendation?.recommendedDate, '2022-07-01');
  assert.equal(
    underSixMonths.recommendation?.earliestRecommendedDate,
    '2022-07-01',
  );
}

function assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations() {
  const moderna = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [covidDose('dose-1', '207', '2023-04-01')],
  });

  assert.equal(moderna.status, 'not-complete');
  assert.equal(moderna.recommendation?.status, 'recommended');
  assert.equal(moderna.recommendation?.earliestRecommendedDate, '2023-05-27');
  assert.equal(moderna.recommendation?.recommendedDate, '2023-05-27');

  const pfizer = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [covidDose('dose-1', '208', '2023-04-01')],
  });

  assert.equal(pfizer.status, 'not-complete');
  assert.equal(pfizer.recommendation?.status, 'recommended');
  assert.equal(pfizer.recommendation?.earliestRecommendedDate, '2023-05-27');
  assert.equal(pfizer.recommendation?.recommendedDate, '2023-05-27');

  const mixed = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [covidDose('dose-1', '207', '2023-04-01')],
  });

  assert.equal(mixed.status, 'not-complete');
  assert.equal(mixed.recommendation?.status, 'recommended');
  assert.equal(mixed.recommendation?.earliestRecommendedDate, '2023-05-27');
  assert.equal(mixed.recommendation?.recommendedDate, '2023-05-27');
}

function assertCovid19Dec2020IncompleteWhoIntervalRecommendations() {
  const astraZenecaIncomplete = evaluateCovid19({
    seriesId: 'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-04-01',
    immunizations: [covidDose('az1', '210', '2021-04-01')],
  });

  assert.equal(astraZenecaIncomplete.status, 'not-complete');
  assert.equal(astraZenecaIncomplete.nextDoseForecast?.dose.doseNumber, 2);
  assert.equal(
    astraZenecaIncomplete.recommendation?.earliestRecommendedDate,
    '2021-04-29',
  );
  assert.equal(
    astraZenecaIncomplete.recommendation?.recommendedDate,
    '2021-04-29',
  );

  const cvx213Incomplete = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-01-01',
    immunizations: [covidDose('cvx213', '213', '2022-01-01')],
  });

  assert.equal(cvx213Incomplete.status, 'not-complete');
  assert.equal(cvx213Incomplete.recommendation?.recommendedDate, '2022-01-29');
}

function assertCovid19Dec2020BivalentInvalidPriorIgnoredForIntervals() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-09-10',
    immunizations: [covidDose('invalid-bivalent', '229', '2022-09-02')],
  });

  const invalidBivalent = invalidDoseById(forecast, 'invalid-bivalent');
  assert.equal(invalidBivalent?.dose.doseNumber, 1);
  assert.deepEqual(invalidBivalent?.reasons, []);
  assert.equal(forecast.nextDoseForecast?.dose.doseNumber, 1);
  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '1990-07-01');
}

function assertCovid19Dec2020IncompleteNotAllowedReasonCleanup() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-10-01',
    immunizations: [
      covidDose('pfizer-dose-1', '208', '2022-01-01'),
      covidDose('invalid-bivalent-dose-2', '229', '2022-10-01'),
    ],
  });

  assert.equal(forecast.status, 'not-complete');
  const invalidBivalent = invalidDoseById(forecast, 'invalid-bivalent-dose-2');
  assert.equal(invalidBivalent?.dose.doseNumber, 2);
  assert.deepEqual(invalidBivalent?.reasons, []);
}

function assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals() {
  const thirdBoosterTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2022-11-01',
    immunizations: [
      covidDose('p1', '208', '2022-01-01'),
      covidDose('p2', '208', '2022-02-01'),
      covidDose('additional', '208', '2022-09-02'),
      covidDose('booster-1', '300', '2022-10-28'),
      covidDose('booster-2', '300', '2022-11-01'),
    ],
  });

  const invalidThird = invalidDoseById(thirdBoosterTooSoon, 'booster-2');
  assert.deepEqual(invalidThird?.reasons, ['BELOW_MINIMUM_INTERVAL']);

  const pfizerFirstBivalent = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-03-17',
    immunizations: [
      covidDose('p1', '208', '2022-07-01'),
      covidDose('p2', '208', '2022-09-01'),
      covidDose('p3', '208', '2023-02-01'),
      covidDose('first-bivalent', '300', '2023-03-17'),
    ],
  });

  assert.equal(
    pfizerFirstBivalent.matchedDoses.at(-1)?.immunization.id,
    'first-bivalent',
  );
  assert.deepEqual(pfizerFirstBivalent.matchedDoses.at(-1)?.supplementalText, [
    'COVID19_MIN_INTERVAL_8W',
  ]);

  const nonPfizerFirstBivalent = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [
      covidDose('m1', '207', '2023-02-01'),
      covidDose('m2', '207', '2023-03-15'),
      covidDose('first-bivalent', '229', '2023-04-19'),
    ],
  });

  assert.equal(
    nonPfizerFirstBivalent.matchedDoses.at(-1)?.immunization.id,
    'first-bivalent',
  );
  assert.deepEqual(
    nonPfizerFirstBivalent.matchedDoses.at(-1)?.supplementalText,
    ['COVID19_MIN_INTERVAL_8W'],
  );
}

function assertCovid19Dec2020PfizerCvx302Dose3NoMaximumAge() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [
      covidDose('dose-1', '208', '2021-01-01'),
      covidDose('dose-2', '208', '2021-02-01'),
      covidDose('dose-3', '302', '2023-05-01'),
    ],
  });

  assert.equal(forecast.matchedDoses[2]?.immunization.id, 'dose-3');
  assert.equal(forecast.matchedDoses[2]?.dose.doseNumber, 3);
  assert.equal(invalidDoseById(forecast, 'dose-3'), undefined);
}

function assertCovid19Dec2020Age65SecondBivalentValidAndIntervalSupplemental() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1950-01-01',
    evaluationDate: '2023-05-01',
    immunizations: [
      covidDose('m1', '207', '2023-01-01'),
      covidDose('m2', '207', '2023-02-01'),
      covidDose('first-current-era', '229', '2023-04-19'),
      covidDose('second-current-era', '229', '2023-05-01'),
    ],
  });

  assert.equal(
    forecast.matchedDoses.at(-1)?.immunization.id,
    'second-current-era',
  );
  assert.equal(forecast.matchedDoses.at(-1)?.status, 'valid');
  assert.deepEqual(forecast.matchedDoses.at(-1)?.supplementalText, [
    'COVID19_MIN_INTERVAL_4M',
  ]);
}

function assertCovid19Dec2020PostApr2023IncompleteSeriesCompletion() {
  const pfizerCurrentEra = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [covidDose('current-era', '208', '2023-04-19')],
  });

  assert.equal(pfizerCurrentEra.status, 'complete');
  assert.equal(pfizerCurrentEra.matchedDoses[0]?.immunization.id, 'current-era');

  const pfizerBivalentByEvaluationDate = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [covidDose('bivalent', '300', '2023-03-17')],
  });

  assert.equal(pfizerBivalentByEvaluationDate.status, 'complete');
  assert.equal(
    pfizerBivalentByEvaluationDate.matchedDoses[0]?.immunization.id,
    'bivalent',
  );

  const modernaCurrentEra = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [covidDose('current-era', '207', '2023-04-19')],
  });

  assert.equal(modernaCurrentEra.status, 'complete');
  assert.equal(modernaCurrentEra.matchedDoses[0]?.immunization.id, 'current-era');

  const modernaBivalentByEvaluationDate = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [covidDose('bivalent', '229', '2022-09-02')],
  });

  assert.equal(modernaBivalentByEvaluationDate.status, 'complete');
  assert.equal(
    modernaBivalentByEvaluationDate.matchedDoses[0]?.immunization.id,
    'bivalent',
  );

  const mixedPfizerCurrentEra = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [covidDose('mixed-pfizer', '208', '2023-04-19')],
  });

  assert.equal(mixedPfizerCurrentEra.status, 'complete');

  const mixedModernaCurrentEra = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-04-19',
    immunizations: [covidDose('mixed-moderna', '207', '2023-04-19')],
  });

  assert.equal(mixedModernaCurrentEra.status, 'complete');
}

function assertCovid19Dec2020TwoDoseIncompleteSeriesCompletion() {
  const pfizerAge5 = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2021-02-01',
    immunizations: [
      covidDose('p1', '208', '2021-01-01'),
      covidDose('p2', '208', '2021-02-01'),
    ],
  });

  assert.equal(pfizerAge5.status, 'complete');
  assert.deepEqual(
    pfizerAge5.matchedDoses.map((match) => match.immunization.id),
    ['p1', 'p2'],
  );

  const pfizerProductSpecific = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2021-02-01',
    immunizations: [
      covidDose('p1', '208', '2021-01-01'),
      covidDose('p2', '208', '2021-02-01'),
    ],
  });

  assert.equal(pfizerProductSpecific.status, 'complete');

  const mixedModernaProductSpecific = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2021-02-01',
    immunizations: [
      covidDose('m1', '207', '2021-01-01'),
      covidDose('m2', '207', '2021-02-01'),
    ],
  });

  assert.equal(mixedModernaProductSpecific.status, 'complete');

  const mixedNovavax = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2020-01-01',
    evaluationDate: '2022-08-01',
    immunizations: [
      covidDose('n1', '211', '2022-07-01'),
      covidDose('n2', '211', '2022-08-01'),
    ],
  });

  assert.equal(mixedNovavax.status, 'complete');
}

function assertCovid19Dec2020MinimumAgeOverrides() {
  const underAgeJanssen = evaluateCovid19({
    seriesId: 'COVID_19_JANSSEN_1_DOSE_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2021-01-01',
    immunizations: [covidDose('janssen', '212', '2021-01-01')],
  });

  assert.equal(underAgeJanssen.status, 'complete');
  assert.equal(underAgeJanssen.matchedDoses[0]?.immunization.id, 'janssen');
  assert.deepEqual(underAgeJanssen.matchedDoses[0]?.supplementalText, [
    'COVID19_MIN_AGE',
  ]);

  const belowSixMonths = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2020-10-01',
    evaluationDate: '2021-01-01',
    immunizations: [covidDose('pfizer', '208', '2021-01-01')],
  });

  assert.equal(belowSixMonths.status, 'not-complete');
  assert.equal(belowSixMonths.matchedDoses[0]?.immunization.id, 'pfizer');
  assert.deepEqual(belowSixMonths.matchedDoses[0]?.supplementalText, [
    'COVID19_MIN_AGE',
  ]);
}

function assertCovid19Dec2020CustomIntervalOverrides() {
  const preOctoberAdultIntervalBypass = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-10-10',
    immunizations: [
      covidDose('m1', '207', '2021-10-01'),
      covidDose('m2', '207', '2021-10-10'),
    ],
  });

  assert.equal(preOctoberAdultIntervalBypass.status, 'complete');
  assert.deepEqual(
    preOctoberAdultIntervalBypass.matchedDoses.map(
      (match) => match.immunization.id,
    ),
    ['m1', 'm2'],
  );

  const modernaPostAprilDose2TooSoon = evaluateCovid19({
    seriesId: 'COVID_19_MODERNA_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-05-18',
    immunizations: [
      covidDose('m1', '207', '2023-04-19'),
      covidDose('m2', '207', '2023-05-18'),
    ],
  });

  assert.deepEqual(invalidDoseById(modernaPostAprilDose2TooSoon, 'm2')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const pfizerPostAprilDose2TooSoon = evaluateCovid19({
    seriesId: 'COVID_19_PFIZER_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-05-18',
    immunizations: [
      covidDose('p1', '208', '2023-04-19'),
      covidDose('p2', '208', '2023-05-18'),
    ],
  });

  assert.deepEqual(invalidDoseById(pfizerPostAprilDose2TooSoon, 'p2')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Dec2020ModernaCvx213TwentyFourDayIntervals() {
  const adultCurrentModernaTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-11-10',
    immunizations: [
      covidDose('p1', '208', '2021-11-01'),
      covidDose('m2', '207', '2021-11-10'),
    ],
  });

  assert.deepEqual(invalidDoseById(adultCurrentModernaTooSoon, 'm2')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const adultPriorModernaTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2021-11-10',
    immunizations: [
      covidDose('m1', '207', '2021-11-01'),
      covidDose('p2', '208', '2021-11-10'),
    ],
  });

  assert.deepEqual(invalidDoseById(adultPriorModernaTooSoon, 'p2')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const under18CurrentModernaTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2021-09-10',
    immunizations: [
      covidDose('p1', '208', '2021-09-01'),
      covidDose('m2', '207', '2021-09-10'),
    ],
  });

  assert.deepEqual(invalidDoseById(under18CurrentModernaTooSoon, 'm2')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const under18PriorModernaTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_MIXED_PRODUCT_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2021-09-10',
    immunizations: [
      covidDose('m1', '207', '2021-09-01'),
      covidDose('p2', '208', '2021-09-10'),
    ],
  });

  assert.deepEqual(invalidDoseById(under18PriorModernaTooSoon, 'p2')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertCovid19Sep2023RecommendationProducts() {
  const modernaInfant = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
    birthDate: '2023-01-01',
    evaluationDate: '2023-09-12',
  });

  assert.equal(modernaInfant.recommendation?.status, 'recommended');
  assert.equal(modernaInfant.recommendation?.recommendedVaccine?.cvx, '311');
  assert.equal(modernaInfant.recommendation?.recommendedDate, '2023-09-12');

  const modernaAge12 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-09-12',
  });

  assert.equal(modernaAge12.recommendation?.recommendedVaccine?.cvx, '312');

  const pfizerInfant = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2023-01-01',
    evaluationDate: '2023-09-12',
  });

  assert.equal(pfizerInfant.recommendation?.recommendedVaccine?.cvx, '308');

  const pfizerAge5 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2016-01-01',
    evaluationDate: '2023-09-12',
  });

  assert.equal(pfizerAge5.recommendation?.recommendedVaccine?.cvx, '310');

  const pfizerAge12 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-09-12',
  });

  assert.equal(pfizerAge12.recommendation?.recommendedVaccine?.cvx, '309');

  const gte5Series = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-09-12',
  });

  assert.equal(gte5Series.recommendation?.status, 'recommended');
  assert.equal(gte5Series.recommendation?.recommendedVaccine, undefined);
}

function assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException() {
  const acceptedOnly = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('novavax', '313', '2023-09-12')],
  });

  assert.equal(acceptedOnly.status, 'not-complete');
  assert.equal(acceptedOnly.matchedDoses.length, 0);
  assert.equal(acceptedOnly.acceptedDoses[0]?.immunization.id, 'novavax');
  assert.deepEqual(acceptedOnly.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  ]);
  assert.equal(acceptedOnly.recommendation?.recommendedDate, '2023-10-10');
  assert.deepEqual(acceptedOnly.recommendation?.reasons, [
    'ADMINISTER_mRNA_VACCINE',
  ]);

  const followUpTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2023-09-20',
    immunizations: [
      covidDose('novavax', '313', '2023-09-12'),
      covidDose('mrna', '213', '2023-09-20'),
    ],
  });

  assert.deepEqual(invalidDoseById(followUpTooSoon, 'mrna')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const followUpAt24Days = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '2015-01-01',
    evaluationDate: '2023-10-06',
    immunizations: [
      covidDose('novavax', '313', '2023-09-12'),
      covidDose('mrna', '213', '2023-10-06'),
    ],
  });

  assert.equal(followUpAt24Days.matchedDoses[0]?.immunization.id, 'mrna');
  assert.deepEqual(followUpAt24Days.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
  ]);
}

function assertCovid19Sep2023Cvx211AcceptedException() {
  const acceptedOnly = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('novavax-old', '211', '2023-09-12')],
  });

  assert.equal(acceptedOnly.status, 'not-complete');
  assert.equal(acceptedOnly.matchedDoses.length, 0);
  assert.equal(acceptedOnly.acceptedDoses[0]?.immunization.id, 'novavax-old');
  assert.deepEqual(acceptedOnly.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_PART_OF_THIS_SERIES',
  ]);
  assert.equal(acceptedOnly.recommendation?.recommendedDate, '2023-10-10');

  const followUpTooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-09-20',
    immunizations: [
      covidDose('novavax-old', '211', '2023-09-12'),
      covidDose('mrna', '213', '2023-09-20'),
    ],
  });

  assert.deepEqual(invalidDoseById(followUpTooSoon, 'mrna')?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);

  const followUpAt24Days = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2023-10-06',
    immunizations: [
      covidDose('novavax-old', '211', '2023-09-12'),
      covidDose('mrna', '213', '2023-10-06'),
    ],
  });

  assert.equal(followUpAt24Days.matchedDoses[0]?.immunization.id, 'mrna');
  assert.deepEqual(followUpAt24Days.acceptedDoses[0]?.reasons, [
    'VACCINE_NOT_PART_OF_THIS_SERIES',
  ]);
}

function assertCovid19Sep2023Dose2Under65AcceptedOutsideRoutine() {
  const allowedDose2 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2024-02-01',
    immunizations: [
      covidDose('dose-1', '213', '2023-09-12'),
      covidDose('dose-2', '213', '2024-02-01'),
    ],
  });

  assert.equal(allowedDose2.matchedDoses[0]?.immunization.id, 'dose-1');
  assert.equal(allowedDose2.acceptedDoses[0]?.immunization.id, 'dose-2');
  assert.deepEqual(allowedDose2.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);

  const cvx310Dose2 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_GTE_5_SERIES',
    birthDate: '1990-01-01',
    evaluationDate: '2024-02-01',
    immunizations: [
      covidDose('dose-1', '213', '2023-09-12'),
      covidDose('dose-2-cvx310', '310', '2024-02-01'),
    ],
  });

  assert.equal(cvx310Dose2.matchedDoses[0]?.immunization.id, 'dose-1');
  assert.equal(cvx310Dose2.acceptedDoses[0]?.immunization.id, 'dose-2-cvx310');
  assert.deepEqual(cvx310Dose2.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);
}

function assertCovid19Sep2023NovavaxCvx313SkipsDose3() {
  const forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2024-01-01',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-20'),
      covidDose('novavax-4', '313', '2024-01-01'),
    ],
  });

  assert.deepEqual(
    forecast.matchedDoses.map((match) => [
      match.immunization.id,
      match.dose.doseNumber,
    ]),
    [
      ['novavax-1', 1],
      ['novavax-2', 2],
    ],
  );
  assert.equal(forecast.acceptedDoses[0]?.immunization.id, 'novavax-4');
  assert.equal(forecast.acceptedDoses[0]?.dose.doseNumber, 4);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);

  const cvx310Dose4 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2024-01-01',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-20'),
      covidDose('pfizer-child-dose-4', '310', '2024-01-01'),
    ],
  });

  assert.equal(
    cvx310Dose4.acceptedDoses[0]?.immunization.id,
    'pfizer-child-dose-4',
  );
  assert.equal(cvx310Dose4.acceptedDoses[0]?.dose.doseNumber, 4);
  assert.deepEqual(cvx310Dose4.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);
}

function assertCovid19Sep2023NovavaxIntervals() {
  const cvx313AtAge5 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '2018-09-12',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('novavax-age-5', '313', '2023-09-12')],
  });
  assert.equal(cvx313AtAge5.matchedDoses[0]?.immunization.id, 'novavax-age-5');
  assert.equal(cvx313AtAge5.matchedDoses[0]?.dose.doseNumber, 1);
  assert.equal(cvx313AtAge5.recommendation?.recommendedDate, '2023-10-10');
  assert.deepEqual(cvx313AtAge5.recommendation?.reasons, [
    'ADMINISTER_mRNA_VACCINE',
  ]);

  const cvx313BelowAge5 = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '2018-09-13',
    evaluationDate: '2023-09-12',
    immunizations: [covidDose('novavax-below-age-5', '313', '2023-09-12')],
  });
  assert.deepEqual(
    invalidDoseById(cvx313BelowAge5, 'novavax-below-age-5')?.reasons,
    ['BELOW_ABSOLUTE_MINIMUM_AGE'],
  );

  for (const cvx of ['213', '309', '312']) {
    const mrnaDose2TooSoon = evaluateCovid19({
      seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
      birthDate: '1990-01-01',
      evaluationDate: '2023-10-01',
      immunizations: [
        covidDose('novavax-1', '313', '2023-09-12'),
        covidDose('mrna-dose-2', cvx, '2023-10-01'),
      ],
    });

    const invalid = invalidDoseById(mrnaDose2TooSoon, 'mrna-dose-2');
    assert.equal(invalid?.dose.doseNumber, 2);
    assert.deepEqual(invalid?.reasons, ['BELOW_ABSOLUTE_MINIMUM_INTERVAL']);
  }

  const dose4Forecast = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '1950-01-01',
    evaluationDate: '2024-01-01',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-20'),
      covidDose('novavax-3', '313', '2024-01-01'),
    ],
  });

  assert.equal(dose4Forecast.nextDoseForecast?.dose.doseNumber, 4);
  assert.equal(dose4Forecast.recommendation?.recommendedDate, '2024-02-28');
  assert.equal(
    dose4Forecast.recommendation?.earliestRecommendedDate,
    '2024-02-28',
  );

  const dose4TooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-11-15',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-20'),
      covidDose('novavax-4', '313', '2023-11-15'),
    ],
  });

  const invalidDose4 = invalidDoseById(dose4TooSoon, 'novavax-4');
  assert.equal(invalidDose4?.dose.doseNumber, 4);
  assert.ok(
    invalidDose4?.reasons.includes('BELOW_ABSOLUTE_MINIMUM_INTERVAL'),
  );

  const nonAllowedDose4TooSoon = evaluateCovid19({
    seriesId: 'COVID_19_SEP_2023_NOVAVAX_SERIES',
    birthDate: '2010-01-01',
    evaluationDate: '2023-11-15',
    immunizations: [
      covidDose('novavax-1', '313', '2023-09-12'),
      covidDose('novavax-2', '313', '2023-10-20'),
      covidDose('moderna-child-dose-4', '311', '2023-11-15'),
    ],
  });

  const invalidNonAllowedDose4 = invalidDoseById(
    nonAllowedDose4TooSoon,
    'moderna-child-dose-4',
  );
  assert.equal(invalidNonAllowedDose4?.dose.doseNumber, 4);
  assert.ok(
    invalidNonAllowedDose4?.reasons.includes(
      'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
    ),
  );
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

function invalidDoseById(forecast, id) {
  return forecast.invalidDoses.find((match) => match.immunization.id === id);
}
