import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';

const meningBFhbpCvxCodes = new Set(['162', '316']);
const meningB4cCvxCodes = new Set(['163', '328']);
const meningBCvxCodes = new Set([...meningBFhbpCvxCodes, ...meningB4cCvxCodes]);

export function selectMeningBSeries(
  candidates: IceSeriesForecast[],
  compareSeriesForecasts: (a: IceSeriesForecast, b: IceSeriesForecast) => number,
) {
  const completed = [...candidates]
    .filter((candidate) => candidate.status === 'complete')
    .sort(compareSeriesForecasts)[0];
  if (completed) return markSelected(completed, 'MENINGB_COMPLETE_SERIES');

  const firstValidCvx = candidates
    .flatMap((candidate) => candidate.matchedDoses)
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )
    .map((match) => normalizeCvx(match.immunization.vaccineCode))
    .find(isDefined);

  const familyCandidates =
    firstValidCvx && meningBFhbpCvxCodes.has(firstValidCvx)
      ? candidates.filter((candidate) => isMeningBFhbpSeries(candidate.series))
      : firstValidCvx && meningB4cCvxCodes.has(firstValidCvx)
        ? candidates.filter((candidate) => isMeningB4cSeries(candidate.series))
        : [];
  const bestFamilyCandidate = [...familyCandidates].sort(compareSeriesForecasts)[0];
  if (bestFamilyCandidate) {
    return markSelected(
      bestFamilyCandidate,
      meningBFhbpCvxCodes.has(firstValidCvx ?? '')
        ? 'MENINGB_FHBP_PRODUCT'
        : 'MENINGB_4C_PRODUCT',
    );
  }

  const default4c = candidates.find(
    (candidate) => candidate.series.id === 'MEN_B_4_C_2_DOSE_SERIES',
  );
  return markSelected(
    default4c ?? [...candidates].sort(compareSeriesForecasts)[0],
    'MENINGB_4C_2_DOSE_DEFAULT',
  );
}

export function isMeningBImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && meningBCvxCodes.has(cvx);
}

export function isMeningBFhbpImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && meningBFhbpCvxCodes.has(cvx);
}

export function isMeningB4cImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && meningB4cCvxCodes.has(cvx);
}

export function isMeningBFhbpSeries(series: IceSeriesDefinition) {
  return (
    series.id === 'MEN_BF_HBP_2_DOSE_SERIES' ||
    series.id === 'MEN_BF_HBP_3_DOSE_SERIES'
  );
}

export function isMeningB4cSeries(series: IceSeriesDefinition) {
  return (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' ||
    series.id === 'MEN_B_4_C_3_DOSE_SERIES'
  );
}

export function isMeningB3DoseSeries(series: IceSeriesDefinition) {
  return (
    series.id === 'MEN_BF_HBP_3_DOSE_SERIES' ||
    series.id === 'MEN_B_4_C_3_DOSE_SERIES'
  );
}

export function findSameDayPreferredMeningBDose({
  series,
  immunization,
  availableImmunizations,
  usedImmunizationIndexes,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
}) {
  if (series.vaccineGroup?.code !== 'MENINGOCOCCAL_B' || !immunization.date) {
    return undefined;
  }
  const immunizationIsFhbp = isMeningBFhbpImmunization(immunization);
  const immunizationIs4c = isMeningB4cImmunization(immunization);
  if (!immunizationIsFhbp && !immunizationIs4c) return undefined;

  if (isMeningB4cSeries(series) && immunizationIsFhbp) {
    return availableImmunizations.find(
      (candidate, index) =>
        !usedImmunizationIndexes.has(index) &&
        candidate.date === immunization.date &&
        isMeningB4cImmunization(candidate),
    );
  }

  if (isMeningBFhbpSeries(series) && immunizationIs4c) {
    return availableImmunizations.find(
      (candidate, index) =>
        !usedImmunizationIndexes.has(index) &&
        candidate.date === immunization.date &&
        isMeningBFhbpImmunization(candidate),
    );
  }

  return undefined;
}

