import {
  ForecastImmunization,
  ForecastPatient,
  IceDataset,
  IceDoseRule,
  IceIntervalConstraint,
  IceNextDoseForecast,
  IceSeriesRecommendation,
  IceSelectedSeriesForecast,
  IceSeriesDoseMatch,
  IceSeriesDefinition,
  IceSeriesForecast,
  IceSeriesForecastInput,
} from './types.js';
import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import * as dtpRules from './dtpRules.js';
import * as pneumococcalRules from './pneumococcalRules.js';

const zosterLegacyCvxCodes = new Set(['121', '188']);
const rotavirusCvxCodes = new Set(['74', '116', '119', '122']);
const influenzaNotAllowedInUsCvxCodes = new Set([
  '194',
  '200',
  '201',
  '202',
  '231',
  '331',
  '337',
]);
const earlyAcceptedMmrCvxCodes = new Set(['03', '04', '05']);
const mmrDuplicateCvxCodes = new Set([
  '03',
  '04',
  '05',
  '06',
  '07',
  '38',
  '94',
]);
const mpoxCvxCodes = new Set(['75', '105', '206', '325']);
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
const meningBFhbpCvxCodes = new Set(['162', '316']);
const meningB4cCvxCodes = new Set(['163', '328']);
const meningBCvxCodes = new Set([...meningBFhbpCvxCodes, ...meningB4cCvxCodes]);
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
const rsvAdultOrUnspecifiedCvxCodes = new Set(['303', '304', '305', '314', '326']);
const rsvInfantOrUnspecifiedCvxCodes = new Set(['304', '306', '307', '315']);
const covid19Aug2025CvxCodes = new Set([
  '213',
  '309',
  '310',
  '311',
  '312',
  '313',
  '334',
]);
const dtpDiphtheriaTetanusPertussisCvxCodes = new Set([
  '01',
  '20',
  '106',
  '107',
  '115',
]);

export function evaluateIceSeries(
  input: IceSeriesForecastInput,
): IceSeriesForecast[] {
  const seriesDefinitions = filterSeriesDefinitions(input);

  const forecasts = seriesDefinitions.map((series) =>
    evaluateOneSeries(
      input.dataset,
      series,
      input.immunizations,
      input.patient,
      input.evaluationDate,
    ),
  );
  return applyCrossSeriesForecastRules(forecasts, input.dataset);
}

export function selectIceSeries(
  input: IceSeriesForecastInput & { vaccineGroup: string },
): IceSelectedSeriesForecast | undefined {
  const candidates = evaluateIceSeries(input);
  if (candidates.length === 0) return undefined;

  const selected = selectBestForecast({
    vaccineGroup: input.vaccineGroup,
    candidates,
    patient: input.patient,
    evaluationDate: input.evaluationDate,
  });

  return {
    vaccineGroup: input.vaccineGroup,
    selected,
    candidates,
  };
}

export function selectIceSeriesForGroups(
  input: IceSeriesForecastInput & { vaccineGroups: string[] },
): IceSelectedSeriesForecast[] {
  const selections = input.vaccineGroups
    .map((vaccineGroup) => {
      const candidates = evaluateIceSeries({ ...input, vaccineGroup });
      if (candidates.length === 0) return undefined;

      return {
        vaccineGroup,
        selected: selectBestForecast({
          vaccineGroup,
          candidates,
          patient: input.patient,
          evaluationDate: input.evaluationDate,
        }),
        candidates,
      } satisfies IceSelectedSeriesForecast;
    })
    .filter(isDefined);

  return applyHepAHepBTwinrixSelectionCoordination({
    selections,
    patient: input.patient,
    evaluationDate: input.evaluationDate,
  });
}

function filterSeriesDefinitions(input: IceSeriesForecastInput) {
  const bySeriesId = input.seriesId
    ? input.dataset.seriesDefinitions.filter(
        (series) => series.id === input.seriesId,
      )
    : input.dataset.seriesDefinitions;

  if (!input.vaccineGroup) return bySeriesId;

  return bySeriesId.filter(
    (series) => series.vaccineGroup?.code === input.vaccineGroup,
  );
}

function selectBestForecast({
  vaccineGroup,
  candidates,
  patient,
  evaluationDate,
}: {
  vaccineGroup: string;
  candidates: IceSeriesForecast[];
  patient?: ForecastPatient;
  evaluationDate?: string;
}) {
  if (vaccineGroup === 'HPV') {
    const hpvSelection = selectHpvSeries(candidates, patient, evaluationDate);
    if (hpvSelection) return hpvSelection;
  }

  if (vaccineGroup === 'INFLUENZA_H1N1') {
    const h1n1Selection = selectH1n1Series(candidates, patient, evaluationDate);
    if (h1n1Selection) return h1n1Selection;
  }

  if (vaccineGroup === 'ROTAVIRUS') {
    const rotavirusSelection = selectRotavirusSeries(candidates);
    if (rotavirusSelection) return rotavirusSelection;
  }

  if (vaccineGroup === 'POLIO') {
    const polioSelection = selectPolioSeries(candidates);
    if (polioSelection) return polioSelection;
  }

  if (vaccineGroup === 'HIB') {
    const hibSelection = selectHibSeries(candidates);
    if (hibSelection) return hibSelection;
  }

  if (vaccineGroup === 'DTP') {
    const dtpSelection = dtpRules.selectDtpSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (dtpSelection) return dtpSelection;
  }

  if (vaccineGroup === 'MENINGOCOCCAL_B') {
    const meningBSelection = selectMeningBSeries(candidates);
    if (meningBSelection) return meningBSelection;
  }

  if (vaccineGroup === 'HEP_A') {
    const hepASelection = selectHepASeries(candidates, patient);
    if (hepASelection) return hepASelection;
  }

  if (vaccineGroup === 'HEP_B') {
    const hepBSelection = selectHepBSeries(candidates, patient, evaluationDate);
    if (hepBSelection) return hepBSelection;
  }

  if (vaccineGroup === 'JAPANESE_ENCEPHALITIS') {
    const japaneseEncephalitisSelection = selectJapaneseEncephalitisSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (japaneseEncephalitisSelection) return japaneseEncephalitisSelection;
  }

  if (vaccineGroup === 'MPOX') {
    const mpoxSelection = selectMpoxSeries(candidates);
    if (mpoxSelection) return mpoxSelection;
  }

  if (vaccineGroup === 'INFLUENZA') {
    const influenzaSelection = selectInfluenzaSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (influenzaSelection) return influenzaSelection;
  }

  if (vaccineGroup === 'RSV') {
    const rsvSelection = selectRsvSeries(candidates, patient, evaluationDate);
    if (rsvSelection) return rsvSelection;
  }

  if (vaccineGroup === 'COVID_19') {
    const covidSelection = selectCovid19Series(
      candidates,
      patient,
      evaluationDate,
    );
    if (covidSelection) return covidSelection;
  }

  const selected = [...candidates].sort(compareSeriesForecasts)[0];
  return markSelected(selected, 'BEST_PROGRESS');
}

function applyHepAHepBTwinrixSelectionCoordination({
  selections,
  patient,
  evaluationDate,
}: {
  selections: IceSelectedSeriesForecast[];
  patient?: ForecastPatient;
  evaluationDate?: string;
}) {
  const hepA = selections.find((selection) => selection.vaccineGroup === 'HEP_A');
  const hepB = selections.find((selection) => selection.vaccineGroup === 'HEP_B');
  if (!hepA || !hepB) return selections;

  const hepBSelectedSeriesId = hepB.selected.series.id;
  const hepBTwinrixSelected =
    hepBSelectedSeriesId === 'HEP_B_3_DOSE_TWINRIX_SERIES' ||
    hepBSelectedSeriesId === 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES';
  if (!hepBTwinrixSelected) return selections;

  const hepATwinrixCompatible =
    (hepBSelectedSeriesId === 'HEP_B_3_DOSE_TWINRIX_SERIES' &&
      hepA.selected.series.id === 'HEP_A_ADULT_3_DOSE_SERIES') ||
    (hepBSelectedSeriesId === 'HEP_B_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
      hepA.selected.series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES');
  if (hepATwinrixCompatible) return selections;

  const coordinatedHepB = selectBestForecast({
    vaccineGroup: 'HEP_B',
    candidates: hepB.candidates.filter(
      (candidate) => candidate.series.id !== hepBSelectedSeriesId,
    ),
    patient,
    evaluationDate,
  });

  return selections.map((selection) =>
    selection.vaccineGroup === 'HEP_B'
      ? {
          ...selection,
          selected: coordinatedHepB,
        }
      : selection,
  );
}

function evaluateOneSeries(
  dataset: IceDataset,
  series: IceSeriesDefinition,
  immunizations: ForecastImmunization[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
): IceSeriesForecast {
  const availableImmunizations = immunizations
    .filter((immunization) => immunization.status !== 'not-done')
    .filter((immunization) => immunization.date)
    .sort((a, b) =>
      compareImmunizationsForSeries(dataset, series, a, b),
    );
  const matchedDoses: IceSeriesDoseMatch[] = [];
  const invalidDoses: IceSeriesDoseMatch[] = [];
  const acceptedDoses: IceSeriesDoseMatch[] = [];
  const usedImmunizationIndexes = new Set<number>();

  for (const dose of series.doses.sort((a, b) => a.doseNumber - b.doseNumber)) {
    const match = findNextDoseMatch({
      series,
      dose,
      dataset,
      availableImmunizations,
      usedImmunizationIndexes,
      matchedDoses,
      invalidDoses,
      acceptedDoses,
      patient,
    });

    if (!match) break;

    usedImmunizationIndexes.add(match.index);
    matchedDoses.push(match.match);
    if (polioHasCustomCompletion({ series, matchedDoses, patient })) {
      break;
    }
  }

  applyPolioDuplicateSameDayRule({
    series,
    matchedDoses,
    invalidDoses,
  });
  applyHepBHeplisavPriorInvalidIntervalException({
    series,
    matchedDoses,
    invalidDoses,
  });
  applyHepBAdult2DoseNotAllowedReasonCleanup({
    series,
    matchedDoses,
    invalidDoses,
    acceptedDoses,
  });
  applyHepBChild3DoseTo4DoseSwitch({
    series,
    matchedDoses,
    invalidDoses,
  });
  applyDtpThreeDosePertussisCompletion({
    series,
    dataset,
    availableImmunizations,
    usedImmunizationIndexes,
    matchedDoses,
  });

  const completedDoses = effectiveCompletedDoseCount({
    series,
    matchedDoses,
  });
  const immunityEvidence = findSeriesImmunityEvidence(series, patient);
  const status = isSeriesComplete({
    series,
    completedDoses,
    matchedDoses,
    immunityEvidence,
    patient,
    evaluationDate,
  })
    ? 'complete'
    : 'not-complete';
  const nextDose = series.doses.find(
    (dose) => status !== 'complete' && dose.doseNumber === completedDoses + 1,
  );
  const nextDoseForecast = nextDose
    ? buildNextDoseForecast({
        series,
        dose: nextDose,
        availableImmunizations,
        matchedDoses,
        invalidDoses,
        acceptedDoses,
        evaluationDate,
        patient,
      })
    : undefined;

  appendPostCompletionDoseMatches({
    series,
    dataset,
    status,
    availableImmunizations,
    usedImmunizationIndexes,
    matchedDoses,
    invalidDoses,
    acceptedDoses,
    patient,
  });
  applyMpoxAcceptedDuplicateSameDayRule({
    series,
    matchedDoses,
    acceptedDoses,
    invalidDoses,
  });

  return {
    series,
    status,
    completedDoses,
    requiredDoses: series.numberOfDosesInSeries,
    matchedDoses,
    invalidDoses,
    acceptedDoses,
    immunityEvidence:
      immunityEvidence.length > 0 ? immunityEvidence : undefined,
    nextDose,
    nextDoseForecast,
    recommendation: buildSeriesRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      completedDoses,
      matchedDoses,
      invalidDoses,
      acceptedDoses,
      nextDoseForecast,
      dataset,
      immunityEvidence,
    }),
  };
}

