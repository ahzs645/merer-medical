import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDataset,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesRecommendation,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
} from './types.js';

const covid19Aug2025SeasonStartDate = '2025-08-27';
const covid19Sep2023SeasonStartDate = '2023-09-12';
const covid19Dec2020ModernaIntervalFromCvxCodes = new Set([
  '207',
  '213',
  '221',
  '227',
  '228',
  '229',
  '230',
  '519',
  '520',
]);
const covid19Dec2020ModernaIntervalToCvxCodes = new Set([
  '207',
  '213',
  '221',
  '227',
  '228',
  '229',
  '230',
  '519',
  '520',
]);
const covid19FdaSameDayPreferredCvxCodes = new Set([
  '207',
  '208',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '300',
  '301',
  '302',
]);
const covid19FdaWhoSameDayExcludedCvxCodes = new Set([
  ...covid19FdaSameDayPreferredCvxCodes,
  '211',
  '213',
  '230',
]);
const covid19Dec2020AcceptedWrongSeriesCvxCodes = new Set([
  '207',
  '208',
  '210',
  '211',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '300',
  '301',
  '302',
  '502',
  '510',
  '511',
  '512',
  '519',
  '520',
  '521',
]);
const covid19Dec2020PfizerBivalentPrimaryCvxCodes = new Set([
  '208',
  '217',
  '218',
  '300',
  '301',
]);
const covid19Dec2020ModernaBivalentPrimaryCvxCodes = new Set([
  '207',
  '221',
  '227',
  '228',
  '229',
]);
const covid19Aug2025CvxCodes = new Set([
  '207',
  '208',
  '211',
  '212',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '308',
  '309',
  '310',
  '311',
  '312',
  '313',
  '334',
]);
const covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes = new Set([
  '213',
  '308',
  '309',
  '310',
  '311',
  '312',
  '313',
]);
const covid19Aug2025PfizerNovavaxUnspecifiedCvxCodes = new Set([
  '208',
  '217',
  '218',
  '219',
  '300',
  '301',
  '302',
  '308',
  '309',
  '310',
  '211',
  '313',
  '213',
]);
const covid19PfizerCvxCodes = new Set([
  '208',
  '217',
  '218',
  '219',
  '300',
  '301',
  '302',
]);
const covid19ModernaCvxCodes = new Set(['207', '221', '227', '228', '229', '230']);
const covid19Sep2023PfizerLt5PriorCvxCodes = new Set([
  '208',
  '217',
  '218',
  '300',
  '301',
  '308',
  '309',
  '310',
]);
const covid19Sep2023ModernaLt5PriorCvxCodes = new Set([
  '207',
  '221',
  '227',
  '228',
  '229',
  '230',
  '311',
  '312',
]);
const covid19Sep2023NovavaxCvxCodes = new Set(['211', '313']);
const covid19Sep2023MixedLt5PriorCvxCodes = new Set([
  '207',
  '208',
  '210',
  '211',
  '212',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '308',
  '309',
  '310',
  '311',
  '312',
  '502',
  '510',
  '511',
  '519',
  '520',
]);
const covid19Sep2023ModernaCvx213IntervalCvxCodes = new Set([
  '213',
  '311',
  '312',
]);
const covid19PriorFormulationInvalidCvxCodes = new Set([
  '207',
  '208',
  '210',
  '212',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '500',
  '501',
  '502',
  '503',
  '504',
  '505',
  '506',
  '507',
  '508',
  '509',
  '510',
  '511',
  '512',
  '513',
  '514',
  '515',
  '516',
  '517',
  '518',
  '519',
  '520',
  '521',
]);
const covid19Sep2023PfizerLt5PriorFormulationOrNonPfizerCvxCodes = new Set([
  '207',
  '208',
  '210',
  '211',
  '212',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '311',
  '312',
  '313',
  '520',
]);
const covid19NotApprovedInUsOrWhoCvxCodes = new Set([
  '500',
  '501',
  '503',
  '504',
  '505',
  '506',
  '507',
  '508',
  '509',
  '513',
  '514',
  '515',
  '516',
  '517',
  '518',
  '521',
]);
const covid19Dec2020BivalentCvxCodes = new Set([
  '229',
  '230',
  '300',
  '301',
  '302',
  '519',
  '520',
]);
const covid19Dec2020AdditionalBoosterCvxCodes = new Set([
  '207',
  '208',
  '211',
  '212',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '519',
  '520',
]);
const covid19Dec2020PostBivalentMonovalentCvxCodes = new Set([
  '207',
  '208',
  '211',
  '212',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
]);
const covid19Dec2020PostApr2023DoseCvxCodes = new Set([
  '207',
  '208',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '519',
  '520',
]);
const covid19Dec2020PreBivalentPfizerMixedJanssenWhoSeriesIds = new Set([
  'COVID_19_PFIZER_SERIES',
  'COVID_19_MIXED_PRODUCT_SERIES',
  'COVID_19_JANSSEN_1_DOSE_SERIES',
  'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  'COVID_19_BIBP_SINOPHARM_2_DOSE_SERIES',
  'COVID_19_CORONA_VAC_SINOVAC_2_DOSE_SERIES',
  'COVID_19_COVAXIN_2_DOSE_SERIES',
  'COVID_19_NOVAVAX_2_DOSE_SERIES',
  'COVID_19_MEDICAGO_2_DOSE_SERIES',
]);
const covid19Dec2020WhoApprovedSeriesIds = new Set([
  'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  'COVID_19_BIBP_SINOPHARM_2_DOSE_SERIES',
  'COVID_19_CORONA_VAC_SINOVAC_2_DOSE_SERIES',
  'COVID_19_COVAXIN_2_DOSE_SERIES',
  'COVID_19_MEDICAGO_2_DOSE_SERIES',
]);
const covid19Dec2020PreBivalentAge50SeriesIds = new Set([
  'COVID_19_PFIZER_SERIES',
  'COVID_19_MODERNA_SERIES',
  'COVID_19_MIXED_PRODUCT_SERIES',
  'COVID_19_JANSSEN_1_DOSE_SERIES',
  'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  'COVID_19_BIBP_SINOPHARM_2_DOSE_SERIES',
  'COVID_19_CORONA_VAC_SINOVAC_2_DOSE_SERIES',
  'COVID_19_COVAXIN_2_DOSE_SERIES',
  'COVID_19_NOVAVAX_2_DOSE_SERIES',
  'COVID_19_MEDICAGO_2_DOSE_SERIES',
]);
const covid19Dec2020PostBivalentSeriesIds = new Set([
  'COVID_19_PFIZER_SERIES',
  'COVID_19_MODERNA_SERIES',
  'COVID_19_MIXED_PRODUCT_SERIES',
  'COVID_19_JANSSEN_1_DOSE_SERIES',
  'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  'COVID_19_BIBP_SINOPHARM_2_DOSE_SERIES',
  'COVID_19_CORONA_VAC_SINOVAC_2_DOSE_SERIES',
  'COVID_19_COVAXIN_2_DOSE_SERIES',
  'COVID_19_NOVAVAX_2_DOSE_SERIES',
  'COVID_19_MEDICAGO_2_DOSE_SERIES',
]);
const covid19Dec2020FirstBoosterFiveMonthSeriesIds = new Set([
  'COVID_19_PFIZER_SERIES',
  'COVID_19_MODERNA_SERIES',
  'COVID_19_MIXED_PRODUCT_SERIES',
  'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  'COVID_19_BIBP_SINOPHARM_2_DOSE_SERIES',
  'COVID_19_CORONA_VAC_SINOVAC_2_DOSE_SERIES',
  'COVID_19_COVAXIN_2_DOSE_SERIES',
  'COVID_19_MEDICAGO_2_DOSE_SERIES',
]);
const covid19Dec2020FirstBoosterEightWeekSeriesIds = new Set([
  ...covid19Dec2020FirstBoosterFiveMonthSeriesIds,
  'COVID_19_JANSSEN_1_DOSE_SERIES',
  'COVID_19_NOVAVAX_2_DOSE_SERIES',
]);
const covid19Dec2020SecondBoosterSeriesIds = new Set([
  'COVID_19_PFIZER_SERIES',
  'COVID_19_MODERNA_SERIES',
  'COVID_19_MIXED_PRODUCT_SERIES',
  'COVID_19_JANSSEN_1_DOSE_SERIES',
  'COVID_19_ASTRA_ZENECA_2_DOSE_SERIES',
  'COVID_19_BIBP_SINOPHARM_2_DOSE_SERIES',
  'COVID_19_CORONA_VAC_SINOVAC_2_DOSE_SERIES',
  'COVID_19_COVAXIN_2_DOSE_SERIES',
  'COVID_19_MEDICAGO_2_DOSE_SERIES',
]);
const covid19Dec2020IncompleteWhoIntervalCvxCodes = new Set([
  '210',
  '213',
  '500',
  '501',
  '502',
  '503',
  '504',
  '505',
  '506',
  '507',
  '508',
  '509',
  '510',
  '511',
  '512',
  '513',
  '514',
  '515',
  '516',
  '517',
  '518',
  '519',
  '520',
  '521',
]);
const covid19JanssenCvxCodes = new Set(['212']);
const covid19PfizerModernaNovavaxCvxCodes = new Set([
  ...covid19PfizerCvxCodes,
  ...covid19ModernaCvxCodes,
  '211',
  '213',
]);

export function compareCovid19ImmunizationsForSeries(
  series: IceSeriesDefinition,
  a: ForecastImmunization,
  b: ForecastImmunization,
) {
  if (series.vaccineGroup?.code !== 'COVID_19') return 0;

  const aCvx = normalizeCvx(a.vaccineCode) ?? '';
  const bCvx = normalizeCvx(b.vaccineCode) ?? '';
  const aIsJanssen = covid19JanssenCvxCodes.has(aCvx);
  const bIsJanssen = covid19JanssenCvxCodes.has(bCvx);
  const aPreferredOverJanssen = covid19PfizerModernaNovavaxCvxCodes.has(aCvx);
  const bPreferredOverJanssen = covid19PfizerModernaNovavaxCvxCodes.has(bCvx);

  if (aIsJanssen && bPreferredOverJanssen) return 1;
  if (bIsJanssen && aPreferredOverJanssen) return -1;
  return 0;
}

export function isCovid19Immunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return (
    immunization.vaccineName.toLowerCase().includes('covid') ||
    (cvx !== undefined && covid19Aug2025CvxCodes.has(cvx))
  );
}

export function covid19Aug2025Lt2PreSeasonDose2SkipMatches(
  matchedDoses: IceSeriesDoseMatch[],
) {
  return matchedDoses.filter((match) => {
    const cvx = normalizeCvx(match.immunization.vaccineCode);
    return (
      match.status === 'valid' &&
      match.immunization.date &&
      match.immunization.date < covid19Aug2025SeasonStartDate &&
      cvx !== undefined &&
      covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes.has(cvx)
    );
  });
}

export function covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(
  immunizations: ForecastImmunization[],
) {
  return immunizations.filter((immunization) => {
    const cvx = normalizeCvx(immunization.vaccineCode);
    return (
      immunization.date &&
      immunization.date < covid19Aug2025SeasonStartDate &&
      cvx !== undefined &&
      covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes.has(cvx) &&
      isCovid19Immunization(immunization)
    );
  });
}

export function covid19Aug2025Lt2OneModernaDose(
  immunizations: ForecastImmunization[],
) {
  const qualifying = covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(
    immunizations,
  );
  if (qualifying.length !== 1) return undefined;
  const cvx = normalizeCvx(qualifying[0]?.vaccineCode);
  return cvx === '311' || cvx === '312' ? qualifying[0] : undefined;
}

export function covid19Aug2025Lt2OneNonModernaDose(
  immunizations: ForecastImmunization[],
) {
  const qualifying = covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(
    immunizations,
  );
  if (qualifying.length !== 1) return undefined;
  const cvx = normalizeCvx(qualifying[0]?.vaccineCode);
  return cvx !== '311' && cvx !== '312' ? qualifying[0] : undefined;
}

export function covid19Aug2025Lt2OneModernaInvalidPrior(
  immunizations: ForecastImmunization[],
) {
  const modernaDose = covid19Aug2025Lt2OneModernaDose(immunizations);
  if (!modernaDose) return [];
  return immunizations.filter((immunization) => {
    const cvx = normalizeCvx(immunization.vaccineCode);
    return (
      immunization !== modernaDose &&
      immunization.date &&
      immunization.date < covid19Aug2025SeasonStartDate &&
      isCovid19Immunization(immunization) &&
      (cvx === undefined ||
        !covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes.has(cvx))
    );
  });
}

export function covid19Aug2025Lt2OneModernaMostRecentInvalidPrior(
  immunizations: ForecastImmunization[],
) {
  return [...covid19Aug2025Lt2OneModernaInvalidPrior(immunizations)].sort(
    (a, b) => (b.date || '').localeCompare(a.date || ''),
  )[0];
}

