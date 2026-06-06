import {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesRecommendation,
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
const pneumococcalCvxCodes = new Set([
  '33',
  '100',
  '109',
  '133',
  '152',
  '215',
  '216',
  '327',
]);

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

  const administrationDate = immunization.date;

  if (
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: administrationDate,
      duration: '1y-4d',
    }) &&
    pneumococcalDosesBefore(matchedDoses, patient.birthDate, '7m') === 0 &&
    matchedDoses.filter(
      (match) =>
        match.status === 'valid' &&
        match.immunization.date &&
        match.immunization.date < administrationDate,
    ).length >= 2
  ) {
    return series.doses.find((candidate) => candidate.doseNumber === 4);
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

export function findSameDayPreferredPneumococcalDose({
  series,
  immunization,
  availableImmunizations,
  usedImmunizationIndexes,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  patient?: ForecastPatient;
}) {
  if (
    series.id !== 'PNEUMOCOCCAL_SERIES' ||
    !immunization.date ||
    !isPneumococcalImmunization(immunization) ||
    pneumococcalPpsv23Under19({ immunization, patient })
  ) {
    return undefined;
  }

  return availableImmunizations.find((candidate, candidateIndex) => {
    if (
      usedImmunizationIndexes.has(candidateIndex) ||
      candidate === immunization ||
      candidate.date !== immunization.date ||
      !isPneumococcalImmunization(candidate) ||
      pneumococcalPpsv23Under19({ immunization: candidate, patient })
    ) {
      return false;
    }

    return pneumococcalSameDayPreferred({
      candidate,
      current: immunization,
      patient,
    });
  });
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

export function evaluatePneumococcalSameDayCompletedChildDuplicate({
  series,
  immunization,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    series.id !== 'PNEUMOCOCCAL_SERIES' ||
    !patient?.birthDate ||
    !immunization.date ||
    !pneumococcalHasCompletedChildSeries({
      matchedDoses,
      birthDate: patient.birthDate,
    })
  ) {
    return undefined;
  }

  const sameDayChildDose = matchedDoses.find(
    (match) =>
      match.status === 'valid' &&
      match.dose.doseNumber <= 4 &&
      match.immunization.date === immunization.date,
  );
  if (!sameDayChildDose) return undefined;

  return {
    immunization,
    dose: sameDayChildDose.dose,
    status: 'invalid',
    reasons: ['DUPLICATE_SAME_DAY'],
  };
}

export function evaluatePneumococcalInvalidOutsideRoutineDose({
  series,
  dose,
  immunization,
  reasons,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  reasons: string[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    series.id !== 'PNEUMOCOCCAL_SERIES' ||
    dose.doseNumber < 6 ||
    !patient?.birthDate ||
    !immunization.date ||
    reasons.length === 0 ||
    reasons.includes('DUPLICATE_SAME_DAY') ||
    reasons.includes('BELOW_ABSOLUTE_MINIMUM_AGE')
  ) {
    return undefined;
  }

  const cvx = normalizeCvx(immunization.vaccineCode);
  if (cvx === '109' || cvx === '152') return undefined;

  const isAtLeast5 = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: immunization.date,
    duration: '5y',
  });
  if (!isAtLeast5) return undefined;

  return {
    immunization,
    dose,
    status: 'accepted',
    reasons: ['OUTSIDE_ROUTINE_SERIES'],
  };
}

function pneumococcalSameDayPreferred({
  candidate,
  current,
  patient,
}: {
  candidate: ForecastImmunization;
  current: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  const candidateCvx = normalizeCvx(candidate.vaccineCode);
  const currentCvx = normalizeCvx(current.vaccineCode);
  if (!candidateCvx || !currentCvx) return false;

  if (candidateCvx === '327') return currentCvx !== '327';
  if (currentCvx === '327') return false;

  if (candidateCvx === '216') return currentCvx !== '216';
  if (currentCvx === '216') return false;

  if (
    candidateCvx === '33' &&
    pneumococcalAdultSameDayShot({ immunization: candidate, patient }) &&
    ['215', '133', '152', '100'].includes(currentCvx)
  ) {
    return true;
  }
  if (
    currentCvx === '33' &&
    pneumococcalAdultSameDayShot({ immunization: current, patient }) &&
    ['215', '133', '152', '100'].includes(candidateCvx)
  ) {
    return false;
  }

  if (
    candidateCvx === '215' &&
    ['133', '152', '100'].includes(currentCvx)
  ) {
    return true;
  }
  if (
    currentCvx === '215' &&
    ['133', '152', '100'].includes(candidateCvx)
  ) {
    return false;
  }

  if (candidateCvx === '133' && currentCvx === '152') return true;
  if (candidateCvx === '152' && currentCvx === '133') return false;

  if (
    candidateCvx === '100' &&
    currentCvx === '152' &&
    current.date &&
    current.date < '2009-03-31'
  ) {
    return true;
  }
  if (
    candidateCvx === '152' &&
    currentCvx === '100' &&
    candidate.date &&
    candidate.date >= '2009-03-31'
  ) {
    return true;
  }

  if (
    candidateCvx === '100' &&
    currentCvx === '133' &&
    current.date &&
    current.date < '2010-06-01'
  ) {
    return true;
  }
  if (
    candidateCvx === '133' &&
    currentCvx === '100' &&
    candidate.date &&
    candidate.date >= '2010-06-01'
  ) {
    return true;
  }

  return false;
}

function pneumococcalAdultSameDayShot({
  immunization,
  patient,
}: {
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  return (
    !!patient?.birthDate &&
    !!immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '19y',
    })
  );
}

function pneumococcalPpsv23Under19({
  immunization,
  patient,
}: {
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  return (
    normalizeCvx(immunization.vaccineCode) === '33' &&
    !!patient?.birthDate &&
    !!immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '19y',
    })
  );
}