function isSeriesComplete({
  series,
  completedDoses,
  matchedDoses,
  immunityEvidence,
  patient,
  evaluationDate,
}: {
  series: IceSeriesDefinition;
  completedDoses: number;
  matchedDoses: IceSeriesDoseMatch[];
  immunityEvidence: NonNullable<ForecastPatient['immunities']>;
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (immunityEvidence.length > 0) return true;
  if (dtpRules.dtpThreeDoseSeriesNeedsPertussis({ series, matchedDoses })) {
    return false;
  }
  if (completedDoses >= series.numberOfDosesInSeries) return true;

  return (
    mcvHasSingleDoseCompletion({ series, matchedDoses, patient }) ||
    mmrHasSingleDoseAdultCompletion({
      series,
      matchedDoses,
      patient,
      evaluationDate,
    }) ||
    hepAHasCustomCompletion({ series, matchedDoses, patient }) ||
    hepBHasCustomCompletion({ series, matchedDoses, patient }) ||
    polioHasCustomCompletion({ series, matchedDoses, patient }) ||
    pneumococcalRules.pneumococcalHasCustomCompletion({
      series,
      matchedDoses,
      patient,
    }) ||
    dtpRules.dtpHasCustomCompletion({
      series,
      matchedDoses,
      patient,
      evaluationDate,
    })
  );
}

function dtpHasCustomCompletion({
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

function dtpThreeDoseSeriesNeedsPertussis({
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

function effectiveCompletedDoseCount({
  series,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (series.id === 'HIB_4_DOSE_SERIES') {
    return Math.max(0, ...matchedDoses.map((match) => match.dose.doseNumber));
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    return unique(matchedDoses.map((match) => match.dose.doseNumber)).length;
  }

  return matchedDoses.length;
}

function mcvHasSingleDoseCompletion({
  series,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.id !== 'MCV_42_DOSE_SERIES' ||
    series.vaccineGroup?.code !== 'MENINGOCOCCAL_ACWY' ||
    matchedDoses.length !== 1 ||
    !patient?.birthDate
  ) {
    return false;
  }

  const dose1Date = matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
  return (
    !!dose1Date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1Date,
      duration: '16y',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1Date,
      duration: '19y',
    })
  );
}

function hepAHasCustomCompletion({
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

function hepBHasCustomCompletion({
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
        (dose) =>
          dose.immunization.date &&
          dateMeetsMinimumDuration({
            startDate: patient.birthDate!,
            endDate: dose.immunization.date,
            duration: '11y',
          }) &&
          !dateMeetsMinimumDuration({
            startDate: patient.birthDate!,
            endDate: dose.immunization.date,
            duration: '16y',
          }),
      )
    ) {
      return true;
    }
  }

  return false;
}

function mmrHasSingleDoseAdultCompletion({
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
  return (
    series.vaccineGroup?.code === 'MMR' &&
    matchedDoses.length === 1 &&
    !!patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    })
  );
}

function polioHasCustomCompletion({
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

function findSeriesImmunityEvidence(
  series: IceSeriesDefinition,
  patient?: ForecastPatient,
) {
  const requiredDiseases = requiredImmunityDiseasesForSeries(series);
  if (requiredDiseases.length === 0 || !patient?.immunities?.length) return [];

  const normalizedImmunities = patient.immunities.map((immunity) => ({
    ...immunity,
    disease: normalizeDiseaseCode(immunity.disease),
  }));

  const evidence = requiredDiseases.flatMap((disease) => {
    const evidence = normalizedImmunities.find(
      (immunity) => immunity.disease === disease,
    );
    return evidence ? [evidence] : [];
  });
  return evidence.length === requiredDiseases.length ? evidence : [];
}

function requiredImmunityDiseasesForSeries(series: IceSeriesDefinition) {
  if (series.vaccineGroup?.code === 'HEP_A') return ['HEP_A'];
  if (series.vaccineGroup?.code === 'HEP_B') return ['HEP_B'];
  if (series.vaccineGroup?.code === 'VARICELLA') return ['VARICELLA'];
  if (series.vaccineGroup?.code === 'MMR') {
    return ['MEASLES', 'MUMPS', 'RUBELLA'];
  }
  return [];
}

function normalizeDiseaseCode(disease: string) {
  return disease
    .toUpperCase()
    .replace(/^DISEASE_CONCEPT_/, '')
    .replace(/^SUPPORTED_DISEASE_CONCEPT\./, '')
    .replace(/[-\s]/g, '_');
}

function compareImmunizationsForSeries(
  dataset: IceDataset,
  series: IceSeriesDefinition,
  a: ForecastImmunization,
  b: ForecastImmunization,
) {
  const dateCompare = (a.date || '').localeCompare(b.date || '');
  if (dateCompare !== 0) return dateCompare;

  if (series.vaccineGroup?.code !== 'DTP') return 0;

  return dtpRules.compareDtpImmunizationsForSeries({ dataset, series, a, b });
}

function isDtpPrimarySeriesDose(
  series: IceSeriesDefinition,
  dose: IceDoseRule,
) {
  return (
    series.vaccineGroup?.code === 'DTP' &&
    dose.doseNumber <= series.numberOfDosesInSeries
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

function dtpVaccineContainsPertussis(
  dataset: IceDataset,
  immunization: ForecastImmunization,
) {
  return (
    dtpVaccineMetadata(dataset, immunization)?.diseaseImmunity.some(
      (disease) => normalizeDiseaseCode(disease.code) === 'PERTUSSIS',
    ) ?? false
  );
}

function immunizationBelongsToDtpGroup(
  dataset: IceDataset,
  immunization: ForecastImmunization,
) {
  const diseaseCodes =
    dtpVaccineMetadata(dataset, immunization)?.diseaseImmunity.map((disease) =>
      normalizeDiseaseCode(disease.code),
    ) ?? [];
  return diseaseCodes.includes('DIPHTHERIA') && diseaseCodes.includes('TETANUS');
}

function dtpVaccineContainsDiphtheriaTetanusPertussisFromCvx(cvx?: string) {
  return !!cvx && dtpDiphtheriaTetanusPertussisCvxCodes.has(cvx);
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

function selectDtpSeries(
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

function selectHpvSeries(
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

function selectH1n1Series(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  const oneDose = candidates.find(
    (candidate) => candidate.series.id === 'H1N1_1_DOSE_SERIES',
  );
  const twoDose = candidates.find(
    (candidate) => candidate.series.id === 'H1N1_2_DOSE_SERIES',
  );

  if (candidates.length === 1) {
    return markSelected(candidates[0], 'H1N1_ONLY_SERIES');
  }

  if (!oneDose || !twoDose || !patient?.birthDate) return undefined;

  const validDose2 = twoDose.matchedDoses.find(
    (match) => match.dose.doseNumber === 2 && match.immunization.date,
  );
  if (
    validDose2?.immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: validDose2.immunization.date,
      duration: '10y',
    })
  ) {
    return markSelected(twoDose, 'H1N1_2009_TWO_DOSE_VALID_DOSE2_BEFORE_10');
  }

  const patientUnder10 =
    evaluationDate &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '10y',
    });

  return markSelected(
    patientUnder10 ? twoDose : oneDose,
    patientUnder10
      ? 'H1N1_2009_TWO_DOSE_UNDER_10'
      : 'H1N1_2009_ONE_DOSE_10_OR_OLDER',
  );
}

function selectRotavirusSeries(candidates: IceSeriesForecast[]) {
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

function selectPolioSeries(candidates: IceSeriesForecast[]) {
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

function selectHibSeries(candidates: IceSeriesForecast[]) {
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

function selectMeningBSeries(candidates: IceSeriesForecast[]) {
  const completed = [...candidates]
    .filter((candidate) => candidate.status === 'complete')
    .sort(compareSeriesForecasts)[0];
  if (completed) return markSelected(completed, 'MENINGB_COMPLETE_SERIES');

  const firstValidCvx = candidates
    .flatMap((candidate) => candidate.matchedDoses)
    .sort((a, b) =>
      (a.immunization.date || '').localeCompare(b.immunization.date || ''),
    )
    .map((match) => normalizeCvx(match.immunization.vaccineCode))
    .find(isDefined);

  const familyCandidates =
    firstValidCvx && meningBFhbpCvxCodes.has(firstValidCvx)
      ? candidates.filter((candidate) => isMeningBFhbpSeries(candidate.series))
      : firstValidCvx && meningB4cCvxCodes.has(firstValidCvx)
        ? candidates.filter((candidate) => isMeningB4cSeries(candidate.series))
        : [];
  const bestFamilyCandidate = [...familyCandidates].sort(compareSeriesForecasts)[0];
  if (bestFamilyCandidate) {
    return markSelected(
      bestFamilyCandidate,
      meningBFhbpCvxCodes.has(firstValidCvx ?? '')
        ? 'MENINGB_FHBP_PRODUCT'
        : 'MENINGB_4C_PRODUCT',
    );
  }

  const default4c = candidates.find(
    (candidate) => candidate.series.id === 'MEN_B_4_C_2_DOSE_SERIES',
  );
  return markSelected(default4c ?? [...candidates].sort(compareSeriesForecasts)[0], 'MENINGB_4C_2_DOSE_DEFAULT');
}

function selectHepASeries(
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
    const earliestComplete = completed.sort((a, b) =>
      {
        const aDate = completionDoseDate(a) || '9999-12-31';
        const bDate = completionDoseDate(b) || '9999-12-31';
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return b.requiredDoses - a.requiredDoses;
      },
    )[0];
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

function selectHepBSeries(
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

function remainingDoses(forecast: IceSeriesForecast) {
  return Math.max(0, forecast.requiredDoses - forecast.matchedDoses.length);
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

function selectJapaneseEncephalitisSeries(
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

function selectMpoxSeries(candidates: IceSeriesForecast[]) {
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

function selectInfluenzaSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate?: string,
) {
  if (candidates.length === 1) {
    return markSelected(candidates[0], 'INFLUENZA_ONLY_SERIES');
  }

  const defaultSeries = candidates.find(
    (candidate) => candidate.series.id === 'INFLUENZA_2_DOSE_DEFAULT_SERIES',
  );
  if (
    defaultSeries &&
    (!evaluationDate || !evaluationDate.startsWith('2012-'))
  ) {
    return markSelected(defaultSeries, 'INFLUENZA_2_DOSE_DEFAULT_SEASON');
  }

  const oneDose = candidates.find(
    (candidate) => candidate.series.id === 'INFLUENZA_1_DOSE_SERIES',
  );
  const twoDose = candidates.find(
    (candidate) => candidate.series.id === 'INFLUENZA_2_DOSE_SERIES',
  );
  if (!oneDose || !twoDose || !patient?.birthDate || !evaluationDate) {
    return defaultSeries
      ? markSelected(defaultSeries, 'INFLUENZA_2_DOSE_DEFAULT_SEASON')
      : undefined;
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '10y',
    })
  ) {
    return markSelected(oneDose, 'INFLUENZA_1_DOSE_AGE_10_OR_OLDER');
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '9y',
    })
  ) {
    return markSelected(oneDose, 'INFLUENZA_1_DOSE_AGE_9_THROUGH_9');
  }

  const validPriorSeasonDoseCount = countInfluenzaPriorSeasonDoses({
    candidates,
    currentSeasonStartDate: findSeriesSeasonStart(twoDose),
  });
  if (validPriorSeasonDoseCount >= 2) {
    return markSelected(oneDose, 'INFLUENZA_1_DOSE_PRIOR_SEASON_DOSES');
  }

  return markSelected(twoDose, 'INFLUENZA_2_DOSE_UNDER_9');
}

function selectRsvSeries(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  if (candidates.length === 1) {
    return markSelected(candidates[0], 'RSV_ONLY_SERIES');
  }

  const infant = candidates.find((candidate) => candidate.series.id === 'RSV_INFANT_SERIES');
  const adult = candidates.find((candidate) => candidate.series.id === 'RSV_ADULT_SERIES');
  if (!infant || !adult) return undefined;

  const allDoseMatches = [
    ...infant.matchedDoses,
    ...infant.acceptedDoses,
    ...infant.invalidDoses,
    ...adult.matchedDoses,
    ...adult.acceptedDoses,
    ...adult.invalidDoses,
  ];
  const adultAgeDose = allDoseMatches.find(
    (match) =>
      patient?.birthDate &&
      match.immunization.date &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: match.immunization.date,
        duration: '20m',
      }),
  );
  if (adultAgeDose) {
    return markSelected(adult, 'RSV_ADULT_DOSE_20_MONTHS_OR_OLDER');
  }

  const infantAgeDose = allDoseMatches.find(
    (match) =>
      patient?.birthDate &&
      match.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: match.immunization.date,
        duration: '20m',
      }),
  );
  if (infantAgeDose) {
    return markSelected(infant, 'RSV_INFANT_DOSE_UNDER_20_MONTHS');
  }

  if (
    patient?.birthDate &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '20m',
    })
  ) {
    return markSelected(adult, 'RSV_ADULT_PATIENT_20_MONTHS_OR_OLDER');
  }

  return markSelected(infant, 'RSV_INFANT_DEFAULT');
}

function selectCovid19Series(
  candidates: IceSeriesForecast[],
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  const lt2 = candidates.find(
    (candidate) => candidate.series.id === 'COVID_19_AUG_2025_LT_2_SERIES',
  );
  const age2To64 = candidates.find(
    (candidate) =>
      candidate.series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES',
  );
  const gte65 = candidates.find(
    (candidate) => candidate.series.id === 'COVID_19_AUG_2025_GTE_65_SERIES',
  );
  if (!lt2 || !age2To64 || !gte65 || !patient?.birthDate) return undefined;

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '65y',
    })
  ) {
    return markSelected(gte65, 'COVID_19_AUG_2025_AGE_65_OR_OLDER');
  }

  if (
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '2y',
    })
  ) {
    return markSelected(age2To64, 'COVID_19_AUG_2025_AGE_2_TO_64');
  }

  return markSelected(lt2, 'COVID_19_AUG_2025_AGE_UNDER_2');
}

