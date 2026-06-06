import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastPatient,
  IceDoseRule,
  IceIntervalConstraint,
  IceNextDoseForecast,
  IceSeriesDoseMatch,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';

export function buildVaricellaRecommendation({
  patient,
  status,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') return undefined;

  if (patient?.birthDate && patient.birthDate < '1980-01-01') {
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

export function customVaricellaAbsoluteMinimumInterval({
  seriesCode,
  dose,
  immunizationDate,
  interval,
  patient,
}: {
  seriesCode?: string;
  dose: IceDoseRule;
  immunizationDate?: string;
  interval: IceIntervalConstraint;
  patient?: ForecastPatient;
}) {
  if (
    seriesCode === 'VARICELLA' &&
    dose.doseNumber === 2 &&
    interval.fromDoseId === 'dose-1' &&
    patient?.birthDate &&
    immunizationDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunizationDate,
      duration: '13y',
    })
  ) {
    return '24d';
  }

  return undefined;
}

export function applyVaricellaForecastOverride({
  forecast,
  matchedDoses,
  invalidDoses,
  patient,
  evaluationDate,
}: {
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (forecast.dose.doseNumber === 1) {
    const latestInvalidDose = latestDoseDate(invalidDoses);
    if (!latestInvalidDose) return forecast;

    const retryDate = dateFromIceDuration({
      startDate: latestInvalidDose,
      duration: '28d',
    });
    return {
      ...forecast,
      earliestRecommendedDate: retryDate,
      recommendedDate: retryDate,
    };
  }

  if (
    forecast.dose.doseNumber !== 2 ||
    !patient?.birthDate ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '13y',
    })
  ) {
    return forecast;
  }

  const dose1Date = matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
  if (!dose1Date) return forecast;

  const dose2Date = dateFromIceDuration({
    startDate: dose1Date,
    duration: '28d',
  });

  return {
    ...forecast,
    earliestRecommendedDate: dose2Date,
    recommendedDate: dose2Date,
  };
}

function latestDoseDate(doses: IceSeriesDoseMatch[]) {
  return latestDate(
    doses.map((dose) => dose.immunization.date).filter(isDefined),
  );
}

function latestDate(dates: string[]) {
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
