import { dateMeetsMinimumDuration } from './iceDuration.js';
import type {
  ForecastImmunization,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';

const mpoxCvxCodes = new Set(['75', '105', '206', '325']);

export function selectMpoxSeries(candidates: IceSeriesForecast[]) {
  const twoDose = candidates.find(
    (candidate) => candidate.series.id === 'MPOX_2_DOSE_SERIES',
  );
  const oneDose = candidates.find(
    (candidate) => candidate.series.id === 'MPOX_1_DOSE_SERIES',
  );
  if (!twoDose || !oneDose) return undefined;

  const completed = [twoDose, oneDose]
    .filter((candidate) => candidate.status === 'complete')
    .sort((a, b) =>
      (completionDoseDate(a) || '').localeCompare(completionDoseDate(b) || ''),
    );
  if (completed.length > 0) {
    return markSelected(completed[0], 'MPOX_COMPLETE_EARLIEST');
  }

  const firstValidTwoDose = firstValidDoseDate(twoDose);
  const firstValidOneDose = firstValidDoseDate(oneDose);
  if (
    firstValidTwoDose &&
    (!firstValidOneDose || firstValidTwoDose <= firstValidOneDose)
  ) {
    return markSelected(twoDose, 'MPOX_2_DOSE_FIRST_VALID_DOSE');
  }
  if (firstValidOneDose) {
    return markSelected(oneDose, 'MPOX_1_DOSE_FIRST_VALID_DOSE');
  }

  return markSelected(twoDose, 'MPOX_2_DOSE_DEFAULT');
}

export function isMpoxImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && mpoxCvxCodes.has(cvx);
}

export function appendMpoxPostCompletionDoseMatches({
  series,
  status,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  status: IceSeriesForecast['status'];
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (series.vaccineGroup?.code !== 'MPOX' || status !== 'complete') return;

  const lastDose = series.doses[series.doses.length - 1];
  let boosterRecorded = false;
  for (const [index, immunization] of availableImmunizations.entries()) {
    if (usedImmunizationIndexes.has(index) || !isMpoxImmunization(immunization)) {
      continue;
    }

    usedImmunizationIndexes.add(index);
    if (!boosterRecorded) {
      matchedDoses.push({
        immunization,
        dose: lastDose,
        status: 'valid',
        reasons: [],
      });
      boosterRecorded = true;
      continue;
    }

    acceptedDoses.push({
      immunization,
      dose: lastDose,
      status: 'accepted',
      reasons: ['EXTRA_DOSE'],
    });
  }
}

export function applyMpoxAcceptedDuplicateSameDayRule({
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
  if (series.vaccineGroup?.code !== 'MPOX') return;

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

export function evaluateMpoxDuplicateSameDay({
  immunization,
  availableImmunizations,
}: {
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
}) {
  const currentCvx = normalizeCvx(immunization.vaccineCode);
  if (!currentCvx || !immunization.date || !mpoxCvxCodes.has(currentCvx)) {
    return undefined;
  }

  const sameDayCvxCodes = new Set(
    availableImmunizations
      .filter((candidate) => candidate.date === immunization.date)
      .map((candidate) => normalizeCvx(candidate.vaccineCode))
      .filter(isDefined)
      .filter((cvx) => mpoxCvxCodes.has(cvx)),
  );
  if (sameDayCvxCodes.size < 2) return undefined;

  if (
    currentCvx === '325' &&
    (sameDayCvxCodes.has('206') ||
      sameDayCvxCodes.has('75') ||
      sameDayCvxCodes.has('105'))
  ) {
    return 'DUPLICATE_SAME_DAY';
  }

  return undefined;
}

export function evaluateMpoxDoseSupplementalText({
  series,
  dose,
  immunization,
  matchedDoses,
  reasons,
}: {
  series: IceSeriesDefinition;
  dose: { doseNumber: number };
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  reasons: string[];
}) {
  if (
    series.id !== 'MPOX_2_DOSE_SERIES' ||
    dose.doseNumber !== 2 ||
    reasons.length > 0 ||
    !immunization.date
  ) {
    return [];
  }

  const priorDose = matchedDoses.find((match) => match.dose.doseNumber === 1);
  if (
    priorDose?.immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: priorDose.immunization.date,
      endDate: immunization.date,
      duration: '28d',
    })
  ) {
    return ['MPOX_MIN_INTERVAL_28D'];
  }

  return [];
}

export function buildMpoxRecommendation({
  series,
  completedDoses,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  completedDoses: number;
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (completedDoses === 0) {
    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
    };
  }

  if (
    series.id === 'MPOX_2_DOSE_SERIES' &&
    completedDoses === 1 &&
    nextDoseForecast
  ) {
    return {
      status: 'recommended',
      reasons: ['DUE'],
      recommendedVaccine: nextDoseForecast.dose.vaccines.find(
        (vaccine) => vaccine.cvx === '206',
      ),
    };
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

function completionDoseDate(forecast: IceSeriesForecast) {
  return forecast.matchedDoses.find(
    (match) => match.dose.doseNumber === forecast.series.numberOfDosesInSeries,
  )?.immunization.date;
}

function firstValidDoseDate(forecast: IceSeriesForecast) {
  return forecast.matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
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