function patientAgeUnder15AtEval(
  patient?: ForecastPatient,
  evaluationDate = new Date().toISOString().split('T')[0],
) {
  if (!patient?.birthDate) return false;
  return !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: evaluationDate,
    duration: '15y',
  });
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

function countInfluenzaPriorSeasonDoses({
  candidates,
  currentSeasonStartDate,
}: {
  candidates: IceSeriesForecast[];
  currentSeasonStartDate?: string;
}) {
  if (!currentSeasonStartDate) return 0;
  return candidates
    .flatMap((candidate) => candidate.matchedDoses)
    .filter(
      (match) =>
        match.immunization.date && match.immunization.date < currentSeasonStartDate,
    ).length;
}

function findSeriesSeasonStart(forecast: IceSeriesForecast) {
  const seasonCode = forecast.series.season?.code;
  const startYear = seasonCode?.match(/^(\d{4})\d{4}_INFLUENZA_SEASON$/)?.[1];
  return startYear ? `${startYear}-07-01` : undefined;
}

function isMeningBImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && meningBCvxCodes.has(cvx);
}

function isMeningBFhbpImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && meningBFhbpCvxCodes.has(cvx);
}

function isMeningB4cImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && meningB4cCvxCodes.has(cvx);
}

function isMeningBFhbpSeries(series: IceSeriesDefinition) {
  return series.id === 'MEN_BF_HBP_2_DOSE_SERIES' || series.id === 'MEN_BF_HBP_3_DOSE_SERIES';
}

function isMeningB4cSeries(series: IceSeriesDefinition) {
  return series.id === 'MEN_B_4_C_2_DOSE_SERIES' || series.id === 'MEN_B_4_C_3_DOSE_SERIES';
}

function isMeningB3DoseSeries(series: IceSeriesDefinition) {
  return series.id === 'MEN_BF_HBP_3_DOSE_SERIES' || series.id === 'MEN_B_4_C_3_DOSE_SERIES';
}

function isHepAImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && hepACvxCodes.has(cvx);
}

