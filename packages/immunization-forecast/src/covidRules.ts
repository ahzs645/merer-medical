import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
} from './types.js';

const covid19Aug2025SeasonStartDate = '2025-08-27';
const covid19Sep2023SeasonStartDate = '2023-09-12';
const covid19Aug2025CvxCodes = new Set([
  '213',
  '309',
  '310',
  '311',
  '312',
  '313',
  '334',
]);
const covid19Aug2025Lt2PreSeasonDose2SkipCvxCodes = new Set([
  '309',
  '310',
  '311',
  '312',
]);
const covid19Aug2025PfizerNovavaxUnspecifiedCvxCodes = new Set([
  '309',
  '310',
  '313',
  '334',
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

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
