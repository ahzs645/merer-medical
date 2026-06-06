import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDoseMatch,
  IceSeriesDefinition,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';

const rsvAdultOrUnspecifiedCvxCodes = new Set(['303', '304', '305', '314', '326']);
const rsvInfantOrUnspecifiedCvxCodes = new Set(['304', '306', '307', '315']);

export function selectRsvSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  if (candidates.length === 1) {
    return markSelected(candidates[0], 'RSV_ONLY_SERIES');
  }

  const infant = candidates.find((candidate) => candidate.series.id === 'RSV_INFANT_SERIES');
  const adult = candidates.find((candidate) => candidate.series.id === 'RSV_ADULT_SERIES');
  if (!infant || !adult) return undefined;

  const allDoseMatches = [
    ...infant.matchedDoses,
    ...infant.acceptedDoses,
    ...infant.invalidDoses,
    ...adult.matchedDoses,
    ...adult.acceptedDoses,
    ...adult.invalidDoses,
  ];
  const adultAgeDose = allDoseMatches.find(
    (match) =>
      patient?.birthDate &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: match.immunization.date,
        duration: '20m',
      }),
  );
  if (adultAgeDose) {
    return markSelected(adult, 'RSV_ADULT_DOSE_20_MONTHS_OR_OLDER');
  }

  const infantAgeDose = allDoseMatches.find(
    (match) =>
      patient?.birthDate &&
      match.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: match.immunization.date,
        duration: '20m',
      }),
  );
  if (infantAgeDose) {
    return markSelected(infant, 'RSV_INFANT_DOSE_UNDER_20_MONTHS');
  }

  if (
    patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '20m',
    })
  ) {
    return markSelected(adult, 'RSV_ADULT_PATIENT_20_MONTHS_OR_OLDER');
  }

  return markSelected(infant, 'RSV_INFANT_DEFAULT');
}

export function rsvVaccineNotYetAvailableReason(
  immunization: ForecastImmunization,
) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!cvx || !immunization.date) return undefined;

  if (
    rsvAdultOrUnspecifiedCvxCodes.has(cvx) &&
    immunization.date < '2023-06-21'
  ) {
    return 'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED';
  }

  if (cvx === '332' && immunization.date < '2025-06-09') {
    return 'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED';
  }

  if (
    rsvInfantOrUnspecifiedCvxCodes.has(cvx) &&
    immunization.date < '2023-08-03'
  ) {
    return 'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED';
  }

  return undefined;
}

export function buildRsvRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status !== 'complete' && evaluationDate < '2023-06-21') {
    return {
      status: 'not-recommended',
      reasons: ['NOT_SUPPORTED'],
    };
  }

  if (!patient?.birthDate) return undefined;

  const patientUnder8Months = !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: evaluationDate,
    duration: '8m',
  });
  const patient8Through19Months =
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '8m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '20m',
    });

  if (series.id === 'RSV_INFANT_SERIES') {
    if (status === 'complete' && patientUnder8Months) {
      return {
        status: 'not-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    if (status === 'complete' && patient8Through19Months) {
      return {
        status: 'conditionally-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    const recommendationDate =
      nextDoseForecast?.recommendedDate ?? nextDoseForecast?.earliestRecommendedDate;
    const doseRecommendedAt8Through19Months =
      recommendationDate &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: recommendationDate,
        duration: '8m',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: recommendationDate,
        duration: '20m',
      });

    if (status !== 'complete' && (patient8Through19Months || doseRecommendedAt8Through19Months)) {
      return {
        status: 'conditionally-recommended',
        reasons: ['HIGH_RISK'],
      };
    }

    if (nextDoseForecast && patientUnder8Months) {
      return {
        status: 'recommended',
        reasons: ['DUE'],
        supplementalText: ['MATERNAL_UNK_OR_WITHIN_14D_RSV_MAB'],
      };
    }
  }

  if (series.id === 'RSV_ADULT_SERIES' && status !== 'complete') {
    if (
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '50y',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '75y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['HIGH_RISK'],
        supplementalText: ['RSV_75PLUS_50_74_AT_RISK'],
      };
    }

    if (
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '20m',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '50y',
      }) &&
      nextDoseForecast
    ) {
      return {
        status: 'recommended',
        reasons: ['DUE'],
        supplementalText: ['RSV_75PLUS_50_74_AT_RISK_SINGLE_DOSE'],
      };
    }
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

export function evaluateRsvAcceptedDose({
  series,
  dose,
  immunization,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    series.vaccineGroup?.code === 'RSV' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '8m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '50y',
    }) &&
    !rsvVaccineNotYetAvailableReason(immunization)
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

export function applyRsvForecastOverride({
  series,
  forecast,
  evaluationDate,
  patient,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  evaluationDate: string;
  patient?: ForecastPatient;
}) {
  if (!patient?.birthDate) return forecast;

  if (
    series.id === 'RSV_INFANT_SERIES' &&
    evaluationDate >= '2023-06-21' &&
    evaluationDate < '2023-10-01' &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '8m',
    })
  ) {
    return {
      ...forecast,
      earliestRecommendedDate: '2023-10-01',
      recommendedDate: '2023-10-01',
    };
  }

  if (series.id !== 'RSV_ADULT_SERIES') return forecast;

  const adultRecommendedDate = latestDate([
    dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '75y',
    }),
    '2024-06-26',
  ]);

  return {
    ...forecast,
    earliestRecommendedDate: adultRecommendedDate,
    recommendedDate: adultRecommendedDate,
  };
}

function markSelected(forecast: IceSeriesForecast, selectionReason: string) {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}

function latestDate(dates: string[]) {
  return dates.sort()[dates.length - 1];
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
