import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';
import type {
  ForecastImmunization,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
} from './types.js';

const zosterLegacyCvxCodes = new Set(['121', '188']);

export function evaluateZosterAcceptedNonAllowedDose({
  series,
  dose,
  immunization,
}: {
  series: IceSeriesDefinition;
  dose: IceDoseRule;
  immunization: ForecastImmunization;
}) {
  if (
    series.vaccineGroup?.code === 'ZOSTER' &&
    zosterLegacyCvxCodes.has(normalizeCvx(immunization.vaccineCode) ?? '')
  ) {
    return {
      immunization,
      dose,
      status: 'accepted' as const,
      reasons: ['VACCINE_NOT_PART_OF_THIS_SERIES'],
    };
  }

  return undefined;
}

export function evaluateZosterIntervalReason({
  series,
  immunization,
  acceptedDoses,
}: {
  series: IceSeriesDefinition;
  immunization: ForecastImmunization;
  acceptedDoses: IceSeriesDoseMatch[];
}) {
  if (
    series.vaccineGroup?.code !== 'ZOSTER' ||
    normalizeCvx(immunization.vaccineCode) !== '187' ||
    !immunization.date
  ) {
    return undefined;
  }

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
    return 'BELOW_ABSOLUTE_MINIMUM_INTERVAL';
  }

  return undefined;
}

export function applyZosterForecastOverride({
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
