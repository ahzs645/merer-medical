import {
  ForecastImmunization,
  ForecastPatient,
  IceDataset,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';
import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';

const dtpDiphtheriaTetanusPertussisCvxCodes = new Set([
  '01',
  '20',
  '106',
  '107',
  '115',
]);

export function compareDtpImmunizationsForSeries({
  dataset,
  series,
  a,
  b,
}: {
  dataset: IceDataset;
  series: IceSeriesDefinition;
  a: ForecastImmunization;
  b: ForecastImmunization;
}) {
  if (series.vaccineGroup?.code !== 'DTP') return 0;

  const aPertussis = dtpVaccineContainsPertussis(dataset, a);
  const bPertussis = dtpVaccineContainsPertussis(dataset, b);
  if (aPertussis !== bPertussis) return aPertussis ? -1 : 1;

  return 0;
}

export function isDtpPrimarySeriesDose(
  series: IceSeriesDefinition,
  dose: IceDoseRule,
) {
  return (
    series.vaccineGroup?.code === 'DTP' &&
    dose.doseNumber <= series.numberOfDosesInSeries
  );
}

export function dtpVaccineContainsPertussis(
  dataset: IceDataset,
  immunization: ForecastImmunization,
) {
  return (
    dtpVaccineMetadata(dataset, immunization)?.diseaseImmunity.some(
      (disease) => normalizeDiseaseCode(disease.code) === 'PERTUSSIS',
    ) ?? false
  );
}

export function immunizationBelongsToDtpGroup(
  dataset: IceDataset,
  immunization: ForecastImmunization,
) {
  const diseaseCodes =
    dtpVaccineMetadata(dataset, immunization)?.diseaseImmunity.map((disease) =>
      normalizeDiseaseCode(disease.code),
    ) ?? [];
  return diseaseCodes.includes('DIPHTHERIA') && diseaseCodes.includes('TETANUS');
}

export function dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
  cvx?: string,
) {
  return !!cvx && dtpDiphtheriaTetanusPertussisCvxCodes.has(cvx);
}

export function selectDtpSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  const threeDose = candidates.find(
    (candidate) => candidate.series.id === 'DTP_3_DOSE_SERIES',
  );
  const fiveDose = candidates.find(
    (candidate) => candidate.series.id === 'DTP_5_DOSE_SERIES',
  );
  if (!threeDose || !fiveDose) return undefined;

  const patientAtLeast7 =
    patient?.birthDate &&
    evaluationDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '7y',
    });
  const hasDtpDoseBeforeAge7 =
    !!patient?.birthDate &&
    candidates
      .flatMap((candidate) => [
        ...candidate.matchedDoses,
        ...candidate.invalidDoses,
        ...candidate.acceptedDoses,
      ])
      .some(
        (match) =>
          match.immunization.date &&
          !dateMeetsMinimumDuration({
            startDate: patient.birthDate!,
            endDate: match.immunization.date,
            duration: '7y',
          }),
      );

  if (patientAtLeast7 && !hasDtpDoseBeforeAge7) {
    return markSelected(threeDose, 'DTP_3_DOSE_NO_SHOTS_PRIOR_TO_7');
  }

  return markSelected(fiveDose, 'DTP_5_DOSE_DEFAULT');
}

export function dtpHasCustomCompletion({
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
  if (series.id !== 'DTP_5_DOSE_SERIES' || !patient?.birthDate) return false;

  const validMatches = matchedDoses.filter((match) => match.status === 'valid');
  const dose1 = validMatches.find((match) => match.dose.doseNumber === 1);
  const dose2OrLaterAt4y = validMatches.find(
    (match) =>
      match.dose.doseNumber >= 2 &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '4y',
      }),
  );
  if (
    validMatches.length === 3 &&
    dose1?.immunization.date &&
    dose2OrLaterAt4y &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1.immunization.date,
      duration: '12m',
    }) &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '7y',
    })
  ) {
    return true;
  }

  const dose3 = validMatches.find((match) => match.dose.doseNumber === 3);
  const dose4 = validMatches.find((match) => match.dose.doseNumber === 4);
  return (
    validMatches.length === 4 &&
    !!dose3?.immunization.date &&
    !!dose4?.immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose4.immunization.date,
      duration: '4y',
    }) &&
    dateMeetsMinimumDuration({
      startDate: dose3.immunization.date,
      endDate: dose4.immunization.date,
      duration: '6m-4d',
    })
  );
}

