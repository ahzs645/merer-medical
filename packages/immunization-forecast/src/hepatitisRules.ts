import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDataset,
  IceDoseRule,
  IceIntervalConstraint,
  IceNextDoseForecast,
  IceSeriesRecommendation,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
} from './types.js';

const hepACvxCodes = new Set(['31', '52', '83', '84', '85', '104']);
const hepAPediatricCvxCodes = new Set(['31', '83', '84']);
const hepAAdultCvxCodes = new Set(['52']);

const hepBCvxCodes = new Set([
  '08',
  '42',
  '43',
  '44',
  '45',
  '51',
  '102',
  '104',
  '110',
  '132',
  '146',
  '189',
  '198',
  '220',
]);

export function selectHepASeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
) {
  const twoDose = candidates.find(
    (candidate) => candidate.series.id === 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
  );
  const threeDose = candidates.find(
    (candidate) => candidate.series.id === 'HEP_A_ADULT_3_DOSE_SERIES',
  );
  const fourDose = candidates.find(
    (candidate) => candidate.series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES',
  );

  const completed = [...candidates].filter((candidate) => candidate.status === 'complete');
  if (completed.length > 0) {
    const earliestComplete = completed.sort((a, b) => {
      const aDate = completionDoseDate(a) || '9999-12-31';
      const bDate = completionDoseDate(b) || '9999-12-31';
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return b.requiredDoses - a.requiredDoses;
    })[0];
    return markSelected(
      applyHepASelectionAcceptedBacktracking({
        selected: earliestComplete,
        candidates,
      }),
      'HEPA_COMPLETE_SERIES',
    );
  }

  const allMatches = candidates.flatMap((candidate) => candidate.matchedDoses);
  const firstDose = allMatches
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )[0];
  const firstCvx = firstDose
    ? normalizeCvx(firstDose.immunization.vaccineCode)
    : undefined;
  const firstDoseAdult =
    patient?.birthDate &&
    firstDose?.immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: firstDose.immunization.date,
      duration: '18y-4d',
    });

  if (fourDose && firstCvx === '104') {
    const twinrixDoseCount = allMatches.filter(
      (match) => normalizeCvx(match.immunization.vaccineCode) === '104',
    ).length;
    const dose1 = allMatches.find((match) => match.dose.doseNumber === 1);
    const dose2 = allMatches.find((match) => match.dose.doseNumber === 2);
    if (
      twinrixDoseCount >= 2 &&
      dose1?.immunization.date &&
      dose2?.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: dose1.immunization.date,
        endDate: dose2.immunization.date,
        duration: '7d',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: dose1.immunization.date,
        endDate: dose2.immunization.date,
        duration: '24d',
      })
    ) {
      return markSelected(
        applyHepASelectionAcceptedBacktracking({
          selected: fourDose,
          candidates,
        }),
        'HEPA_ACCELERATED_TWINRIX',
      );
    }
  }

  if (threeDose && firstCvx === '104' && firstDoseAdult) {
    return markSelected(
      applyHepASelectionAcceptedBacktracking({
        selected: threeDose,
        candidates,
      }),
      'HEPA_TWINRIX_ADULT_3_DOSE',
    );
  }

  if (threeDose && threeDose.matchedDoses.length >= 2) {
    return markSelected(
      applyHepASelectionAcceptedBacktracking({
        selected: threeDose,
        candidates,
      }),
      'HEPA_3_DOSE_PROGRESS',
    );
  }

  return markSelected(
    applyHepASelectionAcceptedBacktracking({
      selected:
        twoDose ?? threeDose ?? fourDose ?? [...candidates].sort(compareSeriesForecasts)[0],
      candidates,
    }),
    firstDose ? 'HEPA_DEFAULT_PROGRESS' : 'HEPA_DEFAULT_NO_DOSES',
  );
}

