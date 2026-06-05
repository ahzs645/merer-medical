import { join } from 'node:path';

import { IceDatasetPaths } from './iceYaml.js';

export function iceDatasetPathsFromRepoRoot(repoRoot: string): IceDatasetPaths {
  const dataRoot = join(
    repoRoot,
    'vendor/ice/opencds-decision-support-service/src/main/resources/data',
  );
  const moduleData = join(
    dataRoot,
    'knowledgeModule/org.nyc.cir.ice/ice-supporting-data',
  );

  return {
    conceptDeterminationMethods: join(
      repoRoot,
      'vendor/ice/opencds-decision-support-service/src/main/resources/config/conceptDeterminationMethods/cdm.xml',
    ),
    ruleCatalogRoot: join(
      repoRoot,
      'vendor/ice/opencds-decision-support-rules/src/main/resources/drools',
    ),
    supportedVaccines: join(moduleData, 'supportedVaccines.yml'),
    supportedVaccineGroups: join(moduleData, 'supportedVaccineGroups.yml'),
    supportedSeries: join(moduleData, 'supportedSeries.yml'),
    supportedSeasons: join(moduleData, 'supportedSeasons.yml'),
    seriesPlanDefinitionsDir: join(dataRoot, 'seriesPlanDefinitions'),
  };
}
