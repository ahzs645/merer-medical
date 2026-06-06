import { dateMeetsMinimumDuration } from './iceDuration.js';
import type {
  ForecastPatient,
  IceNextDoseForecast,
  IceSeason,
  IceSeriesDefinition,
  IceSeriesForecast,
  IceSeriesRecommendation,
} from './types.js';

export function selectH1n1Series(
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

export function buildH1n1Recommendation({
  season,
  evaluationDate,
  status,
  nextDoseForecast,
}: {
  series: IceSeriesDefinition;
  season?: IceSeason;
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

function markSelected(forecast: IceSeriesForecast, selectionReason: string) {
  return {
    ...forecast,
    selected: true,
    selectionReason,
  };
}
