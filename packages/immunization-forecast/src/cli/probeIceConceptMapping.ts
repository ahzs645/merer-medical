import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { findIceConceptMappingsForSource } from '../iceXml.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const sourceCode = process.argv[3] ?? '165';
const sourceCodeSystem = process.argv[4] ?? '2.16.840.1.113883.12.292';
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
const mappings = findIceConceptMappingsForSource({
  methods: dataset.conceptDeterminationMethods,
  sourceCode,
  sourceCodeSystem,
});

console.log(
  JSON.stringify(
    mappings.map((mapping) => ({
      target: mapping.target,
      sources: mapping.sources
        .filter(
          (source) =>
            source.codeSystem === sourceCodeSystem &&
            source.concepts.some((concept) => concept.code === sourceCode),
        )
        .map((source) => ({
          codeSystem: source.codeSystem,
          codeSystemName: source.codeSystemName,
          concepts: source.concepts.filter(
            (concept) => concept.code === sourceCode,
          ),
        })),
    })),
    null,
    2,
  ),
);