export function covid19Aug2025Lt2NoValidPreSeasonMostRecentInvalidPrior(
  immunizations: ForecastImmunization[],
) {
  if (covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(immunizations).length > 0) {
    return undefined;
  }
  return immunizations
    .filter((immunization) => {
      const cvx = normalizeCvx(immunization.vaccineCode);
      return (
        immunization.date &&
        immunization.date < covid19Aug2025SeasonStartDate &&
        isCovid19Immunization(immunization) &&
        (cvx === undefined ||
          !covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes.has(cvx))
      );
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
}

export function covid19Aug2025Lt2OneNonModernaMostRecentPrior(
  immunizations: ForecastImmunization[],
) {
  const nonModernaDose = covid19Aug2025Lt2OneNonModernaDose(immunizations);
  if (!nonModernaDose) return undefined;
  return immunizations
    .filter((immunization) => {
      const cvx = normalizeCvx(immunization.vaccineCode);
      return (
        immunization.date &&
        immunization.date < covid19Aug2025SeasonStartDate &&
        isCovid19Immunization(immunization) &&
        (immunization === nonModernaDose ||
          cvx === undefined ||
          !covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes.has(cvx))
      );
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
}

export function covid19Aug2025PriorIsPfizerNovavaxOrUnspecified(
  immunization: ForecastImmunization,
) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return (
    cvx !== undefined && covid19Aug2025PfizerNovavaxUnspecifiedCvxCodes.has(cvx)
  );
}

export function covid19Aug2025Age65Date(patient?: ForecastPatient) {
  if (!patient?.birthDate) return undefined;
  return dateFromIceDuration({ startDate: patient.birthDate, duration: '65y' });
}

export function covid19Aug2025Turns65Within12MonthsOfSeasonStart(
  patient?: ForecastPatient,
) {
  const age65Date = covid19Aug2025Age65Date(patient);
  if (!age65Date) return false;

  return (
    covid19Aug2025SeasonStartDate < age65Date &&
    age65Date <=
      dateFromIceDuration({
        startDate: covid19Aug2025SeasonStartDate,
        duration: '12m',
      })
  );
}

export function isCovid19Aug2025Gte65TransitionDose1({
  series,
  dose,
  immunization,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  const age65Date = covid19Aug2025Age65Date(patient);
  return (
    series.id === 'COVID_19_AUG_2025_GTE_65_SERIES' &&
    dose.doseNumber === 1 &&
    !!immunization.date &&
    immunization.date >= covid19Aug2025SeasonStartDate &&
    !!age65Date &&
    immunization.date < age65Date &&
    covid19Aug2025Turns65Within12MonthsOfSeasonStart(patient) &&
    isCovid19Immunization(immunization)
  );
}

export function applyCovid19ForecastOverride({
  series,
  forecast,
  availableImmunizations,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (series.season?.code !== 'COVID_19_AUG_2025_SEASON') return forecast;

  const priorCovidDoseDate = [...availableImmunizations]
    .filter((immunization) => immunization.date && isCovid19Immunization(immunization))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date;
  const priorDose8Weeks =
    priorCovidDoseDate &&
    dateFromIceDuration({ startDate: priorCovidDoseDate, duration: '8w' });
  const recommendedVaccine =
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES'
      ? series.doses
          .find((dose) => dose.doseNumber === forecast.dose.doseNumber)
          ?.vaccines.find((vaccine) => vaccine.cvx === '311')
      : forecast.recommendedVaccine;

  if (
    (series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES' ||
      series.id === 'COVID_19_AUG_2025_GTE_65_SERIES') &&
    forecast.dose.doseNumber === 1 &&
    matchedDoses.length === 0 &&
    priorDose8Weeks
  ) {
    return {
      ...forecast,
      earliestRecommendedDate: priorDose8Weeks,
      recommendedDate: priorDose8Weeks,
      recommendedVaccine,
    };
  }

  const lt2NoValidPreSeasonInvalidPrior =
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES'
      ? covid19Aug2025Lt2NoValidPreSeasonMostRecentInvalidPrior(
          availableImmunizations,
        )
      : undefined;
  const lt2OneNonModernaPrior =
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES'
      ? covid19Aug2025Lt2OneNonModernaMostRecentPrior(availableImmunizations)
      : undefined;
  const lt2Dose1Prior =
    lt2OneNonModernaPrior ?? lt2NoValidPreSeasonInvalidPrior;
  if (
    forecast.dose.doseNumber === 1 &&
    lt2Dose1Prior?.date &&
    !hasCovid19ImmunizationInAug2025Season(availableImmunizations)
  ) {
    const interval = covid19Aug2025PriorIsPfizerNovavaxOrUnspecified(lt2Dose1Prior)
      ? '21d'
      : '28d';
    const dueDate = dateFromIceDuration({
      startDate: lt2Dose1Prior.date,
      duration: interval,
    });
    return {
      ...forecast,
      earliestRecommendedDate: dueDate,
      recommendedDate: dueDate,
      recommendedVaccine,
    };
  }

  const lt2PreSeasonDose2SkipImmunizations =
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES'
      ? covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(availableImmunizations)
      : [];
  const lt2OneModernaInvalidPrior =
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES'
      ? covid19Aug2025Lt2OneModernaMostRecentInvalidPrior(availableImmunizations)
      : undefined;
  if (
    forecast.dose.doseNumber === 2 &&
    lt2OneModernaInvalidPrior?.date &&
    !hasCovid19ImmunizationInAug2025Season(availableImmunizations)
  ) {
    const interval = covid19Aug2025PriorIsPfizerNovavaxOrUnspecified(
      lt2OneModernaInvalidPrior,
    )
      ? '21d'
      : '28d';
    const dueDate = latestDate([
      dateFromIceDuration({
        startDate: lt2OneModernaInvalidPrior.date,
        duration: interval,
      }),
      covid19Aug2025SeasonStartDate,
    ]);
    return {
      ...forecast,
      earliestRecommendedDate: dueDate,
      recommendedDate: dueDate,
      recommendedVaccine,
    };
  }

  if (
    forecast.dose.doseNumber === 2 &&
    lt2PreSeasonDose2SkipImmunizations.length >= 2 &&
    !hasCovid19ImmunizationInAug2025Season(availableImmunizations)
  ) {
    const mostRecentPreSeasonDoseDate = latestImmunizationDate(
      lt2PreSeasonDose2SkipImmunizations,
    );
    const dueDate =
      mostRecentPreSeasonDoseDate &&
      latestDate([
        dateFromIceDuration({
          startDate: mostRecentPreSeasonDoseDate,
          duration: '8w',
        }),
        covid19Aug2025SeasonStartDate,
      ]);
    return {
      ...forecast,
      earliestRecommendedDate: dueDate ?? forecast.earliestRecommendedDate,
      recommendedDate: dueDate ?? forecast.recommendedDate,
      recommendedVaccine,
    };
  }

  return {
    ...forecast,
    recommendedVaccine,
  };
}

export function covid19Sep2023Recommendation({
  series,
  patient,
  evaluationDate,
  status,
  nextDoseForecast,
  availableImmunizations,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
}): IceSeriesRecommendation | undefined {
  if (
    series.season?.code !== 'COVID_19_SEP_2023_SEASON' ||
    status === 'complete' ||
    !nextDoseForecast
  ) {
    return undefined;
  }

  const recommendationDateOverride = covid19Sep2023RecommendationDateOverride({
    series,
    patient,
    evaluationDate,
    nextDoseForecast,
    availableImmunizations,
    matchedDoses,
  });
  const recommendedDate =
    recommendationDateOverride ?? nextDoseForecast.recommendedDate;
  const earliestRecommendedDate =
    recommendationDateOverride ?? nextDoseForecast.earliestRecommendedDate;
  const resolvedRecommendedDate = recommendedDate ?? evaluationDate;
  const resolvedEarliestRecommendedDate =
    earliestRecommendedDate ?? resolvedRecommendedDate;
  if (
    covid19Sep2023RecommendationAtLeastOneYearOut({
      series,
      evaluationDate,
      nextDoseForecast,
      recommendedDate: resolvedRecommendedDate,
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }
  const recommendedVaccine = covid19Sep2023RecommendedVaccine({
    series,
    patient,
    evaluationDate,
    nextDoseForecast,
    recommendedDate: resolvedRecommendedDate,
  });
  const reasons = covid19Sep2023RecommendationReasons({
    series,
    patient,
    evaluationDate,
    recommendedDate: resolvedRecommendedDate,
    nextDoseForecast,
    availableImmunizations,
  });

  return {
    status: 'recommended',
    reasons,
    earliestRecommendedDate: resolvedEarliestRecommendedDate,
    recommendedDate: resolvedRecommendedDate,
    ...(recommendedVaccine ? { recommendedVaccine } : {}),
  };
}

function covid19Sep2023RecommendationAtLeastOneYearOut({
  series,
  evaluationDate,
  nextDoseForecast,
  recommendedDate,
}: {
  series: IceSeriesDefinition;
  evaluationDate: string;
  nextDoseForecast: IceNextDoseForecast;
  recommendedDate: string;
}) {
  const applies =
    (series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
      nextDoseForecast.dose.doseNumber === 2) ||
    (series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
      nextDoseForecast.dose.doseNumber === 4);
  if (!applies) return false;

  return (
    recommendedDate >=
    dateFromIceDuration({ startDate: evaluationDate, duration: '1y' })
  );
}

function covid19Sep2023RecommendationReasons({
  series,
  patient,
  evaluationDate,
  recommendedDate,
  nextDoseForecast,
  availableImmunizations,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  recommendedDate: string;
  nextDoseForecast: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
}): string[] {
  const hasAcceptedCvx313Exception = availableImmunizations.some(
    (immunization) =>
      normalizeCvx(immunization.vaccineCode) === '313' &&
      immunization.date &&
      immunization.date >= covid19Sep2023SeasonStartDate,
  );
  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    nextDoseForecast.dose.doseNumber === 1 &&
    hasAcceptedCvx313Exception &&
    patient?.birthDate &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: recommendedDate,
      age: '12y',
    })
  ) {
    return ['ADMINISTER_mRNA_VACCINE'];
  }

  const latestCovidImmunization = [...availableImmunizations]
    .filter((immunization) => immunization.date && isCovid19Immunization(immunization))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  if (
    series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES' &&
    normalizeCvx(latestCovidImmunization?.vaccineCode) === '313' &&
    latestCovidImmunization?.date &&
    patient?.birthDate &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestCovidImmunization.date,
      age: '6m-4d',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestCovidImmunization.date,
      age: '5y',
    })
  ) {
    return ['ADMINISTER_mRNA_VACCINE'];
  }

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    patient?.birthDate &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: recommendedDate,
      age: '12y',
    })
  ) {
    return ['ADMINISTER_mRNA_VACCINE'];
  }

  return ['DUE'];
}

function covid19Sep2023RecommendationDateOverride({
  series,
  patient,
  evaluationDate,
  nextDoseForecast,
  availableImmunizations,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  nextDoseForecast: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
}): string | undefined {
  if (!patient?.birthDate) return undefined;

  const covidImmunizations = availableImmunizations.filter(
    (immunization) => immunization.date && isCovid19Immunization(immunization),
  );
  const inSeasonCovidImmunizations = covidImmunizations.filter(
    (immunization) => immunization.date! >= covid19Sep2023SeasonStartDate,
  );
  const priorSeasonCovidDates = covidImmunizations
    .filter((immunization) => immunization.date! < covid19Sep2023SeasonStartDate)
    .map((immunization) => immunization.date!);
  const latestPriorSeasonCovidDate = latestDate(priorSeasonCovidDates);
  const targetDoseNumber = nextDoseForecast.dose.doseNumber;

  if (covidImmunizations.length === 0) {
    return latestDate([
      dateFromIceDuration({ startDate: patient.birthDate, duration: '6m' }),
      covid19Sep2023SeasonStartDate,
    ]);
  }

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    targetDoseNumber === 1
  ) {
    const acceptedExceptionDate = latestDate(
      covidImmunizations
        .filter((immunization) => {
          const cvx = normalizeCvx(immunization.vaccineCode);
          return (
            immunization.date &&
            immunization.date >= covid19Sep2023SeasonStartDate &&
            (cvx === '313' || (cvx === '211' && immunization.date < '2023-10-04'))
          );
        })
        .map((immunization) => immunization.date!),
    );
    if (acceptedExceptionDate) {
      return dateFromIceDuration({
        startDate: acceptedExceptionDate,
        duration: '28d',
      });
    }

    if (
      latestPriorSeasonCovidDate &&
      matchedDoses.length === 0 &&
      inSeasonCovidImmunizations.length === 0
    ) {
      const priorIntervalDate = dateFromIceDuration({
        startDate: latestPriorSeasonCovidDate,
        duration: '8w',
      });
      const ageFiveDate = dateFromIceDuration({
        startDate: patient.birthDate,
        duration: '5y',
      });
      return latestDate([
        priorIntervalDate,
        ageFiveDate,
        covid19Sep2023SeasonStartDate,
      ]);
    }
  }

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    targetDoseNumber === 2
  ) {
    const dose1Date = latestDoseDate(
      matchedDoses.filter((match) => match.dose.doseNumber === 1),
    );
    if (dose1Date) {
      const dose2Date = dateFromIceDuration({
        startDate: dose1Date,
        duration: '4m',
      });
      return latestDate([
        dose2Date,
        dateFromIceDuration({ startDate: patient.birthDate, duration: '65y' }),
        '2024-02-28',
      ]);
    }
  }

  if (series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES') {
    if (targetDoseNumber === 2 && patient?.birthDate) {
      const dose1 = matchedDoses.find(
        (match) =>
          match.status === 'valid' &&
          match.dose.doseNumber === 1 &&
          normalizeCvx(match.immunization.vaccineCode) === '313' &&
          match.immunization.date &&
          covid19DateAtLeastAge({
            birthDate: patient.birthDate!,
            date: match.immunization.date,
            age: '5y',
          }) &&
          !covid19DateAtLeastAge({
            birthDate: patient.birthDate!,
            date: match.immunization.date,
            age: '12y-4d',
          }),
      );
      if (dose1?.immunization.date) {
        return dateFromIceDuration({
          startDate: dose1.immunization.date,
          duration: '4w',
        });
      }
    }

    if (targetDoseNumber === 4) {
      const latestPriorDoseDate = latestDoseDate(
        matchedDoses.filter(
          (match) => match.status === 'valid' && match.dose.doseNumber < 4,
        ),
      );
      if (latestPriorDoseDate) {
        return latestDate([
          dateFromIceDuration({
            startDate: latestPriorDoseDate,
            duration: '4m',
          }),
          '2024-02-28',
        ]);
      }
    }
  }

  if (
    (series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES') &&
    latestPriorSeasonCovidDate
  ) {
    if (inSeasonCovidImmunizations.length > 0 && matchedDoses.length === 0) {
      return latestDate([
        dateFromIceDuration({
          startDate: latestPriorSeasonCovidDate,
          duration: '8w',
        }),
        covid19Sep2023SeasonStartDate,
      ]);
    }

    if (inSeasonCovidImmunizations.length > 0) return undefined;

    return latestDate([
      dateFromIceDuration({
        startDate: latestPriorSeasonCovidDate,
        duration: '8w',
      }),
      dateFromIceDuration({ startDate: patient.birthDate, duration: '6m' }),
      covid19Sep2023SeasonStartDate,
    ]);
  }

  if (
    (series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES') &&
    matchedDoses.length === 0
  ) {
    const latestInSeasonCovidDate = latestDate(
      inSeasonCovidImmunizations.map((immunization) => immunization.date!),
    );
    if (latestInSeasonCovidDate) {
      return dateFromIceDuration({
        startDate: latestInSeasonCovidDate,
        duration: '28d',
      });
    }
  }

  return undefined;
}

function covid19Sep2023RecommendedVaccine({
  series,
  patient,
  evaluationDate,
  nextDoseForecast,
  recommendedDate,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  nextDoseForecast: IceNextDoseForecast;
  recommendedDate?: string;
}): IceNextDoseForecast['recommendedVaccine'] {
  if (!patient?.birthDate) return undefined;

  const recommendationDate = recommendedDate ?? nextDoseForecast.recommendedDate ?? evaluationDate;
  const vaccineCvx =
    series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES'
      ? covid19DateAtLeastAge({
          birthDate: patient.birthDate,
          date: recommendationDate,
          age: '12y',
        })
        ? '312'
        : '311'
      : series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES'
        ? covid19DateAtLeastAge({
            birthDate: patient.birthDate,
            date: recommendationDate,
            age: '12y',
          })
          ? '309'
          : covid19DateAtLeastAge({
                birthDate: patient.birthDate,
                date: recommendationDate,
                age: '5y',
              })
            ? '310'
            : '308'
        : undefined;

  if (!vaccineCvx) return undefined;

  return nextDoseForecast.dose.vaccines.find(
    (vaccine) => vaccine.cvx === vaccineCvx,
  );
}

export function covid19Dec2020IncompletePostApr2023IntervalRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
}): IceSeriesRecommendation | undefined {
  if (
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    status === 'complete' ||
    evaluationDate < '2023-04-19' ||
    !patient?.birthDate
  ) {
    return undefined;
  }

  const latestValidDose = [...matchedDoses]
    .filter((match) => match.status === 'valid' && match.immunization.date)
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
  if (!latestValidDose?.immunization.date) return undefined;

  const latestDoseNumber = latestValidDose.dose.doseNumber;
  if (latestDoseNumber > 2) return undefined;

  const age =
    series.id === 'COVID_19_MODERNA_SERIES'
      ? '6y'
      : series.id === 'COVID_19_PFIZER_SERIES' ||
          series.id === 'COVID_19_MIXED_PRODUCT_SERIES'
        ? '5y'
        : undefined;
  if (!age) return undefined;

  if (
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestValidDose.immunization.date,
      age,
    })
  ) {
    return undefined;
  }

  const recommendedDate = dateFromIceDuration({
    startDate: latestValidDose.immunization.date,
    duration: '8w',
  });

  return {
    status: 'recommended',
    reasons: ['DUE'],
    earliestRecommendedDate: recommendedDate,
    recommendedDate,
  };
}

