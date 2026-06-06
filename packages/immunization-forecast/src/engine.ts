import {
  evaluateIceSeries,
  selectIceSeries,
  selectIceSeriesForGroups,
} from './iceSeriesEvaluator.js';
import type {
  ForecastImmunization,
  ForecastPatient,
  IceDataset,
  IceSelectedSeriesForecast,
  IceSeriesForecast,
} from './types.js';

export type IceForecastEngineInput = {
  immunizations: ForecastImmunization[];
  patient?: ForecastPatient;
  evaluationDate?: string;
};

export type IceForecastEngine = {
  dataset: IceDataset;
  evaluate(input: IceForecastEngineInput): IceSeriesForecast[];
  evaluateSeries(
    input: IceForecastEngineInput & { seriesId: string },
  ): IceSeriesForecast[];
  select(
    input: IceForecastEngineInput & { vaccineGroup: string },
  ): IceSelectedSeriesForecast | undefined;
  selectForGroups(
    input: IceForecastEngineInput & { vaccineGroups: string[] },
  ): IceSelectedSeriesForecast[];
};

export function createIceForecastEngine(dataset: IceDataset): IceForecastEngine {
  return {
    dataset,
    evaluate(input) {
      return evaluateIceSeries({
        ...input,
        dataset,
      });
    },
    evaluateSeries(input) {
      return evaluateIceSeries({
        ...input,
        dataset,
      });
    },
    select(input) {
      return selectIceSeries({
        ...input,
        dataset,
      });
    },
    selectForGroups(input) {
      return selectIceSeriesForGroups({
        ...input,
        dataset,
      });
    },
  };
}
