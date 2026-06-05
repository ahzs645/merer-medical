import {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
} from './types.js';
import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';

const pneumococcalPcv20Or21CvxCodes = new Set(['216', '327']);
const pneumococcalPcv15CvxCodes = new Set(['215']);
const pneumococcalPpsv23CvxCodes = new Set(['33']);
const pneumococcalPcv13Or15Or20Or21CvxCodes = new Set([
  '133',
  '215',
  '216',
  '327',
]);
const pneumococcalPpsv23OrPcv20Or21CvxCodes = new Set(['33', '216', '327']);

export function pneumococcalHasCustomCompletion({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (series.id !== 'PNEUMOCOCCAL_SERIES' || !patient?.birthDate) return false;

  const adultMatches = matchedDoses.filter(
    (match) =>
      match.status === 'valid' &&
      match.dose.doseNumber >= 6 &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '19y',
      }),
  );

  const adultCvxCodes = adultMatches
    .map((match) => normalizeCvx(match.immunization.vaccineCode))
    .filter(isDefined);

  return (
    pneumococcalHasCompletedChildSeries({
      matchedDoses,
      birthDate: patient.birthDate,
    }) ||
    adultCvxCodes.some((cvx) => pneumococcalPcv20Or21CvxCodes.has(cvx)) ||
    (adultCvxCodes.some((cvx) => pneumococcalPcv15CvxCodes.has(cvx)) &&
      adultCvxCodes.some((cvx) => pneumococcalPpsv23CvxCodes.has(cvx))) ||
    pneumococcalHasPpsv23At65AndAdultPcv({
      adultMatches,
      birthDate: patient.birthDate,
    })
  );
}

export function pneumococcalCustomTargetDoseForImmunization({
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
    series.id !== 'PNEUMOCOCCAL_SERIES' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return undefined;
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '19y',
    })
  ) {
    const adultDoseNumber = Math.min(
      8,
      6 + matchedDoses.filter((match) => match.dose.doseNumber >= 6).length,
    );
    return series.doses.find((candidate) => candidate.doseNumber === adultDoseNumber);
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    })
  ) {
    return series.doses.find((candidate) => candidate.doseNumber === 6);
  }

  const effectiveDoseNumber = pneumococcalEffectiveDoseNumber({
    birthDate: patient.birthDate,
    date: immunization.date,
    matchedDoses,
    fallbackDoseNumber: dose.doseNumber,
  });
  return series.doses.find((candidate) => candidate.doseNumber === effectiveDoseNumber);
}

export function evaluatePneumococcalAcceptedNonAllowedDose({
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
    series.id === 'PNEUMOCOCCAL_SERIES' &&
    dose.doseNumber >= 6 &&
    normalizeCvx(immunization.vaccineCode) === '100' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    })
  ) {
    const reasons = ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'];
    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '19y',
      })
    ) {
      reasons.push('OUTSIDE_ROUTINE_SERIES');
    }

    return {
      immunization,
      dose,
      status: 'accepted',
      reasons,
    };
  }

  if (
    series.id === 'PNEUMOCOCCAL_SERIES' &&
    dose.doseNumber <= 4 &&
    normalizeCvx(immunization.vaccineCode) === '33'
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    };
  }

  return undefined;
}

export function evaluatePneumococcalInvalidNonAllowedDose({
  series,
  dose,
  immunization,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
}): IceSeriesDoseMatch | undefined {
  if (
    series.id === 'PNEUMOCOCCAL_SERIES' &&
    dose.doseNumber >= 6 &&
    ['109', '152'].includes(normalizeCvx(immunization.vaccineCode) ?? '')
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'],
      supplementalText: ['PNEUMOCOCCAL_UNSPECIFIED_CVX'],
    };
  }

  return undefined;
}

export function evaluatePneumococcalAcceptedDose({
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (pneumococcalDose8Pcv13IsOutsideRoutine({ immunization, dose, matchedDoses, patient })) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  if (pneumococcalChildExtraDoseIsAccepted({ immunization, dose, matchedDoses, patient })) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['EXTRA_DOSE'],
    };
  }

  return undefined;
}

