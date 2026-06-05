import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const outputPath = process.argv[3];

if (!outputPath) {
  throw new Error(
    'Usage: exportIceDataset <repo-root> <output-json-path>',
  );
}

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      outputPath,
      vaccines: dataset.vaccines.length,
      vaccineGroups: dataset.vaccineGroups.length,
      series: dataset.series.length,
      seriesDefinitions: dataset.seriesDefinitions.length,
    },
    null,
    2,
  ),
);
