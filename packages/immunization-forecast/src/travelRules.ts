import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastPatient,
  IceNextDoseForecast,
  IceSeriesDoseMatch,
  IceSeriesForecast,
  IceSeriesRecommendation,
  IceSeriesDefinition,
} from './types.js';

export function selectJapaneseEncephalitisSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  const standard = candidates.find(
    (candidate) => candidate.series.id === 'JEVC_RISK_2_DOSE_SERIES',
  );
  const accelerated = candidates.find(
    (candidate) =>
      candidate.series.id === 'JEVC_RISK_2_DOSE_ACCELERATED_SERIES',
  );
  if (!standard || !accelerated || !patient?.birthDate) return undefined;

  const firstValidDose = [...standard.matchedDoses, ...accelerated.matchedDoses]
    .filter((match) => match.dose.doseNumber === 1 && match.immunization.date)
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )[0];
  const ageReferenceDate = firstValidDose?.immunization.date ?? evaluationDate;
  if (!ageReferenceDate) return undefined;

  const ageAtLeast18Minus4Days = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: ageReferenceDate,
    duration: '18y-4d',
  });
  const ageUnder66 = !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: ageReferenceDate,
    duration: '66y',
  });

  if (ageAtLeast18Minus4Days && ageUnder66) {
    return markSelected(
      accelerated,
      firstValidDose
        ? 'JE_ACCELERATED_FIRST_DOSE_18_THROUGH_65'
        : 'JE_ACCELERATED_AGE_18_THROUGH_65',
    );
  }

  return markSelected(
    standard,
    firstValidDose
      ? 'JE_STANDARD_FIRST_DOSE_UNDER_18_OR_66_PLUS'
      : 'JE_STANDARD_AGE_UNDER_18_OR_66_PLUS',
  );
}

export function buildCholeraRecommendation({
  patient,
  evaluationDate,
  completedDoses,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  evaluationDate: string;
  completedDoses: number;
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (!patient?.birthDate || completedDoses > 0 || !nextDoseForecast) {
    return undefined;
  }

  if (
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '2y',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['CHOLERA_NOT_ROUTINE_SEE_ACIP'],
      supplementalText: ['CHOLERA_NOT_ROUTINE_SEE_ACIP'],
    };
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '65y',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['TOO_OLD'],
      supplementalText: ['CHOLERA_NOT_ROUTINE_SEE_ACIP'],
    };
  }

  return {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
    supplementalText: ['CHOLERA_NOT_ROUTINE_SEE_ACIP'],
  };
}

export function buildTyphoidRecommendation({
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
      status: 'conditionally-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
      supplementalText: ['TYPHOID_NOT_ROUTINE_SEE_ACIP'],
    };
  }

  if (!patient?.birthDate || !nextDoseForecast) return undefined;

  if (
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '2y',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['TYPHOID_NOT_ROUTINE_SEE_ACIP'],
      supplementalText: ['TYPHOID_NOT_ROUTINE_SEE_ACIP'],
    };
  }

  return {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
    supplementalText: ['TYPHOID_NOT_ROUTINE_SEE_ACIP'],
  };
}

export function buildYellowFeverRecommendation({
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
      status: 'conditionally-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
      supplementalText: ['YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP'],
    };
  }

  if (!patient?.birthDate || !nextDoseForecast) return undefined;

  if (
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '6m',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP'],
      supplementalText: ['YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP'],
    };
  }

  if (
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '9m',
    })
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['BELOW_REC_AGE_SERIES', 'HIGH_RISK'],
      supplementalText: ['YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP'],
    };
  }

  return {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
    supplementalText: ['YELLOW_FEVER_LIVE_MIN_INTERVALS_SEE_ACIP'],
  };
}

export function buildJapaneseEncephalitisRecommendation({
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
  const supplementalText = ['JE_NOT_ROUTINE_ACCEL_18_65_SEE_ACIP'];

  if (status === 'complete') {
    return {
      status: 'conditionally-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
      supplementalText,
    };
  }

  if (!patient?.birthDate || !nextDoseForecast) return undefined;

  if (
    completedDoses === 0 &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '2m',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['JE_NOT_ROUTINE_ACCEL_18_65_SEE_ACIP'],
      supplementalText,
    };
  }

  return {
    status: 'conditionally-recommended',
    reasons: ['HIGH_RISK'],
    supplementalText,
  };
}

export function applyJapaneseEncephalitisForecastOverride({
  series,
  forecast,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (forecast.dose.doseNumber !== 2 || !patient?.birthDate) return forecast;

  const dose1Date = matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
  if (!dose1Date) return forecast;

  if (series.id === 'JEVC_RISK_2_DOSE_SERIES') {
    const recommendedDate = forecast.recommendedDate ?? forecast.earliestRecommendedDate;
    if (
      !recommendedDate ||
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: recommendedDate,
        duration: '18y',
      }) ||
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: recommendedDate,
        duration: '66y',
      })
    ) {
      return forecast;
    }

    const acceleratedEarliest = dateFromIceDuration({
      startDate: dose1Date,
      duration: '7d',
    });
    const acceleratedLatest = dateFromIceDuration({
      startDate: dose1Date,
      duration: '28d',
    });

    return {
      ...forecast,
      absoluteMinimumDate: acceleratedEarliest,
      minimumDate: acceleratedEarliest,
      earliestRecommendedDate: acceleratedEarliest,
      recommendedDate: acceleratedEarliest,
      overdueDate: acceleratedLatest,
    };
  }

  if (series.id !== 'JEVC_RISK_2_DOSE_ACCELERATED_SERIES') return forecast;

  const recommendedDate = forecast.recommendedDate ?? forecast.earliestRecommendedDate;
  const shouldUseStandardIntervals =
    recommendedDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: recommendedDate,
      duration: '66y',
    });
  const shouldSuppressLatestInterval = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: dose1Date,
    duration: '66y-7d',
  });
  if (!shouldUseStandardIntervals && !shouldSuppressLatestInterval) {
    return forecast;
  }

  const standardRecommended = dateFromIceDuration({
    startDate: dose1Date,
    duration: '28d',
  });

  return {
    ...forecast,
    earliestRecommendedDate: shouldUseStandardIntervals
      ? standardRecommended
      : forecast.earliestRecommendedDate,
    recommendedDate: shouldUseStandardIntervals
      ? standardRecommended
      : forecast.recommendedDate,
    overdueDate: shouldSuppressLatestInterval ? undefined : forecast.overdueDate,
  };
}

function markSelected(forecast: IceSeriesForecast, selectionReason: string) {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}