function pneumococcalChildPpsv23({
  immunization,
  patient,
}: {
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  return (
    normalizeCvx(immunization.vaccineCode) === '33' &&
    !!patient?.birthDate &&
    !!immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '5y',
    })
  );
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

  if (
    pneumococcalChildFinalDoseBelowMinimumAge({
      immunization,
      dose,
      matchedDoses,
      patient,
    })
  ) {
    reasons.push('BELOW_ABSOLUTE_MINIMUM_AGE');
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

  const childFinalDose = series.doses.find((dose) => dose.doseNumber === 4);
  if (!childFinalDose) return;

  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      normalizeCvx(immunization.vaccineCode) !== '33' ||
      !immunization.date ||
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '5y',
      })
    ) {
      continue;
    }

    usedImmunizationIndexes.add(index);
    acceptedDoses.push({
      immunization,
      dose: childFinalDose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    });
  }
}

export function applyPneumococcalForecastOverride({
  series,
  forecast,
  availableImmunizations,
  matchedDoses,
  acceptedDoses,
  evaluationDate,
  patient,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  availableImmunizations?: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses?: IceSeriesDoseMatch[];
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

  const latestChildPpsv23Date = latestDate(
    [
      ...(acceptedDoses ?? []).map((match) => match.immunization),
      ...(availableImmunizations ?? []),
    ]
      .filter((immunization) => pneumococcalChildPpsv23({ immunization, patient }))
      .map((immunization) => immunization.date)
      .filter(isDefined),
  );

  if (latestChildPpsv23Date && forecast.dose.doseNumber <= 4) {
    const intervalDate = dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '2y',
    })
      ? dateFromIceDuration({
          startDate: latestChildPpsv23Date,
          duration: '56d',
        })
      : latestChildPpsv23Date;

    return {
      ...forecast,
      earliestRecommendedDate: laterDate(
        forecast.earliestRecommendedDate,
        intervalDate,
      ),
      recommendedDate: laterDate(forecast.recommendedDate, intervalDate),
    };
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

export function buildPneumococcalRecommendation({
  status,
  matchedDoses,
  nextDoseForecast,
  evaluationDate,
  patient,
}: {
  status: 'complete' | 'not-complete';
  matchedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
  evaluationDate: string;
  patient?: ForecastPatient;
}): IceSeriesRecommendation | undefined {
  if (!patient?.birthDate) return defaultPneumococcalRecommendation({ status, nextDoseForecast });

  const adultValidMatches = matchedDoses.filter(
    (match) =>
      match.status === 'valid' &&
      match.dose.doseNumber >= 6 &&
      match.immunization.date,
  );
  const adultCvxCodes = adultValidMatches
    .map((match) => normalizeCvx(match.immunization.vaccineCode))
    .filter(isDefined);
  const hasPcv13 = adultCvxCodes.includes('133');
  const hasPcv15Or20Or21 = adultCvxCodes.some((cvx) =>
    ['215', '216', '327'].includes(cvx),
  );
  const hasPpsv23 = adultCvxCodes.includes('33');
  const hasPpsv23At65 = adultValidMatches.some(
    (match) =>
      normalizeCvx(match.immunization.vaccineCode) === '33' &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '65y',
      }),
  );
  const latestAdultPcvDate = latestDate(
    adultValidMatches
      .filter((match) =>
        pneumococcalPcv13Or15Or20Or21CvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
      )
      .map((match) => match.immunization.date)
      .filter(isDefined),
  );
  const latestAdultPpsv23Date = latestDate(
    adultValidMatches
      .filter(
        (match) => normalizeCvx(match.immunization.vaccineCode) === '33',
      )
      .map((match) => match.immunization.date)
      .filter(isDefined),
  );
  const hasPpsv23Before65 = adultValidMatches.some(
    (match) =>
      normalizeCvx(match.immunization.vaccineCode) === '33' &&
      match.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '65y',
      }),
  );

  if (status === 'complete') {
    const childComplete = pneumococcalHasCompletedChildSeries({
      matchedDoses,
      birthDate: patient.birthDate,
    });
    const hasChildModernPcv = pneumococcalHasChildModernPcv({ matchedDoses });

    if (childComplete && !hasChildModernPcv) {
      const modernPcvRecommendationDate = dateFromIceDuration({
        startDate: latestDoseDate(matchedDoses) ?? evaluationDate,
        duration: '52d',
      });

      if (
        !dateMeetsMinimumDuration({
          startDate: patient.birthDate,
          endDate: modernPcvRecommendationDate,
          duration: '5y',
        })
      ) {
        return {
          status: 'recommended',
          reasons: ['DUE'],
          recommendedDate: modernPcvRecommendationDate,
          earliestRecommendedDate: modernPcvRecommendationDate,
        };
      }

      if (
        !dateMeetsMinimumDuration({
          startDate: patient.birthDate,
          endDate: modernPcvRecommendationDate,
          duration: '19y',
        })
      ) {
        return {
          status: 'conditionally-recommended',
          reasons: ['HIGH_RISK'],
          recommendedDate: modernPcvRecommendationDate,
          earliestRecommendedDate: modernPcvRecommendationDate,
        };
      }
    }

    if (hasPcv13 && hasPpsv23At65 && !hasPcv15Or20Or21) {
      return {
        status: 'conditionally-recommended',
        reasons: ['COMPLETE', 'CLINICAL_PATIENT_DISCRETION', 'SUPPLEMENTAL_TEXT'],
        supplementalText: ['PNEUMOCOCCAL_SHARED_CLINICAL_DECISION_MAKING'],
      };
    }

    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '5y',
      }) &&
      childComplete &&
      hasChildModernPcv
    ) {
      return {
        status: 'not-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (!nextDoseForecast) return undefined;

  const recommendation: IceSeriesRecommendation = {
    status: 'recommended',
    reasons: ['DUE'],
    recommendedVaccine: nextDoseForecast.recommendedVaccine,
    earliestRecommendedDate: nextDoseForecast.earliestRecommendedDate,
    recommendedDate: nextDoseForecast.recommendedDate,
    overdueDate: nextDoseForecast.overdueDate,
  };

  const ageAtEvaluation = {
    at5: dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '5y',
    }),
    at19: dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    }),
    at50: dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '50y',
    }),
  };

  if (nextDoseForecast.dose.doseNumber <= 5) {
    const childRecommendationDate =
      nextDoseForecast.recommendedDate ?? nextDoseForecast.earliestRecommendedDate;
    if (
      childRecommendationDate &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: childRecommendationDate,
        duration: '5y',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: childRecommendationDate,
        duration: '19y',
      })
    ) {
      return {
        ...recommendation,
        status: 'conditionally-recommended',
        recommendedVaccine: undefined,
        reasons: ['HIGH_RISK'],
      };
    }

    return {
      ...recommendation,
      recommendedVaccine: undefined,
      reasons: ['SUPPLEMENTAL_TEXT'],
      supplementalText: ['PNEUMOCOCCAL_CHILD_SERIES'],
    };
  }

  if (ageAtEvaluation.at5 && !ageAtEvaluation.at19 && adultValidMatches.length === 0) {
    const childComplete = pneumococcalHasCompletedChildSeries({
      matchedDoses,
      birthDate: patient.birthDate,
    });
    return {
      ...recommendation,
      status: 'conditionally-recommended',
      reasons: childComplete ? ['COMPLETE_HIGH_RISK'] : ['HIGH_RISK'],
      recommendedVaccine: undefined,
    };
  }

  if (!ageAtEvaluation.at50 && adultValidMatches.length > 0) {
    return {
      ...recommendation,
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
      supplementalText: ['PNEUMOCOCCAL_HIGH_RISK'],
    };
  }

  if (ageAtEvaluation.at50 && hasPcv13 && !hasPcv15Or20Or21) {
    if (!hasPpsv23 || hasPpsv23Before65) {
      return {
        ...recommendation,
        recommendedVaccine: undefined,
        reasons: ['ADMINISTER_PCV20_OR_PCV21'],
      };
    }
  }

  if (adultValidMatches.length === 0) {
    return {
      ...recommendation,
      recommendedVaccine: undefined,
      reasons: ['ADMINISTER_PCV15_PCV20_OR_PCV21'],
    };
  }

  if (adultValidMatches.length === 1 && adultCvxCodes.some((cvx) => pneumococcalPcv13Or15Or20Or21CvxCodes.has(cvx))) {
    const intervalDate = latestAdultPcvDate
      ? dateFromIceDuration({ startDate: latestAdultPcvDate, duration: '1y' })
      : undefined;
    return {
      ...recommendation,
      recommendedVaccine: { cvx: '33', display: 'PPSV23', preferred: true },
      earliestRecommendedDate: intervalDate ?? recommendation.earliestRecommendedDate,
      recommendedDate: intervalDate ?? recommendation.recommendedDate,
      reasons: ['DUE', 'SUPPLEMENTAL_TEXT'],
      supplementalText: ['PNEUMOCOCCAL_PPSV23_AFTER_PCV'],
    };
  }

  if (adultValidMatches.length === 1 && hasPpsv23) {
    return {
      ...recommendation,
      recommendedVaccine: undefined,
      reasons: ['ADMINISTER_PCV15_PCV20_OR_PCV21'],
    };
  }

  if (adultValidMatches.length >= 2 && hasPpsv23) {
    const intervalDate = latestAdultPpsv23Date
      ? dateFromIceDuration({
          startDate: latestAdultPpsv23Date,
          duration: '5y',
        })
      : undefined;
    return {
      ...recommendation,
      recommendedVaccine: { cvx: '33', display: 'PPSV23', preferred: true },
      earliestRecommendedDate: intervalDate ?? recommendation.earliestRecommendedDate,
      recommendedDate: intervalDate ?? recommendation.recommendedDate,
      reasons: ['DUE', 'SUPPLEMENTAL_TEXT'],
      supplementalText: ['PNEUMOCOCCAL_PPSV23_ADDITIONAL_DOSE'],
    };
  }

  return recommendation;
}