export function selectHepBSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  const child3 = candidates.find(
    (candidate) => candidate.series.id === 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES',
  );
  const adult2 = candidates.find(
    (candidate) => candidate.series.id === 'HEP_B_ADULT_2_DOSE_SERIES',
  );
  const adult3 = candidates.find(
    (candidate) => candidate.series.id === 'HEP_B_ADULT_3_DOSE_SERIES',
  );
  const twinrix3 = candidates.find(
    (candidate) => candidate.series.id === 'HEP_B_3_DOSE_TWINRIX_SERIES',
  );
  const twinrix4 = candidates.find(
    (candidate) => candidate.series.id === 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES',
  );

  const allMatches = candidates.flatMap((candidate) => candidate.matchedDoses);
  const firstDose = allMatches
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )[0];
  const firstCvx = firstDose
    ? normalizeCvx(firstDose.immunization.vaccineCode)
    : undefined;
  const ageReference = firstDose?.immunization.date ?? evaluationDate;
  const adultAtReference =
    patient?.birthDate &&
    ageReference &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: ageReference,
      duration: '19y',
    });

  const completed = [...candidates]
    .filter((candidate) => candidate.status === 'complete')
    .sort((a, b) => {
      const aDate = completionDoseDate(a) || '9999-12-31';
      const bDate = completionDoseDate(b) || '9999-12-31';
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      if (adultAtReference) {
        if (a.series.id === 'HEP_B_ADULT_3_DOSE_SERIES') return -1;
        if (b.series.id === 'HEP_B_ADULT_3_DOSE_SERIES') return 1;
      }
      return b.requiredDoses - a.requiredDoses;
    })[0];
  if (completed) return markSelected(completed, 'HEPB_COMPLETE_SERIES');

  if (firstCvx === '104') {
    const twinrixDoses = (twinrix4?.matchedDoses.length
      ? twinrix4.matchedDoses
      : allMatches
    )
      .filter((match) => normalizeCvx(match.immunization.vaccineCode) === '104')
      .sort((a, b) =>
        (a.immunization.date || '').localeCompare(b.immunization.date || ''),
      );
    if (
      twinrix4 &&
      twinrixDoses.length >= 2 &&
      twinrixDoses[0]?.immunization.date &&
      twinrixDoses[1]?.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: twinrixDoses[0].immunization.date,
        endDate: twinrixDoses[1].immunization.date,
        duration: '7d',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: twinrixDoses[0].immunization.date,
        endDate: twinrixDoses[1].immunization.date,
        duration: '24d',
      })
    ) {
      const twinrixOverride = selectHepBTwinrixOverrideSeries({
        twinrix4,
        child3,
        adult3,
        firstDoseDate: twinrixDoses[0].immunization.date,
        patient,
      });
      if (twinrixOverride) return twinrixOverride;
      return markSelected(twinrix4, 'HEPB_ACCELERATED_TWINRIX');
    }
    if (twinrix3) return markSelected(twinrix3, 'HEPB_TWINRIX_3_DOSE');
  }

  if (firstCvx === '189' && adult2 && firstDose?.immunization.date) {
    const cvx189Selection = selectHepBCvx189Series({
      adult2,
      adult3,
      child3,
      firstDoseDate: firstDose.immunization.date,
      patient,
    });
    if (cvx189Selection) return cvx189Selection;
  }

  if (adultAtReference && adult3) {
    return markSelected(adult3, firstDose ? 'HEPB_ADULT_FIRST_DOSE' : 'HEPB_ADULT_NO_DOSES');
  }

  return markSelected(
    child3 ?? adult3 ?? adult2 ?? twinrix3 ?? twinrix4 ?? [...candidates].sort(compareSeriesForecasts)[0],
    firstDose ? 'HEPB_CHILD_FIRST_DOSE' : 'HEPB_CHILD_NO_DOSES',
  );
}

export function isHepAImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && hepACvxCodes.has(cvx);
}

export function findSameDayPreferredHepADose({
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
    series.vaccineGroup?.code !== 'HEP_A' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return undefined;
  }

  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!cvx || (!hepAAdultCvxCodes.has(cvx) && !hepAPediatricCvxCodes.has(cvx))) {
    return undefined;
  }

  const adultAge = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: immunization.date,
    duration: '19y',
  });
  const preferredSet = adultAge ? hepAAdultCvxCodes : hepAPediatricCvxCodes;
  if (preferredSet.has(cvx)) return undefined;

  return availableImmunizations.find((candidate, index) => {
    const candidateCvx = normalizeCvx(candidate.vaccineCode);
    return (
      !usedImmunizationIndexes.has(index) &&
      candidate.date === immunization.date &&
      !!candidateCvx &&
      preferredSet.has(candidateCvx)
    );
  });
}

