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

const hibCvxCodes = new Set([
  '17',
  '22',
  '46',
  '47',
  '48',
  '49',
  '50',
  '51',
  '102',
  '120',
  '132',
  '146',
  '148',
  '170',
  '198',
]);
const hibNosCvxCodes = new Set(['17']);

export function selectHibSeries(candidates: IceSeriesForecast[]) {
  const completed = candidates.find((candidate) => candidate.status === 'complete');
  if (completed) return markSelected(completed, 'HIB_COMPLETE_SERIES');

  const omp = candidates.find((candidate) => candidate.series.id === 'HIB_OMP_SERIES');
  const fourDose = candidates.find(
    (candidate) => candidate.series.id === 'HIB_4_DOSE_SERIES',
  );
  if (!omp || !fourDose) return undefined;

  const firstValidCvx = [...omp.matchedDoses, ...fourDose.matchedDoses]
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )
    .map((match) => normalizeCvx(match.immunization.vaccineCode))[0];

  if (firstValidCvx === '49' || firstValidCvx === '51') {
    return markSelected(omp, 'HIB_OMP_PRODUCT');
  }

  return markSelected(fourDose, 'HIB_4_DOSE_DEFAULT');
}

export function findSameDaySpecificHibDose({
  series,
  dose,
  immunization,
  availableImmunizations,
  usedImmunizationIndexes,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
}) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (
    series.vaccineGroup?.code !== 'HIB' ||
    !immunization.date ||
    cvx !== '49'
  ) {
    return undefined;
  }

  return availableImmunizations.find((candidate, candidateIndex) => {
    const candidateCvx = normalizeCvx(candidate.vaccineCode);
    return (
      !usedImmunizationIndexes.has(candidateIndex) &&
      candidate !== immunization &&
      candidate.date === immunization.date &&
      isImmunizationAllowedForDose(candidate, dose) &&
      !!candidateCvx &&
      candidateCvx !== '49' &&
      !hibNosCvxCodes.has(candidateCvx)
    );
  });
}

export function customHibTargetDoseForImmunization({
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
    series.id !== 'HIB_4_DOSE_SERIES' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return undefined;
  }

  const effectiveDoseNumber = hibEffectiveDoseNumber({
    birthDate: patient.birthDate,
    date: immunization.date,
    matchedDoses,
    fallbackDoseNumber: dose.doseNumber,
    cvx: normalizeCvx(immunization.vaccineCode),
  });
  return series.doses.find((candidate) => candidate.doseNumber === effectiveDoseNumber);
}

export function isHibImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && hibCvxCodes.has(cvx);
}

export function isHibBoosterVaccineAllowed({
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
    series.vaccineGroup?.code !== 'HIB' ||
    normalizeCvx(immunization.vaccineCode) !== '50' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return false;
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    })
  ) {
    return true;
  }

  return (
    dose.doseNumber >= series.numberOfDosesInSeries &&
    matchedDoses.length > 0 &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '1y-4d',
    })
  );
}

export function evaluateHibInvalidNonAllowedDose({
  series,
  immunization,
  dose,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
}) {
  if (series.vaccineGroup?.code === 'HIB' && isHibImmunization(immunization)) {
    return {
      immunization,
      dose,
      status: 'invalid' as const,
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'],
    };
  }

  return undefined;
}

export function evaluateHibAcceptedNonAllowedDose({
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
    series.vaccineGroup?.code === 'HIB' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    }) &&
    hibDosesBefore(matchedDoses, patient.birthDate, '5y') <
      series.numberOfDosesInSeries
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

export function evaluateHibCustomConstraints({
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
  const reasons: string[] = [];
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!patient?.birthDate || !immunization.date || !cvx) return reasons;

  if (
    cvx === '50' &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    }) &&
    !(
      dose.doseNumber >= series.numberOfDosesInSeries &&
      matchedDoses.length > 0 &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '1y-4d',
      })
    )
  ) {
    reasons.push('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE');
  }

  if (
    series.id === 'HIB_4_DOSE_SERIES' &&
    dose.doseNumber === 4 &&
    hibDosesBefore(matchedDoses, patient.birthDate, '7m') === 0 &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '1y-4d',
    })
  ) {
    reasons.push('BELOW_ABSOLUTE_MINIMUM_AGE');
  }

  return reasons;
}