function defaultPneumococcalRecommendation({
  status,
  nextDoseForecast,
}: {
  status: 'complete' | 'not-complete';
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (!nextDoseForecast) return undefined;

  return {
    status: 'recommended',
    reasons: ['DUE'],
  };
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

function pneumococcalHasChildModernPcv({
  matchedDoses,
}: {
  matchedDoses: IceSeriesDoseMatch[];
}) {
  return matchedDoses.some(
    (match) =>
      match.status === 'valid' &&
      match.dose.doseNumber <= 5 &&
      pneumococcalPcv13Or15Or20Or21CvxCodes.has(
        normalizeCvx(match.immunization.vaccineCode) ?? '',
      ),
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

function pneumococcalChildFinalDoseBelowMinimumAge({
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
  if (
    dose.doseNumber !== 4 ||
    !patient?.birthDate ||
    !immunization.date ||
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '1y-4d',
    })
  ) {
    return false;
  }

  return (
    pneumococcalDosesBefore(matchedDoses, patient.birthDate, '7m') === 0
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

function laterDate(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const cvxMatch = code.match(/(?:CVX[_:-]?)?(\d{1,3})$/i);
  return cvxMatch?.[1]?.padStart(2, '0');
}

function isPneumococcalImmunization(immunization: ForecastImmunization) {
  return pneumococcalCvxCodes.has(normalizeCvx(immunization.vaccineCode) ?? '');
}