export function buildHepARecommendation({
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
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (
    matchedDoses.length === 0 &&
    patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    })
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
    };
  }

  if (!nextDoseForecast) return undefined;

  return {
    status: 'recommended',
    reasons: ['DUE'],
    ...(series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES'
      ? {
          recommendedVaccine: {
            cvx: '104',
            display: 'Hep A-Hep B',
            preferred: true,
          },
        }
      : {}),
    ...(series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
    nextDoseForecast.dose.doseNumber === 4
      ? { supplementalText: ['HEP_A_3DOSE_TWINRIX_ALT_VACCINE'] }
      : {}),
  };
}

export function buildHepBRecommendation({
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
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (
    matchedDoses.length === 0 &&
    patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '60y',
    })
  ) {
    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
    };
  }

  if (!nextDoseForecast) return undefined;

  const recommendedVaccine =
    series.id === 'HEP_B_ADULT_2_DOSE_SERIES'
      ? { cvx: '189', display: 'Hep B, adjuvanted', preferred: true }
      : series.id === 'HEP_B_3_DOSE_TWINRIX_SERIES' ||
          series.id === 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES'
        ? { cvx: '104', display: 'Hep A-Hep B', preferred: true }
        : undefined;

  return {
    status: 'recommended',
    reasons: ['DUE'],
    ...(recommendedVaccine ? { recommendedVaccine } : {}),
    ...(series.id === 'HEP_B_3_DOSE_TWINRIX_SERIES'
      ? { supplementalText: ['HEP_B_3DOSE_TWINRIX_ALT_VACCINE'] }
      : {}),
  };
}