export function buildHibRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  matchedDoses,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') return undefined;
  if (!patient?.birthDate) return undefined;

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '5y',
    }) &&
    hibDosesBefore(matchedDoses, patient.birthDate, '5y') <
      series.numberOfDosesInSeries
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

export function applyHibForecastOverride({
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
  if (series.id !== 'HIB_4_DOSE_SERIES' || !patient?.birthDate) return forecast;

  const dosesBefore7Months = hibDosesBefore(matchedDoses, patient.birthDate, '7m');
  const dosesBefore12Months = hibDosesBefore(
    matchedDoses,
    patient.birthDate,
    '12m',
  );

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '15m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '5y',
    }) &&
    matchedDoses.length < series.numberOfDosesInSeries
  ) {
    return hibForecastAtAge({ series, forecast, patient, doseNumber: 4, age: '15m' });
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '12m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '15m',
    })
  ) {
    return hibForecastAtAge({
      series,
      forecast,
      patient,
      doseNumber: dosesBefore12Months === 2 ? 4 : 3,
      age: '12m',
    });
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '7m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '12m',
    }) &&
    dosesBefore7Months === 0
  ) {
    return hibForecastAtAge({ series, forecast, patient, doseNumber: 2, age: '7m' });
  }

  return forecast;
}

function hibEffectiveDoseNumber({
  birthDate,
  date,
  matchedDoses,
  fallbackDoseNumber,
  cvx,
}: {
  birthDate: string;
  date: string;
  matchedDoses: IceSeriesDoseMatch[];
  fallbackDoseNumber: number;
  cvx?: string;
}) {
  if (
    cvx === '50' &&
    matchedDoses.length > 0 &&
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '1y-4d' })
  ) {
    return 4;
  }

  if (
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '15m' })
  ) {
    return Math.max(fallbackDoseNumber, 4);
  }

  if (
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '12m' })
  ) {
    const dosesBefore12Months = hibDosesBefore(matchedDoses, birthDate, '12m');
    return Math.max(fallbackDoseNumber, dosesBefore12Months === 2 ? 4 : 3);
  }

  if (
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '7m' })
  ) {
    if (
      matchedDoses.length === 1 &&
      dateMeetsMinimumDuration({
        startDate: birthDate,
        endDate: date,
        duration: '12m-28d',
      })
    ) {
      return Math.max(fallbackDoseNumber, 3);
    }

    return Math.max(fallbackDoseNumber, 2);
  }

  return fallbackDoseNumber;
}

function hibDosesBefore(
  matchedDoses: IceSeriesDoseMatch[],
  birthDate: string,
  duration: string,
) {
  const cutoffDate = dateFromIceDuration({ startDate: birthDate, duration });
  return matchedDoses.filter(
    (match) => match.immunization.date && match.immunization.date < cutoffDate,
  ).length;
}

function hibForecastAtAge({
  series,
  forecast,
  patient,
  doseNumber,
  age,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  patient: ForecastPatient;
  doseNumber: number;
  age: string;
}) {
  if (!patient.birthDate) return forecast;
  const dose = series.doses.find((candidate) => candidate.doseNumber === doseNumber);
  const date = dateFromIceDuration({ startDate: patient.birthDate, duration: age });
  return {
    ...forecast,
    dose: dose ?? forecast.dose,
    minimumDate: date,
    earliestRecommendedDate: date,
    recommendedDate: date,
  };
}

function isImmunizationAllowedForDose(
  immunization: ForecastImmunization,
  dose: IceDoseRule,
) {
  const normalizedCode = normalizeCvx(immunization.vaccineCode);
  if (!normalizedCode) return false;
  return dose.vaccines.some((vaccine) => vaccine.cvx === normalizedCode);
}

function markSelected(forecast: IceSeriesForecast, selectionReason: string) {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