export function covid19Dec2020IncompleteWhoRecommendation({
  series,
  status,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
}): IceSeriesRecommendation | undefined {
  if (
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    status === 'complete'
  ) {
    return undefined;
  }

  const latestValidDose = [...matchedDoses]
    .filter((match) => match.status === 'valid' && match.immunization.date)
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
  if (!latestValidDose?.immunization.date) return undefined;

  const latestCvx = normalizeCvx(latestValidDose.immunization.vaccineCode) ?? '';
  if (!covid19Dec2020IncompleteWhoIntervalCvxCodes.has(latestCvx)) {
    return undefined;
  }

  const recommendedDate = dateFromIceDuration({
    startDate: latestValidDose.immunization.date,
    duration: '28d',
  });

  return {
    status: 'recommended',
    reasons: ['DUE'],
    earliestRecommendedDate: recommendedDate,
    recommendedDate,
  };
}

export function covid19Dec2020NoDoseRecommendation({
  series,
  patient,
  evaluationDate,
  availableImmunizations,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  availableImmunizations: ForecastImmunization[];
}): IceSeriesRecommendation | undefined {
  if (
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    !patient?.birthDate ||
    availableImmunizations.some((immunization) => isCovid19Immunization(immunization))
  ) {
    return undefined;
  }

  const ageSixMonthsDate = dateFromIceDuration({
    startDate: patient.birthDate,
    duration: '6m',
  });
  const recommendedDate =
    evaluationDate >= ageSixMonthsDate ? evaluationDate : ageSixMonthsDate;

  return {
    status: 'recommended',
    reasons: ['DUE'],
    earliestRecommendedDate: recommendedDate,
    recommendedDate,
  };
}

export function covid19Dec2020HasPostApr2023IncompleteSeriesCompletion({
  series,
  matchedDoses,
  patient,
  evaluationDate,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    !patient?.birthDate
  ) {
    return false;
  }

  const birthDate = patient.birthDate;
  if (
    covid19Dec2020HasTwoDoseIncompleteSeriesCompletion({
      series,
      matchedDoses,
      birthDate,
    })
  ) {
    return true;
  }

  return matchedDoses.some((match) => {
    const cvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
    const date = match.immunization.date;
    if (match.status !== 'valid' || !date) return false;

    if (series.id === 'COVID_19_PFIZER_SERIES') {
      return (
        covid19DateAtLeastAge({ birthDate, date, age: '5y' }) &&
        ((date >= '2023-04-19' &&
          covid19Dec2020AdditionalBoosterCvxCodes.has(cvx)) ||
          (evaluationDate >= '2023-04-19' && cvx === '300') ||
          (evaluationDate >= '2023-04-19' && cvx === '301'))
      );
    }

    if (series.id === 'COVID_19_MODERNA_SERIES') {
      return (
        covid19DateAtLeastAge({ birthDate, date, age: '6y' }) &&
        ((date >= '2023-04-19' &&
          covid19Dec2020AdditionalBoosterCvxCodes.has(cvx)) ||
          (evaluationDate >= '2023-04-19' && cvx === '229'))
      );
    }

    if (series.id === 'COVID_19_MIXED_PRODUCT_SERIES') {
      if (
        covid19DateAtLeastAge({ birthDate, date, age: '5y' }) &&
        ((date >= '2023-04-19' &&
          covid19Dec2020PostApr2023DoseCvxCodes.has(cvx)) ||
          (evaluationDate >= '2023-04-19' && (cvx === '300' || cvx === '301')))
      ) {
        return true;
      }

      return (
        covid19DateAtLeastAge({ birthDate, date, age: '6y' }) &&
        ((date >= '2023-04-19' &&
          covid19Dec2020AdditionalBoosterCvxCodes.has(cvx)) ||
          (evaluationDate >= '2023-04-19' && cvx === '229'))
      );
    }

    return false;
  });
}

export function covid19Dec2020HasTwoDoseIncompleteSeriesCompletion({
  series,
  matchedDoses,
  birthDate,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  birthDate: string;
}) {
  if (
    series.id === 'COVID_19_PFIZER_SERIES' ||
    series.id === 'COVID_19_MIXED_PRODUCT_SERIES'
  ) {
    const firstTwoAge5 = [1, 2].every((doseNumber) =>
      matchedDoses.some((match) => {
        const date = match.immunization.date;
        return (
          match.status === 'valid' &&
          match.dose.doseNumber === doseNumber &&
          !!date &&
          covid19DateAtLeastAge({ birthDate, date, age: '5y' })
        );
      }),
    );
    if (firstTwoAge5) return true;

    const firstTwoPfizer = [1, 2].every((doseNumber) =>
      matchedDoses.some((match) => {
        const cvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
        return (
          match.status === 'valid' &&
          match.dose.doseNumber === doseNumber &&
          covid19Dec2020PfizerBivalentPrimaryCvxCodes.has(cvx)
        );
      }),
    );
    if (firstTwoPfizer) return true;
  }

  if (series.id === 'COVID_19_MIXED_PRODUCT_SERIES') {
    const firstTwoModerna = [1, 2].every((doseNumber) =>
      matchedDoses.some((match) => {
        const cvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
        return (
          match.status === 'valid' &&
          match.dose.doseNumber === doseNumber &&
          covid19Dec2020ModernaBivalentPrimaryCvxCodes.has(cvx)
        );
      }),
    );
    if (firstTwoModerna) return true;

    const novavaxDoseCount = matchedDoses.filter((match) => {
      const cvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
      return match.status === 'valid' && cvx === '211';
    }).length;
    if (novavaxDoseCount >= 2) return true;
  }

  return false;
}

export function covid19Dec2020MinimumAgeOverrideSupplementalText({
  series,
  immunization,
  reasons,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  reasons: string[];
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return undefined;
  }

  const cvx = normalizeCvx(immunization.vaccineCode) ?? '';
  const belowSixMonths = !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: immunization.date,
    duration: '6m',
  });
  const underAgeJanssen =
    series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' &&
    cvx === '212' &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '18y-4d',
    });

  return belowSixMonths || underAgeJanssen ? 'COVID19_MIN_AGE' : undefined;
}

export function applyCovid19Dec2020DuplicateSameDayRules({
  series,
  matchedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON'
  ) {
    return;
  }

  for (const validPfizer of [...matchedDoses]) {
    const date = validPfizer.immunization.date;
    if (
      !date ||
      date < '2021-10-25' ||
      !covid19PfizerCvxCodes.has(
        normalizeCvx(validPfizer.immunization.vaccineCode) ?? '',
      )
    ) {
      continue;
    }

    const sameDayInvalidModernaIndex = invalidDoses.findIndex(
      (match) =>
        match.immunization.date === date &&
        !match.reasons.includes('DUPLICATE_SAME_DAY') &&
        covid19ModernaCvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
    );
    if (sameDayInvalidModernaIndex < 0) continue;

    const [invalidModerna] = invalidDoses.splice(sameDayInvalidModernaIndex, 1);
    const matchedPfizerIndex = matchedDoses.indexOf(validPfizer);
    if (matchedPfizerIndex >= 0) {
      matchedDoses[matchedPfizerIndex] = {
        ...invalidModerna,
        dose: validPfizer.dose,
        status: 'valid',
        reasons: [],
      };
    }
    invalidDoses.push({
      ...validPfizer,
      status: 'invalid',
      reasons: ['DUPLICATE_SAME_DAY'],
    });
  }

  for (const validDose of matchedDoses) {
    const date = validDose.immunization.date;
    const validCvx = normalizeCvx(validDose.immunization.vaccineCode) ?? '';
    if (!date || date < '2021-10-25') continue;

    const validIsModerna = covid19ModernaCvxCodes.has(validCvx);
    const validIsFda = covid19FdaSameDayPreferredCvxCodes.has(validCvx);
    for (const invalidDose of invalidDoses) {
      if (invalidDose.immunization.date !== date) continue;
      if (invalidDose.reasons.includes('DUPLICATE_SAME_DAY')) continue;
      const invalidCvx = normalizeCvx(invalidDose.immunization.vaccineCode) ?? '';
      if (
        (validIsModerna && covid19PfizerCvxCodes.has(invalidCvx)) ||
        (validIsFda && !covid19FdaWhoSameDayExcludedCvxCodes.has(invalidCvx))
      ) {
        invalidDose.reasons = ['DUPLICATE_SAME_DAY'];
      }
    }
  }
}

export function applyCovid19Dec2020BivalentNotYetAvailableRule({
  series,
  matchedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON'
  ) {
    return;
  }

  for (let index = matchedDoses.length - 1; index >= 0; index -= 1) {
    const match = matchedDoses[index];
    const cvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
    if (
      !match.immunization.date ||
      match.immunization.date >= '2022-09-02' ||
      !covid19Dec2020BivalentCvxCodes.has(cvx) ||
      match.reasons.includes('EXTRA_DOSE')
    ) {
      continue;
    }

    matchedDoses.splice(index, 1);
    invalidDoses.push({
      ...match,
      status: 'invalid',
      reasons: ['VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED'],
    });
  }
}

export function applyCovid19Sep2023NotAllowedReasonCleanup({
  series,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19'
  ) {
    return;
  }

  for (const invalidDose of invalidDoses) {
    if (
      invalidDose.immunization.date &&
      invalidDose.immunization.date >= covid19Sep2023SeasonStartDate &&
      invalidDose.reasons.length > 1 &&
      invalidDose.reasons.includes('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE')
    ) {
      invalidDose.reasons = invalidDose.reasons.filter(
        (reason) => reason !== 'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
      );
    }
  }
}

export function applyCovid19Dec2020IncompleteNotAllowedReasonCleanup({
  series,
  status,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    status === 'complete'
  ) {
    return;
  }

  const latestEvaluatedDose = [
    ...matchedDoses,
    ...invalidDoses,
    ...acceptedDoses,
  ]
    .filter((match) => match.immunization.date)
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
  if (!latestEvaluatedDose || !invalidDoses.includes(latestEvaluatedDose)) return;

  latestEvaluatedDose.reasons = latestEvaluatedDose.reasons.filter(
    (reason) => reason !== 'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  );
}

export function covid19Dec2020CustomAbsoluteMinimumInterval({
  series,
  dose,
  immunization,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return undefined;
  }

  const previousDose = matchedDoses.find(
    (match) => match.dose.doseNumber === dose.doseNumber - 1,
  );
  if (
    previousDose?.immunization.date &&
    dose.doseNumber > 1 &&
    immunization.date < '2021-10-25' &&
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES') &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: previousDose.immunization.date,
      age: '18y',
    })
  ) {
    return '0d';
  }

  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  if (
    dose.doseNumber === 2 &&
    dose1?.immunization.date &&
    immunization.date >= '2023-04-19'
  ) {
    if (
      series.id === 'COVID_19_MODERNA_SERIES' &&
      covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: dose1.immunization.date,
        age: '6y',
      })
    ) {
      return '8w-4d';
    }

    if (
      (series.id === 'COVID_19_PFIZER_SERIES' ||
        series.id === 'COVID_19_MIXED_PRODUCT_SERIES') &&
      covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: dose1.immunization.date,
        age: '5y',
      })
    ) {
      return '8w-4d';
    }
  }

  return undefined;
}