export function dtpThreeDoseSeriesNeedsPertussis({
  series,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  return (
    series.id === 'DTP_3_DOSE_SERIES' &&
    matchedDoses.length >= 3 &&
    !matchedDoses.some((match) =>
      dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
        normalizeCvx(match.immunization.vaccineCode),
      ),
    )
  );
}

export function findSameDayPreferredDtpDose({
  series,
  dose,
  dataset,
  immunization,
  availableImmunizations,
  usedImmunizationIndexes,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  dataset: IceDataset;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
}) {
  if (
    series.vaccineGroup?.code !== 'DTP' ||
    !immunization.date ||
    !isDtpPrimarySeriesDose(series, dose)
  ) {
    return undefined;
  }

  const currentPertussis = dtpVaccineContainsPertussis(dataset, immunization);
  const currentDtp = dtpVaccineMetadata(dataset, immunization);
  if (!currentDtp) return undefined;

  return availableImmunizations.find((candidate, candidateIndex) => {
    if (
      usedImmunizationIndexes.has(candidateIndex) ||
      candidate === immunization ||
      candidate.date !== immunization.date ||
      !isImmunizationAllowedForDose(candidate, dose)
    ) {
      return false;
    }

    const candidateDtp = dtpVaccineMetadata(dataset, candidate);
    if (!candidateDtp) return false;

    const candidatePertussis = dtpVaccineContainsPertussis(dataset, candidate);
    if (candidatePertussis && !currentPertussis) return true;
    if (candidatePertussis !== currentPertussis) return false;

    return (
      compareDtpImmunizationsForSeries({
        dataset,
        series,
        a: candidate,
        b: immunization,
      }) < 0
    );
  });
}

export function evaluateDtpDuplicateSameDay({
  series,
  dose,
  dataset,
  immunization,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  dataset: IceDataset;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'DTP' ||
    !immunization.date ||
    !isDtpPrimarySeriesDose(series, dose)
  ) {
    return undefined;
  }

  const sameDayMatchedPrimary = matchedDoses.find(
    (match) =>
      match.immunization.date === immunization.date &&
      isDtpPrimarySeriesDose(series, match.dose),
  );
  if (!sameDayMatchedPrimary) return undefined;

  const currentPertussis = dtpVaccineContainsPertussis(dataset, immunization);
  const matchedPertussis = dtpVaccineContainsPertussis(
    dataset,
    sameDayMatchedPrimary.immunization,
  );

  if (matchedPertussis || currentPertussis === matchedPertussis) {
    return 'DUPLICATE_SAME_DAY';
  }

  return undefined;
}

export function evaluateDtpCustomConstraints({
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
  const reasons: string[] = [];
  if (!patient?.birthDate || !immunization.date) return reasons;

  const cvx = normalizeCvx(immunization.vaccineCode);
  if (
    series.id === 'DTP_5_DOSE_SERIES' &&
    dose.doseNumber <= 3 &&
    cvx === '115' &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '7y-4d',
    })
  ) {
    reasons.push('INSUFFICIENT_ANTIGEN');
  }

  if (
    isTdImmunization(immunization) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '7y-4d',
    })
  ) {
    reasons.push('BELOW_MINIMUM_AGE_VACCINE');
  }

  return reasons;
}

export function evaluateDtpIntervalConstraint({
  series,
  immunization,
  previousMatch,
  minimumInterval,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  previousMatch: IceSeriesDoseMatch;
  minimumInterval?: string;
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code !== 'DTP' ||
    !minimumInterval ||
    !patient?.birthDate ||
    !immunization.date ||
    !previousMatch.immunization.date ||
    !dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
      normalizeCvx(immunization.vaccineCode),
    ) ||
    !isDtpDiphtheriaTetanusOnlyImmunization(previousMatch.immunization) ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '7y-4d',
    }) ||
    dateMeetsMinimumDuration({
      startDate: previousMatch.immunization.date,
      endDate: immunization.date,
      duration: minimumInterval,
    })
  ) {
    return undefined;
  }

  return 'D_AND_T_INVALID/P_VALID';
}

export function applyDtpThreeDosePertussisCompletion({
  series,
  dataset,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  dataset: IceDataset;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (!dtpThreeDoseSeriesNeedsPertussis({ series, matchedDoses })) return;

  const lastDose = series.doses[series.doses.length - 1];
  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      !isImmunizationAllowedForDose(immunization, lastDose) ||
      !dtpVaccineContainsPertussis(dataset, immunization)
    ) {
      continue;
    }

    usedImmunizationIndexes.add(index);
    matchedDoses.push({
      immunization,
      dose: lastDose,
      status: 'valid',
      reasons: ['PERTUSSIS_COMPLETES_3_DOSE_SERIES'],
    });
    return;
  }
}