export function applyHepAForecastOverride({
  series,
  forecast,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  const duration =
    series.id === 'HEP_A_ADULT_3_DOSE_SERIES' &&
    forecast.dose.doseNumber === 3
      ? '6m'
      : series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
          forecast.dose.doseNumber === 4
        ? '12m'
        : undefined;
  if (!duration || !dose1?.immunization.date) return forecast;

  const dateFromDose1 = dateFromIceDuration({
    startDate: dose1.immunization.date,
    duration,
  });
  return {
    ...forecast,
    earliestRecommendedDate: latestDate(
      [forecast.earliestRecommendedDate, dateFromDose1].filter(isDefined),
    ),
    recommendedDate: latestDate(
      [forecast.recommendedDate, dateFromDose1].filter(isDefined),
    ),
  };
}

export function applyHepBForecastOverride({
  series,
  forecast,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  const dose2 = matchedDoses.find((match) => match.dose.doseNumber === 2);
  const finalDoseOverride =
    series.id === 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES' &&
    forecast.dose.doseNumber === 3
      ? {
          earliest: dose1?.immunization.date
            ? dateFromIceDuration({
                startDate: dose1.immunization.date,
                duration: '16w',
              })
            : undefined,
          recommended: dose1?.immunization.date
            ? dateFromIceDuration({
                startDate: dose1.immunization.date,
                duration: '112d',
              })
            : undefined,
        }
      : series.id === 'HEP_B_ADULT_3_DOSE_SERIES' &&
          forecast.dose.doseNumber === 3
        ? {
            earliest: dose1?.immunization.date
              ? dateFromIceDuration({
                  startDate: dose1.immunization.date,
                  duration: '112d',
                })
              : undefined,
            recommended: dose1?.immunization.date
              ? dateFromIceDuration({
                  startDate: dose1.immunization.date,
                  duration: '6m',
                })
              : undefined,
          }
        : series.id === 'HEP_B_3_DOSE_TWINRIX_SERIES' &&
            forecast.dose.doseNumber === 3
          ? {
              earliest: dose1?.immunization.date
                ? dateFromIceDuration({
                    startDate: dose1.immunization.date,
                    duration: '6m',
                  })
                : undefined,
              recommended: dose1?.immunization.date
                ? dateFromIceDuration({
                    startDate: dose1.immunization.date,
                    duration: '6m',
                  })
                : undefined,
            }
          : series.id === 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
              forecast.dose.doseNumber === 4
            ? {
                earliest: dose1?.immunization.date
                  ? dateFromIceDuration({
                      startDate: dose1.immunization.date,
                      duration: '12m',
                    })
                  : undefined,
                recommended: dose1?.immunization.date
                  ? dateFromIceDuration({
                      startDate: dose1.immunization.date,
                      duration: '12m',
                    })
                  : undefined,
              }
            : series.id === 'HEP_B_4_DOSE_CHILD_ADOLESCENT_SERIES' &&
                forecast.dose.doseNumber === 4
              ? {
                  earliest: latestDate(
                    [
                      dose1?.immunization.date
                        ? dateFromIceDuration({
                            startDate: dose1.immunization.date,
                            duration: '16w',
                          })
                        : undefined,
                      dose2?.immunization.date
                        ? dateFromIceDuration({
                            startDate: dose2.immunization.date,
                            duration: '56d',
                          })
                        : undefined,
                    ].filter(isDefined),
                  ),
                  recommended: latestDate(
                    [
                      dose1?.immunization.date
                        ? dateFromIceDuration({
                            startDate: dose1.immunization.date,
                            duration: '16w',
                          })
                        : undefined,
                      dose2?.immunization.date
                        ? dateFromIceDuration({
                            startDate: dose2.immunization.date,
                            duration: '56d',
                          })
                        : undefined,
                    ].filter(isDefined),
                  ),
                  overdue: dose2?.immunization.date
                    ? dateFromIceDuration({
                        startDate: dose2.immunization.date,
                        duration: '18m+4w',
                      })
                    : undefined,
                }
              : undefined;

  if (!finalDoseOverride) return forecast;

  return {
    ...forecast,
    earliestRecommendedDate: latestDate(
      [forecast.earliestRecommendedDate, finalDoseOverride.earliest].filter(isDefined),
    ),
    recommendedDate: latestDate(
      [forecast.recommendedDate, finalDoseOverride.recommended].filter(isDefined),
    ),
    overdueDate:
      latestDate([forecast.overdueDate, finalDoseOverride.overdue].filter(isDefined)) ||
      forecast.overdueDate,
  };
}

export function hepAHasCustomCompletion({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.id !== 'HEP_A_ADULT_3_DOSE_SERIES' ||
    matchedDoses.length < 2 ||
    !patient?.birthDate
  ) {
    return false;
  }

  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  const dose2 = matchedDoses.find((match) => match.dose.doseNumber === 2);
  if (!dose1?.immunization.date || !dose2?.immunization.date) return false;

  return (
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1.immunization.date,
      duration: '19y',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose2.immunization.date,
      duration: '19y',
    }) &&
    dateMeetsMinimumDuration({
      startDate: dose1.immunization.date,
      endDate: dose2.immunization.date,
      duration: '6m-4d',
    })
  );
}

export function hepAFinalDoseMeetsDose1Interval({
  series,
  dose,
  immunization,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (!immunization.date) return false;
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  if (!dose1?.immunization.date) return false;

  const duration =
    series.id === 'HEP_A_ADULT_3_DOSE_SERIES' && dose.doseNumber === 3
      ? '6m-4d'
      : series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
          dose.doseNumber === 4
        ? '12m-4d'
        : undefined;
  if (!duration) return false;

  return dateMeetsMinimumDuration({
    startDate: dose1.immunization.date,
    endDate: immunization.date,
    duration,
  });
}

export function isHepBImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && hepBCvxCodes.has(cvx);
}

export function evaluateHepACustomConstraints({
  dataset,
  immunization,
  patient,
}: {
  dataset: IceDataset;
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  const reasons: string[] = [];
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!patient?.birthDate || !immunization.date || !cvx) return reasons;

  const maximumAge = findVaccineMaximumAge(dataset, cvx);
  if (
    maximumAge &&
    immunization.date > dateFromIceDuration({
      startDate: patient.birthDate,
      duration: maximumAge,
    })
  ) {
    reasons.push('ABOVE_MAXIMUM_AGE_VACCINE');
  }

  return reasons;
}