export function covid19Dec2020ModernaCvx213IntervalTooShort({
  series,
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return false;
  }

  const currentCvx = normalizeCvx(immunization.vaccineCode) ?? '';
  const currentIsModernaIntervalCvx =
    covid19Dec2020ModernaIntervalToCvxCodes.has(currentCvx);
  const birthDate = patient.birthDate;

  return matchedDoses.some((prior) => {
    const priorDate = prior.immunization.date;
    const priorCvx = normalizeCvx(prior.immunization.vaccineCode) ?? '';
    if (
      prior.status !== 'valid' ||
      prior.dose.doseNumber >= dose.doseNumber ||
      !priorDate ||
      dateMeetsMinimumDuration({
        startDate: priorDate,
        endDate: immunization.date!,
        duration: '24d',
      })
    ) {
      return false;
    }

    const priorIsModernaIntervalCvx =
      covid19Dec2020ModernaIntervalFromCvxCodes.has(priorCvx);
    if (!priorIsModernaIntervalCvx && !currentIsModernaIntervalCvx) {
      return false;
    }

    const priorAtLeast18 = covid19DateAtLeastAge({
      birthDate,
      date: priorDate,
      age: '18y',
    });
    if (priorAtLeast18) {
      return immunization.date! >= '2021-10-25';
    }

    return true;
  });
}

export function appendCovid19Dec2020PostCompletionDoseMatches({
  series,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  invalidDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (!patient?.birthDate) return;

  const lastDose = series.doses[series.doses.length - 1];
  const completionDoseNumber =
    covid19Dec2020CompletionDoseNumber(series, matchedDoses) ??
    Math.max(...matchedDoses.map((match) => match.dose.doseNumber));
  let extraValidCount = matchedDoses.filter(
    (match) => match.dose.doseNumber > completionDoseNumber,
  ).length;

  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      !immunization.date ||
      !isCovid19Immunization(immunization) ||
      !covid19Dec2020AdditionalBoosterCvxCodes.has(
        normalizeCvx(immunization.vaccineCode) ?? '',
      )
    ) {
      continue;
    }

    const allowedExtraLimit = covid19Dec2020PostCompletionExtraLimit({
      series,
      immunization,
      patient,
      matchedDoses,
      completionDoseNumber,
      extraValidCount,
    });
    if (allowedExtraLimit === 0 || extraValidCount >= allowedExtraLimit) {
      const invalidMatch = covid19Dec2020InvalidPostCompletionDose({
        series,
        immunization,
        matchedDoses,
        completionDoseNumber,
        lastDose,
      });
      if (invalidMatch) {
        usedImmunizationIndexes.add(index);
        invalidDoses.push(invalidMatch);
      }
      continue;
    }

    usedImmunizationIndexes.add(index);
    extraValidCount += 1;
    matchedDoses.push({
      immunization,
      dose: {
        ...lastDose,
        doseNumber: completionDoseNumber + extraValidCount,
      },
      status: 'valid',
      reasons: [],
    });
  }
}

export function covid19Dec2020CompletionDoseNumber(
  series: IceSeriesDefinition,
  matchedDoses: IceSeriesDoseMatch[],
) {
  if (
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES' ||
      covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
    matchedDoses.some((match) => match.dose.doseNumber >= 2)
  ) {
    return 2;
  }

  if (
    series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' &&
    matchedDoses.some((match) => match.dose.doseNumber >= 1)
  ) {
    return 1;
  }

  return undefined;
}

export function covid19Dec2020PostCompletionExtraLimit({
  series,
  immunization,
  patient,
  matchedDoses,
  completionDoseNumber,
  extraValidCount,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  patient: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
  extraValidCount: number;
}) {
  const birthDate = patient.birthDate;
  if (!birthDate || !immunization.date) {
    return 0;
  }
  const cvx = normalizeCvx(immunization.vaccineCode) ?? '';
  if (immunization.date >= '2022-09-02') {
    return covid19Dec2020PostBivalentExtraLimit({
      series,
      immunization,
      birthDate,
      cvx,
      matchedDoses,
      completionDoseNumber,
      extraValidCount,
    });
  }

  const ageAtLeast5 = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '5y',
  });
  const ageAtLeast18 = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '18y',
  });
  const ageAtLeast50 = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '50y',
  });

  if (ageAtLeast50 && covid19Dec2020PreBivalentAge50SeriesIds.has(series.id)) {
    return 3;
  }

  if (
    series.id === 'COVID_19_MODERNA_SERIES' &&
    ageAtLeast18 &&
    !ageAtLeast50
  ) {
    return 2;
  }

  if (
    ageAtLeast5 &&
    !ageAtLeast50 &&
    covid19Dec2020PreBivalentPfizerMixedJanssenWhoSeriesIds.has(series.id)
  ) {
    return 2;
  }

  if (
    series.id === 'COVID_19_MODERNA_SERIES' &&
    ageAtLeast5 &&
    !ageAtLeast18
  ) {
    return 1;
  }

  return 0;
}

export function covid19Dec2020PostBivalentExtraLimit({
  series,
  immunization,
  birthDate,
  cvx,
  matchedDoses,
  completionDoseNumber,
  extraValidCount,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  birthDate: string;
  cvx: string;
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
  extraValidCount: number;
}) {
  if (
    !immunization.date ||
    !covid19Dec2020PostBivalentSeriesIds.has(series.id)
  ) {
    return 0;
  }

  const ageAtLeast6Months = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '6m',
  });
  const ageAtLeast5 = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '5y',
  });
  const ageAtLeast12 = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '12y',
  });
  const ageAtLeast65 = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: immunization.date,
    duration: '65y',
  });

  let limit = 0;
  if (
    immunization.date >= '2022-09-02' &&
    ageAtLeast5 &&
    covid19Dec2020PostBivalentMonovalentCvxCodes.has(cvx)
  ) {
    limit = Math.max(limit, 1);
  }

  if (
    covid19Dec2020IsFirstBivalentAfterCompletion({
      series,
      immunization,
      matchedDoses,
      completionDoseNumber,
      cvx,
    })
  ) {
    limit = Math.max(limit, extraValidCount + 1);
  }

  if (
    ageAtLeast65 &&
    immunization.date >= '2023-04-19' &&
    covid19Dec2020PostApr2023DoseCvxCodes.has(cvx) &&
    covid19Dec2020CurrentEraDoseCountBefore({
      matchedDoses,
      completionDoseNumber,
      currentDate: immunization.date,
    }) === 1
  ) {
    limit = Math.max(limit, extraValidCount + 1);
  }

  if (immunization.date >= '2023-04-19') return limit;

  if (immunization.date >= '2022-09-02' && ageAtLeast12) {
    limit = Math.max(limit, 2);
  }
  if (immunization.date >= '2022-10-12' && ageAtLeast5) {
    limit = Math.max(limit, 2);
  }
  if (
    series.id === 'COVID_19_MODERNA_SERIES' &&
    immunization.date >= '2022-12-08' &&
    ageAtLeast6Months
  ) {
    limit = Math.max(limit, 2);
  }

  return limit;
}

export function covid19Dec2020CurrentEraDoseCountBefore({
  matchedDoses,
  completionDoseNumber,
  currentDate,
}: {
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
  currentDate: string;
}) {
  return matchedDoses.filter((match) => {
    const matchDate = match.immunization.date;
    const matchCvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
    return (
      match.status === 'valid' &&
      match.dose.doseNumber > completionDoseNumber &&
      !!matchDate &&
      matchDate < currentDate &&
      covid19Dec2020CountsForPostApr2023BivalentDose(matchDate, matchCvx)
    );
  }).length;
}

export function covid19Dec2020CurrentEraDoseCounts({
  matchedDoses,
  completionDoseNumber,
}: {
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
}) {
  let bivalentBeforeApr19 = 0;
  let postApr19 = 0;

  for (const match of matchedDoses) {
    const matchDate = match.immunization.date;
    const matchCvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
    if (
      match.status !== 'valid' ||
      match.dose.doseNumber <= completionDoseNumber ||
      !matchDate
    ) {
      continue;
    }

    if (matchDate < '2023-04-19' && covid19Dec2020BivalentCvxCodes.has(matchCvx)) {
      bivalentBeforeApr19 += 1;
    }
    if (
      matchDate >= '2023-04-19' &&
      covid19Dec2020PostApr2023DoseCvxCodes.has(matchCvx)
    ) {
      postApr19 += 1;
    }
  }

  return { bivalentBeforeApr19, postApr19 };
}

export function covid19Dec2020CountsForPostApr2023BivalentDose(
  date: string,
  cvx: string,
) {
  return (
    (date < '2023-04-19' && covid19Dec2020BivalentCvxCodes.has(cvx)) ||
    (date >= '2023-04-19' &&
      covid19Dec2020PostApr2023DoseCvxCodes.has(cvx))
  );
}

export function covid19Dec2020IsFirstBivalentAfterCompletion({
  series,
  immunization,
  matchedDoses,
  completionDoseNumber,
  cvx,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
  cvx: string;
}) {
  if (!immunization.date || !covid19Dec2020BivalentCvxCodes.has(cvx)) return false;

  const cutoff =
    series.id === 'COVID_19_PFIZER_SERIES' ? '2023-03-17' : '2023-04-19';
  const allowedSeries =
    series.id === 'COVID_19_PFIZER_SERIES' ||
    series.id === 'COVID_19_MODERNA_SERIES' ||
    series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
    series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' ||
    series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES';
  if (!allowedSeries || immunization.date < cutoff) return false;

  return !matchedDoses.some((match) => {
    const matchDate = match.immunization.date;
    const matchCvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
    return (
      match.status === 'valid' &&
      !!matchDate &&
      match.dose.doseNumber > completionDoseNumber &&
      (matchDate >= '2023-04-19' ||
        (matchDate < cutoff && covid19Dec2020BivalentCvxCodes.has(matchCvx)))
    );
  });
}

export function covid19Dec2020InvalidPostCompletionDose({
  series,
  immunization,
  matchedDoses,
  completionDoseNumber,
  lastDose,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
  lastDose: IceDoseRule;
}): IceSeriesDoseMatch | undefined {
  const currentDate = immunization.date;
  if (
    !currentDate ||
    currentDate < '2022-09-02' ||
    currentDate >= '2023-04-19' ||
    !covid19Dec2020SecondBoosterSeriesIds.has(series.id)
  ) {
    return undefined;
  }

  const postCompletionValid = matchedDoses.filter(
    (match) =>
      match.status === 'valid' && match.dose.doseNumber > completionDoseNumber,
  );
  if (postCompletionValid.length < 2 || postCompletionValid.length > 3) {
    return undefined;
  }

  const priorDate = latestDate(
    postCompletionValid
      .map((match) => match.immunization.date)
      .filter(isDefined)
      .filter((date) => date < currentDate),
  );
  if (
    !priorDate ||
    currentDate >=
      dateFromIceDuration({ startDate: priorDate, duration: '8w-4d' })
  ) {
    return undefined;
  }

  return {
    immunization,
    dose: {
      ...lastDose,
      doseNumber: completionDoseNumber + postCompletionValid.length + 1,
    },
    status: 'invalid',
    reasons: ['BELOW_MINIMUM_INTERVAL'],
  };
}

export function applyCovid19Dec2020PostCompletionSupplementalText({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_DEC_2020_SEASON'
  ) {
    return;
  }

  const completionDoseNumber = covid19Dec2020CompletionDoseNumber(
    series,
    matchedDoses,
  );
  if (completionDoseNumber === undefined) return;

  for (const match of matchedDoses) {
    const currentDate = match.immunization.date;
    const cvx = normalizeCvx(match.immunization.vaccineCode) ?? '';
    if (
      match.status !== 'valid' ||
      !currentDate ||
      (currentDate >= '2023-04-19' &&
        !covid19Dec2020BivalentCvxCodes.has(cvx)) ||
      match.dose.doseNumber <= completionDoseNumber
    ) {
      continue;
    }

    const priorDate = latestDate(
      matchedDoses
        .filter(
          (candidate) =>
            candidate !== match &&
            candidate.status === 'valid' &&
            !!candidate.immunization.date &&
            candidate.immunization.date < currentDate,
        )
        .map((candidate) => candidate.immunization.date)
        .filter(isDefined),
    );
    if (!priorDate) continue;

    const extraDoseNumber = match.dose.doseNumber - completionDoseNumber;
    const supplementalText =
      covid19Dec2020Age65SecondBivalentSupplementalText({
        matchedDoses,
        completionDoseNumber,
        birthDate: patient?.birthDate,
        currentDate,
        priorDate,
      }) ??
      covid19Dec2020PostCompletionIntervalSupplementalText({
        series,
        extraDoseNumber,
        cvx,
        currentDate,
        priorDate,
      });
    if (!supplementalText) continue;

    match.supplementalText = unique([
      ...(match.supplementalText ?? []),
      supplementalText,
    ]);
  }
}

export function covid19Dec2020Age65SecondBivalentSupplementalText({
  matchedDoses,
  completionDoseNumber,
  birthDate,
  currentDate,
  priorDate,
}: {
  matchedDoses: IceSeriesDoseMatch[];
  completionDoseNumber: number;
  birthDate?: string;
  currentDate: string;
  priorDate: string;
}) {
  if (
    !birthDate ||
    currentDate < '2023-04-19' ||
    !dateMeetsMinimumDuration({
      startDate: birthDate,
      endDate: currentDate,
      duration: '65y',
    }) ||
    currentDate >= dateFromIceDuration({ startDate: priorDate, duration: '4m' })
  ) {
    return undefined;
  }

  const { bivalentBeforeApr19, postApr19 } =
    covid19Dec2020CurrentEraDoseCounts({
      matchedDoses,
      completionDoseNumber,
    });

  if (
    postApr19 >= 1 &&
    postApr19 <= 2 &&
    bivalentBeforeApr19 + postApr19 >= 2
  ) {
    return 'COVID19_MIN_INTERVAL_4M';
  }

  return undefined;
}