export function dtpCustomTargetDoseForImmunization({
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
    series.id !== 'DTP_5_DOSE_SERIES' ||
    dose.doseNumber !== 3 ||
    matchedDoses.length !== 2 ||
    !patient?.birthDate ||
    !immunization.date ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '7y',
    }) ||
    !dtpFiveDoseException1SetupApplies({
      patient,
      matchedDoses,
    })
  ) {
    return undefined;
  }

  return series.doses.find((candidate) => candidate.doseNumber === 4);
}

export function appendDtpPostCompletionDoseMatches({
  series,
  dataset,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  acceptedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dataset: IceDataset;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (!patient?.birthDate) return;

  const lastDose = series.doses[series.doses.length - 1];
  let adolescentTdapRecorded = hasDtpAdolescentTdap({
    patient,
    matchedDoses,
  });

  for (const [index, immunization] of availableImmunizations.entries()) {
    if (
      usedImmunizationIndexes.has(index) ||
      !immunizationBelongsToDtpGroup(dataset, immunization) ||
      !immunization.date ||
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '7y',
      })
    ) {
      continue;
    }

    usedImmunizationIndexes.add(index);
    const priorPertussisDose = latestDtpPertussisDoseBefore({
      patient,
      matchedDoses,
      date: immunization.date,
    });
    if (
      !adolescentTdapRecorded &&
      priorPertussisDose?.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: priorPertussisDose.immunization.date,
        endDate: immunization.date,
        duration: '28d',
      })
    ) {
      acceptedDoses.push({
        immunization,
        dose: lastDose,
        status: 'accepted',
        reasons: ['EXTRA_DOSE'],
      });
      continue;
    }

    if (adolescentTdapRecorded) {
      const sameDayAdolescentTdap = matchedDoses.some(
        (match) =>
          match.immunization.date === immunization.date &&
          match.reasons.includes('ADOLESCENT_TDAP'),
      );
      if (sameDayAdolescentTdap) {
        matchedDoses.push({
          immunization,
          dose: lastDose,
          status: 'valid',
          reasons: [],
        });
        continue;
      }

      if (
        dateMeetsMinimumDuration({
          startDate: patient.birthDate,
          endDate: immunization.date,
          duration: '10y',
        })
      ) {
        matchedDoses.push({
          immunization,
          dose: lastDose,
          status: 'valid',
          reasons: ['RECURRING_TD'],
        });
      } else {
        acceptedDoses.push({
          immunization,
          dose: lastDose,
          status: 'accepted',
          reasons: ['EXTRA_DOSE'],
        });
      }
      continue;
    }

    matchedDoses.push({
      immunization,
      dose: lastDose,
      status: 'valid',
      reasons: ['ADOLESCENT_TDAP'],
    });
    adolescentTdapRecorded = true;
  }
}