export function evaluateHepBCustomConstraints({
  dataset,
  immunization,
  patient,
}: {
  dataset: IceDataset;
  immunization: ForecastImmunization;
  patient?: ForecastPatient;
}) {
  const reasons: string[] = [];
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!patient?.birthDate || !immunization.date || !cvx) return reasons;

  if (cvx === '08' || cvx === '42') {
    const maximumAge = findVaccineMaximumAge(dataset, cvx);
    if (
      maximumAge &&
      immunization.date > dateFromIceDuration({
        startDate: patient.birthDate,
        duration: maximumAge,
      })
    ) {
      reasons.push('INSUFFICIENT_ANTIGEN');
    }
  }

  return reasons;
}

export function hepBHasCustomCompletion({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (series.vaccineGroup?.code !== 'HEP_B') return false;

  const validHeplisav = matchedDoses
    .filter((match) => normalizeCvx(match.immunization.vaccineCode) === '189')
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    );
  if (
    validHeplisav.some((dose, index) =>
      validHeplisav
        .slice(0, index)
        .some(
          (prior) =>
            prior.immunization.date &&
            dose.immunization.date &&
            dateMeetsMinimumDuration({
              startDate: prior.immunization.date,
              endDate: dose.immunization.date,
              duration: '24d',
            }),
        ),
    )
  ) {
    return true;
  }

  if (
    series.id === 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES' &&
    matchedDoses.length >= 2 &&
    patient?.birthDate
  ) {
    const adultDoses = matchedDoses
      .filter((match) => normalizeCvx(match.immunization.vaccineCode) === '43')
      .sort((a, b) =>
        (a.immunization.date || '').localeCompare(b.immunization.date || ''),
      );
    const [dose1, dose2] = adultDoses;
    if (
      dose1?.immunization.date &&
      dose2?.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: dose1.immunization.date,
        endDate: dose2.immunization.date,
        duration: '4m-4d',
      }) &&
      [dose1, dose2].every(
        (doseMatch) =>
          doseMatch.immunization.date &&
          dateMeetsMinimumDuration({
            startDate: patient.birthDate!,
            endDate: doseMatch.immunization.date,
            duration: '11y',
          }) &&
          !dateMeetsMinimumDuration({
            startDate: patient.birthDate!,
            endDate: doseMatch.immunization.date,
            duration: '16y',
          }),
      )
    ) {
      return true;
    }
  }

  return false;
}

export function hepBFinalDoseMeetsCustomInterval({
  series,
  dose,
  immunization,
  matchedDoses,
  interval,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  interval: IceIntervalConstraint;
}) {
  if (!immunization.date || series.vaccineGroup?.code !== 'HEP_B') return false;
  const duration = hepBFinalDoseIntervalDuration(series, dose, interval);
  if (!duration) return false;
  const fromDoseNumber = interval.fromDoseId === 'dose-2' ? 2 : 1;
  const prior = matchedDoses.find((match) => match.dose.doseNumber === fromDoseNumber);
  return (
    !!prior?.immunization.date &&
    dateMeetsMinimumDuration({
      startDate: prior.immunization.date,
      endDate: immunization.date,
      duration,
    })
  );
}