export function covid19Dec2020PostCompletionIntervalSupplementalText({
  series,
  extraDoseNumber,
  cvx,
  currentDate,
  priorDate,
}: {
  series: IceSeriesDefinition;
  extraDoseNumber: number;
  cvx: string;
  currentDate: string;
  priorDate: string;
}) {
  if (
    covid19Dec2020BivalentCvxCodes.has(cvx) &&
    currentDate >=
      (series.id === 'COVID_19_PFIZER_SERIES' ? '2023-03-17' : '2023-04-19') &&
    currentDate < dateFromIceDuration({ startDate: priorDate, duration: '8w' })
  ) {
    return 'COVID19_MIN_INTERVAL_8W';
  }

  if (extraDoseNumber === 1) {
    if (
      covid19Dec2020FirstBoosterEightWeekSeriesIds.has(series.id) &&
      currentDate >= '2022-09-02' &&
      currentDate < dateFromIceDuration({ startDate: priorDate, duration: '8w' })
    ) {
      return 'COVID19_MIN_INTERVAL_8W_1ST_BOOSTER';
    }

    if (
      covid19Dec2020FirstBoosterFiveMonthSeriesIds.has(series.id) &&
      currentDate < '2022-09-02' &&
      currentDate < dateFromIceDuration({ startDate: priorDate, duration: '5m' })
    ) {
      return 'COVID19_MIN_INTERVAL_5M_1ST_BOOSTER';
    }

    if (
      (series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' ||
        series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES') &&
      currentDate < dateFromIceDuration({ startDate: priorDate, duration: '8w' })
    ) {
      return 'COVID19_MIN_INTERVAL_8W_1ST_BOOSTER';
    }
  }

  if (extraDoseNumber === 2) {
    if (
      covid19Dec2020SecondBoosterSeriesIds.has(series.id) &&
      currentDate >= '2022-09-02' &&
      currentDate < dateFromIceDuration({ startDate: priorDate, duration: '8w' })
    ) {
      return 'COVID19_MIN_INTERVAL_8W_2ND_BOOSTER';
    }

    if (
      covid19Dec2020SecondBoosterSeriesIds.has(series.id) &&
      currentDate < '2022-09-02' &&
      currentDate < dateFromIceDuration({ startDate: priorDate, duration: '4m' })
    ) {
      return 'COVID19_MIN_INTERVAL_4M_2ND_BOOSTER';
    }
  }

  return undefined;
}

export function covid19Dec2020PreSep2022FirstBoosterRecommendation({
  series,
  patient,
  evaluationDate,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  matchedDoses: IceSeriesDoseMatch[];
}): IceSeriesRecommendation | undefined {
  if (
    series.season?.code !== 'COVID_19_DEC_2020_SEASON' ||
    !patient?.birthDate
  ) {
    return undefined;
  }

  const validDoses = matchedDoses.filter((match) => match.status === 'valid');
  const completionDoseNumber = covid19Dec2020CompletionDoseNumber(
    series,
    validDoses,
  );
  if (!completionDoseNumber) return undefined;

  const extraDoseCount = validDoses.filter(
    (match) => match.dose.doseNumber > completionDoseNumber,
  ).length;
  const latestPrimaryDoseDate = latestDoseDate(
    validDoses.filter((match) => match.dose.doseNumber <= completionDoseNumber),
  );
  if (!latestPrimaryDoseDate) return undefined;

  const latestValidDoseDate = latestDoseDate(validDoses);
  if (!latestValidDoseDate) return undefined;
  const extraDoses = validDoses.filter(
    (match) => match.dose.doseNumber > completionDoseNumber,
  );
  const latestExtraDoseDate = latestDoseDate(extraDoses);
  const currentEraCounts = covid19Dec2020CurrentEraDoseCounts({
    matchedDoses: validDoses,
    completionDoseNumber,
  });

  if (
    series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' &&
    extraDoseCount <= 1 &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  const recommendation = (
    age: string,
    interval: string,
    intervalStartDate = latestPrimaryDoseDate,
    reasons = ['BOOSTER_DOSE'],
  ): IceSeriesRecommendation => {
    const recommendedDate = latestDate([
      dateFromIceDuration({ startDate: patient.birthDate!, duration: age }),
      dateFromIceDuration({
        startDate: intervalStartDate,
        duration: interval,
      }),
    ]);

    return {
      status: 'recommended',
      reasons,
      earliestRecommendedDate: recommendedDate,
      recommendedDate,
    };
  };

  if (evaluationDate >= '2022-09-02') {
    const bivalentEraRecommendation =
      covid19Dec2020BivalentEraRecommendation({
        series,
        patient,
        evaluationDate,
        latestValidDoseDate,
        latestExtraDoseDate,
        currentEraCounts,
        extraDoseCount,
        recommendation,
      });
    if (bivalentEraRecommendation) return bivalentEraRecommendation;

    return undefined;
  }

  if (extraDoseCount === 1) {
    if (
      series.id === 'COVID_19_MODERNA_SERIES' &&
      covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: evaluationDate,
        age: '18y',
      }) &&
      !covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: evaluationDate,
        age: '50y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    if (
      (series.id === 'COVID_19_PFIZER_SERIES' ||
        series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
        covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
      covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: evaluationDate,
        age: '5y',
      }) &&
      !covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: evaluationDate,
        age: '50y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    if (
      (series.id === 'COVID_19_PFIZER_SERIES' ||
        series.id === 'COVID_19_MODERNA_SERIES' ||
        series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
        covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
      covid19DateAtLeastAge({
        birthDate: patient.birthDate,
        date: evaluationDate,
        age: '50y',
      })
    ) {
      return recommendation('50y', '4m', latestValidDoseDate);
    }

    if (series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES') {
      const extraDose = validDoses.find(
        (match) => match.dose.doseNumber === completionDoseNumber + 1,
      );
      const extraDoseCvx = normalizeCvx(extraDose?.immunization.vaccineCode);
      const extraDoseIsMrna =
        !!extraDoseCvx &&
        (covid19PfizerCvxCodes.has(extraDoseCvx) ||
          covid19ModernaCvxCodes.has(extraDoseCvx));

      if (
        extraDoseIsMrna &&
        covid19DateAtLeastAge({
          birthDate: patient.birthDate,
          date: evaluationDate,
          age: '18y',
        }) &&
        !covid19DateAtLeastAge({
          birthDate: patient.birthDate,
          date: evaluationDate,
          age: '50y',
        })
      ) {
        return {
          status: 'conditionally-recommended',
          reasons: ['COMPLETE_HIGH_RISK'],
        };
      }

      if (
        covid19DateAtLeastAge({
          birthDate: patient.birthDate,
          date: evaluationDate,
          age: extraDoseIsMrna ? '50y' : '18y',
        })
      ) {
        return recommendation(
          extraDoseIsMrna ? '50y' : '18y',
          '4m',
          latestValidDoseDate,
        );
      }
    }

    return undefined;
  }

  if (
    extraDoseCount === 2 &&
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' ||
      covid19Dec2020WhoApprovedSeriesIds.has(series.id))
  ) {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (extraDoseCount !== 0) return undefined;

  if (
    series.id === 'COVID_19_MODERNA_SERIES' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '18y',
    })
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (
    series.id === 'COVID_19_MODERNA_SERIES' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '18y',
    })
  ) {
    return recommendation('18y', '5m');
  }

  if (
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES') &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    })
  ) {
    return recommendation('5y', '5m');
  }

  if (
    series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    })
  ) {
    return recommendation('12y', '8w');
  }

  if (
    series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    })
  ) {
    return recommendation('12y', '5m');
  }

  if (
    covid19Dec2020WhoApprovedSeriesIds.has(series.id) &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    })
  ) {
    return recommendation('5y', '5m');
  }

  return undefined;
}

export function covid19Dec2020BivalentEraRecommendation({
  series,
  patient,
  evaluationDate,
  latestValidDoseDate,
  latestExtraDoseDate,
  currentEraCounts,
  extraDoseCount,
  recommendation,
}: {
  series: IceSeriesDefinition;
  patient: ForecastPatient;
  evaluationDate: string;
  latestValidDoseDate: string;
  latestExtraDoseDate?: string;
  currentEraCounts: {
    bivalentBeforeApr19: number;
    postApr19: number;
  };
  extraDoseCount: number;
  recommendation: (
    age: string,
    interval: string,
    intervalStartDate?: string,
  ) => IceSeriesRecommendation;
}): IceSeriesRecommendation | undefined {
  const complete = (): IceSeriesRecommendation => ({
    status: 'not-recommended',
    reasons: ['COMPLETE'],
  });
  const currentEraDoseCount =
    currentEraCounts.bivalentBeforeApr19 + currentEraCounts.postApr19;
  if (!patient.birthDate) return undefined;

  if (
    evaluationDate >= '2023-04-19' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '65y',
    }) &&
    currentEraDoseCount >= 2
  ) {
    return complete();
  }

  if (
    evaluationDate >= '2023-04-19' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '65y',
    }) &&
    (currentEraCounts.bivalentBeforeApr19 === 1 ||
      currentEraCounts.postApr19 === 1)
  ) {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (
    evaluationDate >= '2023-04-19' &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '65y',
    }) &&
    currentEraDoseCount >= 1
  ) {
    return complete();
  }

  if (
    evaluationDate < '2023-04-19' &&
    series.id === 'COVID_19_MODERNA_SERIES' &&
    latestExtraDoseDate &&
    latestExtraDoseDate >= '2022-12-08' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestExtraDoseDate,
      age: '6m',
    })
  ) {
    return complete();
  }

  if (
    evaluationDate < '2023-03-17' &&
    series.id === 'COVID_19_PFIZER_SERIES' &&
    latestExtraDoseDate &&
    latestExtraDoseDate >= '2022-10-12' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestExtraDoseDate,
      age: '5y',
    })
  ) {
    return complete();
  }

  if (
    evaluationDate < '2023-04-19' &&
    (series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
    latestExtraDoseDate &&
    latestExtraDoseDate >= '2022-10-12' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestExtraDoseDate,
      age: '5y',
    })
  ) {
    return complete();
  }

  if (
    evaluationDate < '2023-03-17' &&
    series.id === 'COVID_19_PFIZER_SERIES' &&
    latestExtraDoseDate &&
    latestExtraDoseDate >= '2022-09-02' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestExtraDoseDate,
      age: '12y',
    })
  ) {
    return complete();
  }

  if (
    evaluationDate < '2023-04-19' &&
    (series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES' ||
      series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' ||
      covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
    latestExtraDoseDate &&
    latestExtraDoseDate >= '2022-09-02' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: latestExtraDoseDate,
      age: '12y',
    })
  ) {
    return complete();
  }

  const hasExtraDoseOnOrAfter = (date: string) =>
    !!latestExtraDoseDate && latestExtraDoseDate >= date;
  const recommendationFrom = (age: string, startDate: string) => {
    const result = recommendation(age, '8w', latestValidDoseDate);
    const recommendedDate = latestDate([result.recommendedDate!, startDate]);
    return {
      ...result,
      earliestRecommendedDate: recommendedDate,
      recommendedDate,
    };
  };
  const bivalentRecommendationFrom = (age: string, startDate: string) => ({
    ...recommendationFrom(age, startDate),
    reasons: ['ADMINISTER_COVID19_BIVALENT_VACCINE'],
  });

  if (
    evaluationDate >= '2023-04-19' &&
    currentEraDoseCount === 0 &&
    (series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' ||
      series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES')
  ) {
    return bivalentRecommendationFrom('6m', '2023-04-19');
  }

  if (
    evaluationDate >= '2023-04-19' &&
    currentEraDoseCount === 0 &&
    series.id === 'COVID_19_PFIZER_SERIES' &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    })
  ) {
    return bivalentRecommendationFrom('6m', '2022-09-02');
  }

  if (
    evaluationDate >= '2023-03-17' &&
    currentEraDoseCount === 0 &&
    series.id === 'COVID_19_PFIZER_SERIES' &&
    extraDoseCount <= 2 &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    })
  ) {
    return bivalentRecommendationFrom('6m', '2023-03-17');
  }

  if (
    evaluationDate >= '2022-12-08' &&
    evaluationDate < '2023-04-19' &&
    series.id === 'COVID_19_MODERNA_SERIES' &&
    !hasExtraDoseOnOrAfter('2022-12-08') &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '6m',
    })
  ) {
    return recommendationFrom('6m', '2022-12-08');
  }

  if (
    evaluationDate >= '2022-10-12' &&
    evaluationDate < '2022-12-08' &&
    series.id === 'COVID_19_MODERNA_SERIES' &&
    !hasExtraDoseOnOrAfter('2022-10-12') &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    })
  ) {
    return recommendationFrom('5y', '2022-10-12');
  }

  if (
    evaluationDate >= '2022-10-12' &&
    evaluationDate < '2023-04-19' &&
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
    !hasExtraDoseOnOrAfter('2022-10-12') &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '5y',
    }) &&
    !covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    })
  ) {
    return recommendationFrom('5y', '2022-10-12');
  }

  if (
    evaluationDate >= '2022-09-02' &&
    evaluationDate < '2023-04-19' &&
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES' ||
      series.id === 'COVID_19_NOVAVAX_2_DOSE_SERIES' ||
      series.id === 'COVID_19_JANSSEN_1_DOSE_SERIES' ||
      covid19Dec2020WhoApprovedSeriesIds.has(series.id)) &&
    !hasExtraDoseOnOrAfter('2022-09-02') &&
    covid19DateAtLeastAge({
      birthDate: patient.birthDate,
      date: evaluationDate,
      age: '12y',
    })
  ) {
    return recommendationFrom('12y', '2022-09-02');
  }

  return undefined;
}

