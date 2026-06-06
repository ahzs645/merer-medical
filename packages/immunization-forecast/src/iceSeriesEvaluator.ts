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
import { applyCrossSeriesForecastRules } from './crossSeriesRules.js';
import * as covidRules from './covidRules.js';
import * as dtpRules from './dtpRules.js';
import * as h1n1Rules from './h1n1Rules.js';
import * as hepatitisRules from './hepatitisRules.js';
import * as hibRules from './hibRules.js';
import * as hpvRules from './hpvRules.js';
import * as influenzaRules from './influenzaRules.js';
import * as mcvRules from './mcvRules.js';
import * as meningBRules from './meningBRules.js';
import * as mmrRules from './mmrRules.js';
import * as mpoxRules from './mpoxRules.js';
import * as pneumococcalRules from './pneumococcalRules.js';
import * as polioRules from './polioRules.js';
import * as rotavirusRules from './rotavirusRules.js';
import * as rsvRules from './rsvRules.js';
import * as travelRules from './travelRules.js';
import * as varicellaRules from './varicellaRules.js';
import * as zosterRules from './zosterRules.js';

const hepAPediatricCvxCodes = new Set(['31', '83', '84']);
const covid19Aug2025SeasonStartDate = '2025-08-27';
const covid19Sep2023PfizerLt5PriorFormulationOrNonPfizerCvxCodes = new Set([
  '207',
  '208',
  '210',
  '211',
  '212',
  '213',
  '217',
  '218',
  '219',
  '221',
  '227',
  '228',
  '229',
  '230',
  '300',
  '301',
  '302',
  '311',
  '312',
  '313',
  '520',
]);
export function evaluateIceSeries(
  input: IceSeriesForecastInput,
): IceSeriesForecast[] {
  const seriesDefinitions = filterSeriesDefinitions(input);
  const evaluationDate =
    input.evaluationDate ?? new Date().toISOString().split('T')[0];

  const forecasts = seriesDefinitions.map((series) =>
    evaluateOneSeries(
      input.dataset,
      series,
      input.immunizations,
      input.patient,
      evaluationDate,
    ),
  );
  return applyCrossSeriesForecastRules({
    forecasts,
    dataset: input.dataset,
    evaluationDate,
  });
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
    const hpvSelection = hpvRules.selectHpvSeries(candidates, patient, evaluationDate);
    if (hpvSelection) return hpvSelection;
  }

  if (vaccineGroup === 'INFLUENZA_H1N1') {
    const h1n1Selection = h1n1Rules.selectH1n1Series(
      candidates,
      patient,
      evaluationDate,
    );
    if (h1n1Selection) return h1n1Selection;
  }

  if (vaccineGroup === 'ROTAVIRUS') {
    const rotavirusSelection = rotavirusRules.selectRotavirusSeries(candidates);
    if (rotavirusSelection) return rotavirusSelection;
  }

  if (vaccineGroup === 'POLIO') {
    const polioSelection = polioRules.selectPolioSeries(candidates);
    if (polioSelection) return polioSelection;
  }

  if (vaccineGroup === 'HIB') {
    const hibSelection = hibRules.selectHibSeries(candidates);
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
    const meningBSelection = meningBRules.selectMeningBSeries(
      candidates,
      compareSeriesForecasts,
    );
    if (meningBSelection) return meningBSelection;
  }

  if (vaccineGroup === 'HEP_A') {
    const hepASelection = hepatitisRules.selectHepASeries(candidates, patient);
    if (hepASelection) return hepASelection;
  }

  if (vaccineGroup === 'HEP_B') {
    const hepBSelection = hepatitisRules.selectHepBSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (hepBSelection) return hepBSelection;
  }

  if (vaccineGroup === 'JAPANESE_ENCEPHALITIS') {
    const japaneseEncephalitisSelection = travelRules.selectJapaneseEncephalitisSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (japaneseEncephalitisSelection) return japaneseEncephalitisSelection;
  }

  if (vaccineGroup === 'MPOX') {
    const mpoxSelection = mpoxRules.selectMpoxSeries(candidates);
    if (mpoxSelection) return mpoxSelection;
  }

  if (vaccineGroup === 'INFLUENZA') {
    const influenzaSelection = influenzaRules.selectInfluenzaSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (influenzaSelection) return influenzaSelection;
  }

  if (vaccineGroup === 'RSV') {
    const rsvSelection = rsvRules.selectRsvSeries(
      candidates,
      patient,
      evaluationDate,
    );
    if (rsvSelection) return rsvSelection;
  }

  if (vaccineGroup === 'COVID_19') {
    const covidSelection = covidRules.selectCovid19Series(
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
    if (polioRules.polioHasCustomCompletion({ series, matchedDoses, patient })) {
      break;
    }
  }

  polioRules.applyPolioDuplicateSameDayRule({
    series,
    matchedDoses,
    invalidDoses,
  });
  hepatitisRules.applyHepBHeplisavPriorInvalidIntervalException({
    series,
    matchedDoses,
    invalidDoses,
  });
  hepatitisRules.applyHepBAdult2DoseNotAllowedReasonCleanup({
    series,
    matchedDoses,
    invalidDoses,
    acceptedDoses,
  });
  hepatitisRules.applyHepBChild3DoseTo4DoseSwitch({
    series,
    matchedDoses,
    invalidDoses,
  });
  dtpRules.applyDtpThreeDosePertussisCompletion({
    series,
    dataset,
    availableImmunizations,
    usedImmunizationIndexes,
    matchedDoses,
  });
  covidRules.applyCovid19Sep2023Aug2024DuplicateSameDayRule({
    series,
    patient,
    matchedDoses,
    acceptedDoses,
    invalidDoses,
  });
  covidRules.applyCovid19Sep2023Cvx313AcceptedReasonTransition({
    series,
    matchedDoses,
    acceptedDoses,
  });
  covidRules.applyCovid19InvalidNotAllowedDuplicateSameDayRule({
    series,
    matchedDoses,
    invalidDoses,
  });
  covidRules.applyCovid19Dec2020DuplicateSameDayRules({
    series,
    matchedDoses,
    invalidDoses,
  });
  covidRules.applyCovid19AcceptedDuplicateSameDayRule({
    series,
    matchedDoses,
    acceptedDoses,
    invalidDoses,
  });
  covidRules.applyCovid19Sep2023NotAllowedReasonCleanup({
    series,
    invalidDoses,
  });
  covidRules.applyCovid19Dec2020BivalentNotYetAvailableRule({
    series,
    matchedDoses,
    invalidDoses,
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
  covidRules.applyCovid19Dec2020IncompleteNotAllowedReasonCleanup({
    series,
    status,
    matchedDoses,
    invalidDoses,
    acceptedDoses,
  });
  const nextDoseNumber =
    status !== 'complete'
      ? (covidRules.covid19Sep2023NextTargetDoseNumber({
          series,
          availableImmunizations,
          matchedDoses,
          patient,
          completedDoses,
        }) ?? completedDoses + 1)
      : undefined;
  const nextDose = series.doses.find(
    (dose) => nextDoseNumber !== undefined && dose.doseNumber === nextDoseNumber,
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
  covidRules.applyCovid19Dec2020BivalentNotYetAvailableRule({
    series,
    matchedDoses,
    invalidDoses,
  });
  covidRules.applyCovid19Dec2020PostCompletionSupplementalText({
    series,
    matchedDoses,
    patient,
  });
  mpoxRules.applyMpoxAcceptedDuplicateSameDayRule({
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
    availableImmunizations,
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
    mcvRules.mcvHasSingleDoseCompletion({ series, matchedDoses, patient }) ||
    mmrRules.mmrHasSingleDoseAdultCompletion({
      series,
      matchedDoses,
      patient,
      evaluationDate,
    }) ||
    hepatitisRules.hepAHasCustomCompletion({ series, matchedDoses, patient }) ||
    hepatitisRules.hepBHasCustomCompletion({ series, matchedDoses, patient }) ||
    polioRules.polioHasCustomCompletion({ series, matchedDoses, patient }) ||
    pneumococcalRules.pneumococcalHasCustomCompletion({
      series,
      matchedDoses,
      patient,
    }) ||
    covidRules.covid19Dec2020HasPostApr2023IncompleteSeriesCompletion({
      series,
      matchedDoses,
      patient,
      evaluationDate,
    }) ||
    covidRules.covid19Sep2023HasCustomCompletion({
      series,
      matchedDoses,
      patient,
      evaluationDate,
    }) ||
    dtpRules.dtpHasCustomCompletion({
      series,
      matchedDoses,
      patient,
      evaluationDate,
    })
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

  const covidCompare = covidRules.compareCovid19ImmunizationsForSeries(
    series,
    a,
    b,
  );
  if (covidCompare !== 0) return covidCompare;

  if (series.vaccineGroup?.code !== 'DTP') return 0;

  return dtpRules.compareDtpImmunizationsForSeries({ dataset, series, a, b });
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
      availableImmunizations,
      matchedDoses,
      patient,
    });
    if (
      covidRules.shouldSkipCovid19Aug2025Lt2PreSeasonDose2Match({
        series,
        dose: effectiveDose,
        immunization,
        availableImmunizations,
      })
    ) {
      continue;
    }
    if (
      covidRules.shouldSkipCovid19Aug2025Lt2OneNonModernaDose1Match({
        series,
        dose: effectiveDose,
        immunization,
        availableImmunizations,
      })
    ) {
      continue;
    }
    if (
      covidRules.shouldSkipCovid19Aug2025AdultPreSeasonDose1Match({
        series,
        dose: effectiveDose,
        immunization,
      })
    ) {
      continue;
    }
    const sameDaySpecificPolioDose = polioRules.findSameDaySpecificPolioDose({
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

    const sameDaySpecificHibDose = hibRules.findSameDaySpecificHibDose({
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

    const sameDayPreferredMeningBDose = meningBRules.findSameDayPreferredMeningBDose({
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

    const sameDayPreferredHepADose = hepatitisRules.findSameDayPreferredHepADose({
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

    const sameDayPreferredDtpDose = dtpRules.findSameDayPreferredDtpDose({
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

    const sameDayPreferredPneumococcalDose =
      pneumococcalRules.findSameDayPreferredPneumococcalDose({
        series,
        immunization,
        availableImmunizations,
        usedImmunizationIndexes,
        patient,
      });
    if (sameDayPreferredPneumococcalDose) {
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
      !covidRules.isCovid19Aug2025Gte65TransitionDose1({
        series,
        dose: effectiveDose,
        immunization,
        patient,
      }) &&
      !hibRules.isHibBoosterVaccineAllowed({
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
        matchedDoses,
        availableImmunizations,
        patient,
      });
      if (acceptedMatch) {
        usedImmunizationIndexes.add(index);
        acceptedDoses.push(acceptedMatch);
      }

      if (
        rotavirusRules.isRotavirusSeries(series) &&
        rotavirusRules.isRotavirusImmunization(immunization)
      ) {
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
        matchedDoses,
        patient,
      });
      if (invalidNonAllowedMatch) {
        usedImmunizationIndexes.add(index);
        invalidDoses.push(invalidNonAllowedMatch);
      }
      continue;
    }

    const pneumococcalSameDayCompletedChildDuplicate =
      pneumococcalRules.evaluatePneumococcalSameDayCompletedChildDuplicate({
        series,
        immunization,
        matchedDoses,
        patient,
      });
    if (pneumococcalSameDayCompletedChildDuplicate) {
      usedImmunizationIndexes.add(index);
      invalidDoses.push(pneumococcalSameDayCompletedChildDuplicate);
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

    let reasons = evaluateDoseConstraints({
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
    const covid19MinimumAgeSupplementalText =
      covidRules.covid19Dec2020MinimumAgeOverrideSupplementalText({
        series,
        immunization,
        reasons,
        patient,
      });
    if (covid19MinimumAgeSupplementalText) {
      reasons = reasons.filter(
        (reason) => reason !== 'BELOW_ABSOLUTE_MINIMUM_AGE',
      );
    }
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
    if (covid19MinimumAgeSupplementalText) {
      supplementalText.push(covid19MinimumAgeSupplementalText);
    }

    const pneumococcalInvalidOutsideRoutineDose =
      pneumococcalRules.evaluatePneumococcalInvalidOutsideRoutineDose({
        series,
        dose: effectiveDose,
        immunization,
        reasons,
        patient,
    });
    if (pneumococcalInvalidOutsideRoutineDose) {
      usedImmunizationIndexes.add(index);
      acceptedDoses.push(pneumococcalInvalidOutsideRoutineDose);
      continue;
    }

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









function customTargetDoseForImmunization({
  series,
  dose,
  immunization,
  availableImmunizations,
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  availableImmunizations: ForecastImmunization[];
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}) {
  const covid19Sep2023TargetDoseNumber =
    covidRules.covid19Sep2023Lt5SkipTargetDoseNumber({
      series,
      availableImmunizations,
      patient,
    });
  if (
    covid19Sep2023TargetDoseNumber &&
    dose.doseNumber < covid19Sep2023TargetDoseNumber
  ) {
    return (
      series.doses.find(
        (candidate) => candidate.doseNumber === covid19Sep2023TargetDoseNumber,
      ) ?? dose
    );
  }

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    dose.doseNumber === 3 &&
    matchedDoses.some(
      (match) =>
        match.dose.doseNumber <= 2 &&
        normalizeCvx(match.immunization.vaccineCode) === '313',
    )
  ) {
    return series.doses.find((candidate) => candidate.doseNumber === 4) ?? dose;
  }
  const pneumococcalTargetDose =
    pneumococcalRules.pneumococcalCustomTargetDoseForImmunization({
      series,
      dose,
      immunization,
      matchedDoses,
      patient,
    });
  if (pneumococcalTargetDose) return pneumococcalTargetDose;

  const dtpTargetDose = dtpRules.dtpCustomTargetDoseForImmunization({
    series,
    dose,
    immunization,
    matchedDoses,
    patient,
  });
  if (dtpTargetDose) return dtpTargetDose;

  return (
    hibRules.customHibTargetDoseForImmunization({
      series,
      dose,
      immunization,
      matchedDoses,
      patient,
    }) ?? dose
  );
}

function evaluateAcceptedNonAllowedDose({
  series,
  dose,
  immunization,
  matchedDoses,
  availableImmunizations,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  availableImmunizations: ForecastImmunization[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  const covidMatch = covidRules.evaluateCovid19AcceptedNonAllowedDose({
    series,
    dose,
    immunization,
    matchedDoses,
    availableImmunizations,
    patient,
  });
  if (covidMatch) return covidMatch;

  if (
    series.vaccineGroup?.code === 'MPOX' &&
    mpoxRules.isMpoxImmunization(immunization)
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
    meningBRules.isMeningBImmunization(immunization)
  ) {
    const meningBMatch = meningBRules.evaluateMeningBAcceptedNonAllowedDose({
      series,
      immunization,
      dose,
    });
    if (meningBMatch) return meningBMatch;
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
  matchedDoses,
  patient,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
  matchedDoses: IceSeriesDoseMatch[];
  patient?: ForecastPatient;
}): IceSeriesDoseMatch | undefined {
  const covidMatch = covidRules.evaluateCovid19InvalidNonAllowedDose({
    series,
    dose,
    immunization,
    matchedDoses,
    patient,
  });
  if (covidMatch) return covidMatch;

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

  if (series.vaccineGroup?.code === 'HIB') {
    const hibMatch = hibRules.evaluateHibInvalidNonAllowedDose({
      series,
      immunization,
      dose,
    });
    if (hibMatch) return hibMatch;
  }

  if (
    series.id === 'HEP_B_ADULT_2_DOSE_SERIES' &&
    hepatitisRules.isHepBImmunization(immunization)
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
    polioRules.appendPolioBoosterDoseMatches({
      series,
      availableImmunizations,
      usedImmunizationIndexes,
      matchedDoses,
      acceptedDoses,
    });
    return;
  }

  if (series.vaccineGroup?.code === 'HEP_B' && status === 'complete') {
    hepatitisRules.appendHepBHeplisavAcceptedDoseMatches({
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

  if (
    series.vaccineGroup?.code === 'COVID_19' &&
    series.season?.code === 'COVID_19_DEC_2020_SEASON' &&
    status === 'complete'
  ) {
    covidRules.appendCovid19Dec2020PostCompletionDoseMatches({
      series,
      availableImmunizations,
      usedImmunizationIndexes,
      matchedDoses,
      invalidDoses,
      patient,
    });
  }

  mpoxRules.appendMpoxPostCompletionDoseMatches({
    series,
    status,
    availableImmunizations,
    usedImmunizationIndexes,
    matchedDoses,
    acceptedDoses,
  });
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
  const covidMatch = covidRules.evaluateCovid19AcceptedDose({
    series,
    dose,
    immunization,
    matchedDoses,
    patient,
  });
  if (covidMatch) return covidMatch;

  if (series.vaccineGroup?.code === 'MMR') {
    const mmrMatch = mmrRules.evaluateMmrAcceptedNonAllowedDose({
      series,
      dose,
      immunization,
      patient,
    });
    if (mmrMatch) return mmrMatch;
  }

  if (
    rotavirusRules.isRotavirusSeries(series) &&
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

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY') {
    const mcvMatch = mcvRules.evaluateMcvAcceptedNonAllowedDose({
      series,
      dose,
      immunization,
      matchedDoses,
      patient,
    });
    if (mcvMatch) return mcvMatch;
  }

  const hpvMatch = hpvRules.evaluateHpvAcceptedDose({
    series,
    immunization,
    dose,
    matchedDoses,
    patient,
  });
  if (hpvMatch) return hpvMatch;

  const rsvMatch = rsvRules.evaluateRsvAcceptedDose({
    series,
    dose,
    immunization,
    patient,
  });
  if (rsvMatch) return rsvMatch;

  if (series.vaccineGroup?.code === 'HIB') {
    const hibMatch = hibRules.evaluateHibAcceptedNonAllowedDose({
      series,
      dose,
      immunization,
      matchedDoses,
      patient,
    });
    if (hibMatch) return hibMatch;
  }

  if (series.vaccineGroup?.code === 'ZOSTER') {
    const zosterMatch = zosterRules.evaluateZosterAcceptedNonAllowedDose({
      series,
      dose,
      immunization,
    });
    if (zosterMatch) return zosterMatch;
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
  if (patient?.birthDate && immunization.date < patient.birthDate) {
    return ['PRIOR_TO_DOB'];
  }

  if (series.vaccineGroup?.code === 'MMR') {
    const duplicateReason = mmrRules.evaluateMmrDuplicateSameDay({
      immunization,
      availableImmunizations,
    });
    if (duplicateReason) addReason(reasons, duplicateReason);

    if (mmrRules.isMmrLiveVirusConflict({ immunization, matchedDoses })) {
      addReason(reasons, 'TOO_EARLY_LIVE_VIRUS');
    }
  }

  if (rotavirusRules.isRotavirusSeries(series)) {
    const duplicateReason = rotavirusRules.evaluateRotavirusDuplicateSameDay({
      immunization,
      availableImmunizations,
    });
    if (duplicateReason) addReason(reasons, duplicateReason);
  }

  if (series.vaccineGroup?.code === 'MPOX') {
    const duplicateReason = mpoxRules.evaluateMpoxDuplicateSameDay({
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
    const influenzaReason = influenzaRules.evaluateInfluenzaCustomConstraint({
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
    const rsvReason = rsvRules.rsvVaccineNotYetAvailableReason(immunization);
    if (rsvReason) addReason(reasons, rsvReason);
  }

  if (
    series.vaccineGroup?.code === 'COVID_19' &&
    normalizeCvx(immunization.vaccineCode) === '211' &&
    immunization.date &&
    immunization.date >= '2023-10-04'
  ) {
    addReason(reasons, 'VACCINE_NOT_ALLOWED');
  }

  if (series.vaccineGroup?.code === 'COVID_19') {
    for (const covid19Reason of covidRules.evaluateCovid19CustomConstraints({
      series,
      dose,
      dataset,
      immunization,
      patient,
    })) {
      addReason(reasons, covid19Reason);
    }
  }

  if (series.vaccineGroup?.code === 'POLIO') {
    const polioReason = polioRules.evaluatePolioCustomConstraint({
      series,
      immunization,
    });
    if (polioReason) addReason(reasons, polioReason);
  }

  if (series.vaccineGroup?.code === 'HIB') {
    for (const hibReason of hibRules.evaluateHibCustomConstraints({
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
    for (const hepAReason of hepatitisRules.evaluateHepACustomConstraints({
      dataset,
      immunization,
      patient,
    })) {
      addReason(reasons, hepAReason);
    }
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    for (const hepBReason of hepatitisRules.evaluateHepBCustomConstraints({
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
      patient?.birthDate &&
      previousMatch.immunization.date < patient.birthDate
    ) {
      continue;
    }
    if (
      meningBRules.meningBDose3MeetsDose1Interval({
        series,
        dose,
        immunization,
        matchedDoses,
      })
    ) {
      continue;
    }
    if (
      hepatitisRules.hepAFinalDoseMeetsDose1Interval({
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
      hepatitisRules.hepBFinalDoseMeetsCustomInterval({
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

  if (
    covidRules.covid19Dec2020ModernaCvx213IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      patient,
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
  }

  if (
    covidRules.covid19Sep2023Gte5Dose1ToDose2IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      invalidDoses,
      acceptedDoses,
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
  }

  if (
    covidRules.covid19Sep2023NovavaxMrnaDose2IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
    }) ||
    covidRules.covid19Sep2023NovavaxDose4IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
  }

  if (
    covidRules.covid19Sep2023ModernaCvx213IntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      patient,
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
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

  const zosterIntervalReason = zosterRules.evaluateZosterIntervalReason({
    series,
    immunization,
    acceptedDoses,
  });
  if (zosterIntervalReason) addReason(reasons, zosterIntervalReason);

  if (
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES' &&
    dose.doseNumber === 1 &&
    immunization.date >= covid19Aug2025SeasonStartDate
  ) {
    const invalidPrior =
      covidRules.covid19Aug2025Lt2NoValidPreSeasonMostRecentInvalidPrior(
        availableImmunizations,
      );
    const nonModernaPrior =
      covidRules.covid19Aug2025Lt2OneNonModernaMostRecentPrior(availableImmunizations);
    const prior = nonModernaPrior ?? invalidPrior;
    const minimumInterval = prior
      ? covidRules.covid19Aug2025PriorIsPfizerNovavaxOrUnspecified(prior)
        ? '17d'
        : '24d'
      : undefined;
    if (
      prior?.date &&
      minimumInterval &&
      !dateMeetsMinimumDuration({
        startDate: prior.date,
        endDate: immunization.date,
        duration: minimumInterval,
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
  }

  if (
    (series.id === 'COVID_19_AUG_2025_2_Y_TO_64_Y_SERIES' ||
      series.id === 'COVID_19_AUG_2025_GTE_65_SERIES') &&
    dose.doseNumber === 1 &&
    immunization.date
  ) {
    const priorCovid = covidRules.latestCovid19ImmunizationBeforeDate({
      immunizations: availableImmunizations,
      date: immunization.date,
      exclude: immunization,
      invalidDoses,
    });
    const priorCvx = normalizeCvx(priorCovid?.vaccineCode);
    const currentCvx = normalizeCvx(immunization.vaccineCode);
    const minimumInterval =
      priorCvx === '313' && currentCvx === '313' ? '17d' : priorCovid ? '8w-4d' : undefined;
    if (
      priorCovid?.date &&
      minimumInterval &&
      !dateMeetsMinimumDuration({
        startDate: priorCovid.date,
        endDate: immunization.date,
        duration: minimumInterval,
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
  }

  if (
    series.season?.code === 'COVID_19_SEP_2023_SEASON' &&
    series.vaccineGroup?.code === 'COVID_19' &&
    dose.doseNumber === 1 &&
    matchedDoses.length === 0 &&
    immunization.date >= '2023-09-12'
  ) {
    const latestAcceptedCvx313Exception = covidRules.latestAcceptedCovid19DoseBeforeDate({
      acceptedDoses,
      date: immunization.date,
      cvx: '313',
      reason: 'VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
    });
    const latestAcceptedCvx211Exception = covidRules.latestAcceptedCovid19DoseBeforeDate({
      acceptedDoses,
      date: immunization.date,
      cvx: '211',
      reason: 'VACCINE_NOT_PART_OF_THIS_SERIES',
    });
    if (latestAcceptedCvx313Exception?.immunization.date) {
      if (
        !dateMeetsMinimumDuration({
          startDate: latestAcceptedCvx313Exception.immunization.date,
          endDate: immunization.date,
          duration: '24d',
        })
      ) {
        addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
      }
    } else if (latestAcceptedCvx211Exception?.immunization.date) {
      if (
        !dateMeetsMinimumDuration({
          startDate: latestAcceptedCvx211Exception.immunization.date,
          endDate: immunization.date,
          duration: '24d',
        })
      ) {
        addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
      }
    } else {
      const latestPreSeasonCovid = covidRules.latestCovid19ImmunizationBeforeDate({
        immunizations: availableImmunizations.filter(
          (candidate) =>
            !!candidate.date &&
            candidate.date < '2023-09-12' &&
            covidRules.isCovid19Immunization(candidate),
        ),
        date: '2023-09-12',
        invalidDoses,
      });
      if (
        latestPreSeasonCovid?.date &&
        !dateMeetsMinimumDuration({
          startDate: latestPreSeasonCovid.date,
          endDate: immunization.date,
          duration: '8w-4d',
        })
      ) {
        addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
      }
    }
  }

  if (
    series.season?.code === 'COVID_19_SEP_2023_SEASON' &&
    (series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MODERNA_LT_5_Y_SERIES' ||
      series.id === 'COVID_19_SEP_2023_MIXED_PRODUCT_LT_5_Y_SERIES') &&
    (dose.doseNumber === 1 || dose.doseNumber === 2)
  ) {
    const latestBelowMinimumAgeInvalid = [...invalidDoses]
      .filter(
        (match) =>
          match.dose.doseNumber === dose.doseNumber &&
          match.immunization.date &&
          match.immunization.date < immunization.date! &&
          match.reasons.includes('BELOW_ABSOLUTE_MINIMUM_AGE'),
      )
      .sort((a, b) =>
        (b.immunization.date || '').localeCompare(a.immunization.date || ''),
      )[0];
    if (
      latestBelowMinimumAgeInvalid?.immunization.date &&
      !dateMeetsMinimumDuration({
        startDate: latestBelowMinimumAgeInvalid.immunization.date,
        endDate: immunization.date,
        duration: '24d',
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
  }

  if (
    series.id === 'COVID_19_SEP_2023_PFIZER_LT_5_Y_SERIES' &&
    immunization.date >= '2023-09-12' &&
    (dose.doseNumber === 1 || dose.doseNumber === 2)
  ) {
    const latestPrior = covidRules.latestCovid19ImmunizationBeforeDate({
      immunizations: availableImmunizations.filter((candidate) => {
        const cvx = normalizeCvx(candidate.vaccineCode);
        return (
          !!cvx &&
          covid19Sep2023PfizerLt5PriorFormulationOrNonPfizerCvxCodes.has(cvx)
        );
      }),
      date: immunization.date,
      exclude: immunization,
      invalidDoses,
    });
    if (
      latestPrior?.date &&
      !dateMeetsMinimumDuration({
        startDate: latestPrior.date,
        endDate: immunization.date,
        duration: '24d',
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
  }

  if (
    covidRules.covid19Sep2023ModernaLt5SkippedDose2PriorSeasonIntervalTooShort({
      series,
      immunization,
      dose,
      matchedDoses,
      availableImmunizations,
      patient,
    })
  ) {
    addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
  }

  if (
    series.id === 'COVID_19_AUG_2025_LT_2_SERIES' &&
    dose.doseNumber === 2 &&
    immunization.date >= covid19Aug2025SeasonStartDate
  ) {
    const oneModernaInvalidPrior =
      covidRules.covid19Aug2025Lt2OneModernaMostRecentInvalidPrior(availableImmunizations);
    const oneModernaMinimumInterval = oneModernaInvalidPrior
      ? covidRules.covid19Aug2025PriorIsPfizerNovavaxOrUnspecified(oneModernaInvalidPrior)
        ? '17d'
        : '24d'
      : undefined;
    if (
      oneModernaInvalidPrior?.date &&
      oneModernaMinimumInterval &&
      !dateMeetsMinimumDuration({
        startDate: oneModernaInvalidPrior.date,
        endDate: immunization.date,
        duration: oneModernaMinimumInterval,
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }

    const mostRecentPreSeasonDoseDate = latestImmunizationDate(
      covidRules.covid19Aug2025Lt2PreSeasonDose2SkipImmunizations(availableImmunizations),
    );
    if (
      !oneModernaInvalidPrior &&
      mostRecentPreSeasonDoseDate &&
      !dateMeetsMinimumDuration({
        startDate: mostRecentPreSeasonDoseDate,
        endDate: immunization.date,
        duration: '8w-4d',
      })
    ) {
      addReason(reasons, 'BELOW_ABSOLUTE_MINIMUM_INTERVAL');
    }
  }

  return reasons;
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
    polioRules.isPolioExtraDoseBefore4After2009({
      series,
      dose,
      immunization,
      patient,
    })
  ) {
    return ['EXTRA_DOSE'];
  }

  return [];
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
    return polioRules.polioSupplementalText(immunization);
  }

  if (series.vaccineGroup?.code === 'DTP') {
    return dtpRules.evaluateDtpDoseSupplementalText({
      series,
      immunization,
      reasons,
    });
  }

  if (series.vaccineGroup?.code === 'MPOX') {
    return mpoxRules.evaluateMpoxDoseSupplementalText({
      series,
      dose,
      immunization,
      matchedDoses,
      reasons,
    });
  }

  return [];
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
  const varicellaInterval = varicellaRules.customVaricellaAbsoluteMinimumInterval({
    seriesCode: series.vaccineGroup?.code,
    dose,
    immunizationDate: immunization.date,
    interval,
    patient,
  });
  if (varicellaInterval) return varicellaInterval;

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

  if (
    polioRules.isPolioExtraDoseBefore4After2009({
      series,
      dose,
      immunization,
      patient,
    })
  ) {
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
    meningBRules.isMeningB3DoseSeries(series) &&
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

  const covid19Override = covidRules.covid19Dec2020CustomAbsoluteMinimumInterval({
    series,
    dose,
    immunization,
    matchedDoses,
    patient,
  });
  if (covid19Override) return covid19Override;

  const hepBOverride = hepatitisRules.hepBCustomAbsoluteMinimumInterval({
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

  if (
    polioRules.isPolioExtraDoseBefore4After2009({
      series,
      dose,
      immunization,
      patient,
    })
  ) {
    return series.id === 'POLIO_4_DOSE_SERIES' ? '94d' : '122d';
  }

  if (
    series.id === 'MEN_B_4_C_2_DOSE_SERIES' &&
    dose.doseNumber === 1 &&
    immunization.date &&
    (immunization.date < '2024-10-25' ||
      meningBRules.isMeningB4cImmunization(immunization))
  ) {
    return '10y-4d';
  }

  if (
    series.id === 'HEP_A_ADULT_3_DOSE_SERIES' &&
    hepAPediatricCvxCodes.has(normalizeCvx(immunization.vaccineCode) ?? '')
  ) {
    return '12m-4d';
  }

  if (
    covidRules.isCovid19Aug2025Gte65TransitionDose1({
      series,
      dose,
      immunization,
      patient,
    })
  ) {
    return '2y';
  }

  if (
    series.id === 'COVID_19_SEP_2023_NOVAVAX_SERIES' &&
    dose.doseNumber === 1 &&
    normalizeCvx(immunization.vaccineCode) === '313'
  ) {
    return '5y';
  }

  return dose.age?.absoluteMinimumAge;
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
  availableImmunizations,
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
  availableImmunizations: ForecastImmunization[];
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
    return travelRules.buildTyphoidRecommendation({
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'YELLOW_FEVER') {
    return travelRules.buildYellowFeverRecommendation({
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'VARICELLA') {
    return varicellaRules.buildVaricellaRecommendation({
      patient,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY') {
    return mcvRules.buildMcvRecommendation({
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'INFLUENZA_H1N1') {
    return h1n1Rules.buildH1n1Recommendation({
      series,
      season: findSeriesSeason(dataset, series),
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'ROTAVIRUS') {
    return rotavirusRules.buildRotavirusRecommendation({
      patient,
      evaluationDate,
      status,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MMR') {
    return mmrRules.buildMmrRecommendation({
      patient,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'JAPANESE_ENCEPHALITIS') {
    return travelRules.buildJapaneseEncephalitisRecommendation({
      patient,
      evaluationDate,
      status,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MPOX') {
    return mpoxRules.buildMpoxRecommendation({
      series,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'RSV') {
    return rsvRules.buildRsvRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'POLIO') {
    return polioRules.buildPolioRecommendation({
      patient,
      evaluationDate,
      status,
      matchedDoses,
      acceptedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'HIB') {
    return hibRules.buildHibRecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_B') {
    return meningBRules.buildMeningBRecommendation({
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
    return hepatitisRules.buildHepARecommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    return hepatitisRules.buildHepBRecommendation({
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

  if (series.vaccineGroup?.code === 'PNEUMOCOCCAL') {
    return pneumococcalRules.buildPneumococcalRecommendation({
      status,
      matchedDoses,
      nextDoseForecast,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'COVID_19') {
    return covidRules.buildCovid19Recommendation({
      series,
      patient,
      evaluationDate,
      status,
      matchedDoses,
      availableImmunizations,
      nextDoseForecast,
      dataset,
    });
  }

  if (status === 'complete') return undefined;

  if (series.vaccineGroup?.code === 'HPV') {
    return hpvRules.buildHpvRecommendation({
      patient,
      evaluationDate,
      completedDoses,
      nextDoseForecast,
    });
  }

  if (series.vaccineGroup?.code === 'CHOLERA') {
    return travelRules.buildCholeraRecommendation({
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
    if (patient?.birthDate && previousDoseDate < patient.birthDate) continue;

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
    return zosterRules.applyZosterForecastOverride({
      forecast,
      availableImmunizations,
      acceptedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'VARICELLA') {
    return varicellaRules.applyVaricellaForecastOverride({
      forecast,
      matchedDoses,
      invalidDoses,
      patient,
      evaluationDate,
    });
  }

  if (series.vaccineGroup?.code === 'MENINGOCOCCAL_ACWY') {
    return mcvRules.applyMcvForecastOverride({
      forecast,
      matchedDoses,
      patient,
      evaluationDate,
    });
  }

  if (series.vaccineGroup?.code === 'JAPANESE_ENCEPHALITIS') {
    return travelRules.applyJapaneseEncephalitisForecastOverride({
      series,
      forecast,
      matchedDoses,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'INFLUENZA') {
    return influenzaRules.applyInfluenzaForecastOverride({
      series,
      forecast,
      matchedDoses,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'RSV') {
    return rsvRules.applyRsvForecastOverride({
      series,
      forecast,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'COVID_19') {
    return covidRules.applyCovid19ForecastOverride({
      series,
      forecast,
      availableImmunizations,
      matchedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'POLIO') {
    return polioRules.applyPolioForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'HIB') {
    return hibRules.applyHibForecastOverride({
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
      availableImmunizations,
      matchedDoses,
      acceptedDoses,
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
    return meningBRules.applyMeningBForecastOverride({
      series,
      forecast,
      matchedDoses,
      evaluationDate,
      patient,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_A') {
    return hepatitisRules.applyHepAForecastOverride({
      series,
      forecast,
      matchedDoses,
    });
  }

  if (series.vaccineGroup?.code === 'HEP_B') {
    return hepatitisRules.applyHepBForecastOverride({
      series,
      forecast,
      matchedDoses,
    });
  }

  return hpvRules.applyHpvForecastOverride({
    seriesId: series.id,
    forecast,
    matchedDoses,
    invalidDoses,
    evaluationDate,
    patient,
  });
}

function latestImmunizationDate(immunizations: ForecastImmunization[]) {
  return latestDate(
    immunizations.map((immunization) => immunization.date).filter(isDefined),
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
