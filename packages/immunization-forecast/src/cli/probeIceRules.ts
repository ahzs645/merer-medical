import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { summarizeIceRuleCatalog } from '../iceRules.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const filter = process.argv[3];
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
const normalizedFilter = filter?.toUpperCase();
const ruleFiles = normalizedFilter ? filterRuleFiles(normalizedFilter) : dataset.ruleFiles;

console.log(
  JSON.stringify(
    {
      summary: summarizeIceRuleCatalog(ruleFiles),
      files: ruleFiles.map((file) => ({
        fileName: file.fileName,
        kind: file.kind,
        vaccineGroup: file.vaccineGroup,
        season: file.season,
        lineCount: file.lineCount,
        byteSize: file.byteSize,
        rules: file.rules.map((rule) => ({
          name: rule.name,
          line: rule.line,
          extends: rule.extends,
          ruleflowGroup: rule.ruleflowGroup,
          activationGroup: rule.activationGroup,
        })),
      })),
    },
    null,
    2,
  ),
);

function filterRuleFiles(normalizedFilter: string) {
  return dataset.ruleFiles
    .map((file) => {
      const fileMatches =
        file.kind.toUpperCase() === normalizedFilter ||
        file.vaccineGroup === normalizedFilter ||
        file.season?.toUpperCase() === normalizedFilter;
      const matchingRules = file.rules.filter(
        (rule) =>
          fileMatches ||
          rule.kind.toUpperCase() === normalizedFilter ||
          rule.vaccineGroup === normalizedFilter ||
          rule.season?.toUpperCase() === normalizedFilter,
      );

      return matchingRules.length > 0
        ? {
            ...file,
            rules: matchingRules,
          }
        : undefined;
    })
    .filter((file) => file !== undefined);
}
