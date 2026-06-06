import { dateMeetsMinimumDuration } from './iceDuration.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
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

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed.padStart(2, '0') : undefined;
}
