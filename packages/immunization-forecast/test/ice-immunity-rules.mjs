import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.argv[2] ?? process.cwd();
const compiledRoot = join(
  repoRoot,
  'dist/out-tsc/packages/immunization-forecast/src',
);

const { evaluateIceSeries } = await import(
  pathToFileURL(join(compiledRoot, 'iceSeriesEvaluator.js'))
);
const { iceDatasetPathsFromRepoRoot } = await import(
  pathToFileURL(join(compiledRoot, 'icePaths.js'))
);
const { loadIceDataset } = await import(
  pathToFileURL(join(compiledRoot, 'iceYaml.js'))
);
const { summarizeImplementedRulePorts } = await import(
  pathToFileURL(join(compiledRoot, 'iceRulePorts.js'))
);

const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));

assertImmunityConcreteRulePortsComplete();
assertHepBDiseaseDocumentedCompletesSeries();
assertHepBProofOfImmunityCompletesSeries();
assertHepADiseaseDocumentedCompletesSeries();
assertHepAProofOfImmunityCompletesSeries();
assertMmrDiseaseDocumentedCompletesSeries();
assertMmrProofOfImmunityCompletesSeries();
assertMmrPartialImmunityDoesNotCompleteSeries();
assertVaricellaDiseaseDocumentedCompletesSeries();
assertVaricellaProofOfImmunityCompletesSeries();

console.log('ICE Immunity rule regression checks passed.');

function assertImmunityConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'IMMUNITY');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Immunity rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function assertHepBDiseaseDocumentedCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'HEP_B_ADULT_3_DOSE_SERIES',
    immunities: [immunity('HEP_B', 'DISEASE_DOCUMENTED')],
  });

  assertCompleteByImmunity(forecast, ['DISEASE_DOCUMENTED'], ['HEP_B']);
}

function assertHepBProofOfImmunityCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'HEP_B_ADULT_3_DOSE_SERIES',
    immunities: [immunity('HEP_B', 'PROOF_OF_IMMUNITY')],
  });

  assertCompleteByImmunity(forecast, ['PROOF_OF_IMMUNITY'], ['HEP_B']);
}

function assertHepADiseaseDocumentedCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    immunities: [immunity('HEP_A', 'DISEASE_DOCUMENTED')],
  });

  assertCompleteByImmunity(forecast, ['DISEASE_DOCUMENTED'], ['HEP_A']);
}

function assertHepAProofOfImmunityCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'HEP_A_2_DOSE_CHILD_ADULT_SERIES',
    immunities: [immunity('HEP_A', 'PROOF_OF_IMMUNITY')],
  });

  assertCompleteByImmunity(forecast, ['PROOF_OF_IMMUNITY'], ['HEP_A']);
}

function assertMmrDiseaseDocumentedCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'MMR_2_DOSE_SERIES',
    immunities: [
      immunity('MEASLES', 'DISEASE_DOCUMENTED'),
      immunity('MUMPS', 'DISEASE_DOCUMENTED'),
      immunity('RUBELLA', 'DISEASE_DOCUMENTED'),
    ],
  });

  assertCompleteByImmunity(forecast, ['DISEASE_DOCUMENTED'], [
    'MEASLES',
    'MUMPS',
    'RUBELLA',
  ]);
}

function assertMmrProofOfImmunityCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'MMR_2_DOSE_SERIES',
    immunities: [
      immunity('MEASLES', 'PROOF_OF_IMMUNITY'),
      immunity('MUMPS', 'PROOF_OF_IMMUNITY'),
      immunity('RUBELLA', 'PROOF_OF_IMMUNITY'),
    ],
  });

  assertCompleteByImmunity(forecast, ['PROOF_OF_IMMUNITY'], [
    'MEASLES',
    'MUMPS',
    'RUBELLA',
  ]);
}

function assertMmrPartialImmunityDoesNotCompleteSeries() {
  const forecast = evaluateOne({
    seriesId: 'MMR_2_DOSE_SERIES',
    immunities: [immunity('MEASLES', 'PROOF_OF_IMMUNITY')],
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.immunityEvidence, undefined);
}

function assertVaricellaDiseaseDocumentedCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'VARICELLA_2_DOSE_SERIES',
    immunities: [immunity('VARICELLA', 'DISEASE_DOCUMENTED')],
  });

  assertCompleteByImmunity(forecast, ['DISEASE_DOCUMENTED'], ['VARICELLA']);
}

function assertVaricellaProofOfImmunityCompletesSeries() {
  const forecast = evaluateOne({
    seriesId: 'VARICELLA_2_DOSE_SERIES',
    immunities: [immunity('VARICELLA', 'PROOF_OF_IMMUNITY')],
  });

  assertCompleteByImmunity(forecast, ['PROOF_OF_IMMUNITY'], ['VARICELLA']);
}

function assertCompleteByImmunity(forecast, reasons, diseases) {
  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 0);
  assert.deepEqual(forecast.recommendation?.reasons, reasons);
  assert.deepEqual(
    forecast.immunityEvidence?.map((evidence) => evidence.disease),
    diseases,
  );
}

function evaluateOne({
  seriesId,
  birthDate = '2000-01-01',
  immunities = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate: '2026-06-01',
    patient: { birthDate, immunities },
    immunizations: [],
  });
  assert.ok(forecast, `Expected forecast for ${seriesId}`);
  return forecast;
}

function immunity(disease, reason) {
  return {
    disease,
    reason,
    date: '2025-01-01',
  };
}
