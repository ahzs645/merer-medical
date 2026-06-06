import { dateMeetsMinimumDuration } from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDoseRule,
  IceIntervalConstraint,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
} from './types.js';

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

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
