import { dateFromIceDuration, dateMeetsMinimumDuration } from './iceDuration.js';
import type {
  IceDataset,
  IceSeriesDoseMatch,
  IceSeriesForecast,
} from './types.js';

export function applyCrossSeriesForecastRules({
  forecasts,
  dataset,
  evaluationDate,
}: {
  forecasts: IceSeriesForecast[];
  dataset: IceDataset;
  evaluationDate: string;
}) {
  return applyHepATwinrixRecommendationRule(
    applySelectAdjuvantProductRecommendationIntervalRule({
      forecasts: applyYellowFeverLiveVirusIntervalRule(forecasts, dataset),
      dataset,
      evaluationDate,
    }),
  );
}

function applySelectAdjuvantProductRecommendationIntervalRule({
  forecasts,
  dataset,
  evaluationDate,
}: {
  forecasts: IceSeriesForecast[];
  dataset: IceDataset;
  evaluationDate: string;
}) {
  const selectAdjuvantCvxCodes = new Set(
    dataset.vaccines
      .filter((vaccine) => vaccine.selectAdjuvantProduct)
      .map((vaccine) => vaccine.cvx),
  );
  if (selectAdjuvantCvxCodes.size === 0) return forecasts;

  const mostRecentSelectAdjuvantDate = latestDoseDate(
    forecasts
      .flatMap((forecast) => forecast.matchedDoses)
      .filter((match) =>
        selectAdjuvantCvxCodes.has(
          normalizeCvx(match.immunization.vaccineCode) ?? '',
        ),
      ),
  );
  if (!mostRecentSelectAdjuvantDate) return forecasts;

  const futureSpacingDate = dateFromIceDuration({
    startDate: mostRecentSelectAdjuvantDate,
    duration: '28d',
  });

  return forecasts.map((forecast) => {
    const nextDoseForecast = forecast.nextDoseForecast;
    if (
      !nextDoseForecast ||
      !forecastTargetsSelectAdjuvantProduct(forecast, selectAdjuvantCvxCodes)
    ) {
      return forecast;
    }

    const adjustedEarliestRecommendedDate =
      adjustSelectAdjuvantRecommendationDate({
        date: nextDoseForecast.earliestRecommendedDate,
        mostRecentSelectAdjuvantDate,
        futureSpacingDate,
        evaluationDate,
      });
    const adjustedRecommendedDate = adjustSelectAdjuvantRecommendationDate({
      date: nextDoseForecast.recommendedDate,
      mostRecentSelectAdjuvantDate,
      futureSpacingDate,
      evaluationDate,
    });

    if (
      adjustedEarliestRecommendedDate ===
        nextDoseForecast.earliestRecommendedDate &&
      adjustedRecommendedDate === nextDoseForecast.recommendedDate
    ) {
      return forecast;
    }

    const adjustedNextDoseForecast = {
      ...nextDoseForecast,
      earliestRecommendedDate: adjustedEarliestRecommendedDate,
      recommendedDate: adjustedRecommendedDate,
    };

    return {
      ...forecast,
      nextDoseForecast: adjustedNextDoseForecast,
      recommendation: forecast.recommendation
        ? {
            ...forecast.recommendation,
            earliestRecommendedDate:
              adjustedEarliestRecommendedDate ??
              forecast.recommendation.earliestRecommendedDate,
            recommendedDate:
              adjustedRecommendedDate ?? forecast.recommendation.recommendedDate,
          }
        : forecast.recommendation,
    };
  });
}

function forecastTargetsSelectAdjuvantProduct(
  forecast: IceSeriesForecast,
  selectAdjuvantCvxCodes: Set<string>,
) {
  const nextDoseForecast = forecast.nextDoseForecast;
  if (!nextDoseForecast) return false;

  if (
    nextDoseForecast.recommendedVaccine?.cvx &&
    selectAdjuvantCvxCodes.has(nextDoseForecast.recommendedVaccine.cvx)
  ) {
    return true;
  }

  return nextDoseForecast.dose.vaccines.some((vaccine) =>
    selectAdjuvantCvxCodes.has(vaccine.cvx),
  );
}

function adjustSelectAdjuvantRecommendationDate({
  date,
  mostRecentSelectAdjuvantDate,
  futureSpacingDate,
  evaluationDate,
}: {
  date?: string;
  mostRecentSelectAdjuvantDate: string;
  futureSpacingDate: string;
  evaluationDate: string;
}) {
  if (!date) return date;
  if (
    date < futureSpacingDate &&
    (mostRecentSelectAdjuvantDate !== evaluationDate ||
      date > mostRecentSelectAdjuvantDate)
  ) {
    return futureSpacingDate;
  }
  if (date < mostRecentSelectAdjuvantDate) {
    return mostRecentSelectAdjuvantDate;
  }
  return date;
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

function latestDoseDate(doses: IceSeriesDoseMatch[]) {
  return latestDate(
    doses.map((dose) => dose.immunization.date).filter(isDefined),
  );
}

function latestDate(dates: string[]) {
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1];
}

function normalizeCvx(code?: string) {
  if (!code) return undefined;
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) return String(numeric).padStart(2, '0');
  return trimmed;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