export function meningBDose3MeetsDose1Interval({
  series,
  dose,
  immunization,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (!isMeningB3DoseSeries(series) || dose.doseNumber !== 3 || !immunization.date) {
    return false;
  }
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  return (
    !!dose1?.immunization.date &&
    dateMeetsMinimumDuration({
      startDate: dose1.immunization.date,
      endDate: immunization.date,
      duration: '6m-4d',
    })
  );
}

export function evaluateMeningBAcceptedNonAllowedDose({
  series,
  immunization,
  dose,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
}) {
  if (
    series.vaccineGroup?.code === 'MENINGOCOCCAL_B' &&
    isMeningBImmunization(immunization) &&
    ((isMeningBFhbpSeries(series) && isMeningB4cImmunization(immunization)) ||
      (isMeningB4cSeries(series) && isMeningBFhbpImmunization(immunization)))
  ) {
    return {
      immunization,
      dose,
      status: 'accepted' as const,
      reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
    };
  }

  return undefined;
}

export function buildMeningBRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  matchedDoses,
  acceptedDoses,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (matchedDoses.length === 0 && patient?.birthDate) {
    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '10y',
      })
    ) {
      return {
        status: 'not-recommended',
        reasons: ['BELOW_MINIMUM_AGE_HIGH_RISK_SERIES'],
      };
    }

    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '16y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['HIGH_RISK'],
      };
    }

    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '24y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['CLINICAL_PATIENT_DISCRETION'],
      };
    }

    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
    };
  }

  if (!nextDoseForecast) return undefined;

  const reasons = ['DUE'];
  const hasFhbp = [...matchedDoses, ...acceptedDoses].some((match) =>
    isMeningBFhbpImmunization(match.immunization),
  );
  const has4c = [...matchedDoses, ...acceptedDoses].some((match) =>
    isMeningB4cImmunization(match.immunization),
  );
  if (hasFhbp && has4c) reasons.push('OTHER_VACCINE_PRODUCT_POSSIBLE');

  return {
    status: 'recommended',
    reasons,
    recommendedVaccine: isMeningB4cSeries(series)
      ? { cvx: '163', display: 'Meningococcal B 4C, OMV', preferred: true }
      : {
          cvx: '162',
          display: 'Meningococcal B FHbp, recombinant',
          preferred: true,
        },
  };
}

export function applyMeningBForecastOverride({
  series,
  forecast,
  matchedDoses,
  evaluationDate,
  patient,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  evaluationDate: string;
  patient?: ForecastPatient;
}) {
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);

  if (
    isMeningB3DoseSeries(series) &&
    forecast.dose.doseNumber === 3 &&
    dose1?.immunization.date
  ) {
    const dose1Plus6Months = dateFromIceDuration({
      startDate: dose1.immunization.date,
      duration: '6m',
    });
    return {
      ...forecast,
      minimumDate: latestDate([forecast.minimumDate, dose1Plus6Months].filter(isDefined)),
      earliestRecommendedDate: latestDate(
        [forecast.earliestRecommendedDate, dose1Plus6Months].filter(isDefined),
      ),
      recommendedDate: latestDate(
        [forecast.recommendedDate, dose1Plus6Months].filter(isDefined),
      ),
    };
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    forecast.dose.doseNumber === 2 &&
    dose1?.immunization.date
  ) {
    const interval = dose1.immunization.date < '2024-10-25' ? '1m' : '6m';
    const intervalDate = dateFromIceDuration({
      startDate: dose1.immunization.date,
      duration: interval,
    });
    return {
      ...forecast,
      minimumDate: intervalDate,
      earliestRecommendedDate: intervalDate,
      recommendedDate: intervalDate,
    };
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    forecast.dose.doseNumber === 1 &&
    patient?.birthDate &&
    evaluationDate < '2024-10-25'
  ) {
    const age10Date = dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '10y',
    });
    return {
      ...forecast,
      minimumDate: age10Date,
      earliestRecommendedDate: age10Date,
      recommendedDate: age10Date,
    };
  }

  return forecast;
}

function markSelected(
  forecast: IceSeriesForecast | undefined,
  reason: string,
): IceSeriesForecast | undefined {
  if (!forecast) return undefined;
  return {
    ...forecast,
    selected: true,
    selectionReason: reason,
  };
}

function latestDate(dates: string[]) {
  return dates.sort()[dates.length - 1];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
