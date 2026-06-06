import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesRecommendation,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
} from './types.js';

const polioCvxCodes = new Set([
  '02',
  '10',
  '89',
  '110',
  '120',
  '130',
  '132',
  '146',
  '170',
  '178',
  '179',
  '182',
  '195',
  '324',
]);
const polioOpvCvxCodes = new Set(['02', '182']);
const polioMissingAntigenCvxCodes = new Set(['178', '179']);

export function selectPolioSeries(candidates: IceSeriesForecast[]) {
  const fourDose = candidates.find(
    (candidate) => candidate.series.id === 'POLIO_4_DOSE_SERIES',
  );
  const fipv = candidates.find(
    (candidate) => candidate.series.id === 'POLIO_FRACTIONAL_IPV_SERIES',
  );
  if (!fourDose || !fipv) return undefined;

  const hasFractionalIpvDose = [...fourDose.matchedDoses, ...fipv.matchedDoses]
    .some((match) => normalizeCvx(match.immunization.vaccineCode) === '324');
  if (hasFractionalIpvDose) {
    return markSelected(fipv, 'POLIO_FIPV_PRODUCT');
  }

  if (fourDose.status !== 'complete' && fipv.status === 'complete') {
    return markSelected(fipv, 'POLIO_FIPV_COMPLETE');
  }

  return markSelected(fourDose, 'POLIO_4_DOSE_DEFAULT');
}

export function findSameDaySpecificPolioDose({
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
    series.vaccineGroup?.code !== 'POLIO' ||
    !immunization.date ||
    !cvx ||
    !polioOpvCvxCodes.has(cvx) ||
    immunization.date >= '2016-04-01'
  ) {
    return undefined;
  }

  return availableImmunizations.find(
    (candidate, candidateIndex) =>
      !usedImmunizationIndexes.has(candidateIndex) &&
      candidate !== immunization &&
      candidate.date === immunization.date &&
      isImmunizationAllowedForDose(candidate, dose) &&
      !polioOpvCvxCodes.has(normalizeCvx(candidate.vaccineCode) ?? '') &&
      normalizeCvx(candidate.vaccineCode) !== '89',
  );
}

