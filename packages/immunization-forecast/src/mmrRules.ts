import { dateMeetsMinimumDuration } from './iceDuration.js';
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

const earlyAcceptedMmrCvxCodes = new Set(['03', '04', '05']);
const mmrDuplicateCvxCodes = new Set([
  '03',
  '04',
  '05',
  '06',
  '07',
  '38',
  '94',
]);

export function mmrHasSingleDoseAdultCompletion({
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
  return (
    series.vaccineGroup?.code === 'MMR' &&
    matchedDoses.length === 1 &&
    !!patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    })
  );
}

export function evaluateMmrAcceptedNonAllowedDose({
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
  if (
    series.vaccineGroup?.code === 'MMR' &&
    dose.doseNumber === 1 &&
    patient?.birthDate &&
    immunization.date &&
    dose.age?.absoluteMinimumAge &&
    earlyAcceptedMmrCvxCodes.has(normalizeCvx(immunization.vaccineCode) ?? '') &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: dose.age.absoluteMinimumAge,
    }) &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '6m-4d',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted' as const,
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  if (
    series.vaccineGroup?.code === 'MMR' &&
    dose.doseNumber === 2 &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '19y',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted' as const,
      reasons: ['EXTRA_DOSE'],
    };
  }

  return undefined;
}

export function evaluateMmrDuplicateSameDay({
  immunization,
  availableImmunizations,
}: {
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
}) {
  const currentCvx = normalizeCvx(immunization.vaccineCode);
  if (!currentCvx || !immunization.date) return undefined;

  const sameDayCvxCodes = new Set(
    availableImmunizations
      .filter((candidate) => candidate.date === immunization.date)
      .map((candidate) => normalizeCvx(candidate.vaccineCode))
      .filter(isDefined)
      .filter((cvx) => mmrDuplicateCvxCodes.has(cvx)),
  );
  if (sameDayCvxCodes.size < 2) return undefined;

  if (sameDayCvxCodes.has('94')) {
    return currentCvx === '94' ? undefined : 'DUPLICATE_SAME_DAY';
  }

  if (sameDayCvxCodes.has('03')) {
    return currentCvx === '03' ? undefined : 'DUPLICATE_SAME_DAY';
  }

  return undefined;
}

export function isMmrLiveVirusConflict({
  immunization,
  matchedDoses,
}: {
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (normalizeCvx(immunization.vaccineCode) !== '94' || !immunization.date) {
    return false;
  }

  return matchedDoses.some((match) => {
    const previousCvx = normalizeCvx(match.immunization.vaccineCode);
    return (
      match.dose.doseNumber === 1 &&
      !!match.immunization.date &&
      ['03', '21', '94'].includes(previousCvx ?? '') &&
      match.immunization.date < immunization.date! &&
      !dateMeetsMinimumDuration({
        startDate: match.immunization.date,
        endDate: immunization.date!,
        duration: '28d',
      })
    );
  });
}

export function buildMmrRecommendation({
  patient,
  status,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (patient?.birthDate && patient.birthDate < '1957-01-01') {
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

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
