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

assertMmrConcreteRulePortsComplete();
assertMmrMmrvWinsSameDay();
assertMmrCvx03WinsSameDay();
assertMmrEarlyInfantAcceptedOutsideRoutine();
assertMmrAdultDose2AcceptedExtraDose();
assertMmrAdultOneDoseComplete();
assertMmrMmrvLiveVirusInterval();
assertMmrBornBefore1957Conditional();
assertMmrCompleteHighRisk();

console.log('ICE MMR rule regression checks passed.');

function assertMmrConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(dataset.ruleFiles, 'MMR');
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete MMR rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function evaluateMmr({
  birthDate = '2020-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId: 'MMR_2_DOSE_SERIES',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected MMR forecast');
  return forecast;
}

function assertMmrMmrvWinsSameDay() {
  const forecast = evaluateMmr({
    immunizations: [
      mmrDose('mmr-dose-03', '03', '2021-01-01'),
      mmrDose('mmrv-dose-94', '94', '2021-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '94');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '03');
}

function assertMmrCvx03WinsSameDay() {
  const forecast = evaluateMmr({
    immunizations: [
      mmrDose('measles-dose-05', '05', '2021-01-01'),
      mmrDose('mmr-dose-03', '03', '2021-01-01'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.matchedDoses[0]?.immunization.vaccineCode, '03');
  assert.deepEqual(forecast.invalidDoses[0]?.reasons, ['DUPLICATE_SAME_DAY']);
  assert.equal(forecast.invalidDoses[0]?.immunization.vaccineCode, '05');
}

function assertMmrEarlyInfantAcceptedOutsideRoutine() {
  const forecast = evaluateMmr({
    birthDate: '2020-01-01',
    evaluationDate: '2020-07-01',
    immunizations: [mmrDose('early-mmr', '03', '2020-06-28')],
  });

  assert.equal(forecast.completedDoses, 0);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, [
    'OUTSIDE_ROUTINE_SERIES',
  ]);
}

function assertMmrAdultDose2AcceptedExtraDose() {
  const forecast = evaluateMmr({
    birthDate: '1980-01-01',
    evaluationDate: '2020-01-01',
    immunizations: [
      mmrDose('mmr-dose-1', '03', '1995-01-01'),
      mmrDose('mmr-dose-2-adult', '03', '2020-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.acceptedDoses.length, 1);
  assert.deepEqual(forecast.acceptedDoses[0]?.reasons, ['EXTRA_DOSE']);
}

function assertMmrAdultOneDoseComplete() {
  const forecast = evaluateMmr({
    birthDate: '1980-01-01',
    evaluationDate: '2020-01-01',
    immunizations: [mmrDose('mmr-dose-1', '03', '1995-01-01')],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.nextDose, undefined);
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
}

function assertMmrMmrvLiveVirusInterval() {
  const forecast = evaluateMmr({
    birthDate: '2020-01-01',
    evaluationDate: '2021-03-01',
    immunizations: [
      mmrDose('mmr-dose-1', '03', '2021-02-01'),
      mmrDose('mmrv-dose-2-too-soon', '94', '2021-02-15'),
    ],
  });

  assert.equal(forecast.completedDoses, 1);
  assert.equal(forecast.invalidDoses.length, 1);
  assert.ok(forecast.invalidDoses[0]?.reasons.includes('TOO_EARLY_LIVE_VIRUS'));
}

function assertMmrBornBefore1957Conditional() {
  const forecast = evaluateMmr({
    birthDate: '1956-12-31',
    evaluationDate: '1965-01-01',
  });

  assert.equal(forecast.status, 'not-complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
}

function assertMmrCompleteHighRisk() {
  const forecast = evaluateMmr({
    birthDate: '2020-01-01',
    evaluationDate: '2026-06-01',
    immunizations: [
      mmrDose('mmr-dose-1', '03', '2021-01-01'),
      mmrDose('mmr-dose-2', '03', '2024-01-01'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
}

function mmrDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'MMR',
    vaccineCode,
    date,
  };
}