export function evaluatePneumococcalCustomConstraints({
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  const reasons: string[] = [];
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!cvx) return reasons;

  const priorAdultDose6 = matchedDoses.find(
    (match) => match.dose.doseNumber === 6 && match.status === 'valid',
  );
  const priorAdultDose6Cvx = normalizeCvx(priorAdultDose6?.immunization.vaccineCode);

  if (
    dose.doseNumber === 7 &&
    priorAdultDose6Cvx &&
    pneumococcalPpsv23OrPcv20Or21CvxCodes.has(priorAdultDose6Cvx) &&
    !pneumococcalPcv13Or15Or20Or21CvxCodes.has(cvx)
  ) {
    reasons.push('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE');
  }

  if (
    dose.doseNumber === 7 &&
    priorAdultDose6Cvx &&
    pneumococcalPcv13Or15Or20Or21CvxCodes.has(priorAdultDose6Cvx) &&
    !pneumococcalPpsv23OrPcv20Or21CvxCodes.has(cvx)
  ) {
    reasons.push('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE');
  }

  if (
    dose.doseNumber === 8 &&
    !pneumococcalPpsv23OrPcv20Or21CvxCodes.has(cvx) &&
    !pneumococcalDose8Pcv13IsOutsideRoutine({
      immunization,
      dose,
      matchedDoses,
      patient,
    })
  ) {
    reasons.push('VACCINE_NOT_ALLOWED_FOR_THIS_DOSE');
  }

  if (
    pneumococcalChildModernPcvNeededAfterCompletion({
      immunization,
      dose,
      matchedDoses,
      patient,
    }) &&
    !pneumococcalChildModernPcvNeededIntervalMet({
      immunization,
      matchedDoses,
    })
  ) {
    reasons.push('BELOW_MINIMUM_INTERVAL');
  }

  return reasons;
}

export function appendPneumococcalPostCompletionDoseMatches({
  series,
  availableImmunizations,
  usedImmunizationIndexes,
  acceptedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  acceptedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (!patient?.birthDate) return;

  const lastDose = series.doses[series.doses.length - 1];
  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      !immunization.date ||
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '5y',
      })
    ) {
      continue;
    }

    const cvx = normalizeCvx(immunization.vaccineCode);
    if (!cvx || !pneumococcalPcv13Or15Or20Or21CvxCodes.has(cvx)) continue;

    usedImmunizationIndexes.add(index);
    acceptedDoses.push({
      immunization,
      dose: lastDose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    });
  }
}

export function applyPneumococcalForecastOverride({
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
  const patientWithBirthDate = patient as ForecastPatient & { birthDate: string };

  if (
    dateMeetsMinimumDuration({
      startDate: patientWithBirthDate.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    }) &&
    forecast.dose.doseNumber <= 5
  ) {
    return pneumococcalForecastAtAge({
      series,
      forecast,
      patient: patientWithBirthDate,
      doseNumber: 6,
      age: '19y',
    });
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patientWithBirthDate.birthDate,
      endDate: evaluationDate,
      duration: '5y',
    }) &&
    forecast.dose.doseNumber <= 6 &&
    !matchedDoses.some(
      (match) =>
        match.dose.doseNumber <= 6 &&
        pneumococcalPcv13Or15Or20Or21CvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
    )
  ) {
    return pneumococcalForecastAtAge({
      series,
      forecast,
      patient: patientWithBirthDate,
      doseNumber: 6,
      age: '50y',
    });
  }

  const dosesBefore7Months = pneumococcalDosesBefore(
    matchedDoses,
    patientWithBirthDate.birthDate,
    '7m',
  );
  const dosesBefore12Months = pneumococcalDosesBefore(
    matchedDoses,
    patientWithBirthDate.birthDate,
    '12m',
  );
  const effectiveDosesBefore24Months = pneumococcalEffectiveDosesBefore(
    matchedDoses,
    patientWithBirthDate.birthDate,
    '24m',
  );

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '24m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '5y',
    }) &&
    effectiveDosesBefore24Months < 4
  ) {
    return pneumococcalForecastAtAge({
      series,
      forecast,
      patient: patientWithBirthDate,
      doseNumber: 4,
      age: '24m',
    });
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
      duration: '24m',
    })
  ) {
    return pneumococcalForecastAtAge({
      series,
      forecast,
      patient: patientWithBirthDate,
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
    })
  ) {
    return pneumococcalForecastAtAge({
      series,
      forecast,
      patient: patientWithBirthDate,
      doseNumber: dosesBefore7Months === 1 ? 3 : 2,
      age: '7m',
    });
  }

  return forecast;
}

function pneumococcalHasCompletedChildSeries({
  matchedDoses,
  birthDate,
}: {
  matchedDoses: IceSeriesDoseMatch[];
  birthDate: string;
}) {
  return (
    matchedDoses.filter(
      (match) =>
        match.status === 'valid' &&
        match.dose.doseNumber <= 4 &&
        match.immunization.date &&
        !dateMeetsMinimumDuration({
          startDate: birthDate,
          endDate: match.immunization.date,
          duration: '5y',
        }),
    ).length >= 4
  );
}

function pneumococcalHasPpsv23At65AndAdultPcv({
  adultMatches,
  birthDate,
}: {
  adultMatches: IceSeriesDoseMatch[];
  birthDate: string;
}) {
  const hasPpsv23At65 = adultMatches.some(
    (match) =>
      pneumococcalPpsv23CvxCodes.has(
        normalizeCvx(match.immunization.vaccineCode) ?? '',
      ) &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: birthDate,
        endDate: match.immunization.date,
        duration: '65y',
      }),
  );
  const hasAdultPcv = adultMatches.some((match) =>
    pneumococcalPcv13Or15Or20Or21CvxCodes.has(
      normalizeCvx(match.immunization.vaccineCode) ?? '',
    ),
  );

  return hasPpsv23At65 && hasAdultPcv;
}