export function hepBCustomAbsoluteMinimumInterval({
  series,
  dose,
  immunization,
  interval,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  interval: IceIntervalConstraint;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (series.vaccineGroup?.code !== 'HEP_B') return undefined;

  if (
    normalizeCvx(immunization.vaccineCode) === '189' &&
    matchedDoses.some(
      (match) =>
        normalizeCvx(match.immunization.vaccineCode) === '189' &&
        match.immunization.date &&
        immunization.date &&
        dateMeetsMinimumDuration({
          startDate: match.immunization.date,
          endDate: immunization.date,
          duration: '24d',
        }),
    )
  ) {
    return '0d';
  }

  return hepBFinalDoseIntervalDuration(series, dose, interval);
}

export function applyHepBHeplisavPriorInvalidIntervalException({
  series,
  matchedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (series.vaccineGroup?.code !== 'HEP_B') return;

  for (let index = invalidDoses.length - 1; index >= 0; index -= 1) {
    const invalidDose = invalidDoses[index];
    if (
      normalizeCvx(invalidDose.immunization.vaccineCode) !== '189' ||
      !invalidDose.immunization.date ||
      invalidDose.reasons.length !== 1 ||
      invalidDose.reasons[0] !== 'BELOW_ABSOLUTE_MINIMUM_INTERVAL'
    ) {
      continue;
    }

    const laterValidHeplisavDose = matchedDoses.find(
      (match) =>
        normalizeCvx(match.immunization.vaccineCode) === '189' &&
        match.immunization.date &&
        match.immunization.date > invalidDose.immunization.date! &&
        dateMeetsMinimumDuration({
          startDate: invalidDose.immunization.date!,
          endDate: match.immunization.date,
          duration: '24d',
        }),
    );
    if (!laterValidHeplisavDose) continue;

    invalidDoses.splice(index, 1);
    matchedDoses.push({
      ...invalidDose,
      status: 'valid',
      reasons: [],
    });
  }
}

export function applyHepBAdult2DoseNotAllowedReasonCleanup({
  series,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (series.id !== 'HEP_B_ADULT_2_DOSE_SERIES') return;

  const latestEvaluatedDose = [
    ...matchedDoses,
    ...invalidDoses,
    ...acceptedDoses,
  ]
    .filter((match) => match.immunization.date)
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
  if (!latestEvaluatedDose || !invalidDoses.includes(latestEvaluatedDose)) return;

  latestEvaluatedDose.reasons = latestEvaluatedDose.reasons.filter(
    (reason) => reason !== 'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
  );
}

export function applyHepBChild3DoseTo4DoseSwitch({
  series,
  matchedDoses,
  invalidDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
}) {
  if (series.id !== 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES') return;

  for (let index = invalidDoses.length - 1; index >= 0; index -= 1) {
    const invalidDose = invalidDoses[index];
    if (
      invalidDose.dose.doseNumber !== 3 ||
      invalidDose.reasons.length === 0 ||
      invalidDose.reasons.some(
        (reason) =>
          reason !== 'BELOW_ABSOLUTE_MINIMUM_INTERVAL' &&
          reason !== 'BELOW_ABSOLUTE_MINIMUM_AGE',
      )
    ) {
      continue;
    }

    invalidDoses.splice(index, 1);
    matchedDoses.push({
      ...invalidDose,
      status: 'valid',
      reasons: ['EXTRA_DOSE'],
    });
  }
}

function hepBFinalDoseIntervalDuration(
  series: IceSeriesDefinition,
  dose: IceDoseRule,
  interval: IceIntervalConstraint,
) {
  if (
    series.id === 'HEP_B_3_DOSE_TWINRIX_SERIES' &&
    dose.doseNumber === 3 &&
    interval.fromDoseId === 'dose-1'
  ) {
    return '6m-4d';
  }
  if (
    series.id === 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
    dose.doseNumber === 4 &&
    interval.fromDoseId === 'dose-1'
  ) {
    return '12m-4d';
  }
  if (
    series.id === 'HEP_B_3_DOSE_CHILD_ADOLESCENT_SERIES' &&
    dose.doseNumber === 3 &&
    interval.fromDoseId === 'dose-1'
  ) {
    return '108d';
  }
  if (
    series.id === 'HEP_B_4_DOSE_CHILD_ADOLESCENT_SERIES' &&
    dose.doseNumber === 4 &&
    interval.fromDoseId === 'dose-1'
  ) {
    return '108d';
  }
  if (
    series.id === 'HEP_B_4_DOSE_CHILD_ADOLESCENT_SERIES' &&
    dose.doseNumber === 4 &&
    interval.fromDoseId === 'dose-2'
  ) {
    return '52d';
  }
  if (
    series.id === 'HEP_B_ADULT_3_DOSE_SERIES' &&
    dose.doseNumber === 3 &&
    interval.fromDoseId === 'dose-1'
  ) {
    return '16w-4d';
  }
  return undefined;
}

function selectHepBTwinrixOverrideSeries({
  twinrix4,
  child3,
  adult3,
  firstDoseDate,
  patient,
}: {
  twinrix4: IceSeriesForecast;
  child3?: IceSeriesForecast;
  adult3?: IceSeriesForecast;
  firstDoseDate: string;
  patient?: ForecastPatient;
}) {
  if (!patient?.birthDate) return undefined;

  const twinrixLatestDate = latestDoseDate(twinrix4.matchedDoses);
  if (!twinrixLatestDate) return undefined;

  const firstDoseAdult = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: firstDoseDate,
    duration: '19y',
  });
  const comparison = firstDoseAdult ? adult3 : child3;
  if (!comparison) return undefined;

  const comparisonHasLaterDose = comparison.matchedDoses.some(
    (match) => match.immunization.date && match.immunization.date > twinrixLatestDate,
  );
  if (!comparisonHasLaterDose) return undefined;

  if (remainingDoses(comparison) < remainingDoses(twinrix4)) {
    return markSelected(
      applyHepBTwinrixOverrideAcceptedBacktracking({
        selected: comparison,
        twinrix4,
      }),
      firstDoseAdult
        ? 'HEPB_TWINRIX_OVERRIDE_ADULT_3_FEWER_REMAINING'
        : 'HEPB_TWINRIX_OVERRIDE_CHILD_FEWER_REMAINING',
    );
  }

  return undefined;
}

function applyHepBTwinrixOverrideAcceptedBacktracking({
  selected,
  twinrix4,
}: {
  selected: IceSeriesForecast;
  twinrix4: IceSeriesForecast;
}) {
  const twinrixValidDoseDates = new Set(
    twinrix4.matchedDoses
      .filter((match) => normalizeCvx(match.immunization.vaccineCode) === '104')
      .map((match) => match.immunization.date)
      .filter(isDefined),
  );
  if (twinrixValidDoseDates.size === 0) return selected;

  const invalidDoses: IceSeriesDoseMatch[] = [];
  const acceptedDoses = [...selected.acceptedDoses];

  for (const invalidDose of selected.invalidDoses) {
    if (
      invalidDose.immunization.date &&
      twinrixValidDoseDates.has(invalidDose.immunization.date)
    ) {
      acceptedDoses.push({
        ...invalidDose,
        status: 'accepted',
        reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
      });
      continue;
    }

    invalidDoses.push(invalidDose);
  }

  if (invalidDoses.length === selected.invalidDoses.length) return selected;

  return {
    ...selected,
    invalidDoses,
    acceptedDoses,
  };
}

function selectHepBCvx189Series({
  adult2,
  adult3,
  child3,
  firstDoseDate,
  patient,
}: {
  adult2: IceSeriesForecast;
  adult3?: IceSeriesForecast;
  child3?: IceSeriesForecast;
  firstDoseDate: string;
  patient?: ForecastPatient;
}) {
  if (
    !patient?.birthDate ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: firstDoseDate,
      duration: '18y-4d',
    })
  ) {
    return undefined;
  }

  const adult2Progress = adult2.matchedDoses.length;
  const firstDoseAdult = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: firstDoseDate,
    duration: '19y',
  });
  const comparison = firstDoseAdult ? adult3 : child3;

  if (comparison && comparison.matchedDoses.length > adult2Progress) {
    return markSelected(
      comparison,
      firstDoseAdult
        ? 'HEPB_CVX189_ADULT_3_MORE_PROGRESS'
        : 'HEPB_CVX189_CHILD_MORE_PROGRESS',
    );
  }

  return markSelected(
    adult2,
    firstDoseAdult
      ? 'HEPB_CVX189_ADULT_2_MORE_OR_EQUAL_PROGRESS'
      : 'HEPB_CVX189_ADULT_2_MORE_OR_EQUAL_PROGRESS_18_TO_19',
  );
}
export function appendHepBHeplisavAcceptedDoseMatches({
  series,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  const secondHeplisavDate = heplisavCompletionDate(matchedDoses);
  if (!secondHeplisavDate) return;

  const lastDose = series.doses[series.doses.length - 1];
  for (let index = invalidDoses.length - 1; index >= 0; index -= 1) {
    const invalidDose = invalidDoses[index];
    if (
      !isHepBImmunization(invalidDose.immunization) ||
      normalizeCvx(invalidDose.immunization.vaccineCode) === '189' ||
      !invalidDose.immunization.date ||
      invalidDose.immunization.date > secondHeplisavDate
    ) {
      continue;
    }

    invalidDoses.splice(index, 1);
    acceptedDoses.push({
      ...invalidDose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
    });
  }

  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      !isHepBImmunization(immunization) ||
      normalizeCvx(immunization.vaccineCode) === '189' ||
      !immunization.date ||
      immunization.date > secondHeplisavDate
    ) {
      continue;
    }

    usedImmunizationIndexes.add(index);
    acceptedDoses.push({
      immunization,
      dose: lastDose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
    });
  }
}