export function applyPolioDuplicateSameDayRule({
  series,
  matchedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (series.vaccineGroup?.code !== 'POLIO') return;

  for (let index = matchedDoses.length - 1; index >= 0; index -= 1) {
    const match = matchedDoses[index];
    const cvx = normalizeCvx(match.immunization.vaccineCode);
    if (!cvx || !polioOpvCvxCodes.has(cvx) || !match.immunization.date) continue;

    const sameDaySpecificDose = matchedDoses.find(
      (candidate) =>
        candidate !== match &&
        candidate.dose.doseNumber === match.dose.doseNumber &&
        candidate.immunization.date === match.immunization.date &&
        !polioOpvCvxCodes.has(normalizeCvx(candidate.immunization.vaccineCode) ?? '') &&
        normalizeCvx(candidate.immunization.vaccineCode) !== '89',
    );
    if (!sameDaySpecificDose) continue;

    matchedDoses.splice(index, 1);
    invalidDoses.push({
      ...match,
      status: 'invalid',
      reasons: ['DUPLICATE_SAME_DAY'],
    });
  }
}

export function buildPolioRecommendation({
  patient,
  evaluationDate,
  status,
  matchedDoses,
  acceptedDoses,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (!patient?.birthDate) return undefined;
  const birthDate = patient.birthDate;

  const patientAdult = dateMeetsMinimumDuration({
    startDate: birthDate,
    endDate: evaluationDate,
    duration: '18y',
  });
  if (!patientAdult) {
    return nextDoseForecast
      ? {
          status: 'recommended',
          reasons: ['DUE'],
        }
      : undefined;
  }

  const adultBooster = [...matchedDoses, ...acceptedDoses].find(
    (match) =>
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: birthDate,
        endDate: match.immunization.date,
        duration: '18y',
      }) &&
      match.reasons.includes('BOOSTER_DOSE'),
  );

  if (status === 'complete' && adultBooster) {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (status === 'complete') {
    return {
      status: 'conditionally-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
      supplementalText: ['POLIO_COMPLETE_HIGH_RISK'],
    };
  }

  if (matchedDoses.length === 0 && acceptedDoses.length === 0) {
    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
      supplementalText: ['POLIO_ASSUME_VACCINATED'],
    };
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

export function applyPolioForecastOverride({
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
  if (!patient?.birthDate) return forecast;

  const doseNumber = forecast.dose.doseNumber;
  const isFourDoseFinal =
    series.id === 'POLIO_4_DOSE_SERIES' && doseNumber === 4;
  const isFipvFinal =
    series.id === 'POLIO_FRACTIONAL_IPV_SERIES' && doseNumber === 5;
  if (isFourDoseFinal || isFipvFinal) {
    const priorDoseDate = latestDoseDate(matchedDoses);
    if (!priorDoseDate) return forecast;

    const historicalEarliest = latestDate([
      dateFromIceDuration({
        startDate: patient.birthDate,
        duration: '126d',
      }),
      dateFromIceDuration({
        startDate: priorDoseDate,
        duration: '28d',
      }),
    ]);

    if (
      evaluationDate < '2009-08-07' &&
      historicalEarliest &&
      historicalEarliest <= '2009-08-07'
    ) {
      return {
        ...forecast,
        minimumDate: historicalEarliest,
        earliestRecommendedDate: historicalEarliest,
        recommendedDate: historicalEarliest,
      };
    }
  }

  const finalDoseForFourDoseAt4Years =
    series.id === 'POLIO_4_DOSE_SERIES' && doseNumber === 3;
  const finalDoseForFipvAt4Years =
    series.id === 'POLIO_FRACTIONAL_IPV_SERIES' && doseNumber === 4;
  if (!finalDoseForFourDoseAt4Years && !finalDoseForFipvAt4Years) {
    return forecast;
  }

  const recommendationDate = forecast.recommendedDate ?? forecast.earliestRecommendedDate;
  const age4Date = dateFromIceDuration({
    startDate: patient.birthDate,
    duration: '4y',
  });
  if (
    evaluationDate < age4Date &&
    (!recommendationDate || recommendationDate < age4Date)
  ) {
    return forecast;
  }

  const priorDoseDate = latestDoseDate(matchedDoses);
  if (!priorDoseDate) return forecast;

  const intervalDate = dateFromIceDuration({
    startDate: priorDoseDate,
    duration: '6m',
  });
  const adjustedDate = latestDate([age4Date, intervalDate]);

  return {
    ...forecast,
    minimumDate: adjustedDate,
    earliestRecommendedDate: adjustedDate,
    recommendedDate: adjustedDate,
  };
}

export function polioHasCustomCompletion({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (series.vaccineGroup?.code !== 'POLIO' || !patient?.birthDate) return false;

  if (series.id === 'POLIO_4_DOSE_SERIES') {
    if (
      polioFinalDoseCompletesSeries({
        doseNumber: 3,
        matchedDoses,
        patient,
      })
    ) {
      return true;
    }

    const dose4Date = doseDateByNumber(matchedDoses, 4);
    return !!dose4Date && polioFinalDateCanComplete(patient.birthDate, dose4Date);
  }

  if (series.id === 'POLIO_FRACTIONAL_IPV_SERIES') {
    if (
      polioFinalDoseCompletesSeries({
        doseNumber: 4,
        matchedDoses,
        patient,
      })
    ) {
      return true;
    }

    const dose5Date = doseDateByNumber(matchedDoses, 5);
    return !!dose5Date && polioFinalDateCanComplete(patient.birthDate, dose5Date);
  }

  return false;
}

export function isPolioImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && polioCvxCodes.has(cvx);
}

export function isPolioMissingAntigenImmunization(
  immunization: ForecastImmunization,
) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return (
    !!cvx &&
    (polioMissingAntigenCvxCodes.has(cvx) ||
      (polioOpvCvxCodes.has(cvx) &&
        !!immunization.date &&
        immunization.date >= '2016-04-01'))
  );
}

export function evaluatePolioCustomConstraint({
  series,
  immunization,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
}) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!cvx || !immunization.date) return undefined;

  if (polioMissingAntigenCvxCodes.has(cvx)) {
    return 'MISSING_ANTIGEN';
  }

  if (polioOpvCvxCodes.has(cvx) && immunization.date >= '2016-04-01') {
    return 'MISSING_ANTIGEN';
  }

  if (series.id === 'POLIO_4_DOSE_SERIES' && cvx === '324') {
    return 'VACCINE_NOT_PART_OF_THIS_SERIES';
  }

  return undefined;
}

