import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import {
  summarizeImplementedRulePorts,
  summarizeRulePortCoverageByVaccineGroup,
} from '../iceRulePorts.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const filter = process.argv[3];
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, filter);
const includeDetails = Boolean(filter);

console.log(
  JSON.stringify(
    {
      filter,
      byVaccineGroup: filter
        ? undefined
        : summarizeRulePortCoverageByVaccineGroup(dataset.ruleFiles),
      implemented: coverage.implemented.length,
      matched: coverage.matched.length,
      missing: coverage.missing.map((port) => port.ruleName),
      unported: coverage.unported.length,
      concreteUnported: coverage.concreteUnported.length,
      abstractRules: coverage.abstractRules.length,
      ports: includeDetails
        ? coverage.matched.map((port) => ({
            ruleName: port.ruleName,
            behavior: port.behavior,
            testId: port.testId,
            fileName: port.rule.fileName,
            line: port.rule.line,
            kind: port.rule.kind,
            vaccineGroup: port.rule.vaccineGroup,
          }))
        : undefined,
      unportedRules: includeDetails
        ? coverage.unported.map((rule) => ({
            ruleName: rule.name,
            fileName: rule.fileName,
            line: rule.line,
            kind: rule.kind,
            vaccineGroup: rule.vaccineGroup,
            extends: rule.extends,
            ruleflowGroup: rule.ruleflowGroup,
            activationGroup: rule.activationGroup,
          }))
        : undefined,
      concreteUnportedRules: includeDetails
        ? coverage.concreteUnported.map((rule) => ({
            ruleName: rule.name,
            fileName: rule.fileName,
            line: rule.line,
            kind: rule.kind,
            vaccineGroup: rule.vaccineGroup,
            extends: rule.extends,
            ruleflowGroup: rule.ruleflowGroup,
            activationGroup: rule.activationGroup,
          }))
        : undefined,
      abstractRuleDetails: includeDetails
        ? coverage.abstractRules.map((rule) => ({
            ruleName: rule.name,
            fileName: rule.fileName,
            line: rule.line,
            kind: rule.kind,
            vaccineGroup: rule.vaccineGroup,
            ruleflowGroup: rule.ruleflowGroup,
          }))
        : undefined,
    },
    null,
    2,
  ),
);