function heplisavCompletionDate(matchedDoses: IceSeriesDoseMatch[]) {
  const validHeplisav = matchedDoses
    .filter((match) => normalizeCvx(match.immunization.vaccineCode) === '189')
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    );

  for (const [index, dose] of validHeplisav.entries()) {
    const priorDose = validHeplisav.slice(0, index).find(
      (prior) =>
        prior.immunization.date &&
        dose.immunization.date &&
        dateMeetsMinimumDuration({
          startDate: prior.immunization.date,
          endDate: dose.immunization.date,
          duration: '24d',
        }),
    );
    if (priorDose) return dose.immunization.date;
  }

  return undefined;
}


function applyHepASelectionAcceptedBacktracking({
  selected,
  candidates,
}: {
  selected: IceSeriesForecast;
  candidates: IceSeriesForecast[];
}) {
  const selectedDoseDates = new Set(
    selected.matchedDoses
      .map((match) => match.immunization.date)
      .filter(isDefined),
  );
  const validDoseDatesFromUnselectedSeries = new Set(
    candidates
      .filter((candidate) => candidate.series.id !== selected.series.id)
      .flatMap((candidate) => candidate.matchedDoses)
      .map((match) => match.immunization.date)
      .filter(isDefined),
  );

  const invalidDoses: IceSeriesDoseMatch[] = [];
  const acceptedDoses = [...selected.acceptedDoses];

  for (const invalidDose of selected.invalidDoses) {
    const date = invalidDose.immunization.date;
    if (
      date &&
      !selectedDoseDates.has(date) &&
      validDoseDatesFromUnselectedSeries.has(date)
    ) {
      acceptedDoses.push({
        ...invalidDose,
        status: 'accepted',
        reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
      });
      continue;
    }
    invalidDoses.push(invalidDose);
  }

  if (invalidDoses.length === selected.invalidDoses.length) return selected;

  return {
    ...selected,
    invalidDoses,
    acceptedDoses,
  };
}