export function polioSupplementalText(immunization: ForecastImmunization) {
  return normalizeCvx(immunization.vaccineCode) === '89' &&
    !!immunization.date &&
    immunization.date >= '2016-04-01'
    ? ['POLIO_CVX_89']
    : [];
}

export function isPolioExtraDoseBefore4After2009({
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
    series.vaccineGroup?.code !== 'POLIO' ||
    !patient?.birthDate ||
    !immunization.date ||
    immunization.date < '2009-08-07'
  ) {
    return false;
  }

  const targetDose =
    series.id === 'POLIO_4_DOSE_SERIES'
      ? 4
      : series.id === 'POLIO_FRACTIONAL_IPV_SERIES'
        ? 5
        : undefined;
  if (!targetDose || dose.doseNumber !== targetDose) return false;

  return !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: immunization.date,
    duration: '4y-4d',
  });
}

function polioFinalDoseCompletesSeries({
  doseNumber,
  matchedDoses,
  patient,
}: {
  doseNumber: number;
  matchedDoses: IceSeriesDoseMatch[];
  patient: ForecastPatient;
}) {
  const finalDoseDate = doseDateByNumber(matchedDoses, doseNumber);
  const previousDoseDate = doseDateByNumber(matchedDoses, doseNumber - 1);
  return (
    !!patient.birthDate &&
    !!finalDoseDate &&
    !!previousDoseDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: finalDoseDate,
      duration: '4y-4d',
    }) &&
    dateMeetsMinimumDuration({
      startDate: previousDoseDate,
      endDate: finalDoseDate,
      duration: '6m-4d',
    })
  );
}

function polioFinalDateCanComplete(birthDate: string, doseDate: string) {
  return (
    doseDate < '2009-08-07' ||
    dateMeetsMinimumDuration({
      startDate: birthDate,
      endDate: doseDate,
      duration: '4y-4d',
    })
  );
}

function doseDateByNumber(
  matchedDoses: IceSeriesDoseMatch[],
  doseNumber: number,
) {
  return matchedDoses.find((match) => match.dose.doseNumber === doseNumber)
    ?.immunization.date;
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
export function appendPolioBoosterDoseMatches({
  series,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  const lastDose = series.doses[series.doses.length - 1];
  let boosterRecorded = matchedDoses.some((match) =>
    match.reasons.includes('BOOSTER_DOSE'),
  );

  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      !isPolioImmunization(immunization) ||
      isPolioMissingAntigenImmunization(immunization)
    ) {
      continue;
    }

    usedImmunizationIndexes.add(index);
    if (!boosterRecorded) {
      matchedDoses.push({
        immunization,
        dose: lastDose,
        status: 'valid',
        reasons: ['BOOSTER_DOSE'],
        ...(polioSupplementalText(immunization).length > 0
          ? { supplementalText: polioSupplementalText(immunization) }
          : {}),
      });
      boosterRecorded = true;
      continue;
    }

    acceptedDoses.push({
      immunization,
      dose: lastDose,
      status: 'accepted',
      reasons: ['EXTRA_DOSE'],
      ...(polioSupplementalText(immunization).length > 0
        ? { supplementalText: polioSupplementalText(immunization) }
        : {}),
    });
  }
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

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const cvxMatch = code.match(/(?:CVX[_:-]?)?(\d{1,3})$/i);
  return cvxMatch?.[1]?.padStart(2, '0');
}