export function buildCovid19Recommendation({
  series,
  patient,
  evaluationDate,
  status,
  matchedDoses,
  availableImmunizations,
  nextDoseForecast,
  dataset,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  availableImmunizations: ForecastImmunization[];
  nextDoseForecast?: IceNextDoseForecast;
  dataset: IceDataset;
}): IceSeriesRecommendation | undefined {
  const dec2020NoDoseRecommendation = covid19Dec2020NoDoseRecommendation({
    series,
    patient,
    evaluationDate,
    availableImmunizations,
  });
  if (dec2020NoDoseRecommendation) return dec2020NoDoseRecommendation;

  const dec2020IncompleteIntervalRecommendation =
    covid19Dec2020IncompletePostApr2023IntervalRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
    });
  if (dec2020IncompleteIntervalRecommendation) {
    return dec2020IncompleteIntervalRecommendation;
  }

  const sep2023Recommendation = covid19Sep2023Recommendation({
    series,
    patient,
    evaluationDate,
    status,
    nextDoseForecast,
    availableImmunizations,
    matchedDoses,
  });
  if (sep2023Recommendation) return sep2023Recommendation;

  const dec2020IncompleteWhoRecommendation =
    covid19Dec2020IncompleteWhoRecommendation({
      series,
      status,
      matchedDoses,
    });
  if (dec2020IncompleteWhoRecommendation) {
    return dec2020IncompleteWhoRecommendation;
  }

  if (status === 'complete') {
    const dec2020FirstBooster =
      covid19Dec2020PreSep2022FirstBoosterRecommendation({
        series,
        patient,
        evaluationDate,
        matchedDoses,
      });
    if (dec2020FirstBooster) return dec2020FirstBooster;

    if (
      covid19CompleteSeasonHasFutureSeason({
        series,
        evaluationDate,
        dataset,
      })
    ) {
      return {
        status: 'not-recommended',
        reasons: ['COMPLETE'],
      };
    }

    if (series.season?.code !== 'COVID_19_AUG_2025_SEASON') return undefined;

    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (series.season?.code !== 'COVID_19_AUG_2025_SEASON') return undefined;

  if (!nextDoseForecast) return undefined;

  const latestCovidDoseDate = latestCovid19ImmunizationDate(availableImmunizations);
  const supplementalText: string[] = [];

  if (
    series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES' &&
    nextDoseForecast.dose.doseNumber === 1 &&
    latestCovidDoseDate &&
    patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '12y-8w',
    }) &&
    evaluationDate <=
      dateFromIceDuration({ startDate: latestCovidDoseDate, duration: '12w' })
  ) {
    supplementalText.push('TARGET_DOSE1_NOVAVAX_3W_OTHERS_8_12W');
  }

  if (
    series.id === 'COVID_19_AUG_2025_GTE_65_SERIES' &&
    nextDoseForecast.dose.doseNumber === 1 &&
    latestCovidDoseDate &&
    evaluationDate <=
      dateFromIceDuration({ startDate: latestCovidDoseDate, duration: '12w' })
  ) {
    supplementalText.push('TARGET_DOSE1_NOVAVAX_3W_OTHERS_8_12W_V2');
  }

  if (
    series.id === 'COVID_19_AUG_2025_GTE_65_SERIES' &&
    nextDoseForecast.dose.doseNumber === 2
  ) {
    supplementalText.push('TARGET_DOSE2_6MO_MIN_8_12W_BY_PRODUCT');
  }

  if (
    series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES' &&
    patient?.birthDate &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    }) &&
    hasCovid19ImmunizationBeforeSeason(availableImmunizations, series) &&
    !hasCovid19ImmunizationInSeason(availableImmunizations, series)
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK', 'CLINICAL_PATIENT_DISCRETION'],
      recommendedVaccine: nextDoseForecast.recommendedVaccine,
      earliestRecommendedDate: nextDoseForecast.earliestRecommendedDate,
      recommendedDate: nextDoseForecast.recommendedDate,
      ...(supplementalText.length > 0 ? { supplementalText } : {}),
    };
  }

  return {
    status: 'recommended',
    reasons: ['DUE'],
    recommendedVaccine: nextDoseForecast.recommendedVaccine,
    earliestRecommendedDate: nextDoseForecast.earliestRecommendedDate,
    recommendedDate: nextDoseForecast.recommendedDate,
    ...(supplementalText.length > 0 ? { supplementalText } : {}),
  };
}

export function latestCovid19ImmunizationDate(immunizations: ForecastImmunization[]) {
  return [...immunizations]
    .filter((immunization) => immunization.date && isCovid19Immunization(immunization))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date;
}

export function covid19CompleteSeasonHasFutureSeason({
  series,
  evaluationDate,
  dataset,
}: {
  series: IceSeriesDefinition;
  evaluationDate: string;
  dataset: IceDataset;
}) {
  const season = dataset.seasons.find((candidate) => candidate.code === series.season?.code);
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    !season?.startDate ||
    season.startDate < '2023-09-12'
  ) {
    return false;
  }

  return dataset.seasons.some(
    (candidate) =>
      candidate.vaccineGroup?.code === 'COVID_19' &&
      candidate.code !== season.code &&
      !!candidate.startDate &&
      candidate.startDate > evaluationDate,
  );
}

export function hasCovid19ImmunizationBeforeSeason(
  immunizations: ForecastImmunization[],
  series: IceSeriesDefinition,
) {
  const seasonStartDate = covid19SeasonStartDate(series);
  if (!seasonStartDate) return false;
  return immunizations.some(
    (immunization) =>
      immunization.date &&
      immunization.date < seasonStartDate &&
      isCovid19Immunization(immunization),
  );
}

export function hasCovid19ImmunizationInSeason(
  immunizations: ForecastImmunization[],
  series: IceSeriesDefinition,
) {
  const seasonStartDate = covid19SeasonStartDate(series);
  if (!seasonStartDate) return false;
  return immunizations.some(
    (immunization) =>
      immunization.date &&
      immunization.date >= seasonStartDate &&
      isCovid19Immunization(immunization),
  );
}

export function covid19SeasonStartDate(series: IceSeriesDefinition) {
  if (series.season?.code === 'COVID_19_AUG_2025_SEASON') {
    return covid19Aug2025SeasonStartDate;
  }
  return undefined;
}

export function covid19Sep2023Lt5SkipTargetDoseNumber({
  series,
  availableImmunizations,
  patient,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  patient?: ForecastPatient;
}) {
  if (
    series.season?.code !== 'COVID_19_SEP_2023_SEASON' ||
    !patient?.birthDate
  ) {
    return undefined;
  }

  const qualifyingPriorDates = covid19Sep2023Lt5QualifyingPriorDates({
    series,
    availableImmunizations,
    birthDate: patient.birthDate,
  });
  const count = qualifyingPriorDates.length;

  if (series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES') {
    return count >= 2 ? 3 : count === 1 ? 2 : undefined;
  }

  if (series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES') {
    return count >= 2 ? 3 : count === 1 ? 2 : undefined;
  }

  if (series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES') {
    return count >= 1 ? 2 : undefined;
  }

  return undefined;
}

export function covid19Sep2023NextTargetDoseNumber({
  series,
  availableImmunizations,
  matchedDoses,
  patient,
  completedDoses,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  completedDoses: number;
}) {
  const lt5TargetDoseNumber = covid19Sep2023Lt5SkipTargetDoseNumber({
    series,
    availableImmunizations,
    patient,
  });
  if (lt5TargetDoseNumber !== undefined) return lt5TargetDoseNumber;

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    completedDoses === 2 &&
    matchedDoses.some(
      (match) =>
        match.status === 'valid' &&
        match.dose.doseNumber <= 2 &&
        normalizeCvx(match.immunization.vaccineCode) === '313',
    )
  ) {
    return 4;
  }

  return undefined;
}

export function covid19Sep2023HasCustomCompletion({
  series,
  matchedDoses,
  patient,
  evaluationDate,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (
    series.season?.code !== 'COVID_19_SEP_2023_SEASON' ||
    !patient?.birthDate
  ) {
    return false;
  }

  const patientUnder65OnEvaluationDate = !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: evaluationDate,
    duration: '65y',
  });

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    patientUnder65OnEvaluationDate
  ) {
    return matchedDoses.some(
      (match) =>
        match.status === 'valid' &&
        match.dose.doseNumber === 1 &&
        !covid19Sep2023NovavaxCvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
    );
  }

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    patientUnder65OnEvaluationDate
  ) {
    const novavaxPrimaryDoses = new Set(
      matchedDoses
        .filter(
          (match) =>
            match.status === 'valid' &&
            (match.dose.doseNumber === 1 || match.dose.doseNumber === 2) &&
            covid19Sep2023NovavaxCvxCodes.has(
              normalizeCvx(match.immunization.vaccineCode) ?? '',
            ),
        )
        .map((match) => match.dose.doseNumber),
    );
    if (novavaxPrimaryDoses.size >= 2) return true;
  }

  if (series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES') {
    return matchedDoses.some((match) => {
      const cvx = normalizeCvx(match.immunization.vaccineCode);
      return (
        (cvx === '309' || cvx === '310') &&
        !!match.immunization.date &&
        dateMeetsMinimumDuration({
          startDate: patient.birthDate!,
          endDate: match.immunization.date,
          duration: '5y',
        })
      );
    });
  }

  if (series.id !== 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES') {
    return false;
  }

  const hasUpdatedMrnaAtAge5 = matchedDoses.some((match) => {
    const cvx = normalizeCvx(match.immunization.vaccineCode);
    return (
      (cvx === '309' || cvx === '310' || cvx === '311' || cvx === '312') &&
      !!match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '5y',
      })
    );
  });
  if (hasUpdatedMrnaAtAge5) return true;

  const hasAnyDoseBeforeAge5 = matchedDoses.some(
    (match) =>
      !!match.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '5y',
      }),
  );
  const novavaxAtOrAfterAge5Count = matchedDoses.filter(
    (match) =>
      normalizeCvx(match.immunization.vaccineCode) === '313' &&
      !!match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '5y',
      }),
  ).length;

  return (
    (hasAnyDoseBeforeAge5 && novavaxAtOrAfterAge5Count >= 1) ||
    novavaxAtOrAfterAge5Count >= 2
  );
}

export function covid19Sep2023Lt5QualifyingPriorDates({
  series,
  availableImmunizations,
  birthDate,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  birthDate: string;
}) {
  const qualifyingCvxCodes =
    series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES'
      ? covid19Sep2023PfizerLt5PriorCvxCodes
      : series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES'
        ? covid19Sep2023ModernaLt5PriorCvxCodes
        : series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES'
          ? covid19Sep2023MixedLt5PriorCvxCodes
          : undefined;
  if (!qualifyingCvxCodes) return [];

  return unique(
    availableImmunizations
      .filter((immunization) => {
        const cvx = normalizeCvx(immunization.vaccineCode);
        return (
          !!cvx &&
          qualifyingCvxCodes.has(cvx) &&
          !!immunization.date &&
          immunization.date < '2023-09-12' &&
          !dateMeetsMinimumDuration({
            startDate: birthDate,
            endDate: immunization.date,
            duration: '5y',
          })
        );
      })
      .map((immunization) => immunization.date)
      .filter(isDefined),
  ).sort();
}

export function shouldSkipCovid19Aug2025Lt2PreSeasonDose2Match({
  series,
  dose,
  immunization,
  availableImmunizations,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
}) {
  return (
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES' &&
    dose.doseNumber === 2 &&
    !!immunization.date &&
    immunization.date < covid19Aug2025SeasonStartDate &&
    covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(availableImmunizations)
      .length >= 2
  );
}

export function shouldSkipCovid19Aug2025Lt2OneNonModernaDose1Match({
  series,
  dose,
  immunization,
  availableImmunizations,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
}) {
  return (
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES' &&
    dose.doseNumber === 1 &&
    !!immunization.date &&
    immunization.date < covid19Aug2025SeasonStartDate &&
    immunization === covid19Aug2025Lt2OneNonModernaDose(availableImmunizations)
  );
}

export function shouldSkipCovid19Aug2025AdultPreSeasonDose1Match({
  series,
  dose,
  immunization,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
}) {
  return (
    (series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES' ||
      series.id === 'COVID_19_AUG_2025_GTE_65_SERIES') &&
    dose.doseNumber === 1 &&
    !!immunization.date &&
    immunization.date < covid19Aug2025SeasonStartDate
  );
}

