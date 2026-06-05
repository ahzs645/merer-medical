import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

import { IceRule, IceRuleFile, IceRuleFileKind } from './types.js';

const RULE_FILE_EXTENSIONS = new Set(['.drl', '.dsl', '.dslr']);

export function loadIceRuleCatalog(rulesRoot: string): IceRuleFile[] {
  return listRuleFiles(rulesRoot)
    .sort()
    .map((path) => mapRuleFile(rulesRoot, path));
}

export function summarizeIceRuleCatalog(ruleFiles: IceRuleFile[]) {
  return {
    files: ruleFiles.length,
    rules: ruleFiles.reduce((total, file) => total + file.rules.length, 0),
    filesByKind: countBy(ruleFiles, (file) => file.kind),
    rulesByKind: countRulesBy(ruleFiles, (rule) => rule.kind),
    rulesByVaccineGroup: countRulesBy(
      ruleFiles,
      (rule) => rule.vaccineGroup ?? 'UNKNOWN',
    ),
  };
}

function listRuleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listRuleFiles(path);
    return RULE_FILE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function mapRuleFile(rulesRoot: string, path: string): IceRuleFile {
  const content = readFileSync(path, 'utf8');
  const stats = statSync(path);
  const fileName = basename(path);
  const kind = inferRuleFileKind(fileName);
  const vaccineGroup = inferVaccineGroup(fileName);
  const season = inferSeason(fileName);
  const lines = content.split(/\r?\n/);

  return {
    path,
    relativePath: relative(rulesRoot, path),
    fileName,
    extension: extname(path).slice(1),
    kind,
    vaccineGroup,
    season,
    lineCount: lines.length,
    byteSize: stats.size,
    rules: extractRules(lines, {
      fileName,
      kind,
      vaccineGroup,
      season,
    }),
  };
}

function extractRules(
  lines: string[],
  context: {
    fileName: string;
    kind: IceRuleFileKind;
    vaccineGroup?: string;
    season?: string;
  },
): IceRule[] {
  const rules: IceRule[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const ruleMatch = lines[index].match(/^\s*rule\s+"([^"]+)"/);
    if (!ruleMatch) continue;

    const rule: IceRule = {
      name: ruleMatch[1],
      line: index + 1,
      fileName: context.fileName,
      kind: context.kind,
      vaccineGroup: context.vaccineGroup ?? inferRuleVaccineGroup(ruleMatch[1]),
      season: context.season,
    };

    const extendsMatch = lines[index + 1]?.match(/^\s*extends\s+"([^"]+)"/);
    if (extendsMatch) rule.extends = extendsMatch[1];

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (cursor !== index + 1 && /^\s*rule\s+"/.test(lines[cursor])) break;
      if (/^\s*when\s*$/.test(lines[cursor])) break;

      const ruleflowMatch = lines[cursor].match(/ruleflow-group\s+"([^"]+)"/);
      if (ruleflowMatch) rule.ruleflowGroup = ruleflowMatch[1];

      const activationMatch = lines[cursor].match(/activation-group\s+"([^"]+)"/);
      if (activationMatch) rule.activationGroup = activationMatch[1];
    }

    rules.push(rule);
  }

  return rules;
}

function inferRuleFileKind(fileName: string): IceRuleFileKind {
  const parts = fileNameWithoutExtension(fileName).split('^');
  const classifiers = parts.slice(3);
  const joined = classifiers.join('^');

  if (fileName.endsWith('.dsl')) return 'dsl';
  if (joined.includes('SeriesSelection')) return 'series-selection';
  if (joined.includes('DuplicateShotSameDay')) return 'duplicate-shot-same-day';
  if (joined.includes('CandidateDoses')) return 'candidate-doses';
  if (joined.includes('CandidateSeries')) return 'candidate-series';
  if (classifiers[0] === 'Any') return 'any';
  if (classifiers[0] === 'Evaluation') return 'evaluation';
  if (classifiers[0] === 'Recommendation') return 'recommendation';
  if (classifiers[0] === 'Immunity') return 'immunity';
  if (fileName.includes('knowledgeCommon')) return 'common';
  if (classifiers.length === 0) return 'common';
  return 'other';
}

function inferVaccineGroup(fileName: string): string | undefined {
  const classifiers = fileNameWithoutExtension(fileName).split('^').slice(3);
  const group = classifiers.find(
    (part) =>
      ![
        'Any',
        'Evaluation',
        'Recommendation',
        'DuplicateShotSameDay',
        'Aug2025Season',
        'Dec2020Season',
        'Sep2023Season',
      ].includes(part) &&
      !part.includes('SeriesSelection') &&
      !part.includes('Candidate'),
  );

  return group ? normalizeVaccineGroup(group) : undefined;
}

function inferSeason(fileName: string): string | undefined {
  const classifiers = fileNameWithoutExtension(fileName).split('^').slice(3);
  return classifiers.find((part) => part.endsWith('Season'));
}

function inferRuleVaccineGroup(ruleName: string): string | undefined {
  const patterns: Array<[RegExp, string]> = [
    [/\bCOVID-?19\b|\bCOVID_19\b/i, 'COVID_19'],
    [/\bDTP\b/i, 'DTP'],
    [/\bH1N1\b/i, 'H1N1'],
    [/\bHPV\b/i, 'HPV'],
    [/\bHep A\b|\bHepA\b/i, 'HEPA'],
    [/\bHep B\b|\bHepB\b/i, 'HEPB'],
    [/\bHib\b/i, 'HIB'],
    [/\bInfluenza\b/i, 'INFLUENZA'],
    [/\bJapaneseEncephalitis\b|\bJapanese Encephalitis\b/i, 'JAPANESEENCEPHALITIS'],
    [/\bMCV\b/i, 'MCV'],
    [/\bMMR\b/i, 'MMR'],
    [/\bMeningB\b|\bMening B\b/i, 'MENINGB'],
    [/\bMpox\b/i, 'MPOX'],
    [/\bPNEUMOCOCCAL\b|\bPneumococcal\b/i, 'PNEUMOCOCCAL'],
    [/\bPolio\b|\bfIPV\b/i, 'POLIO'],
    [/\bROTAVIRUS\b|\bRotavirus\b|\bRV1\b/i, 'ROTAVIRUS'],
    [/\bRSV\b/i, 'RSV'],
    [/\bVaricella\b/i, 'VARICELLA'],
    [/\bZOSTER\b|\bZoster\b/i, 'ZOSTER'],
  ];

  return patterns.find(([pattern]) => pattern.test(ruleName))?.[1];
}

function normalizeVaccineGroup(value: string) {
  return value.replace(/COVID19/g, 'COVID_19').toUpperCase();
}

function fileNameWithoutExtension(fileName: string) {
  return fileName.slice(0, -extname(fileName).length);
}

function countBy<T>(items: T[], keyFor: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyFor(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function countRulesBy(
  ruleFiles: IceRuleFile[],
  keyFor: (rule: IceRule) => string,
) {
  return countBy(
    ruleFiles.flatMap((file) => file.rules),
    keyFor,
  );
}
