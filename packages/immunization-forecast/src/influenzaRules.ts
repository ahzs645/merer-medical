import {
  ForecastImmunization,
  ForecastPatient,
  IceDataset,
  IceDoseRule,
  IceNextDoseForecast,
  IceSeriesDefinition,
  IceSeriesDoseMatch,
  IceSeriesForecast,
} from './types.js';
import {
  dateFromIceDuration,
  dateMeetsMinimumDuration,
} from './iceDuration.js';

const influenzaNotAllowedInUsCvxCodes = new Set([
  '194',
  '200',
  '201',
  '202',
  '231',
  '331',
  '337',
]);

export function selectInfluenzaSeries(
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

export function evaluateInfluenzaCustomConstraint({
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
  const seasonStartDate = seasonRange?.startDate;
  if (!seasonStartDate || dose.doseNumber !== 1 || !immunization.date) {
    return undefined;
  }

  const latestPriorInfluenzaDate = latestDate(
    availableImmunizations
      .filter(
        (candidate) =>
          candidate.date &&
          candidate.date < seasonStartDate &&
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

export function applyInfluenzaForecastOverride({
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

function dateFallsWithinSeriesSeason({
  dataset,
  series,
  date,
}: {
  dataset: IceDataset;
  series: IceSeriesDefinition;
  date?: string;
}) {
  if (!date) return true;
  const seasonRange = influenzaSeasonDateRange(dataset, series, date);
  if (!seasonRange?.startDate || !seasonRange.endDate) return true;
  return date >= seasonRange.startDate && date <= seasonRange.endDate;
}

function influenzaSeasonDateRange(
  dataset: IceDataset,
  series: IceSeriesDefinition,
  dateHint?: string,
) {
  const seasonCode = series.season?.code;
  const seasonFromDataset = seasonCode
    ? dataset.seasons.find((season) => season.code === seasonCode)
    : undefined;
  if (seasonFromDataset?.startDate || seasonFromDataset?.endDate) {
    return seasonFromDataset;
  }

  const seasonEnd = influenzaSeasonEndDate(series, dateHint);
  if (!seasonEnd) return undefined;
  const endYear = Number(seasonEnd.slice(0, 4));
  return {
    code: series.season?.code,
    display: series.season?.display,
    startDate: `${endYear - 1}-07-01`,
    endDate: seasonEnd,
  };
}

function influenzaSeasonEndDate(series: IceSeriesDefinition, dateHint?: string) {
  const seasonCode = series.season?.code;
  const codedSeason = seasonCode?.match(
    /^(\d{4})(\d{4})_INFLUENZA_SEASON$/,
  );
  if (codedSeason) return `${codedSeason[2]}-06-30`;

  if (seasonCode !== 'DEFAULT_INFLUENZA_SEASON' || !dateHint) {
    return undefined;
  }

  const year = Number(dateHint.slice(0, 4));
  if (!Number.isFinite(year)) return undefined;
  const monthDay = dateHint.slice(5);
  const endYear = monthDay <= '06-30' ? year : year + 1;
  return `${endYear}-06-30`;
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
