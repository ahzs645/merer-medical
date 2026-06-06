import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';

const rotavirusCvxCodes = new Set(['74', '116', '119', '122']);

export function selectRotavirusSeries(candidates: IceSeriesForecast[]) {
  const twoDose = candidates.find(
    (candidate) => candidate.series.id === 'ROTAVIRUS_2_DOSE_SERIES',
  );
  const threeDose = candidates.find(
    (candidate) => candidate.series.id === 'ROTAVIRUS_3_DOSE_SERIES',
  );
  if (!twoDose || !threeDose) return undefined;

  const validCvxCodes = new Set(
    [...twoDose.matchedDoses, ...threeDose.matchedDoses]
      .map((match) => normalizeCvx(match.immunization.vaccineCode))
      .filter(isDefined),
  );
  if (['116', '122', '74'].some((cvx) => validCvxCodes.has(cvx))) {
    return markSelected(threeDose, 'ROTAVIRUS_3_DOSE_PRODUCT');
  }

  if (validCvxCodes.has('119')) {
    return markSelected(twoDose, 'ROTAVIRUS_2_DOSE_RV1');
  }

  return markSelected(threeDose, 'ROTAVIRUS_3_DOSE_DEFAULT');
}

export function isRotavirusSeries(series: IceSeriesDefinition) {
  return series.vaccineGroup?.code === 'ROTAVIRUS';
}

export function isRotavirusImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && rotavirusCvxCodes.has(cvx);
}

export function evaluateRotavirusDuplicateSameDay({
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
      .filter((cvx) => rotavirusCvxCodes.has(cvx)),
  );
  if (sameDayCvxCodes.size < 2) return undefined;

  if (immunization.date >= '2000-01-01') {
    if (currentCvx === '74' && sameDayCvxCodes.has('74')) {
      return 'DUPLICATE_SAME_DAY';
    }
    if (
      currentCvx === '119' &&
      sameDayCvxCodes.has('119') &&
      !sameDayCvxCodes.has('74')
    ) {
      return 'DUPLICATE_SAME_DAY';
    }
    return undefined;
  }

  if (sameDayCvxCodes.has('74')) {
    return currentCvx === '74' ? undefined : 'DUPLICATE_SAME_DAY';
  }
  if (currentCvx === '119' && sameDayCvxCodes.has('119')) {
    return 'DUPLICATE_SAME_DAY';
  }
  return undefined;
}

export function buildRotavirusRecommendation({
  patient,
  evaluationDate,
  status,
  completedDoses,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  completedDoses: number;
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') return undefined;
  if (!patient?.birthDate) return undefined;

  if (
    completedDoses === 0 &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '105d',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['TOO_OLD_TO_INITIATE'],
    };
  }

  if (
    dateIsAfterIceDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '8m',
    }) ||
    (!!nextDoseForecast?.recommendedDate &&
      dateIsAfterIceDuration({
        startDate: patient.birthDate,
        endDate: nextDoseForecast.recommendedDate,
        duration: '8m',
      }))
  ) {
    return {
      status: 'not-recommended',
      reasons: ['TOO_OLD'],
    };
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

function dateIsAfterIceDuration({
  startDate,
  endDate,
  duration,
}: {
  startDate: string;
  endDate: string;
  duration: string;
}) {
  return endDate > dateFromIceDuration({ startDate, duration });
}

function markSelected(forecast: IceSeriesForecast, selectionReason: string) {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
