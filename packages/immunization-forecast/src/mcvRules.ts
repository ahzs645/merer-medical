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

export function mcvHasSingleDoseCompletion({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.id !== 'MCV_42_DOSE_SERIES' ||
    series.vaccineGroup?.code !== 'MENINGOCOCCAL_ACWY' ||
    matchedDoses.length !== 1 ||
    !patient?.birthDate
  ) {
    return false;
  }

  const dose1Date = matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
  return (
    !!dose1Date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1Date,
      duration: '16y',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1Date,
      duration: '19y',
    })
  );
}

export function evaluateMcvAcceptedNonAllowedDose({
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
    series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '22y',
    }) &&
    !mcvHasSingleDoseCompletion({ series, matchedDoses, patient })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted' as const,
      reasons: ['ABOVE_REC_AGE_SERIES'],
    };
  }

  return undefined;
}

export function buildMcvRecommendation({
  patient,
  evaluationDate,
  status,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (!patient?.birthDate) return undefined;

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    })
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
    };
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

export function applyMcvForecastOverride({
  forecast,
  matchedDoses,
  patient,
  evaluationDate,
}: {
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (
    forecast.dose.doseNumber !== 1 ||
    matchedDoses.length !== 0 ||
    !patient?.birthDate ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '16y',
    }) ||
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    })
  ) {
    return forecast;
  }

  return {
    ...forecast,
    recommendedDate: dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '16y',
    }),
  };
}