function completionDoseDate(forecast: IceSeriesForecast) {
  return forecast.matchedDoses.find(
    (match) => match.dose.doseNumber === forecast.series.numberOfDosesInSeries,
  )?.immunization.date;
}

function compareSeriesForecasts(a: IceSeriesForecast, b: IceSeriesForecast) {
  if (a.status !== b.status) return a.status === 'complete' ? -1 : 1;
  if (a.completedDoses !== b.completedDoses) return b.completedDoses - a.completedDoses;
  if (a.invalidDoses.length !== b.invalidDoses.length) {
    return a.invalidDoses.length - b.invalidDoses.length;
  }
  if (a.requiredDoses !== b.requiredDoses) return a.requiredDoses - b.requiredDoses;
  const aFirstDoseDate = firstValidDoseDate(a);
  const bFirstDoseDate = firstValidDoseDate(b);
  if (aFirstDoseDate && bFirstDoseDate && aFirstDoseDate !== bFirstDoseDate) {
    return aFirstDoseDate.localeCompare(bFirstDoseDate);
  }
  return a.requiredDoses - b.requiredDoses;
}

function firstValidDoseDate(forecast: IceSeriesForecast) {
  return forecast.matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
}

function remainingDoses(forecast: IceSeriesForecast) {
  return Math.max(0, forecast.requiredDoses - forecast.matchedDoses.length);
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

function findVaccineMaximumAge(dataset: IceDataset, vaccineCode?: string) {
  const cvx = normalizeCvx(vaccineCode);
  if (!cvx) return undefined;
  return dataset.vaccines.find((vaccine) => vaccine.cvx === cvx)
    ?.validMaximumAgeForUse;
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
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
  const cvxMatch = code.match(/(?:CVX[_:-]?)?(\d{1,3})$/i);
  return cvxMatch?.[1]?.padStart(2, '0');
}
