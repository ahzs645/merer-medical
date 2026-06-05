import { IceDataset, IceSeason } from './types.js';

export type IceSeasonLookupInput = {
  dataset: IceDataset;
  vaccineGroup: string;
  evaluationDate: string;
};

export function findIceSeasonForDate({
  dataset,
  vaccineGroup,
  evaluationDate,
}: IceSeasonLookupInput): IceSeason | undefined {
  const seasons = dataset.seasons.filter(
    (season) => season.vaccineGroup?.code === vaccineGroup,
  );

  const exactSeason = seasons.find(
    (season) =>
      !season.defaultSeason &&
      season.startDate &&
      season.endDate &&
      evaluationDate >= season.startDate &&
      evaluationDate <= season.endDate,
  );
  if (exactSeason) return exactSeason;

  return seasons.find(
    (season) =>
      season.defaultSeason &&
      season.defaultStartMonthAndDay &&
      season.defaultStopMonthAndDay &&
      monthDayFallsInWindow(
        monthDay(evaluationDate),
        season.defaultStartMonthAndDay,
        season.defaultStopMonthAndDay,
      ),
  );
}

function monthDay(date: string) {
  return date.slice(5, 10);
}

function monthDayFallsInWindow(
  value: string,
  startMonthDay: string,
  stopMonthDay: string,
) {
  if (startMonthDay <= stopMonthDay) {
    return value >= startMonthDay && value <= stopMonthDay;
  }

  return value >= startMonthDay || value <= stopMonthDay;
}