export function buildDtpRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status !== 'complete') {
    if (dtpThreeDoseSeriesNeedsPertussis({ series, matchedDoses })) {
      return {
        status: 'recommended',
        reasons: ['DUE'],
        recommendedVaccine: {
          cvx: '115',
          display: 'Tdap',
          preferred: true,
        },
        supplementalText: ['PERTUSSIS_NEEDED'],
      };
    }

    if (!nextDoseForecast) return undefined;

    if (
      dtpSixBySevenRecommendationApplies({
        series,
        patient,
        evaluationDate,
        matchedDoses,
        invalidDoses,
        acceptedDoses,
      })
    ) {
      const age7Date = dateFromIceDuration({
        startDate: patient!.birthDate!,
        duration: '7y',
      });
      return {
        status: 'recommended',
        reasons: ['DUE'],
        recommendedVaccine: {
          cvx: '115',
          display: 'Tdap',
          preferred: true,
        },
        earliestRecommendedDate: age7Date,
        recommendedDate: age7Date,
      };
    }

    const recommendationDate =
      nextDoseForecast.recommendedDate ??
      nextDoseForecast.earliestRecommendedDate ??
      nextDoseForecast.minimumDate;
    const recommendedVaccine = dtpRecommendedVaccineForIncompleteSeries({
      patient,
      evaluationDate,
      recommendationDate,
      matchedDoses,
    });

    return {
      status: 'recommended',
      reasons: recommendedVaccine?.cvx === '09' ? ['ADMINISTER_TDAP_OR_TD'] : ['DUE'],
      ...(recommendedVaccine ? { recommendedVaccine } : {}),
      ...(recommendedVaccine?.cvx === '09'
        ? { supplementalText: ['SUPPLEMENTAL_TEXT_ADMINISTER_TDAP_OR_TD'] }
        : {}),
    };
  }
  if (!patient?.birthDate) return undefined;

  if (hasDtpAdolescentTdap({ patient, matchedDoses })) {
    return {
      status: 'recommended',
      reasons: ['ADMINISTER_TDAP_OR_TD'],
      recommendedVaccine: {
        cvx: '115',
        display: 'Tdap',
        preferred: true,
      },
      supplementalText: ['SUPPLEMENTAL_TEXT_ADMINISTER_TDAP_OR_TD'],
    };
  }

  if (dtpFiveDoseAdolescentTdapExceptionApplies({ series, patient, matchedDoses })) {
    const recommendedDate = dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '7y',
    });
    return {
      status: 'recommended',
      reasons: ['ADOLESCENT_TDAP_NEEDED'],
      recommendedVaccine: {
        cvx: '115',
        display: 'Tdap',
        preferred: true,
      },
      earliestRecommendedDate: recommendedDate,
      recommendedDate,
      overdueDate: recommendedDate,
      supplementalText: ['ADOLESCENT_TDAP'],
    };
  }

  const pertussisAge7To10 = latestDtpPertussisDoseInAgeRange({
    patient,
    matchedDoses,
    minimumAge: '7y',
    maximumAge: '10y',
  });
  if (pertussisAge7To10) {
    const recommendedDate = dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '11y',
    });
    const overdueDate = dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '13y+4w',
    });
    return {
      status: 'recommended',
      reasons: ['ADOLESCENT_TDAP_NEEDED'],
      recommendedVaccine: {
        cvx: '115',
        display: 'Tdap',
        preferred: true,
      },
      earliestRecommendedDate: recommendedDate,
      recommendedDate,
      overdueDate,
      supplementalText: ['ADOLESCENT_TDAP'],
    };
  }

  const nonPertussisDose = latestDtpNonPertussisDose(matchedDoses);
  if (nonPertussisDose?.immunization.date) {
    return {
      status: 'recommended',
      reasons: ['ADOLESCENT_TDAP_NEEDED'],
      recommendedVaccine: {
        cvx: '115',
        display: 'Tdap',
        preferred: true,
      },
      earliestRecommendedDate: nonPertussisDose.immunization.date,
      recommendedDate: nonPertussisDose.immunization.date,
      supplementalText: ['ADOLESCENT_TDAP'],
    };
  }

  const pertussisDose = latestDtpPertussisDoseInAgeRange({
    patient,
    matchedDoses,
    minimumAge: '0d',
  });
  if (pertussisDose?.immunization.date) {
    const recommendedDate = dateFromIceDuration({
      startDate: pertussisDose.immunization.date,
      duration: '6m',
    });
    return {
      status: 'recommended',
      reasons: ['ADOLESCENT_TDAP_NEEDED'],
      recommendedVaccine: {
        cvx: '115',
        display: 'Tdap',
        preferred: true,
      },
      earliestRecommendedDate: recommendedDate,
      recommendedDate,
      supplementalText: ['ADOLESCENT_TDAP'],
    };
  }

  if (series.id !== 'DTP_5_DOSE_SERIES') return undefined;

  return {
    status: 'recommended',
    reasons: ['ADOLESCENT_TDAP_NEEDED'],
    recommendedVaccine: {
      cvx: '115',
      display: 'Tdap',
      preferred: true,
    },
    supplementalText: ['ADOLESCENT_TDAP'],
  };
}

export function evaluateDtpDoseSupplementalText({
  series,
  immunization,
  reasons,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  reasons: string[];
}) {
  if (
    series.id === 'DTP_5_DOSE_SERIES' &&
    reasons.length === 0 &&
    isTdImmunization(immunization)
  ) {
    return ['PERTUSSIS_NEEDED'];
  }

  if (reasons.length === 0 && normalizeCvx(immunization.vaccineCode) === '28') {
    return ['DT_LIMITATIONS'];
  }

  return [];
}