export function evaluateCovid19CustomConstraints({
  series,
  dose,
  dataset,
  immunization,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  dataset: IceDataset;
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  const reasons: string[] = [];
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!patient?.birthDate || !immunization.date || !cvx) return reasons;

  if (
    series.id === 'COVID_19_PFIZER_SERIES' &&
    dose.doseNumber === 3 &&
    cvx === '302'
  ) {
    return reasons;
  }

  if (
    (series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES') &&
    (dose.doseNumber === 2 || dose.doseNumber === 3) &&
    cvx === '308'
  ) {
    return reasons;
  }

  const maximumAge = findVaccineMaximumAge(dataset, cvx);
  if (
    maximumAge &&
    immunization.date > dateFromIceDuration({
      startDate: patient.birthDate,
      duration: maximumAge,
    })
  ) {
    reasons.push('ABOVE_MAXIMUM_AGE_VACCINE');
  }

  return reasons;
}

export function covid19Sep2023ModernaCvx213IntervalTooShort({
  series,
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    series.season?.code !== 'COVID_19_SEP_2023_SEASON' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return false;
  }

  const currentCvx = normalizeCvx(immunization.vaccineCode) ?? '';
  const currentIsModernaOrCvx213 =
    covid19Sep2023ModernaCvx213IntervalCvxCodes.has(currentCvx);
  const patientUnder18AtCurrentShot = !covid19DateAtLeastAge({
    birthDate: patient.birthDate,
    date: immunization.date,
    age: '18y',
  });

  return matchedDoses.some((prior) => {
    const priorDate = prior.immunization.date;
    const priorCvx = normalizeCvx(prior.immunization.vaccineCode) ?? '';
    if (
      prior.status !== 'valid' ||
      prior.dose.doseNumber >= dose.doseNumber ||
      !priorDate ||
      dateMeetsMinimumDuration({
        startDate: priorDate,
        endDate: immunization.date!,
        duration: '24d',
      })
    ) {
      return false;
    }

    const priorIsModernaOrCvx213 =
      covid19Sep2023ModernaCvx213IntervalCvxCodes.has(priorCvx);
    return (
      priorIsModernaOrCvx213 ||
      (patientUnder18AtCurrentShot && currentIsModernaOrCvx213)
    );
  });
}

export function covid19Sep2023ModernaLt5SkippedDose2PriorSeasonIntervalTooShort({
  series,
  immunization,
  dose,
  matchedDoses,
  availableImmunizations,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  availableImmunizations: ForecastImmunization[];
  patient?: ForecastPatient;
}) {
  if (
    series.id !== 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES' ||
    dose.doseNumber !== 2 ||
    matchedDoses.length > 0 ||
    !patient?.birthDate ||
    !immunization.date ||
    immunization.date < '2023-09-12'
  ) {
    return false;
  }

  const qualifyingPriorDates = covid19Sep2023Lt5QualifyingPriorDates({
    series,
    availableImmunizations,
    birthDate: patient.birthDate,
  });
  if (qualifyingPriorDates.length < 2) return false;

  const latestPriorDate = qualifyingPriorDates[qualifyingPriorDates.length - 1];
  return (
    !!latestPriorDate &&
    !dateMeetsMinimumDuration({
      startDate: latestPriorDate,
      endDate: immunization.date,
      duration: '8w-4d',
    })
  );
}

export function covid19Sep2023NovavaxMrnaDose2IntervalTooShort({
  series,
  immunization,
  dose,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (
    series.id !== 'COVID_19_SEP_2023_NOVAVAX_SERIES' ||
    dose.doseNumber !== 2 ||
    !immunization.date ||
    (cvx !== '213' && cvx !== '309' && cvx !== '312')
  ) {
    return false;
  }

  const latestPrior = latestDoseDate(
    matchedDoses.filter(
      (match) => match.status === 'valid' && match.dose.doseNumber < 2,
    ),
  );
  return (
    !!latestPrior &&
    !dateMeetsMinimumDuration({
      startDate: latestPrior,
      endDate: immunization.date,
      duration: '8w-4d',
    })
  );
}

export function covid19Sep2023NovavaxDose4IntervalTooShort({
  series,
  immunization,
  dose,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.id !== 'COVID_19_SEP_2023_NOVAVAX_SERIES' ||
    dose.doseNumber !== 4 ||
    !immunization.date
  ) {
    return false;
  }

  const latestPrior = latestDoseDate(
    matchedDoses.filter(
      (match) => match.status === 'valid' && match.dose.doseNumber < 4,
    ),
  );
  return (
    !!latestPrior &&
    !dateMeetsMinimumDuration({
      startDate: latestPrior,
      endDate: immunization.date,
      duration: '8w-4d',
    })
  );
}

export function covid19Sep2023Gte5Dose1ToDose2IntervalTooShort({
  series,
  immunization,
  dose,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.id !== 'COVID_19_SEP_2023_GTE_5_SERIES' ||
    dose.doseNumber > 2 ||
    !immunization.date
  ) {
    return false;
  }

  const latestPrior = [...matchedDoses, ...invalidDoses, ...acceptedDoses]
    .filter(
      (match) =>
        match.immunization.date &&
        match.immunization.date < immunization.date! &&
        match.dose.doseNumber <= dose.doseNumber &&
        !covid19InvalidMatchIgnoredForIntervals(match),
    )
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
  if (!latestPrior?.immunization.date) return false;

  const latestPriorCvx = normalizeCvx(latestPrior.immunization.vaccineCode);
  const latestPriorHasDoseIntervalOverride =
    (latestPriorCvx === '313' &&
      latestPrior.reasons.includes('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE')) ||
    (latestPriorCvx === '211' &&
      latestPrior.reasons.includes('VACCINE_NOT_PART_OF_THIS_SERIES'));
  if (latestPriorHasDoseIntervalOverride) return false;

  return !dateMeetsMinimumDuration({
    startDate: latestPrior.immunization.date,
    endDate: immunization.date,
    duration: '4m-4d',
  });
}

export function latestCovid19ImmunizationBeforeDate({
  immunizations,
  date,
  exclude,
  invalidDoses = [],
}: {
  immunizations: ForecastImmunization[];
  date: string;
  exclude?: ForecastImmunization;
  invalidDoses?: IceSeriesDoseMatch[];
}) {
  return [...immunizations]
    .filter(
      (immunization) =>
        immunization !== exclude &&
        immunization.date &&
        immunization.date < date &&
        isCovid19Immunization(immunization) &&
        !covid19InvalidDoseIgnoredForIntervals(immunization, invalidDoses),
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
}

export function covid19InvalidDoseIgnoredForIntervals(
  immunization: ForecastImmunization,
  invalidDoses: IceSeriesDoseMatch[],
) {
  const invalidDose = invalidDoses.find((match) =>
    sameForecastImmunization(match.immunization, immunization),
  );
  if (!invalidDose) return false;
  return covid19InvalidMatchIgnoredForIntervals(invalidDose);
}

export function covid19InvalidMatchIgnoredForIntervals(match: IceSeriesDoseMatch) {
  if (match.status !== 'invalid') return false;
  if (match.reasons.includes('ABOVE_MAXIMUM_AGE_VACCINE')) return true;

  const cvx = normalizeCvx(match.immunization.vaccineCode);
  return (
    (cvx === '229' || cvx === '230') &&
    (match.reasons.includes('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE') ||
      match.reasons.length === 0)
  );
}

export function latestAcceptedCovid19DoseBeforeDate({
  acceptedDoses,
  date,
  cvx,
  reason,
}: {
  acceptedDoses: IceSeriesDoseMatch[];
  date: string;
  cvx: string;
  reason: string;
}) {
  return [...acceptedDoses]
    .filter(
      (match) =>
        match.immunization.date &&
        match.immunization.date < date &&
        normalizeCvx(match.immunization.vaccineCode) === cvx &&
        match.reasons.includes(reason),
    )
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
}

export function evaluateCovid19AcceptedNonAllowedDose({
  series,
  dose,
  immunization,
  matchedDoses,
  availableImmunizations,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  availableImmunizations: ForecastImmunization[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    series.vaccineGroup?.code === 'COVID_19' &&
    series.season?.code === 'COVID_19_DEC_2020_SEASON' &&
    covid19Dec2020AcceptedWrongSeriesCvxCodes.has(
      normalizeCvx(immunization.vaccineCode) ?? '',
    ) &&
    availableImmunizations.some(
      (candidate) =>
        candidate !== immunization &&
        !!candidate.date &&
        !!immunization.date &&
        candidate.date >= immunization.date &&
        isCovid19Immunization(candidate),
    )
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
    };
  }

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    dose.doseNumber === 1 &&
    immunization.date &&
    immunization.date < '2023-10-04' &&
    normalizeCvx(immunization.vaccineCode) === '211'
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    };
  }

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    dose.doseNumber === 2 &&
    patient?.birthDate &&
    immunization.date &&
    (normalizeCvx(immunization.vaccineCode) === '310' ||
      normalizeCvx(immunization.vaccineCode) === '311') &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '65y-4d',
    }) &&
    !covid19Sep2023ModernaCvx213IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      patient,
    }) &&
    !covid19Sep2023Gte5Dose1ToDose2IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      invalidDoses: [],
      acceptedDoses: [],
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    dose.doseNumber === 4 &&
    patient?.birthDate &&
    immunization.date &&
    (normalizeCvx(immunization.vaccineCode) === '310' ||
      normalizeCvx(immunization.vaccineCode) === '311') &&
    dose.age?.absoluteMinimumAge &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: dose.age.absoluteMinimumAge,
    }) &&
    !covid19Sep2023NovavaxDose4IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  return undefined;
}

export function evaluateCovid19AcceptedDose({
  series,
  dose,
  immunization,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    dose.doseNumber === 1 &&
    matchedDoses.length === 0 &&
    patient?.birthDate &&
    immunization.date &&
    normalizeCvx(immunization.vaccineCode) === '313' &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '12y-4d',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'],
    };
  }

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    dose.doseNumber === 1 &&
    immunization.date &&
    immunization.date < '2023-10-04' &&
    normalizeCvx(immunization.vaccineCode) === '211'
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    };
  }

  if (
    series.id === 'COVID_19_SEP_2023_GTE_5_SERIES' &&
    dose.doseNumber === 2 &&
    patient?.birthDate &&
    immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '65y-4d',
    }) &&
    !covid19Sep2023ModernaCvx213IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      patient,
    }) &&
    !covid19Sep2023Gte5Dose1ToDose2IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      invalidDoses: [],
      acceptedDoses: [],
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    dose.doseNumber === 4 &&
    patient?.birthDate &&
    immunization.date &&
    dose.age?.absoluteMinimumAge &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: dose.age.absoluteMinimumAge,
    }) &&
    !covid19Sep2023NovavaxDose4IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  return undefined;
}

export function evaluateCovid19InvalidNonAllowedDose({
  series,
  dose,
  immunization,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    covid19Sep2023ModernaCvx213IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      patient,
    })
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['BELOW_ABSOLUTE_MINIMUM_INTERVAL'],
    };
  }

  if (
    covid19Sep2023NovavaxMrnaDose2IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
    }) ||
    covid19Sep2023NovavaxDose4IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
    })
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['BELOW_ABSOLUTE_MINIMUM_INTERVAL'],
    };
  }

  if (
    series.vaccineGroup?.code === 'COVID_19' &&
    series.season?.code === 'COVID_19_DEC_2020_SEASON' &&
    covid19NotApprovedInUsOrWhoCvxCodes.has(
      normalizeCvx(immunization.vaccineCode) ?? '',
    )
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_APPROVED_IN_US_OR_BY_WHO'],
    };
  }

  if (
    series.vaccineGroup?.code === 'COVID_19' &&
    series.season?.code === 'COVID_19_DEC_2020_SEASON' &&
    (series.id === 'COVID_19_PFIZER_SERIES' ||
      series.id === 'COVID_19_MODERNA_SERIES' ||
      series.id === 'COVID_19_MIXED_PRODUCT_SERIES') &&
    (normalizeCvx(immunization.vaccineCode) === '229' ||
      normalizeCvx(immunization.vaccineCode) === '230')
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'],
    };
  }

  if (
    series.vaccineGroup?.code === 'COVID_19' &&
    immunization.date &&
    immunization.date >= covid19Sep2023SeasonStartDate &&
    covid19PriorFormulationInvalidCvxCodes.has(
      normalizeCvx(immunization.vaccineCode) ?? '',
    )
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE', 'VACCINE_NOT_ALLOWED'],
    };
  }

  return undefined;
}

export function selectCovid19Series(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  if (evaluationDate >= covid19Aug2025SeasonStartDate) {
    const aug2025Selection = selectCovid19Aug2025Series(
      candidates,
      patient,
      evaluationDate,
    );
    if (aug2025Selection) return aug2025Selection;
  }

  if (evaluationDate >= covid19Sep2023SeasonStartDate) {
    const sep2023Selection = selectCovid19Sep2023Series(
      candidates,
      patient,
      evaluationDate,
    );
    if (sep2023Selection) return sep2023Selection;
  }

  const dec2020Selection = selectCovid19Dec2020Series(candidates);
  if (dec2020Selection) return dec2020Selection;

  return undefined;
}

function selectCovid19Aug2025Series(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  const lt2 = candidates.find(
    (candidate) => candidate.series.id === 'COVID_19_AUG_2025_LT_2_SERIES',
  );
  const age2To64 = candidates.find(
    (candidate) =>
      candidate.series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
  );
  const gte65 = candidates.find(
    (candidate) => candidate.series.id === 'COVID_19_AUG_2025_GTE_65_SERIES',
  );
  if (!lt2 || !age2To64 || !gte65 || !patient?.birthDate) return undefined;

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '65y',
    })
  ) {
    return markSelected(gte65, 'COVID_19_AUG_2025_AGE_65_OR_OLDER');
  }

  if (covid19Aug2025Gte65TransitionDose1({ forecast: gte65, patient })) {
    return markSelected(gte65, 'COVID_19_AUG_2025_TURNS_65_WITHIN_12_MONTHS');
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '2y',
    })
  ) {
    return markSelected(age2To64, 'COVID_19_AUG_2025_AGE_2_TO_64');
  }

  return markSelected(lt2, 'COVID_19_AUG_2025_AGE_UNDER_2');
}

function covid19Aug2025Gte65TransitionDose1({
  forecast,
  patient,
}: {
  forecast: IceSeriesForecast;
  patient?: ForecastPatient;
}) {
  if (
    forecast.series.id !== 'COVID_19_AUG_2025_GTE_65_SERIES' ||
    !patient?.birthDate
  ) {
    return undefined;
  }

  return forecast.matchedDoses.find(
    (match) =>
      match.status === 'valid' &&
      match.dose.doseNumber === 1 &&
      !!match.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '65y',
      }),
  );
}

