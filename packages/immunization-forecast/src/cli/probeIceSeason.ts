import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { findIceSeasonForDate } from '../iceSeason.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const vaccineGroup = process.argv[3] ?? 'COVID_19';
const evaluationDate = process.argv[4] ?? '2026-06-01';
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
const season = findIceSeasonForDate({
  dataset,
  vaccineGroup,
  evaluationDate,
});

console.log(
  JSON.stringify(
    season
      ? {
          code: season.code,
          display: season.display,
          vaccineGroup: season.vaccineGroup?.code,
          defaultSeason: season.defaultSeason,
          startDate: season.startDate,
          endDate: season.endDate,
          defaultStartMonthAndDay: season.defaultStartMonthAndDay,
          defaultStopMonthAndDay: season.defaultStopMonthAndDay,
        }
      : undefined,
    null,
    2,
  ),
);