export function applyDtpForecastOverride({
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

  const age7Date = dateFromIceDuration({
    startDate: patient.birthDate,
    duration: '7y',
  });
  const patientAtLeast7 = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: evaluationDate,
    duration: '7y',
  });
  const age7RecommendedVaccine = patientAtLeast7
    ? dtpRecommendedVaccineForIncompleteSeries({
        patient,
        evaluationDate,
        recommendationDate: age7Date,
        matchedDoses,
      })
    : undefined;
  const age7Forecast =
    patientAtLeast7 && age7RecommendedVaccine
      ? {
          ...forecast,
          recommendedVaccine: age7RecommendedVaccine,
          earliestRecommendedDate: age7Date,
          recommendedDate: age7Date,
          overdueDate: age7Date,
        }
      : forecast;

  if (
    series.id !== 'DTP_5_DOSE_SERIES' ||
    forecast.dose.doseNumber !== 3 ||
    matchedDoses.length !== 2 ||
    !patientAtLeast7
  ) {
    return age7Forecast;
  }

  const dose4 = series.doses.find((dose) => dose.doseNumber === 4);
  if (
    !dose4 ||
    !dtpFiveDoseException1SetupApplies({
      patient,
      matchedDoses,
    })
  ) {
    return age7Forecast;
  }

  const replacementForecast: IceNextDoseForecast = {
    dose: dose4,
    recommendedVaccine: age7Forecast.recommendedVaccine,
    absoluteMinimumDate: age7Forecast.absoluteMinimumDate,
    minimumDate: age7Forecast.minimumDate,
    earliestRecommendedDate: age7Forecast.earliestRecommendedDate,
    recommendedDate: age7Forecast.recommendedDate,
    overdueDate: age7Forecast.overdueDate,
  };

  return replacementForecast;
}

function dtpSixBySevenRecommendationApplies({
  series,
  patient,
  evaluationDate,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.id !== 'DTP_5_DOSE_SERIES' ||
    !patient?.birthDate ||
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '7y',
    })
  ) {
    return false;
  }

  const administeredShotDates = new Set(
    [...matchedDoses, ...invalidDoses, ...acceptedDoses]
      .filter((match) => !match.reasons.includes('DUPLICATE_SAME_DAY'))
      .map((match) => `${match.immunization.date ?? ''}:${match.immunization.id ?? ''}`),
  );

  return administeredShotDates.size >= 6;
}

function dtpFiveDoseException1SetupApplies({
  patient,
  matchedDoses,
}: {
  patient: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  const laterDoseAt4y = matchedDoses.find(
    (match) =>
      match.dose.doseNumber >= 2 &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: '4y',
      }),
  );

  return (
    !!dose1?.immunization.date &&
    !!laterDoseAt4y &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate!,
      endDate: dose1.immunization.date,
      duration: '12m',
    })
  );
}

function dtpVaccineMetadata(
  dataset: IceDataset,
  immunization: ForecastImmunization,
) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!cvx) return undefined;
  return dataset.vaccines.find((vaccine) => vaccine.cvx === cvx);
}

function hasDtpAdolescentTdap({
  patient,
  matchedDoses,
}: {
  patient?: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  return !!latestDtpAdolescentTdapDose({ patient, matchedDoses });
}

function latestDtpAdolescentTdapDose({
  patient,
  matchedDoses,
}: {
  patient?: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (!patient?.birthDate) return undefined;

  return matchedDoses
    .filter(
      (match) =>
        match.immunization.date &&
        dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
          normalizeCvx(match.immunization.vaccineCode),
        ) &&
        dateMeetsMinimumDuration({
          startDate: patient.birthDate!,
          endDate: match.immunization.date,
          duration: '10y',
        }),
    )
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
}

function latestDtpPertussisDoseBefore({
  patient,
  matchedDoses,
  date,
}: {
  patient?: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
  date: string;
}) {
  if (!patient?.birthDate) return undefined;

  return matchedDoses
    .filter(
      (match) =>
        match.immunization.date &&
        match.immunization.date <= date &&
        dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
          normalizeCvx(match.immunization.vaccineCode),
        ),
    )
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
}

function hasDtpPertussisDoseAtOrAfterAge({
  patient,
  matchedDoses,
  age,
}: {
  patient?: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
  age: string;
}) {
  if (!patient?.birthDate) return false;

  return matchedDoses.some(
    (match) =>
      match.immunization.date &&
      dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
        normalizeCvx(match.immunization.vaccineCode),
      ) &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate!,
        endDate: match.immunization.date,
        duration: age,
      }),
  );
}