function selectCovid19Sep2023Series(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  const pfizerLt5 = candidates.find(
    (candidate) =>
      candidate.series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES',
  );
  const modernaLt5 = candidates.find(
    (candidate) =>
      candidate.series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES',
  );
  const mixedLt5 = candidates.find(
    (candidate) =>
      candidate.series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES',
  );
  const gte5 = candidates.find(
    (candidate) => candidate.series.id === 'COVID_19_SEP_2023_GTE_5_SERIES',
  );
  const novavax = candidates.find(
    (candidate) => candidate.series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES',
  );
  if (!pfizerLt5 || !modernaLt5 || !mixedLt5 || !gte5 || !novavax) {
    return undefined;
  }

  if (gte5.status === 'complete' && novavax.status !== 'complete') {
    return markSelected(gte5, 'COVID_19_SEP_2023_GTE_5_COMPLETE');
  }
  if (novavax.status === 'complete' && gte5.status !== 'complete') {
    return markSelected(novavax, 'COVID_19_SEP_2023_NOVAVAX_COMPLETE');
  }

  const ageAtLeast5 =
    !!patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '5y',
    });

  if (ageAtLeast5) {
    if (covid19Sep2023NovavaxSeriesApplies(novavax, gte5, patient)) {
      return markSelected(novavax, 'COVID_19_SEP_2023_NOVAVAX_FIRST_DOSE');
    }

    const hasCurrentSeasonUnder5Dose = covid19Sep2023UniqueValidMatches([
      pfizerLt5,
      modernaLt5,
      mixedLt5,
    ]).some((match) =>
      covid19Sep2023MatchAdministeredBeforeAge({
        match,
        patient,
        age: '5y',
        minDate: covid19Sep2023SeasonStartDate,
      }),
    );
    if (!hasCurrentSeasonUnder5Dose) {
      return markSelected(gte5, 'COVID_19_SEP_2023_AGE_5_OR_OLDER');
    }
  }

  const productMatches = covid19Sep2023UniqueValidMatches([
    pfizerLt5,
    modernaLt5,
    mixedLt5,
  ]).filter((match) =>
    covid19Sep2023MatchAdministeredBeforeAge({
      match,
      patient,
      age: '5y',
    }),
  );
  const productCvxCodes = productMatches
    .map((match) => normalizeCvx(match.immunization.vaccineCode))
    .filter(isDefined);

  if (
    productCvxCodes.length > 0 &&
    productCvxCodes.every((cvx) =>
      covid19Sep2023PfizerLt5PriorCvxCodes.has(cvx),
    )
  ) {
    return markSelected(pfizerLt5, 'COVID_19_SEP_2023_PFIZER_LT_5_PRODUCT');
  }

  if (
    productCvxCodes.length > 0 &&
    productCvxCodes.every((cvx) =>
      covid19Sep2023ModernaLt5PriorCvxCodes.has(cvx),
    )
  ) {
    return markSelected(modernaLt5, 'COVID_19_SEP_2023_MODERNA_LT_5_PRODUCT');
  }

  return markSelected(mixedLt5, 'COVID_19_SEP_2023_MIXED_LT_5_DEFAULT');
}

function covid19Sep2023NovavaxSeriesApplies(
  novavax: IceSeriesForecast,
  gte5: IceSeriesForecast,
  patient?: ForecastPatient,
) {
  if (!patient?.birthDate) return false;

  const firstDose = novavax.matchedDoses.find(
    (match) =>
      match.status === 'valid' &&
      match.dose.doseNumber === 1 &&
      match.immunization.date &&
      covid19Sep2023NovavaxCvxCodes.has(
        normalizeCvx(match.immunization.vaccineCode) ?? '',
      ) &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '12y-4d',
      }),
  );
  if (!firstDose) return false;

  return !gte5.matchedDoses.some(
    (match) =>
      match.status === 'valid' &&
      match.immunization.date &&
      match.immunization.date > firstDose.immunization.date!,
  );
}

function covid19Sep2023UniqueValidMatches(forecasts: IceSeriesForecast[]) {
  const byImmunizationId = new Map<string, IceSeriesDoseMatch>();
  for (const forecast of forecasts) {
    for (const match of forecast.matchedDoses) {
      if (match.status !== 'valid') continue;
      const key =
        match.immunization.id ??
        `${match.immunization.date ?? ''}:${normalizeCvx(match.immunization.vaccineCode) ?? ''}`;
      byImmunizationId.set(key, match);
    }
  }
  return [...byImmunizationId.values()];
}

function covid19Sep2023MatchAdministeredBeforeAge({
  match,
  patient,
  age,
  minDate,
}: {
  match: IceSeriesDoseMatch;
  patient?: ForecastPatient;
  age: string;
  minDate?: string;
}) {
  if (!patient?.birthDate || !match.immunization.date) return false;
  if (minDate && match.immunization.date < minDate) return false;
  return !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: match.immunization.date,
    duration: age,
  });
}

function selectCovid19Dec2020Series(candidates: IceSeriesForecast[]) {
  const decCandidates = candidates.filter(
    (candidate) => candidate.series.season?.code === 'COVID_19_DEC_2020_SEASON',
  );
  if (decCandidates.length === 0) return undefined;

  const bySeriesId = new Map(
    decCandidates.map((candidate) => [candidate.series.id, candidate]),
  );
  const mixed = bySeriesId.get('COVID_19_MIXED_PRODUCT_SERIES');
  const pfizer = bySeriesId.get('COVID_19_PFIZER_SERIES');
  const moderna = bySeriesId.get('COVID_19_MODERNA_SERIES');
  const novavax = bySeriesId.get('COVID_19_NOVAVAX_2_DOSE_SERIES');
  const janssen = bySeriesId.get('COVID_19_JANSSEN_1_DOSE_SERIES');
  if (!mixed) return undefined;

  const validMatches = covid19UniqueValidMatches(decCandidates).sort((a, b) =>
    (a.immunization.date ?? '').localeCompare(b.immunization.date ?? ''),
  );
  if (validMatches.length === 0) {
    return markSelected(mixed, 'COVID_19_DEC_2020_MIXED_DEFAULT');
  }

  const firstValid = validMatches[0];
  const firstValidCvx = normalizeCvx(firstValid.immunization.vaccineCode) ?? '';
  if (firstValidCvx === '212' && janssen) {
    return markSelected(janssen, 'COVID_19_DEC_2020_JANSSEN_FIRST_DOSE');
  }

  const validCvxCodes = validMatches
    .map((match) => normalizeCvx(match.immunization.vaccineCode))
    .filter(isDefined);

  if (
    pfizer &&
    validCvxCodes.every((cvx) => covid19PfizerCvxCodes.has(cvx))
  ) {
    return markSelected(pfizer, 'COVID_19_DEC_2020_PFIZER_PRODUCT');
  }

  if (
    moderna &&
    validCvxCodes.every((cvx) => covid19ModernaCvxCodes.has(cvx))
  ) {
    return markSelected(moderna, 'COVID_19_DEC_2020_MODERNA_PRODUCT');
  }

  if (novavax && validCvxCodes.every((cvx) => cvx === '211')) {
    return markSelected(novavax, 'COVID_19_DEC_2020_NOVAVAX_PRODUCT');
  }

  const firstValidCandidate = decCandidates.find((candidate) =>
    candidate.matchedDoses.some(
      (match) =>
        match.status === 'valid' &&
        match.immunization.id === firstValid.immunization.id &&
        candidate.series.id !== 'COVID_19_PFIZER_SERIES' &&
        candidate.series.id !== 'COVID_19_MODERNA_SERIES' &&
        candidate.series.id !== 'COVID_19_MIXED_PRODUCT_SERIES' &&
        candidate.series.id !== 'COVID_19_JANSSEN_1_DOSE_SERIES',
    ),
  );
  if (firstValidCandidate) {
    return markSelected(
      firstValidCandidate,
      'COVID_19_DEC_2020_EARLIEST_NON_FDA_SERIES',
    );
  }

  return markSelected(mixed, 'COVID_19_DEC_2020_MIXED_PRODUCT');
}

function covid19UniqueValidMatches(forecasts: IceSeriesForecast[]) {
  const byImmunizationKey = new Map<string, IceSeriesDoseMatch>();
  for (const forecast of forecasts) {
    for (const match of forecast.matchedDoses) {
      if (match.status !== 'valid') continue;
      const key =
        match.immunization.id ??
        `${match.immunization.date ?? ''}:${normalizeCvx(match.immunization.vaccineCode) ?? ''}`;
      byImmunizationKey.set(key, match);
    }
  }
  return [...byImmunizationKey.values()];
}
export function applyCovid19AcceptedDuplicateSameDayRule({
  series,
  matchedDoses,
  acceptedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (series.vaccineGroup?.code !== 'COVID_19') return;

  for (let index = acceptedDoses.length - 1; index >= 0; index -= 1) {
    const accepted = acceptedDoses[index];
    const duplicateValid = matchedDoses.find(
      (match) =>
        match.dose.doseNumber === accepted.dose.doseNumber &&
        match.immunization.date === accepted.immunization.date,
    );
    if (!duplicateValid) continue;

    acceptedDoses.splice(index, 1);
    invalidDoses.push({
      ...accepted,
      status: 'invalid',
      reasons: ['DUPLICATE_SAME_DAY'],
    });
  }
}

export function applyCovid19InvalidNotAllowedDuplicateSameDayRule({
  series,
  matchedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (series.vaccineGroup?.code !== 'COVID_19') return;

  for (const invalidDose of invalidDoses) {
    if (
      invalidDose.reasons.length !== 1 ||
      invalidDose.reasons[0] !== 'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'
    ) {
      continue;
    }

    const duplicateValid = matchedDoses.find(
      (match) =>
        match.dose.doseNumber === invalidDose.dose.doseNumber &&
        match.immunization.date === invalidDose.immunization.date,
    );
    if (!duplicateValid) continue;

    invalidDose.reasons = ['DUPLICATE_SAME_DAY'];
  }
}

export function applyCovid19Sep2023Aug2024DuplicateSameDayRule({
  series,
  patient,
  matchedDoses,
  acceptedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'COVID_19' ||
    !series.id.startsWith('COVID_19_SEP_2023_') ||
    !patient?.birthDate
  ) {
    return;
  }

  for (const valid313 of [...matchedDoses]) {
    if (normalizeCvx(valid313.immunization.vaccineCode) !== '313') continue;
    const date = valid313.immunization.date;
    if (
      !date ||
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: date,
        duration: '5y',
      })
    ) {
      continue;
    }

    const sameDayInvalid213Index = invalidDoses.findIndex(
      (match) =>
        match.immunization.date === date &&
        normalizeCvx(match.immunization.vaccineCode) === '213',
    );
    const sameDayAccepted213Index = acceptedDoses.findIndex(
      (match) =>
        match.immunization.date === date &&
        normalizeCvx(match.immunization.vaccineCode) === '213',
    );
    if (sameDayInvalid213Index < 0 && sameDayAccepted213Index < 0) continue;

    const [replacement213] =
      sameDayInvalid213Index >= 0
        ? invalidDoses.splice(sameDayInvalid213Index, 1)
        : acceptedDoses.splice(sameDayAccepted213Index, 1);
    const matched313Index = matchedDoses.indexOf(valid313);
    if (matched313Index >= 0) {
      matchedDoses[matched313Index] = {
        ...replacement213,
        dose: valid313.dose,
        status: 'valid',
        reasons: [],
      };
    }
    invalidDoses.push({
      ...valid313,
      status: 'invalid',
      reasons: ['DUPLICATE_SAME_DAY'],
    });
  }

  for (const valid213 of matchedDoses) {
    if (normalizeCvx(valid213.immunization.vaccineCode) !== '213') continue;
    const date = valid213.immunization.date;
    if (
      !date ||
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: date,
        duration: '5y',
      })
    ) {
      continue;
    }

    for (const invalid313 of invalidDoses) {
      if (
        invalid313.immunization.date === date &&
        normalizeCvx(invalid313.immunization.vaccineCode) === '313'
      ) {
        invalid313.reasons = ['DUPLICATE_SAME_DAY'];
      }
    }

    for (let index = acceptedDoses.length - 1; index >= 0; index -= 1) {
      const accepted313 = acceptedDoses[index];
      if (
        accepted313.immunization.date !== date ||
        normalizeCvx(accepted313.immunization.vaccineCode) !== '313'
      ) {
        continue;
      }

      acceptedDoses.splice(index, 1);
      invalidDoses.push({
        ...accepted313,
        status: 'invalid',
        reasons: ['DUPLICATE_SAME_DAY'],
      });
    }
  }
}

export function applyCovid19Sep2023Cvx313AcceptedReasonTransition({
  series,
  matchedDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (series.id !== 'COVID_19_SEP_2023_GTE_5_SERIES') return;

  const hasValidDose1 = matchedDoses.some(
    (match) => match.status === 'valid' && match.dose.doseNumber === 1,
  );
  if (!hasValidDose1) return;

  for (const accepted of acceptedDoses) {
    if (
      accepted.dose.doseNumber === 1 &&
      normalizeCvx(accepted.immunization.vaccineCode) === '313' &&
      accepted.reasons.includes('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE')
    ) {
      accepted.reasons = [
        'VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
      ];
    }
  }
}


function hasCovid19ImmunizationInAug2025Season(
  immunizations: ForecastImmunization[],
) {
  return immunizations.some(
    (immunization) =>
      immunization.date &&
      immunization.date >= covid19Aug2025SeasonStartDate &&
      isCovid19Immunization(immunization),
  );
}

function sameForecastImmunization(
  left: ForecastImmunization,
  right: ForecastImmunization,
) {
  if (left === right) return true;
  if (left.id && right.id) return left.id === right.id;
  return (
    left.date === right.date &&
    normalizeCvx(left.vaccineCode) === normalizeCvx(right.vaccineCode)
  );
}

function findVaccineMaximumAge(dataset: IceDataset, vaccineCode?: string) {
  const cvx = normalizeCvx(vaccineCode);
  if (!cvx) return undefined;
  return dataset.vaccines.find((vaccine) => vaccine.cvx === cvx)
    ?.validMaximumAgeForUse;
}

function latestImmunizationDate(immunizations: ForecastImmunization[]) {
  return latestDate(
    immunizations.map((immunization) => immunization.date).filter(isDefined),
  );
}

function latestDoseDate(doses: IceSeriesDoseMatch[]) {
  return latestDate(
    doses.map((dose) => dose.immunization.date).filter(isDefined),
  );
}

function covid19DateAtLeastAge({
  birthDate,
  date,
  age,
}: {
  birthDate: string;
  date: string;
  age: string;
}) {
  return dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: date,
    duration: age,
  });
}

function latestDate(dates: string[]) {
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1];
}

function markSelected(
  forecast: IceSeriesForecast,
  selectionReason: string,
): IceSeriesForecast {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) return String(numeric).padStart(2, '0');
  return trimmed;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