function findSameDayPreferredHepADose({
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

function hepAFinalDoseMeetsDose1Interval({
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

function isHepBImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && hepBCvxCodes.has(cvx);
}

function hepBFinalDoseMeetsCustomInterval({
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

function hepBCustomAbsoluteMinimumInterval({
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

function applyHepBHeplisavPriorInvalidIntervalException({
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

function applyHepBAdult2DoseNotAllowedReasonCleanup({
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

function applyHepBChild3DoseTo4DoseSwitch({
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

function findSameDayPreferredMeningBDose({
  series,
  immunization,
  availableImmunizations,
  usedImmunizationIndexes,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
}) {
  if (series.vaccineGroup?.code !== 'MENINGOCOCCAL_B' || !immunization.date) {
    return undefined;
  }
  const immunizationIsFhbp = isMeningBFhbpImmunization(immunization);
  const immunizationIs4c = isMeningB4cImmunization(immunization);
  if (!immunizationIsFhbp && !immunizationIs4c) return undefined;

  if (isMeningB4cSeries(series) && immunizationIsFhbp) {
    return availableImmunizations.find(
      (candidate, index) =>
        !usedImmunizationIndexes.has(index) &&
        candidate.date === immunization.date &&
        isMeningB4cImmunization(candidate),
    );
  }

  if (isMeningBFhbpSeries(series) && immunizationIs4c) {
    return availableImmunizations.find(
      (candidate, index) =>
        !usedImmunizationIndexes.has(index) &&
        candidate.date === immunization.date &&
        isMeningBFhbpImmunization(candidate),
    );
  }

  return undefined;
}

function meningBDose3MeetsDose1Interval({
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
  if (!isMeningB3DoseSeries(series) || dose.doseNumber !== 3 || !immunization.date) {
    return false;
  }
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
  return (
    !!dose1?.immunization.date &&
    dateMeetsMinimumDuration({
      startDate: dose1.immunization.date,
      endDate: immunization.date,
      duration: '6m-4d',
    })
  );
}

function compareSeriesForecasts(a: IceSeriesForecast, b: IceSeriesForecast) {
  if (a.status !== b.status) return a.status === 'complete' ? -1 : 1;
  if (a.completedDoses !== b.completedDoses) {
    return b.completedDoses - a.completedDoses;
  }
  if (a.invalidDoses.length !== b.invalidDoses.length) {
    return a.invalidDoses.length - b.invalidDoses.length;
  }
  return a.requiredDoses - b.requiredDoses;
}

function applyCrossSeriesForecastRules(
  forecasts: IceSeriesForecast[],
  dataset: IceDataset,
) {
  return applyHepATwinrixRecommendationRule(
    applyYellowFeverLiveVirusIntervalRule(forecasts, dataset),
  );
}

function applyYellowFeverLiveVirusIntervalRule(
  forecasts: IceSeriesForecast[],
  dataset: IceDataset,
) {
  const yellowFeverDoseDate = latestDoseDate(
    forecasts
      .filter(
        (forecast) =>
          forecast.series.vaccineGroup?.code === 'YELLOW_FEVER' &&
          forecast.status === 'complete',
      )
      .flatMap((forecast) => forecast.matchedDoses),
  );
  if (!yellowFeverDoseDate) return forecasts;

  const liveCvxCodes = new Set(
    dataset.vaccines
      .filter((vaccine) => vaccine.liveVirusVaccine)
      .map((vaccine) => vaccine.cvx),
  );
  const adjustedEarliestDate = dateFromIceDuration({
    startDate: yellowFeverDoseDate,
    duration: '30d',
  });

  return forecasts.map((forecast) => {
    if (
      forecast.series.vaccineGroup?.code === 'YELLOW_FEVER' ||
      forecast.series.vaccineGroup?.code === 'INFLUENZA' ||
      (forecast.series.id === 'MPOX_2_DOSE_SERIES' &&
        forecast.completedDoses === 1) ||
      !forecast.nextDoseForecast?.earliestRecommendedDate ||
      !forecast.nextDoseForecast.dose.vaccines.some((vaccine) =>
        liveCvxCodes.has(vaccine.cvx),
      ) ||
      dateMeetsMinimumDuration({
        startDate: yellowFeverDoseDate,
        endDate: forecast.nextDoseForecast.earliestRecommendedDate,
        duration: '30d',
      })
    ) {
      return forecast;
    }

    return {
      ...forecast,
      nextDoseForecast: {
        ...forecast.nextDoseForecast,
        earliestRecommendedDate: adjustedEarliestDate,
      },
    };
  });
}

function applyHepATwinrixRecommendationRule(forecasts: IceSeriesForecast[]) {
  const hepBTwinrix = forecasts.find(
    (forecast) =>
      forecast.series.id === 'HEP_B_3_DOSE_TWINRIX_SERIES' &&
      forecast.status !== 'complete' &&
      forecast.nextDoseForecast?.recommendedDate &&
      forecast.recommendation,
  );
  if (!hepBTwinrix?.nextDoseForecast?.recommendedDate) return forecasts;

  return forecasts.map((forecast) => {
    if (
      forecast.series.id !== 'HEP_A_ADULT_3_DOSE_SERIES' ||
      forecast.status === 'complete' ||
      !forecast.nextDoseForecast?.recommendedDate ||
      !forecast.recommendation ||
      forecast.nextDoseForecast.dose.doseNumber !==
        hepBTwinrix.nextDoseForecast?.dose.doseNumber ||
      forecast.nextDoseForecast.recommendedDate !==
        hepBTwinrix.nextDoseForecast.recommendedDate
    ) {
      return forecast;
    }

    return {
      ...forecast,
      recommendation: {
        ...forecast.recommendation,
        recommendedVaccine: {
          cvx: '104',
          display: 'Hep A-Hep B',
          preferred: true,
        },
        supplementalText: unique([
          ...(forecast.recommendation.supplementalText ?? []),
          'HEP_A_3DOSE_TWINRIX_ALT_VACCINE',
        ]),
      },
    };
  });
}

function markSelected(
  forecast: IceSeriesForecast,
  selectionReason: string,
): IceSeriesForecast {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}

function findNextDoseMatch({
  series,
  dose,
  dataset,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  dataset: IceDataset;
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  for (const [index, immunization] of availableImmunizations.entries()) {
    if (usedImmunizationIndexes.has(index)) continue;
    const effectiveDose = customTargetDoseForImmunization({
      series,
      dose,
      immunization,
      matchedDoses,
      patient,
    });
    const sameDaySpecificPolioDose = findSameDaySpecificPolioDose({
      series,
      dose: effectiveDose,
      immunization,
      availableImmunizations,
      usedImmunizationIndexes,
    });
    if (sameDaySpecificPolioDose) {
      usedImmunizationIndexes.add(index);
      invalidDoses.push({
        immunization,
        dose: effectiveDose,
        status: 'invalid',
        reasons: ['DUPLICATE_SAME_DAY'],
      });
      continue;
    }

    const sameDaySpecificHibDose = findSameDaySpecificHibDose({
      series,
      dose: effectiveDose,
      immunization,
      availableImmunizations,
      usedImmunizationIndexes,
    });
    if (sameDaySpecificHibDose) {
      usedImmunizationIndexes.add(index);
      invalidDoses.push({
        immunization,
        dose: effectiveDose,
        status: 'invalid',
        reasons: ['DUPLICATE_SAME_DAY'],
      });
      continue;
    }

    const sameDayPreferredMeningBDose = findSameDayPreferredMeningBDose({
      series,
      immunization,
      availableImmunizations,
      usedImmunizationIndexes,
    });
    if (sameDayPreferredMeningBDose) {
      usedImmunizationIndexes.add(index);
      invalidDoses.push({
        immunization,
        dose: effectiveDose,
        status: 'invalid',
        reasons: ['DUPLICATE_SAME_DAY'],
      });
      continue;
    }

    const sameDayPreferredHepADose = findSameDayPreferredHepADose({
      series,
      immunization,
      availableImmunizations,
      usedImmunizationIndexes,
      patient,
    });
    if (sameDayPreferredHepADose) {
      usedImmunizationIndexes.add(index);
      invalidDoses.push({
        immunization,
        dose: effectiveDose,
        status: 'invalid',
        reasons: ['DUPLICATE_SAME_DAY'],
      });
      continue;
    }

    const sameDayPreferredDtpDose = findSameDayPreferredDtpDose({
      series,
      dose: effectiveDose,
      dataset,
      immunization,
      availableImmunizations,
      usedImmunizationIndexes,
    });
    if (sameDayPreferredDtpDose) {
      usedImmunizationIndexes.add(index);
      invalidDoses.push({
        immunization,
        dose: effectiveDose,
        status: 'invalid',
        reasons: ['DUPLICATE_SAME_DAY'],
      });
      continue;
    }

    if (
      !isImmunizationAllowedForDose(immunization, effectiveDose) &&
      !isHibBoosterVaccineAllowed({
        series,
        dose: effectiveDose,
        immunization,
        matchedDoses,
        patient,
      })
    ) {
      const acceptedMatch = evaluateAcceptedNonAllowedDose({
        series,
        dose: effectiveDose,
        immunization,
        patient,
      });
      if (acceptedMatch) {
        usedImmunizationIndexes.add(index);
        acceptedDoses.push(acceptedMatch);
      }

      if (isRotavirusSeries(series) && isRotavirusImmunization(immunization)) {
        const match = {
          immunization,
          dose,
          status: 'invalid',
          reasons: [],
        } satisfies IceSeriesDoseMatch;
        usedImmunizationIndexes.add(index);
        invalidDoses.push(match);
      }

      const invalidNonAllowedMatch = evaluateInvalidNonAllowedDose({
        series,
        dose: effectiveDose,
        immunization,
      });
      if (invalidNonAllowedMatch) {
        usedImmunizationIndexes.add(index);
        invalidDoses.push(invalidNonAllowedMatch);
      }
      continue;
    }

    const acceptedMatch = evaluateAcceptedDose({
      series,
      dose: effectiveDose,
      dataset,
      immunization,
      matchedDoses,
      patient,
    });

    if (acceptedMatch) {
      usedImmunizationIndexes.add(index);
      acceptedDoses.push(acceptedMatch);
      continue;
    }

    const reasons = evaluateDoseConstraints({
      series,
      immunization,
      dose: effectiveDose,
      matchedDoses,
      invalidDoses,
      acceptedDoses,
      dataset,
      availableImmunizations,
      patient,
    });
    const validReasons =
      reasons.length === 0
        ? evaluateDoseValidReasons({
            series,
            dose: effectiveDose,
            immunization,
            dataset,
            patient,
          })
        : [];
    const supplementalText = evaluateDoseSupplementalText({
      series,
      immunization,
      dose: effectiveDose,
      matchedDoses,
      reasons,
    });

    const match = {
      immunization,
      dose: effectiveDose,
      status: reasons.length > 0 ? 'invalid' : 'valid',
      reasons: reasons.length > 0 ? reasons : validReasons,
      ...(supplementalText.length > 0 ? { supplementalText } : {}),
    } satisfies IceSeriesDoseMatch;

    usedImmunizationIndexes.add(index);

    if (match.status === 'valid') {
      return { index, match };
    }

    invalidDoses.push(match);
  }

  return undefined;
}

function findSameDaySpecificPolioDose({
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

function findSameDaySpecificHibDose({
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

function findSameDayPreferredDtpDose({
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
  return dtpRules.findSameDayPreferredDtpDose({
    series,
    dose,
    dataset,
    immunization,
    availableImmunizations,
    usedImmunizationIndexes,
  });
}

function customTargetDoseForImmunization({
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
    series.id === 'PNEUMOCOCCAL_SERIES' &&
    patient?.birthDate &&
    immunization.date
  ) {
    if (
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '19y',
      })
    ) {
      const adultDoseNumber = Math.min(
        8,
        6 +
          matchedDoses.filter((match) => match.dose.doseNumber >= 6).length,
      );
      return (
        series.doses.find((candidate) => candidate.doseNumber === adultDoseNumber) ??
        dose
      );
    }

    if (
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: '5y',
      })
    ) {
      return series.doses.find((candidate) => candidate.doseNumber === 6) ?? dose;
    }

    return (
      pneumococcalRules.pneumococcalCustomTargetDoseForImmunization({
        series,
        dose,
        immunization,
        matchedDoses,
        patient,
      }) ?? dose
    );
  }

  if (series.vaccineGroup?.code === 'DTP') {
    return (
      dtpRules.dtpCustomTargetDoseForImmunization({
        series,
        dose,
        immunization,
        matchedDoses,
        patient,
      }) ?? dose
    );
  }

  if (
    series.id !== 'HIB_4_DOSE_SERIES' ||
    !patient?.birthDate ||
    !immunization.date
  ) {
    return dose;
  }

  const effectiveDoseNumber = hibEffectiveDoseNumber({
    birthDate: patient.birthDate,
    date: immunization.date,
    matchedDoses,
    fallbackDoseNumber: dose.doseNumber,
    cvx: normalizeCvx(immunization.vaccineCode),
  });
  return (
    series.doses.find((candidate) => candidate.doseNumber === effectiveDoseNumber) ??
    dose
  );
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

function evaluateAcceptedNonAllowedDose({
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
    series.vaccineGroup?.code === 'MPOX' &&
    isMpoxImmunization(immunization)
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
    };
  }

  if (
    series.vaccineGroup?.code === 'MENINGOCOCCAL_B' &&
    isMeningBImmunization(immunization) &&
    ((isMeningBFhbpSeries(series) && isMeningB4cImmunization(immunization)) ||
      (isMeningB4cSeries(series) && isMeningBFhbpImmunization(immunization)))
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN'],
    };
  }

  const pneumococcalMatch =
    pneumococcalRules.evaluatePneumococcalAcceptedNonAllowedDose({
      series,
      dose,
      immunization,
      patient,
    });
  if (pneumococcalMatch) return pneumococcalMatch;

  return undefined;
}

function evaluateInvalidNonAllowedDose({
  series,
  dose,
  immunization,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
}): IceSeriesDoseMatch | undefined {
  if (
    series.id === 'POLIO_4_DOSE_SERIES' &&
    normalizeCvx(immunization.vaccineCode) === '324'
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    };
  }

  if (series.vaccineGroup?.code === 'HIB' && isHibImmunization(immunization)) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'],
    };
  }

  if (
    series.id === 'HEP_B_ADULT_2_DOSE_SERIES' &&
    isHepBImmunization(immunization)
  ) {
    return {
      immunization,
      dose,
      status: 'invalid',
      reasons: ['VACCINE_NOT_ALLOWED_FOR_THIS_DOSE'],
    };
  }

  const pneumococcalMatch =
    pneumococcalRules.evaluatePneumococcalInvalidNonAllowedDose({
      series,
      dose,
      immunization,
    });
  if (pneumococcalMatch) return pneumococcalMatch;

  return undefined;
}

function appendPostCompletionDoseMatches({
  series,
  dataset,
  status,
  availableImmunizations,
  usedImmunizationIndexes,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dataset: IceDataset;
  status: IceSeriesForecast['status'];
  availableImmunizations: ForecastImmunization[];
  usedImmunizationIndexes: Set<number>;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (series.vaccineGroup?.code === 'POLIO' && status === 'complete') {
    appendPolioBoosterDoseMatches({
      series,
      availableImmunizations,
      usedImmunizationIndexes,
      matchedDoses,
      acceptedDoses,
    });
    return;
  }

  if (series.vaccineGroup?.code === 'HEP_B' && status === 'complete') {
    appendHepBHeplisavAcceptedDoseMatches({
      series,
      availableImmunizations,
      usedImmunizationIndexes,
      matchedDoses,
      invalidDoses,
      acceptedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'DTP' && status === 'complete') {
    dtpRules.appendDtpPostCompletionDoseMatches({
      series,
      dataset,
      availableImmunizations,
      usedImmunizationIndexes,
      matchedDoses,
      acceptedDoses,
      patient,
    });
  }

  if (series.id === 'PNEUMOCOCCAL_SERIES' && status === 'complete') {
    pneumococcalRules.appendPneumococcalPostCompletionDoseMatches({
      series,
      availableImmunizations,
      usedImmunizationIndexes,
      acceptedDoses,
      patient,
    });
  }

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

function appendPneumococcalPostCompletionDoseMatches({
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

function appendDtpPostCompletionDoseMatches({
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

function applyDtpThreeDosePertussisCompletion({
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
  dtpRules.applyDtpThreeDosePertussisCompletion({
    series,
    dataset,
    availableImmunizations,
    usedImmunizationIndexes,
    matchedDoses,
  });
}

function appendHepBHeplisavAcceptedDoseMatches({
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
    if (
      validHeplisav.slice(0, index).some(
        (prior) =>
          prior.immunization.date &&
          dose.immunization.date &&
          dateMeetsMinimumDuration({
            startDate: prior.immunization.date,
            endDate: dose.immunization.date,
            duration: '24d',
          }),
      )
    ) {
      return dose.immunization.date;
    }
  }

  return undefined;
}

function appendPolioBoosterDoseMatches({
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

function applyMpoxAcceptedDuplicateSameDayRule({
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

function applyPolioDuplicateSameDayRule({
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

function evaluateAcceptedDose({
  series,
  dose,
  dataset,
  immunization,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  dataset: IceDataset;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  if (
    series.vaccineGroup?.code === 'MMR' &&
    dose.doseNumber === 1 &&
    patient?.birthDate &&
    immunization.date &&
    dose.age?.absoluteMinimumAge &&
    earlyAcceptedMmrCvxCodes.has(
      normalizeCvx(immunization.vaccineCode) ?? '',
    ) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: dose.age.absoluteMinimumAge,
    }) &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '6m-4d',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

  if (
    series.vaccineGroup?.code === 'MMR' &&
    dose.doseNumber === 2 &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '19y',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['EXTRA_DOSE'],
    };
  }

  if (
    isRotavirusSeries(series) &&
    patient?.birthDate &&
    immunization.date &&
    dateIsAfterIceDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '8m',
    })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['ABOVE_REC_AGE_SERIES'],
    };
  }

  if (
    series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY' &&
    dose.doseNumber === 1 &&
    patient?.birthDate &&
    immunization.date &&
    dose.age?.absoluteMinimumAge
  ) {
    const vaccineMinimumAge = findVaccineMinimumAge(
      dataset,
      immunization.vaccineCode,
    );
    if (
      vaccineMinimumAge &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: dose.age.absoluteMinimumAge,
      }) &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: immunization.date,
        duration: vaccineMinimumAge,
      })
    ) {
      return {
        immunization,
        dose,
        status: 'accepted',
        reasons: ['BELOW_REC_AGE_SERIES'],
      };
    }
  }

  if (
    series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '22y',
    }) &&
    !mcvHasSingleDoseCompletion({ series, matchedDoses, patient })
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['ABOVE_REC_AGE_SERIES'],
    };
  }

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

  if (
    series.vaccineGroup?.code === 'RSV' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '8m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '50y',
    }) &&
    !rsvVaccineNotYetAvailableReason(immunization)
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['OUTSIDE_ROUTINE_SERIES'],
    };
  }

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
      status: 'accepted',
      reasons: ['ABOVE_REC_AGE_SERIES'],
    };
  }

  if (
    series.vaccineGroup?.code === 'ZOSTER' &&
    zosterLegacyCvxCodes.has(normalizeCvx(immunization.vaccineCode) ?? '')
  ) {
    return {
      immunization,
      dose,
      status: 'accepted',
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    };
  }

  if (series.id === 'PNEUMOCOCCAL_SERIES') {
    const pneumococcalMatch = pneumococcalRules.evaluatePneumococcalAcceptedDose({
      immunization,
      dose,
      matchedDoses,
      patient,
    });
    if (pneumococcalMatch) return pneumococcalMatch;
  }

  return undefined;
}

function findVaccineMinimumAge(dataset: IceDataset, vaccineCode?: string) {
  const cvx = normalizeCvx(vaccineCode);
  if (!cvx) return undefined;
  return dataset.vaccines.find((vaccine) => vaccine.cvx === cvx)
    ?.validMinimumAgeForUse;
}

function findVaccineMaximumAge(dataset: IceDataset, vaccineCode?: string) {
  const cvx = normalizeCvx(vaccineCode);
  if (!cvx) return undefined;
  return dataset.vaccines.find((vaccine) => vaccine.cvx === cvx)
    ?.validMaximumAgeForUse;
}

function dateFallsWithinSeriesSeason({
  dataset,
  series,
  date,
}: {
  dataset: IceDataset;
  series: IceSeriesDefinition;
  date: string;
}) {
  const seasonRange = influenzaSeasonDateRange(dataset, series, date);
  if (!seasonRange?.startDate || !seasonRange.endDate) return true;
  return date >= seasonRange.startDate && date <= seasonRange.endDate;
}

function findSeriesSeason(dataset: IceDataset, series: IceSeriesDefinition) {
  if (!series.season?.code) return undefined;
  return dataset.seasons.find((season) => season.code === series.season?.code);
}

function influenzaSeasonDateRange(
  dataset: IceDataset,
  series: IceSeriesDefinition,
  dateHint?: string,
) {
  const season = findSeriesSeason(dataset, series);
  if (!season) return undefined;
  if (season.startDate && season.endDate) {
    return {
      startDate: season.startDate,
      endDate: season.endDate,
    };
  }
  if (
    !dateHint ||
    !season.defaultStartMonthAndDay ||
    !season.defaultStopMonthAndDay
  ) {
    return undefined;
  }

  const year = Number(dateHint.slice(0, 4));
  const startThisYear = `${year}-${season.defaultStartMonthAndDay}`;
  const endThisSeasonYear =
    season.defaultStopMonthAndDay < season.defaultStartMonthAndDay
      ? year + 1
      : year;
  const endThisSeason = `${endThisSeasonYear}-${season.defaultStopMonthAndDay}`;
  if (dateHint >= startThisYear && dateHint <= endThisSeason) {
    return {
      startDate: startThisYear,
      endDate: endThisSeason,
    };
  }

  const previousStartYear = year - 1;
  return {
    startDate: `${previousStartYear}-${season.defaultStartMonthAndDay}`,
    endDate: `${year}-${season.defaultStopMonthAndDay}`,
  };
}

function influenzaSeasonEndDate(series: IceSeriesDefinition, dateHint?: string) {
  const seasonCode = series.season?.code;
  const explicitStartYear = seasonCode?.match(
    /^(\d{4})(\d{4})_INFLUENZA_SEASON$/,
  );
  if (explicitStartYear) return `${explicitStartYear[2]}-06-30`;

  if (seasonCode !== 'DEFAULT_INFLUENZA_SEASON' || !dateHint) {
    return undefined;
  }

  const year = Number(dateHint.slice(0, 4));
  const currentSeasonStart = `${year}-07-01`;
  return dateHint >= currentSeasonStart ? `${year + 1}-06-30` : `${year}-06-30`;
}

function evaluateRotavirusDuplicateSameDay({
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

function evaluateMpoxDuplicateSameDay({
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

function evaluateDtpDuplicateSameDay({
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

function evaluateMmrDuplicateSameDay({
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
      .filter((cvx) => mmrDuplicateCvxCodes.has(cvx)),
  );
  if (sameDayCvxCodes.size < 2) return undefined;

  if (sameDayCvxCodes.has('94')) {
    return currentCvx === '94' ? undefined : 'DUPLICATE_SAME_DAY';
  }

  if (sameDayCvxCodes.has('03')) {
    return currentCvx === '03' ? undefined : 'DUPLICATE_SAME_DAY';
  }

  return undefined;
}

function isMmrLiveVirusConflict({
  immunization,
  matchedDoses,
}: {
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (normalizeCvx(immunization.vaccineCode) !== '94' || !immunization.date) {
    return false;
  }

  return matchedDoses.some((match) => {
    const previousCvx = normalizeCvx(match.immunization.vaccineCode);
    return (
      match.dose.doseNumber === 1 &&
      !!match.immunization.date &&
      ['03', '21', '94'].includes(previousCvx ?? '') &&
      match.immunization.date < immunization.date! &&
      !dateMeetsMinimumDuration({
        startDate: match.immunization.date,
        endDate: immunization.date!,
        duration: '28d',
      })
    );
  });
}

function isRotavirusSeries(series: IceSeriesDefinition) {
  return series.vaccineGroup?.code === 'ROTAVIRUS';
}

function isRotavirusImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && rotavirusCvxCodes.has(cvx);
}

function isMpoxImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && mpoxCvxCodes.has(cvx);
}

function isHibImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && hibCvxCodes.has(cvx);
}

function isHibBoosterVaccineAllowed({
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

function isPolioImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return !!cvx && polioCvxCodes.has(cvx);
}

function isPolioMissingAntigenImmunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return (
    !!cvx &&
    (polioMissingAntigenCvxCodes.has(cvx) ||
      (polioOpvCvxCodes.has(cvx) &&
        !!immunization.date &&
        immunization.date >= '2016-04-01'))
  );
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

function patientSexIsMale(patient?: ForecastPatient) {
  return ['m', 'male'].includes(patient?.sex?.toLowerCase() ?? '');
}

function evaluateDoseConstraints({
  series,
  immunization,
  dose,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  dataset,
  availableImmunizations,
  patient,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  dataset: IceDataset;
  availableImmunizations: ForecastImmunization[];
  patient?: ForecastPatient;
}) {
  const reasons: string[] = [];
  if (!immunization.date) return ['MISSING_ADMINISTRATION_DATE'];

  if (series.vaccineGroup?.code === 'MMR') {
    const duplicateReason = evaluateMmrDuplicateSameDay({
      immunization,
      availableImmunizations,
    });
    if (duplicateReason) addReason(reasons, duplicateReason);

    if (isMmrLiveVirusConflict({ immunization, matchedDoses })) {
      addReason(reasons, 'TOO_EARLY_LIVE_VIRUS');
    }
  }

  if (isRotavirusSeries(series)) {
    const duplicateReason = evaluateRotavirusDuplicateSameDay({
      immunization,
      availableImmunizations,
    });
    if (duplicateReason) addReason(reasons, duplicateReason);
  }

  if (series.vaccineGroup?.code === 'MPOX') {
    const duplicateReason = evaluateMpoxDuplicateSameDay({
      immunization,
      availableImmunizations,
    });
    if (duplicateReason) addReason(reasons, duplicateReason);
  }

  if (series.vaccineGroup?.code === 'DTP') {
    const duplicateReason = dtpRules.evaluateDtpDuplicateSameDay({
      series,
      dose,
      dataset,
      immunization,
      matchedDoses,
    });
    if (duplicateReason) addReason(reasons, duplicateReason);
    if (duplicateReason) return reasons;
    for (const dtpReason of dtpRules.evaluateDtpCustomConstraints({
      series,
      dose,
      immunization,
      patient,
    })) {
      addReason(reasons, dtpReason);
    }
  }

  if (
    series.vaccineGroup?.code === 'INFLUENZA_H1N1' &&
    !dateFallsWithinSeriesSeason({ dataset, series, date: immunization.date })
  ) {
    addReason(reasons, 'OUTSIDE_FLU_SEASON');
  }

  if (series.vaccineGroup?.code === 'INFLUENZA') {
    const influenzaReason = evaluateInfluenzaCustomConstraint({
      series,
      dose,
      immunization,
      availableImmunizations,
      patient,
      dataset,
    });
    if (influenzaReason) addReason(reasons, influenzaReason);
  }

  if (series.vaccineGroup?.code === 'RSV') {
    const rsvReason = rsvVaccineNotYetAvailableReason(immunization);
    if (rsvReason) addReason(reasons, rsvReason);
  }

  if (series.vaccineGroup?.code === 'POLIO') {
    const polioReason = evaluatePolioCustomConstraint({
      series,
      immunization,
    });
    if (polioReason) addReason(reasons, polioReason);
  }

  if (series.vaccineGroup?.code === 'HIB') {
    for (const hibReason of evaluateHibCustomConstraints({
      series,
      immunization,
      dose,
      matchedDoses,
      patient,
    })) {
      addReason(reasons, hibReason);
    }
  }

  if (series.id === 'PNEUMOCOCCAL_SERIES') {
    for (const pneumococcalReason of pneumococcalRules.evaluatePneumococcalCustomConstraints({
      immunization,
      dose,
      matchedDoses,
      patient,
    })) {
      addReason(reasons, pneumococcalReason);
    }
  }

  if (series.vaccineGroup?.code === 'HEP_A') {
    for (const hepAReason of evaluateHepACustomConstraints({
      dataset,
      immunization,
      patient,
    })) {
      addReason(reasons, hepAReason);
    }
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    for (const hepBReason of evaluateHepBCustomConstraints({
      dataset,
      immunization,
      patient,
    })) {
      addReason(reasons, hepBReason);
    }
  }

  if (
    patient?.birthDate &&
    customAbsoluteMinimumAge({
      series,
      dose,
      immunization,
      patient,
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: customAbsoluteMinimumAge({
        series,
        dose,
        immunization,
        patient,
      })!,
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_AGE');
  }

  for (const interval of dose.intervals) {
    const previousMatch = findMatchedDoseById(matchedDoses, interval);
    if (!previousMatch?.immunization.date) continue;
    if (
      meningBDose3MeetsDose1Interval({
        series,
        dose,
        immunization,
        matchedDoses,
      })
    ) {
      continue;
    }
    if (
      hepAFinalDoseMeetsDose1Interval({
        series,
        dose,
        immunization,
        matchedDoses,
      }) &&
      (interval.fromDoseId === 'dose-2' || interval.fromDoseId === 'dose-3')
    ) {
      continue;
    }
    if (
      hepBFinalDoseMeetsCustomInterval({
        series,
        dose,
        immunization,
        matchedDoses,
        interval,
      })
    ) {
      continue;
    }
    const absoluteMinimumInterval = customAbsoluteMinimumInterval({
      series,
      dose,
      immunization,
      interval,
      matchedDoses,
      patient,
    });
    if (
      absoluteMinimumInterval &&
      !dateMeetsMinimumDuration({
        startDate: previousMatch.immunization.date,
        endDate: immunization.date,
        duration: absoluteMinimumInterval,
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
    const dtpIntervalReason = dtpRules.evaluateDtpIntervalConstraint({
      series,
      immunization,
      previousMatch,
      minimumInterval: interval.minimumInterval,
      patient,
    });
    if (dtpIntervalReason) addReason(reasons, dtpIntervalReason);
  }

  const latestInvalidDose2 = [...invalidDoses]
    .filter(
      (match) =>
        match.dose.doseNumber === 2 &&
        match.immunization.date &&
        match.immunization.date < immunization.date!,
    )
    .sort((a, b) =>
      (b.immunization.date || '').localeCompare(a.immunization.date || ''),
    )[0];
  if (
    series.id === 'HPV_2_DOSE_SERIES' &&
    dose.doseNumber === 2 &&
    latestInvalidDose2?.immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: latestInvalidDose2.immunization.date,
      endDate: immunization.date,
      duration: '12w-4d',
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
  }

  if (
    series.vaccineGroup?.code === 'ZOSTER' &&
    normalizeCvx(immunization.vaccineCode) === '187'
  ) {
    const latestLegacyZosterDose = latestDoseDate(
      acceptedDoses.filter((match) =>
        zosterLegacyCvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
      ),
    );
    if (
      latestLegacyZosterDose &&
      !dateMeetsMinimumDuration({
        startDate: latestLegacyZosterDose,
        endDate: immunization.date,
        duration: '52d',
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
  }

  return reasons;
}

function evaluateHepACustomConstraints({
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

function evaluateHepBCustomConstraints({
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

function evaluateHibCustomConstraints({
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

function evaluatePolioCustomConstraint({
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

function evaluateDoseValidReasons({
  series,
  dose,
  immunization,
  dataset,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  dataset: IceDataset;
  patient?: ForecastPatient;
}) {
  if (
    series.id === 'RSV_INFANT_SERIES' &&
    patient?.birthDate &&
    immunization.date &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '8m',
    }) &&
    !dateFallsWithinSeriesSeason({ dataset, series, date: immunization.date })
  ) {
    return ['OUTSIDE_SEASON'];
  }

  if (
    series.vaccineGroup?.code === 'POLIO' &&
    isPolioExtraDoseBefore4After2009({ series, dose, immunization, patient })
  ) {
    return ['EXTRA_DOSE'];
  }

  return [];
}

function rsvVaccineNotYetAvailableReason(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (!cvx || !immunization.date) return undefined;

  if (
    rsvAdultOrUnspecifiedCvxCodes.has(cvx) &&
    immunization.date < '2023-06-21'
  ) {
    return 'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED';
  }

  if (cvx === '332' && immunization.date < '2025-06-09') {
    return 'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED';
  }

  if (
    rsvInfantOrUnspecifiedCvxCodes.has(cvx) &&
    immunization.date < '2023-08-03'
  ) {
    return 'VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED';
  }

  return undefined;
}

function evaluateInfluenzaCustomConstraint({
  series,
  dose,
  immunization,
  availableImmunizations,
  patient,
  dataset,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  patient?: ForecastPatient;
  dataset: IceDataset;
}) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  if (cvx && influenzaNotAllowedInUsCvxCodes.has(cvx)) {
    return 'VACCINE_NOT_ALLOWED_IN_US';
  }

  if (
    cvx === '161' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '3y',
    })
  ) {
    return 'INSUFFICIENT_ANTIGEN';
  }

  if (
    immunization.date &&
    !dateFallsWithinSeriesSeason({ dataset, series, date: immunization.date })
  ) {
    return 'OUTSIDE_FLU_SEASON';
  }

  const seasonRange = influenzaSeasonDateRange(dataset, series, immunization.date);
  if (!seasonRange?.startDate || dose.doseNumber !== 1 || !immunization.date) {
    return undefined;
  }

  const latestPriorInfluenzaDate = latestDate(
    availableImmunizations
      .filter(
        (candidate) =>
          candidate.date &&
          candidate.date < seasonRange.startDate &&
          isImmunizationAllowedForDose(candidate, dose),
      )
      .map((candidate) => candidate.date)
      .filter(isDefined),
  );
  if (
    latestPriorInfluenzaDate &&
    !dateMeetsMinimumDuration({
      startDate: latestPriorInfluenzaDate,
      endDate: immunization.date,
      duration: '24d',
    })
  ) {
    return 'BELOW_MINIMUM_INTERVAL';
  }

  return undefined;
}

function evaluateDoseSupplementalText({
  series,
  immunization,
  dose,
  matchedDoses,
  reasons,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  matchedDoses: IceSeriesDoseMatch[];
  reasons: string[];
}) {
  if (series.vaccineGroup?.code === 'POLIO') {
    return polioSupplementalText(immunization);
  }

  if (series.vaccineGroup?.code === 'DTP') {
    return dtpRules.evaluateDtpDoseSupplementalText({
      series,
      immunization,
      reasons,
    });
  }

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

function polioSupplementalText(immunization: ForecastImmunization) {
  return normalizeCvx(immunization.vaccineCode) === '89' &&
    !!immunization.date &&
    immunization.date >= '2016-04-01'
    ? ['POLIO_CVX_89']
    : [];
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function customAbsoluteMinimumInterval({
  series,
  dose,
  immunization,
  interval,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  interval: IceIntervalConstraint;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  if (
    series.vaccineGroup?.code === 'VARICELLA' &&
    dose.doseNumber === 2 &&
    interval.fromDoseId === 'dose-1' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '13y',
    })
  ) {
    return '24d';
  }

  if (
    series.id === 'HPV_3_DOSE_SERIES' &&
    dose.doseNumber === 3 &&
    interval.fromDoseId === 'dose-1' &&
    immunization.date &&
    immunization.date < '2016-12-16'
  ) {
    return '16w-4d';
  }

  if (
    series.id === 'JEVC_RISK_2_DOSE_SERIES' &&
    dose.doseNumber === 2 &&
    interval.fromDoseId === 'dose-1' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '18y',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '66y',
    })
  ) {
    return '7d';
  }

  if (
    series.id === 'JEVC_RISK_2_DOSE_ACCELERATED_SERIES' &&
    dose.doseNumber === 2 &&
    interval.fromDoseId === 'dose-1' &&
    patient?.birthDate &&
    immunization.date &&
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: immunization.date,
      duration: '66y',
    })
  ) {
    return '24d';
  }

  if (
    series.vaccineGroup?.code === 'POLIO' &&
    ((series.id === 'POLIO_4_DOSE_SERIES' && dose.doseNumber === 4) ||
      (series.id === 'POLIO_FRACTIONAL_IPV_SERIES' && dose.doseNumber === 5)) &&
    immunization.date &&
    immunization.date < '2009-08-07'
  ) {
    return '24d';
  }

  if (isPolioExtraDoseBefore4After2009({ series, dose, immunization, patient })) {
    return '0d';
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    dose.doseNumber === 2 &&
    interval.fromDoseId === 'dose-1' &&
    immunization.date
  ) {
    return immunization.date < '2024-10-25' ? '1m-4d' : '6m-4d';
  }

  if (
    isMeningB3DoseSeries(series) &&
    dose.doseNumber === 3 &&
    interval.fromDoseId === 'dose-2'
  ) {
    const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
    if (
      dose1?.immunization.date &&
      immunization.date &&
      dateMeetsMinimumDuration({
        startDate: dose1.immunization.date,
        endDate: immunization.date,
        duration: '6m-4d',
      })
    ) {
      return '0d';
    }
  }

  if (
    series.id === 'HEP_A_ADULT_3_DOSE_SERIES' &&
    dose.doseNumber === 3 &&
    interval.fromDoseId === 'dose-2'
  ) {
    const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
    if (
      dose1?.immunization.date &&
      immunization.date &&
      dateMeetsMinimumDuration({
        startDate: dose1.immunization.date,
        endDate: immunization.date,
        duration: '6m-4d',
      })
    ) {
      return '0d';
    }
  }

  if (
    series.id === 'HEP_A_4_DOSE_ACCELERATED_TWINRIX_SERIES' &&
    dose.doseNumber === 4 &&
    interval.fromDoseId === 'dose-3'
  ) {
    const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);
    if (
      dose1?.immunization.date &&
      immunization.date &&
      dateMeetsMinimumDuration({
        startDate: dose1.immunization.date,
        endDate: immunization.date,
        duration: '12m-4d',
      })
    ) {
      return '0d';
    }
  }

  const hepBOverride = hepBCustomAbsoluteMinimumInterval({
    series,
    dose,
    immunization,
    interval,
    matchedDoses,
  });
  if (hepBOverride) return hepBOverride;

  return interval.absoluteMinimumInterval;
}

function customAbsoluteMinimumAge({
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
    series.vaccineGroup?.code === 'POLIO' &&
    ((series.id === 'POLIO_4_DOSE_SERIES' && dose.doseNumber === 4) ||
      (series.id === 'POLIO_FRACTIONAL_IPV_SERIES' && dose.doseNumber === 5)) &&
    immunization.date &&
    immunization.date < '2009-08-07'
  ) {
    return '122d';
  }

  if (isPolioExtraDoseBefore4After2009({ series, dose, immunization, patient })) {
    return series.id === 'POLIO_4_DOSE_SERIES' ? '94d' : '122d';
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    dose.doseNumber === 1 &&
    immunization.date &&
    (immunization.date < '2024-10-25' || isMeningB4cImmunization(immunization))
  ) {
    return '10y-4d';
  }

  if (
    series.id === 'HEP_A_ADULT_3_DOSE_SERIES' &&
    hepAPediatricCvxCodes.has(normalizeCvx(immunization.vaccineCode) ?? '')
  ) {
    return '12m-4d';
  }

  return dose.age?.absoluteMinimumAge;
}

function isPolioExtraDoseBefore4After2009({
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

function findMatchedDoseById(
  matchedDoses: IceSeriesDoseMatch[],
  interval: IceIntervalConstraint,
) {
  return matchedDoses.find((match) => match.dose.id === interval.fromDoseId);
}

function buildSeriesRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  completedDoses,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  nextDoseForecast,
  dataset,
  immunityEvidence,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  completedDoses: number;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
  dataset: IceDataset;
  immunityEvidence: NonNullable<ForecastPatient['immunities']>;
}): IceSeriesRecommendation | undefined {
  if (immunityEvidence.length > 0) {
    return {
      status: 'not-recommended',
      reasons: unique(immunityEvidence.map((evidence) => evidence.reason)),
    };
  }

  if (series.vaccineGroup?.code === 'TYPHOID') {
    return buildTyphoidRecommendation({
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'YELLOW_FEVER') {
    return buildYellowFeverRecommendation({
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'VARICELLA') {
    return buildVaricellaRecommendation({
      patient,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY') {
    return buildMcvRecommendation({
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'INFLUENZA_H1N1') {
    return buildH1n1Recommendation({
      dataset,
      series,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'ROTAVIRUS') {
    return buildRotavirusRecommendation({
      patient,
      evaluationDate,
      status,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MMR') {
    return buildMmrRecommendation({
      patient,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'JAPANESE_ENCEPHALITIS') {
    return buildJapaneseEncephalitisRecommendation({
      patient,
      evaluationDate,
      status,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MPOX') {
    return buildMpoxRecommendation({
      series,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'RSV') {
    return buildRsvRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'POLIO') {
    return buildPolioRecommendation({
      patient,
      evaluationDate,
      status,
      matchedDoses,
      acceptedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'HIB') {
    return buildHibRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_B') {
    return buildMeningBRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      acceptedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_A') {
    return buildHepARecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    return buildHepBRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'DTP') {
    return dtpRules.buildDtpRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      invalidDoses,
      acceptedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'COVID_19') {
    return buildCovid19Recommendation({
      series,
      status,
      nextDoseForecast,
    });
  }

  if (status === 'complete') return undefined;

  if (series.vaccineGroup?.code === 'HPV') {
    return buildHpvRecommendation({
      patient,
      evaluationDate,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'CHOLERA') {
    return buildCholeraRecommendation({
      patient,
      evaluationDate,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (nextDoseForecast) {
    return {
      status: 'recommended',
      reasons: ['DUE'],
    };
  }

  return undefined;
}

function buildH1n1Recommendation({
  dataset,
  series,
  evaluationDate,
  status,
  nextDoseForecast,
}: {
  dataset: IceDataset;
  series: IceSeriesDefinition;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  const season = findSeriesSeason(dataset, series);
  if (
    season?.endDate &&
    (evaluationDate > season.endDate ||
      (!!nextDoseForecast?.recommendedDate &&
        nextDoseForecast.recommendedDate > season.endDate))
  ) {
    return {
      status: 'not-recommended',
      reasons: ['VAC_GROUP_NO_LONGER_REC'],
    };
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

function buildCovid19Recommendation({
  series,
  status,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (series.season?.code !== 'COVID_19_AUG_2025_SEASON') return undefined;

  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (!nextDoseForecast) return undefined;

  return {
    status: 'recommended',
    reasons: ['DUE'],
    recommendedVaccine: nextDoseForecast.recommendedVaccine,
    earliestRecommendedDate: nextDoseForecast.earliestRecommendedDate,
    recommendedDate: nextDoseForecast.recommendedDate,
  };
}

function buildMcvRecommendation({
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
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (!patient?.birthDate) return undefined;

  if (
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

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

function buildRotavirusRecommendation({
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

function buildMmrRecommendation({
  patient,
  status,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE_HIGH_RISK'],
    };
  }

  if (patient?.birthDate && patient.birthDate < '1957-01-01') {
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

function buildVaricellaRecommendation({
  patient,
  status,
  nextDoseForecast,
}: {
  patient?: ForecastPatient;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') return undefined;

  if (patient?.birthDate && patient.birthDate < '1980-01-01') {
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

function buildHpvRecommendation({
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

function buildCholeraRecommendation({
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

function buildTyphoidRecommendation({
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

function buildYellowFeverRecommendation({
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

function buildJapaneseEncephalitisRecommendation({
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

function buildMpoxRecommendation({
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

function buildRsvRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status !== 'complete' && evaluationDate < '2023-06-21') {
    return {
      status: 'not-recommended',
      reasons: ['NOT_SUPPORTED'],
    };
  }

  if (!patient?.birthDate) return undefined;

  const patientUnder8Months = !dateMeetsMinimumDuration({
    startDate: patient.birthDate,
    endDate: evaluationDate,
    duration: '8m',
  });
  const patient8Through19Months =
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '8m',
    }) &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '20m',
    });

  if (series.id === 'RSV_INFANT_SERIES') {
    if (status === 'complete' && patientUnder8Months) {
      return {
        status: 'not-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    if (status === 'complete' && patient8Through19Months) {
      return {
        status: 'conditionally-recommended',
        reasons: ['COMPLETE_HIGH_RISK'],
      };
    }

    const recommendationDate =
      nextDoseForecast?.recommendedDate ?? nextDoseForecast?.earliestRecommendedDate;
    const doseRecommendedAt8Through19Months =
      recommendationDate &&
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: recommendationDate,
        duration: '8m',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: recommendationDate,
        duration: '20m',
      });

    if (status !== 'complete' && (patient8Through19Months || doseRecommendedAt8Through19Months)) {
      return {
        status: 'conditionally-recommended',
        reasons: ['HIGH_RISK'],
      };
    }

    if (nextDoseForecast && patientUnder8Months) {
      return {
        status: 'recommended',
        reasons: ['DUE'],
        supplementalText: ['MATERNAL_UNK_OR_WITHIN_14D_RSV_MAB'],
      };
    }
  }

  if (series.id === 'RSV_ADULT_SERIES' && status !== 'complete') {
    if (
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '50y',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '75y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['HIGH_RISK'],
        supplementalText: ['RSV_75PLUS_50_74_AT_RISK'],
      };
    }

    if (
      dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '20m',
      }) &&
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '50y',
      }) &&
      nextDoseForecast
    ) {
      return {
        status: 'recommended',
        reasons: ['DUE'],
        supplementalText: ['RSV_75PLUS_50_74_AT_RISK_SINGLE_DOSE'],
      };
    }
  }

  return nextDoseForecast
    ? {
        status: 'recommended',
        reasons: ['DUE'],
      }
    : undefined;
}

function buildPolioRecommendation({
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

function buildHibRecommendation({
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

function buildMeningBRecommendation({
  series,
  patient,
  evaluationDate,
  status,
  matchedDoses,
  acceptedDoses,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  patient?: ForecastPatient;
  evaluationDate: string;
  status: IceSeriesForecast['status'];
  matchedDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  nextDoseForecast?: IceNextDoseForecast;
}): IceSeriesRecommendation | undefined {
  if (status === 'complete') {
    return {
      status: 'not-recommended',
      reasons: ['COMPLETE'],
    };
  }

  if (matchedDoses.length === 0 && patient?.birthDate) {
    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '10y',
      })
    ) {
      return {
        status: 'not-recommended',
        reasons: ['BELOW_MINIMUM_AGE_HIGH_RISK_SERIES'],
      };
    }

    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '16y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['HIGH_RISK'],
      };
    }

    if (
      !dateMeetsMinimumDuration({
        startDate: patient.birthDate,
        endDate: evaluationDate,
        duration: '24y',
      })
    ) {
      return {
        status: 'conditionally-recommended',
        reasons: ['CLINICAL_PATIENT_DISCRETION'],
      };
    }

    return {
      status: 'conditionally-recommended',
      reasons: ['HIGH_RISK'],
    };
  }

  if (!nextDoseForecast) return undefined;

  const reasons = ['DUE'];
  const hasFhbp = [...matchedDoses, ...acceptedDoses].some((match) =>
    isMeningBFhbpImmunization(match.immunization),
  );
  const has4c = [...matchedDoses, ...acceptedDoses].some((match) =>
    isMeningB4cImmunization(match.immunization),
  );
  if (hasFhbp && has4c) reasons.push('OTHER_VACCINE_PRODUCT_POSSIBLE');

  return {
    status: 'recommended',
    reasons,
    recommendedVaccine: isMeningB4cSeries(series)
      ? { cvx: '163', display: 'Meningococcal B 4C, OMV', preferred: true }
      : {
          cvx: '162',
          display: 'Meningococcal B FHbp, recombinant',
          preferred: true,
        },
  };
}

function buildHepARecommendation({
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

function buildHepBRecommendation({
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

function buildDtpRecommendation({
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

function buildNextDoseForecast({
  series,
  dose,
  availableImmunizations,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  evaluationDate,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  evaluationDate: string;
  patient?: ForecastPatient;
}): IceNextDoseForecast {
  const candidates: Record<
    Exclude<keyof IceNextDoseForecast, 'dose' | 'recommendedVaccine'>,
    string[]
  > = {
    absoluteMinimumDate: [],
    minimumDate: [],
    earliestRecommendedDate: [],
    recommendedDate: [],
    overdueDate: [],
  };

  if (patient?.birthDate && dose.age) {
    appendCandidate(
      candidates.absoluteMinimumDate,
      patient.birthDate,
      dose.age.absoluteMinimumAge,
    );
    appendCandidate(
      candidates.minimumDate,
      patient.birthDate,
      dose.age.minimumAge,
    );
    appendCandidate(
      candidates.earliestRecommendedDate,
      patient.birthDate,
      dose.age.earliestRecommendedAge,
    );
    appendCandidate(
      candidates.overdueDate,
      patient.birthDate,
      dose.age.latestRecommendedAge,
    );
  }

  for (const interval of dose.intervals) {
    const previousMatch = findMatchedDoseById(matchedDoses, interval);
    const previousDoseDate = previousMatch?.immunization.date;
    if (!previousDoseDate) continue;

    appendCandidate(
      candidates.absoluteMinimumDate,
      previousDoseDate,
      interval.absoluteMinimumInterval,
    );
    appendCandidate(
      candidates.minimumDate,
      previousDoseDate,
      interval.minimumInterval,
    );
    appendCandidate(
      candidates.earliestRecommendedDate,
      previousDoseDate,
      interval.earliestRecommendedInterval,
    );
    appendCandidate(
      candidates.overdueDate,
      previousDoseDate,
      interval.latestRecommendedInterval,
    );
  }

  const forecast = {
    dose,
    absoluteMinimumDate: latestDate(candidates.absoluteMinimumDate),
    minimumDate: latestDate(candidates.minimumDate),
    earliestRecommendedDate: latestDate(candidates.earliestRecommendedDate),
    recommendedDate:
      latestDate(candidates.earliestRecommendedDate) ??
      latestDate(candidates.minimumDate),
    overdueDate: latestDate(candidates.overdueDate),
  };

  return applyCustomNextDoseForecast({
    series,
    forecast,
    availableImmunizations,
    matchedDoses,
    invalidDoses,
    acceptedDoses,
    evaluationDate,
    patient,
  });
}

function applyCustomNextDoseForecast({
  series,
  forecast,
  availableImmunizations,
  matchedDoses,
  invalidDoses,
  acceptedDoses,
  evaluationDate,
  patient,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  evaluationDate: string;
  patient?: ForecastPatient;
}): IceNextDoseForecast {
  if (series.vaccineGroup?.code === 'ZOSTER') {
    return applyZosterForecastOverride({
      forecast,
      availableImmunizations,
      acceptedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'VARICELLA') {
    return applyVaricellaForecastOverride({
      forecast,
      matchedDoses,
      invalidDoses,
      patient,
      evaluationDate,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY') {
    return applyMcvForecastOverride({
      forecast,
      matchedDoses,
      patient,
      evaluationDate,
    });
  }

  if (series.vaccineGroup?.code === 'JAPANESE_ENCEPHALITIS') {
    return applyJapaneseEncephalitisForecastOverride({
      series,
      forecast,
      matchedDoses,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'INFLUENZA') {
    return applyInfluenzaForecastOverride({
      series,
      forecast,
      matchedDoses,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'RSV') {
    return applyRsvForecastOverride({
      series,
      forecast,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'COVID_19') {
    return applyCovid19ForecastOverride({
      series,
      forecast,
      availableImmunizations,
      matchedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'POLIO') {
    return applyPolioForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'HIB') {
    return applyHibForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.id === 'PNEUMOCOCCAL_SERIES') {
    return pneumococcalRules.applyPneumococcalForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'DTP') {
    return dtpRules.applyDtpForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_B') {
    return applyMeningBForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_A') {
    return applyHepAForecastOverride({
      series,
      forecast,
      matchedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    return applyHepBForecastOverride({
      series,
      forecast,
      matchedDoses,
    });
  }

  if (series.id === 'HPV_2_DOSE_SERIES' && forecast.dose.doseNumber === 2) {
    return applyHpv2DoseForecastOverride({ forecast, invalidDoses });
  }

  if (
    series.id === 'HPV_3_DOSE_SERIES' &&
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

  if (series.id !== 'HPV_3_DOSE_SERIES' || forecast.dose.doseNumber !== 3) {
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

function applyRsvForecastOverride({
  series,
  forecast,
  evaluationDate,
  patient,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  evaluationDate: string;
  patient?: ForecastPatient;
}) {
  if (!patient?.birthDate) return forecast;

  if (
    series.id === 'RSV_INFANT_SERIES' &&
    evaluationDate >= '2023-06-21' &&
    evaluationDate < '2023-10-01' &&
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '8m',
    })
  ) {
    return {
      ...forecast,
      earliestRecommendedDate: '2023-10-01',
      recommendedDate: '2023-10-01',
    };
  }

  if (series.id !== 'RSV_ADULT_SERIES') return forecast;

  const adultRecommendedDate = latestDate([
    dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '75y',
    }),
    '2024-06-26',
  ]);

  return {
    ...forecast,
    earliestRecommendedDate: adultRecommendedDate,
    recommendedDate: adultRecommendedDate,
  };
}

function applyCovid19ForecastOverride({
  series,
  forecast,
  availableImmunizations,
  matchedDoses,
}: {
  series: IceSeriesDefinition;
  forecast: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
}) {
  if (series.season?.code !== 'COVID_19_AUG_2025_SEASON') return forecast;

  const priorCovidDoseDate = [...availableImmunizations]
    .filter((immunization) => immunization.date && isCovid19Immunization(immunization))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date;
  const priorDose8Weeks =
    priorCovidDoseDate &&
    dateFromIceDuration({ startDate: priorCovidDoseDate, duration: '8w' });
  const recommendedVaccine =
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES'
      ? series.doses
          .find((dose) => dose.doseNumber === forecast.dose.doseNumber)
          ?.vaccines.find((vaccine) => vaccine.cvx === '311')
      : forecast.recommendedVaccine;

  if (
    (series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES' ||
      series.id === 'COVID_19_AUG_2025_GTE_65_SERIES') &&
    forecast.dose.doseNumber === 1 &&
    matchedDoses.length === 0 &&
    priorDose8Weeks
  ) {
    return {
      ...forecast,
      earliestRecommendedDate: priorDose8Weeks,
      recommendedDate: priorDose8Weeks,
      recommendedVaccine,
    };
  }

  return {
    ...forecast,
    recommendedVaccine,
  };
}

function isCovid19Immunization(immunization: ForecastImmunization) {
  const cvx = normalizeCvx(immunization.vaccineCode);
  return (
    immunization.vaccineName.toLowerCase().includes('covid') ||
    (cvx !== undefined && covid19Aug2025CvxCodes.has(cvx))
  );
}

function applyPolioForecastOverride({
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

function applyHibForecastOverride({
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

function applyDtpForecastOverride({
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
  const dose4 = series.doses.find((dose) => dose.doseNumber === 4);
  if (
    !dose4 ||
    !dose1?.immunization.date ||
    !laterDoseAt4y ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: dose1.immunization.date,
      duration: '12m',
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

function applyMeningBForecastOverride({
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
  const dose1 = matchedDoses.find((match) => match.dose.doseNumber === 1);

  if (
    isMeningB3DoseSeries(series) &&
    forecast.dose.doseNumber === 3 &&
    dose1?.immunization.date
  ) {
    const dose1Plus6Months = dateFromIceDuration({
      startDate: dose1.immunization.date,
      duration: '6m',
    });
    return {
      ...forecast,
      minimumDate: latestDate([forecast.minimumDate, dose1Plus6Months].filter(isDefined)),
      earliestRecommendedDate: latestDate(
        [forecast.earliestRecommendedDate, dose1Plus6Months].filter(isDefined),
      ),
      recommendedDate: latestDate(
        [forecast.recommendedDate, dose1Plus6Months].filter(isDefined),
      ),
    };
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    forecast.dose.doseNumber === 2 &&
    dose1?.immunization.date
  ) {
    const interval = dose1.immunization.date < '2024-10-25' ? '1m' : '6m';
    const intervalDate = dateFromIceDuration({
      startDate: dose1.immunization.date,
      duration: interval,
    });
    return {
      ...forecast,
      minimumDate: intervalDate,
      earliestRecommendedDate: intervalDate,
      recommendedDate: intervalDate,
    };
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    forecast.dose.doseNumber === 1 &&
    patient?.birthDate &&
    evaluationDate < '2024-10-25'
  ) {
    const age10Date = dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '10y',
    });
    return {
      ...forecast,
      minimumDate: age10Date,
      earliestRecommendedDate: age10Date,
      recommendedDate: age10Date,
    };
  }

  return forecast;
}

function applyHepAForecastOverride({
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

function applyHepBForecastOverride({
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

function applyMcvForecastOverride({
  forecast,
  matchedDoses,
  patient,
  evaluationDate,
}: {
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (
    forecast.dose.doseNumber !== 1 ||
    matchedDoses.length !== 0 ||
    !patient?.birthDate ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '16y',
    }) ||
    dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '19y',
    })
  ) {
    return forecast;
  }

  return {
    ...forecast,
    recommendedDate: dateFromIceDuration({
      startDate: patient.birthDate,
      duration: '16y',
    }),
  };
}

function applyJapaneseEncephalitisForecastOverride({
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

function applyInfluenzaForecastOverride({
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
  const recommendedDate = forecast.recommendedDate;
  const seasonEndDate = influenzaSeasonEndDate(series, recommendedDate);
  if (!recommendedDate || !seasonEndDate || recommendedDate <= seasonEndDate) {
    return forecast;
  }

  const dose1AbsoluteMinimumAge = series.doses.find(
    (dose) => dose.doseNumber === 1,
  )?.age?.absoluteMinimumAge;
  const latestEligibleDoseDate = latestDoseDate(
    matchedDoses.filter(
      (match) =>
        match.immunization.date &&
        (!patient?.birthDate ||
          !dose1AbsoluteMinimumAge ||
          dateMeetsMinimumDuration({
            startDate: patient.birthDate,
            endDate: match.immunization.date,
            duration: dose1AbsoluteMinimumAge,
          })),
    ),
  );
  if (!latestEligibleDoseDate) return forecast;

  const adjustedDate = dateFromIceDuration({
    startDate: latestEligibleDoseDate,
    duration: '4w',
  });

  return {
    ...forecast,
    earliestRecommendedDate: adjustedDate,
    recommendedDate: adjustedDate,
  };
}

function applyVaricellaForecastOverride({
  forecast,
  matchedDoses,
  invalidDoses,
  patient,
  evaluationDate,
}: {
  forecast: IceNextDoseForecast;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
  evaluationDate: string;
}) {
  if (forecast.dose.doseNumber === 1) {
    const latestInvalidDose = latestDoseDate(invalidDoses);
    if (!latestInvalidDose) return forecast;

    const retryDate = dateFromIceDuration({
      startDate: latestInvalidDose,
      duration: '28d',
    });
    return {
      ...forecast,
      earliestRecommendedDate: retryDate,
      recommendedDate: retryDate,
    };
  }

  if (
    forecast.dose.doseNumber !== 2 ||
    !patient?.birthDate ||
    !dateMeetsMinimumDuration({
      startDate: patient.birthDate,
      endDate: evaluationDate,
      duration: '13y',
    })
  ) {
    return forecast;
  }

  const dose1Date = matchedDoses.find((match) => match.dose.doseNumber === 1)
    ?.immunization.date;
  if (!dose1Date) return forecast;

  const dose2Date = dateFromIceDuration({
    startDate: dose1Date,
    duration: '28d',
  });

  return {
    ...forecast,
    earliestRecommendedDate: dose2Date,
    recommendedDate: dose2Date,
  };
}

function applyZosterForecastOverride({
  forecast,
  availableImmunizations,
  acceptedDoses,
}: {
  forecast: IceNextDoseForecast;
  availableImmunizations: ForecastImmunization[];
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  const recommendedVaccine = forecast.dose.vaccines.find(
    (vaccine) => vaccine.cvx === '187',
  );
  const latestAdultVaricellaDate = latestDate(
    availableImmunizations
      .filter((immunization) => normalizeCvx(immunization.vaccineCode) === '21')
      .map((immunization) => immunization.date)
      .filter(isDefined),
  );
  const latestLegacyZosterDate = latestDoseDate(
    acceptedDoses.filter((match) =>
      zosterLegacyCvxCodes.has(
        normalizeCvx(match.immunization.vaccineCode) ?? '',
      ),
    ),
  );
  const intervalDate = latestDate(
    [latestAdultVaricellaDate, latestLegacyZosterDate]
      .filter(isDefined)
      .map((date) =>
        dateFromIceDuration({
          startDate: date,
          duration: '8w',
        }),
      ),
  );

  return {
    ...forecast,
    recommendedVaccine,
    earliestRecommendedDate: latestDate(
      [forecast.earliestRecommendedDate, intervalDate].filter(isDefined),
    ),
    recommendedDate: latestDate(
      [forecast.recommendedDate, intervalDate].filter(isDefined),
    ),
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

function latestDoseDate(doses: IceSeriesDoseMatch[]) {
  return latestDate(
    doses.map((dose) => dose.immunization.date).filter(isDefined),
  );
}

function appendCandidate(
  target: string[],
  startDate: string,
  duration?: string,
) {
  if (!duration) return;
  target.push(dateFromIceDuration({ startDate, duration }));
}

function latestDate(dates: string[]) {
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isImmunizationAllowedForDose(
  immunization: ForecastImmunization,
  dose: IceDoseRule,
) {
  const normalizedCode = normalizeCvx(immunization.vaccineCode);
  if (!normalizedCode) return false;
  return dose.vaccines.some((vaccine) => vaccine.cvx === normalizedCode);
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const cvxMatch = code.match(/(?:CVX[_:-]?)?(\d{1,3})$/i);
  return cvxMatch?.[1]?.padStart(2, '0');
}