function latestDtpPertussisDoseInAgeRange({
  patient,
  matchedDoses,
  minimumAge,
  maximumAge,
}: {
  patient?: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
  minimumAge: string;
  maximumAge?: string;
}) {
  if (!patient?.birthDate) return undefined;

  return matchedDoses
    .filter((match) => {
      if (
        !match.immunization.date ||
        !dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
          normalizeCvx(match.immunization.vaccineCode),
        ) ||
        !dateMeetsMinimumDuration({
          startDate: patient.birthDate!,
          endDate: match.immunization.date,
          duration: minimumAge,
        })
      ) {
        return false;
      }

      return maximumAge
        ? !dateMeetsMinimumDuration({
            startDate: patient.birthDate!,
            endDate: match.immunization.date,
            duration: maximumAge,
          })
        : true;
    })
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
}

function latestDtpNonPertussisDose(matchedDoses: IceSeriesDoseMatch[]) {
  return matchedDoses
    .filter(
      (match) =>
        match.immunization.date &&
        !dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
          normalizeCvx(match.immunization.vaccineCode),
        ),
    )
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
}

function isTdImmunization(immunization: ForecastImmunization) {
  return ['09', '113', '138', '139', '196'].includes(
    normalizeCvx(immunization.vaccineCode) ?? '',
  );
}

function isDtpDiphtheriaTetanusOnlyImmunization(
  immunization: ForecastImmunization,
) {
  return isTdImmunization(immunization) || normalizeCvx(immunization.vaccineCode) === '28';
}

function dtpFiveDoseAdolescentTdapExceptionApplies({
  series,
  patient,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  patient: ForecastPatient;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (series.id !== 'DTP_5_DOSE_SERIES' || !patient.birthDate) return false;
  const birthDate = patient.birthDate;

  const validPertussisDoses = matchedDoses.filter(
    (match) =>
      match.status === 'valid' &&
      match.immunization.date &&
      dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(
        normalizeCvx(match.immunization.vaccineCode),
      ),
  );
  if (validPertussisDoses.length === 0) return false;
  const hasPertussisAt4yMinus4d = validPertussisDoses.some((match) =>
    dateMeetsMinimumDuration({
      startDate: birthDate,
      endDate: match.immunization.date!,
      duration: '4y-4d',
    }),
  );
  const pertussisBefore7y = validPertussisDoses.filter(
    (match) =>
      !dateMeetsMinimumDuration({
        startDate: birthDate,
        endDate: match.immunization.date!,
        duration: '7y',
      }),
  );

  return !hasPertussisAt4yMinus4d || pertussisBefore7y.length < 4;
}

function dtpRecommendedVaccineForIncompleteSeries({
  patient,
  evaluationDate,
  recommendationDate,
  matchedDoses,
}: {
  patient?: ForecastPatient;
  evaluationDate: string;
  recommendationDate?: string;
  matchedDoses: IceSeriesDoseMatch[];
}): IceNextDoseForecast['recommendedVaccine'] {
  if (!patient?.birthDate || !recommendationDate) return undefined;

  const patientAtLeast7 = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: evaluationDate,
    duration: '7y',
  });
  const recommendationAtLeast7 = dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: recommendationDate,
    duration: '7y',
  });

  if (!patientAtLeast7) {
    return recommendationAtLeast7
      ? { cvx: '115', display: 'Tdap', preferred: true }
      : { cvx: '107', display: 'DTaP, NOS', preferred: true };
  }

  return hasDtpPertussisDoseAtOrAfterAge({
    patient,
    matchedDoses,
    age: '7y',
  })
    ? { cvx: '09', display: 'Td, adult, absorbed', preferred: true }
    : { cvx: '115', display: 'Tdap', preferred: true };
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

function isImmunizationAllowedForDose(
  immunization: ForecastImmunization,
  dose: IceDoseRule,
) {
  const normalizedCode = normalizeCvx(immunization.vaccineCode);
  if (!normalizedCode) return false;
  return dose.vaccines.some((vaccine) => vaccine.cvx === normalizedCode);
}

function normalizeDiseaseCode(disease: string) {
  return disease
    .toUpperCase()
    .replace(/^DISEASE_CONCEPT_/, '')
    .replace(/^SUPPORTED_DISEASE_CONCEPT\./, '')
    .replace(/[-\s]/g, '_');
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const cvxMatch = code.match(/(?:CVX[_:-]?)?(\d{1,3})$/i);
  return cvxMatch?.[1]?.padStart(2, '0');
}
