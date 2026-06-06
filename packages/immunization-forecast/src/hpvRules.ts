import {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDoseMatch,
  IceSeriesDefinition,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';
import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';

export function selectHpvSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  const twoDose = candidates.find(
    (candidate) => candidate.series.id === 'HPV_2_DOSE_SERIES',
  );
  const threeDose = candidates.find(
    (candidate) => candidate.series.id === 'HPV_3_DOSE_SERIES',
  );
  if (!twoDose || !threeDose) return undefined;

  const firstValidDose = [...twoDose.matchedDoses, ...threeDose.matchedDoses]
    .filter((match) => match.dose.doseNumber === 1)
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )[0];
  const firstDoseBefore15 =
    patient?.birthDate &&
    firstValidDose?.immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: firstValidDose.immunization.date,
      duration: '15y',
    });

  if (twoDose.completedDoses >= 2 && firstDoseBefore15) {
    return markSelected(twoDose, 'HPV_2_DOSE_FIRST_DOSE_BEFORE_15');
  }

  if (threeDose.completedDoses >= 2 && !twoDose.completedDoses) {
    return markSelected(threeDose, 'HPV_3_DOSE_VALID_SECOND_DOSE');
  }

  if (twoDose.completedDoses === 1 && firstDoseBefore15) {
    return markSelected(twoDose, 'HPV_2_DOSE_ONE_VALID_DOSE_BEFORE_15');
  }

  if (twoDose.completedDoses === 0 && threeDose.completedDoses === 0) {
    const patientUnder15 = patientAgeUnder15AtEval(patient, evaluationDate);
    return markSelected(
      firstDoseBefore15 || patientUnder15 ? twoDose : threeDose,
      firstDoseBefore15 || patientUnder15
        ? 'HPV_2_DOSE_PATIENT_UNDER_15_NO_DOSES'
        : 'HPV_3_DOSE_DEFAULT',
    );
  }

  return markSelected(threeDose, 'HPV_3_DOSE_DEFAULT');
}

export function buildHpvRecommendation({
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
  if (!patient?.birthDate) return undefined;

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '46y',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['TOO_OLD'],
    };
  }

  if (
    nextDoseForecast?.recommendedDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: nextDoseForecast.recommendedDate,
      duration: '46y',
    })
  ) {
    return {
      status: 'not-recommended',
      reasons: ['TOO_OLD'],
    };
  }

  if (
    completedDoses === 0 &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '27y',
    })
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['CLINICAL_PATIENT_DISCRETION'],
      supplementalText: ['HPV_NOT_ROUTINE_27_THROUGH_45'],
    };
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

export function evaluateHpvAcceptedDose({
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
}): IceSeriesDoseMatch | undefined {
  if (
    series.vaccineGroup?.code === 'HPV' &&
    immunization.vaccineCode === '118' &&
    patientSexIsMale(patient)
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_LICENSED_FOR_MALES'],
    };
  }

  if (
    series.vaccineGroup?.code === 'HPV' &&
    matchedDoses.length < series.numberOfDosesInSeries &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '46y',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['ABOVE_REC_AGE_SERIES'],
    };
  }

  return undefined;
}

export function applyHpvForecastOverride({
  seriesId,
  forecast,
  matchedDoses,
  invalidDoses,
  evaluationDate,
  patient,
}: {
  seriesId: string;
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  evaluationDate: string;
  patient?: ForecastPatient;
}) {
  if (seriesId === 'HPV_2_DOSE_SERIES' && forecast.dose.doseNumber === 2) {
    return applyHpv2DoseForecastOverride({ forecast, invalidDoses });
  }

  if (
    seriesId === 'HPV_3_DOSE_SERIES' &&
    forecast.dose.doseNumber <= 2 &&
    matchedDoses.length <= 1 &&
    patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '15y',
    })
  ) {
    return applyHpv3DoseAge15ForecastOverride({
      forecast,
      matchedDoses,
      patient,
    });
  }

  if (seriesId !== 'HPV_3_DOSE_SERIES' || forecast.dose.doseNumber !== 3) {
    return forecast;
  }

  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  const dose2 = matchedDoses.find((match) => match.dose.doseNumber === 2);
  const dose1Date = dose1?.immunization.date;
  if (!dose1Date) return forecast;

  const dose2Earliest = dose2?.immunization.date
    ? dateFromIceDuration({
        startDate: dose2.immunization.date,
        duration: '12w',
      })
    : undefined;
  const dose1Earliest = dateFromIceDuration({
    startDate: dose1Date,
    duration: '5m',
  });
  const recommendedDate = dateFromIceDuration({
    startDate: dose1Date,
    duration: '6m',
  });
  const firstDoseBefore15 =
    patient?.birthDate &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1Date,
      duration: '15y',
    });
  const overdueDate = dateFromIceDuration({
    startDate: dose1Date,
    duration: firstDoseBefore15 ? '13m+4w' : '7m+4w',
  });

  return {
    ...forecast,
    earliestRecommendedDate: latestDate(
      [dose1Earliest, dose2Earliest].filter(isDefined),
    ),
    recommendedDate: latestDate(
      [recommendedDate, dose2Earliest].filter(isDefined),
    ),
    overdueDate,
  };
}

function applyHpv3DoseAge15ForecastOverride({
  forecast,
  matchedDoses,
  patient,
}: {
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  patient: ForecastPatient;
}) {
  if (forecast.dose.doseNumber === 1 && patient.birthDate) {
    return {
      ...forecast,
      overdueDate: dateFromIceDuration({
        startDate: patient.birthDate,
        duration: '15y',
      }),
    };
  }

  const dose1Date = matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
  if (forecast.dose.doseNumber !== 2 || !dose1Date) return forecast;

  return {
    ...forecast,
    overdueDate: dateFromIceDuration({
      startDate: dose1Date,
      duration: '16w',
    }),
  };
}

function applyHpv2DoseForecastOverride({
  forecast,
  invalidDoses,
}: {
  forecast: IceNextDoseForecast;
  invalidDoses: IceSeriesDoseMatch[];
}) {
  const latestInvalidDose2 = latestDoseDate(
    invalidDoses.filter((match) => match.dose.doseNumber === 2),
  );
  if (!latestInvalidDose2) return forecast;

  const retryDate = dateFromIceDuration({
    startDate: latestInvalidDose2,
    duration: '12w',
  });

  return {
    ...forecast,
    earliestRecommendedDate: retryDate,
    recommendedDate: retryDate,
  };
}

function patientSexIsMale(patient?: ForecastPatient) {
  return ['m', 'male'].includes(patient?.sex?.toLowerCase() ?? '');
}

function patientAgeUnder15AtEval(
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  return (
    !!patient?.birthDate &&
    !!evaluationDate &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '15y',
    })
  );
}

function latestDoseDate(matches: IceSeriesDoseMatch[]) {
  return matches
    .map((match) => match.immunization.date)
    .filter(isDefined)
    .sort((a, b) => b.localeCompare(a))[0];
}

function latestDate(dates: string[]) {
  return [...dates].sort((a, b) => b.localeCompare(a))[0];
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function markSelected(
  forecast: IceSeriesForecast,
  reason: string,
): IceSeriesForecast {
  return {
    ...forecast,
    selected: true,
    selectionReason: reason,
  };
}
