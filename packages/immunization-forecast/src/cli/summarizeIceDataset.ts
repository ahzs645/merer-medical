import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { summarizeIceRuleCatalog } from '../iceRules.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

const doses = dataset.seriesDefinitions.reduce(
  (total, series) => total + series.doses.length,
  0,
);
const doseVaccines = dataset.seriesDefinitions.reduce(
  (total, series) =>
    total +
    series.doses.reduce((doseTotal, dose) => doseTotal + dose.vaccines.length, 0),
  0,
);
const doseIntervals = dataset.seriesDefinitions.reduce(
  (total, series) =>
    total +
    series.doses.reduce((doseTotal, dose) => doseTotal + dose.intervals.length, 0),
  0,
);
const seasonsByGroup = dataset.seasons.reduce<Record<string, number>>(
  (groups, season) => {
    const group = season.vaccineGroup?.code ?? 'UNKNOWN';
    groups[group] = (groups[group] ?? 0) + 1;
    return groups;
  },
  {},
);
const conceptMappings = dataset.conceptDeterminationMethods.reduce(
  (total, method) => total + method.mappings.length,
  0,
);
const sourceConcepts = dataset.conceptDeterminationMethods.reduce(
  (total, method) =>
    total +
    method.mappings.reduce(
      (mappingTotal, mapping) =>
        mappingTotal +
        mapping.sources.reduce(
          (sourceTotal, source) => sourceTotal + source.concepts.length,
          0,
        ),
      0,
    ),
  0,
);
const ruleSummary = summarizeIceRuleCatalog(dataset.ruleFiles);

console.log(
  JSON.stringify(
    {
      conceptDeterminationMethods: dataset.conceptDeterminationMethods.length,
      conceptMappings,
      sourceConcepts,
      ruleFiles: ruleSummary.files,
      rules: ruleSummary.rules,
      ruleFilesByKind: ruleSummary.filesByKind,
      rulesByKind: ruleSummary.rulesByKind,
      rulesByVaccineGroup: ruleSummary.rulesByVaccineGroup,
      vaccines: dataset.vaccines.length,
      supportedVaccines: dataset.vaccines.filter((vaccine) => vaccine.supported)
        .length,
      vaccineGroups: dataset.vaccineGroups.length,
      series: dataset.series.length,
      seasons: dataset.seasons.length,
      defaultSeasons: dataset.seasons.filter((season) => season.defaultSeason)
        .length,
      seasonsByGroup,
      seriesDefinitions: dataset.seriesDefinitions.length,
      doses,
      doseVaccines,
      doseIntervals,
      sampleDefaultSeasons: dataset.seasons
        .filter((season) => season.defaultSeason)
        .map((season) => ({
          code: season.code,
          vaccineGroup: season.vaccineGroup?.code,
          defaultStartMonthAndDay: season.defaultStartMonthAndDay,
          defaultStopMonthAndDay: season.defaultStopMonthAndDay,
        })),
      sampleSeries: dataset.seriesDefinitions.slice(0, 5).map((series) => ({
        id: series.id,
        doses: series.doses.length,
        vaccineGroup: series.vaccineGroup?.code,
        sourceFile: series.sourceFile,
      })),
    },
    null,
    2,
  ),
);