function pneumococcalEffectiveDoseNumber({
  birthDate,
  date,
  matchedDoses,
  fallbackDoseNumber,
}: {
  birthDate: string;
  date: string;
  matchedDoses: IceSeriesDoseMatch[];
  fallbackDoseNumber: number;
}) {
  if (
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '24m' })
  ) {
    return Math.max(fallbackDoseNumber, 4);
  }

  if (
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '12m' })
  ) {
    const dosesBefore12Months = pneumococcalDosesBefore(
      matchedDoses,
      birthDate,
      '12m',
    );
    return Math.max(fallbackDoseNumber, dosesBefore12Months === 2 ? 4 : 3);
  }

  if (
    dateMeetsMinimumDuration({ startDate: birthDate, endDate: date, duration: '7m' })
  ) {
    const dosesBefore7Months = pneumococcalDosesBefore(
      matchedDoses,
      birthDate,
      '7m',
    );
    return Math.max(fallbackDoseNumber, dosesBefore7Months === 1 ? 3 : 2);
  }

  return fallbackDoseNumber;
}

function pneumococcalDosesBefore(
  matchedDoses: IceSeriesDoseMatch[],
  birthDate: string,
  duration: string,
) {
  const cutoffDate = dateFromIceDuration({ startDate: birthDate, duration });
  return matchedDoses.filter(
    (match) => match.immunization.date && match.immunization.date < cutoffDate,
  ).length;
}

function pneumococcalEffectiveDosesBefore(
  matchedDoses: IceSeriesDoseMatch[],
  birthDate: string,
  duration: string,
) {
  const cutoffDate = dateFromIceDuration({ startDate: birthDate, duration });
  return matchedDoses.filter(
    (match) =>
      match.immunization.date &&
      match.immunization.date < cutoffDate &&
      match.dose.doseNumber < 6,
  ).length;
}

function pneumococcalChildExtraDoseIsAccepted({
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  return (
    dose.doseNumber > 4 &&
    pneumococcalChildShotBeforeAge5({ immunization, patient }) &&
    !pneumococcalChildModernPcvNeededAfterCompletion({
      immunization,
      dose,
      matchedDoses,
      patient,
    })
  );
}

function pneumococcalChildModernPcvNeededAfterCompletion({
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return (
    dose.doseNumber === 5 &&
    !!cvx &&
    pneumococcalPcv13Or15Or20Or21CvxCodes.has(cvx) &&
    pneumococcalChildShotBeforeAge5({ immunization, patient }) &&
    pneumococcalHasCompletedChildSeries({
      matchedDoses,
      birthDate: patient?.birthDate ?? '',
    }) &&
    !matchedDoses.some(
      (match) =>
        match.status === 'valid' &&
        pneumococcalPcv13Or15Or20Or21CvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
    )
  );
}

function pneumococcalChildModernPcvNeededIntervalMet({
  immunization,
  matchedDoses,
}: {
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  const previousDate = latestDoseDate(matchedDoses);
  return (
    !!previousDate &&
    !!immunization.date &&
    dateMeetsMinimumDuration({
      startDate: previousDate,
      endDate: immunization.date,
      duration: '52d',
    })
  );
}

function pneumococcalChildShotBeforeAge5({
  immunization,
  patient,
}: {
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  return (
    !!patient?.birthDate &&
    !!immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    })
  );
}

function pneumococcalDose8Pcv13IsOutsideRoutine({
  immunization,
  dose,
  matchedDoses,
  patient,
}: {
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (dose.doseNumber !== 8 || cvx !== '133') return false;

  const hasPriorModernPcv = matchedDoses.some(
    (match) =>
      (match.dose.doseNumber === 6 || match.dose.doseNumber === 7) &&
      match.status === 'valid' &&
      (pneumococcalPcv15CvxCodes.has(
        normalizeCvx(match.immunization.vaccineCode) ?? '',
      ) ||
        pneumococcalPcv20Or21CvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        )),
  );
  if (hasPriorModernPcv) return false;

  const birthDate = patient?.birthDate;
  const hasPpsv23At50 = matchedDoses.some((match) => {
    const matchCvx = normalizeCvx(match.immunization.vaccineCode);
    if (
      match.status !== 'valid' ||
      matchCvx !== '33' ||
      !match.immunization.date ||
      !birthDate
    ) {
      return false;
    }

    return dateMeetsMinimumDuration({
      startDate: birthDate,
      endDate: match.immunization.date,
      duration: '50y',
    });
  });

  return !hasPpsv23At50;
}

function pneumococcalForecastAtAge({
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
  if (!dose) return forecast;

  const date = dateFromIceDuration({ startDate: patient.birthDate, duration: age });
  return {
    ...forecast,
    dose,
    earliestRecommendedDate: date,
    recommendedDate: date,
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

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const cvxMatch = code.match(/(?:CVX[_:-]?)?(\d{1,3})$/i);
  return cvxMatch?.[1]?.padStart(2, '0');
}
