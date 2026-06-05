import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.argv[2] ?? process.cwd();
const compiledRoot = join(
  repoRoot,
  'dist/out-tsc/packages/immunization-forecast/src',
);

const { evaluateIceSeries, selectIceSeries } = await import(
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
const supplementalText = ['JE_NOT_ROUTINE_ACCEL_18_65_SEE_ACIP'];

assertJapaneseEncephalitisConcreteRulePortsComplete();
assertJapaneseEncephalitisSelectionByEvaluationAge();
assertJapaneseEncephalitisSelectionByFirstDoseAge();
assertJapaneseEncephalitisStandardAdultAcceleratedInterval();
assertJapaneseEncephalitisAcceleratedAge66StandardInterval();
assertJapaneseEncephalitisUnder2MonthsNotRecommended();
assertJapaneseEncephalitisTwoMonthsPlusConditional();
assertJapaneseEncephalitisCompleteHighRisk();
assertJapaneseEncephalitisSupplementalText();
assertJapaneseEncephalitisAcceleratedForecastAt66();

console.log('ICE Japanese Encephalitis rule regression checks passed.');

function assertJapaneseEncephalitisConcreteRulePortsComplete() {
  const coverage = summarizeImplementedRulePorts(
    dataset.ruleFiles,
    'JAPANESEENCEPHALITIS',
  );
  assert.equal(
    coverage.concreteUnported.length,
    0,
    `Concrete Japanese Encephalitis rules missing TS ports: ${coverage.concreteUnported
      .map((rule) => rule.name)
      .join(', ')}`,
  );
  assert.equal(coverage.abstractRules.length, 0);
}

function assertJapaneseEncephalitisSelectionByEvaluationAge() {
  assert.equal(
    selectJapaneseEncephalitis({
      birthDate: '2010-06-01',
      evaluationDate: '2026-06-01',
    })?.selected.series.id,
    'JEVC_RISK_2_DOSE_SERIES',
  );
  assert.equal(
    selectJapaneseEncephalitis({
      birthDate: '2000-01-01',
      evaluationDate: '2026-06-01',
    })?.selected.series.id,
    'JEVC_RISK_2_DOSE_ACCELERATED_SERIES',
  );
  assert.equal(
    selectJapaneseEncephalitis({
      birthDate: '1959-06-01',
      evaluationDate: '2026-06-01',
    })?.selected.series.id,
    'JEVC_RISK_2_DOSE_SERIES',
  );
}

function assertJapaneseEncephalitisSelectionByFirstDoseAge() {
  assert.equal(
    selectJapaneseEncephalitis({
      birthDate: '2010-06-01',
      evaluationDate: '2026-06-01',
      immunizations: [jeDose('je-under-18-dose-1', '134', '2026-01-01')],
    })?.selected.series.id,
    'JEVC_RISK_2_DOSE_SERIES',
  );
  assert.equal(
    selectJapaneseEncephalitis({
      birthDate: '2000-01-01',
      evaluationDate: '2026-06-01',
      immunizations: [jeDose('je-adult-dose-1', '134', '2026-01-01')],
    })?.selected.series.id,
    'JEVC_RISK_2_DOSE_ACCELERATED_SERIES',
  );
  assert.equal(
    selectJapaneseEncephalitis({
      birthDate: '1960-01-01',
      evaluationDate: '2026-06-01',
      immunizations: [jeDose('je-age-66-dose-1', '134', '2026-01-01')],
    })?.selected.series.id,
    'JEVC_RISK_2_DOSE_SERIES',
  );
}

function assertJapaneseEncephalitisStandardAdultAcceleratedInterval() {
  const valid = evaluateJapaneseEncephalitis({
    seriesId: 'JEVC_RISK_2_DOSE_SERIES',
    birthDate: '2000-01-01',
    immunizations: [
      jeDose('je-standard-adult-dose-1', '134', '2026-01-01'),
      jeDose('je-standard-adult-dose-2', '134', '2026-01-08'),
    ],
  });
  assert.equal(valid.status, 'complete');
  assert.equal(valid.completedDoses, 2);

  const invalid = evaluateJapaneseEncephalitis({
    seriesId: 'JEVC_RISK_2_DOSE_SERIES',
    birthDate: '2000-01-01',
    immunizations: [
      jeDose('je-standard-adult-dose-1', '134', '2026-01-01'),
      jeDose('je-standard-adult-dose-2-too-soon', '134', '2026-01-07'),
    ],
  });
  assert.equal(invalid.status, 'not-complete');
  assert.equal(invalid.invalidDoses.length, 1);
  assert.deepEqual(invalid.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertJapaneseEncephalitisAcceleratedAge66StandardInterval() {
  const valid = evaluateJapaneseEncephalitis({
    seriesId: 'JEVC_RISK_2_DOSE_ACCELERATED_SERIES',
    birthDate: '1960-01-01',
    immunizations: [
      jeDose('je-accelerated-age66-dose-1', '134', '2026-01-01'),
      jeDose('je-accelerated-age66-dose-2', '134', '2026-01-25'),
    ],
  });
  assert.equal(valid.status, 'complete');
  assert.equal(valid.completedDoses, 2);

  const invalid = evaluateJapaneseEncephalitis({
    seriesId: 'JEVC_RISK_2_DOSE_ACCELERATED_SERIES',
    birthDate: '1960-01-01',
    immunizations: [
      jeDose('je-accelerated-age66-dose-1', '134', '2026-01-01'),
      jeDose('je-accelerated-age66-dose-2-too-soon', '134', '2026-01-24'),
    ],
  });
  assert.equal(invalid.status, 'not-complete');
  assert.equal(invalid.invalidDoses.length, 1);
  assert.deepEqual(invalid.invalidDoses[0]?.reasons, [
    'BELOW_ABSOLUTE_MINIMUM_INTERVAL',
  ]);
}

function assertJapaneseEncephalitisUnder2MonthsNotRecommended() {
  const forecast = evaluateJapaneseEncephalitis({
    birthDate: '2026-05-01',
    evaluationDate: '2026-06-01',
  });

  assert.equal(forecast.recommendation?.status, 'not-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, supplementalText);
  assert.deepEqual(forecast.recommendation?.supplementalText, supplementalText);
}

function assertJapaneseEncephalitisTwoMonthsPlusConditional() {
  const forecast = evaluateJapaneseEncephalitis({
    birthDate: '2026-03-01',
    evaluationDate: '2026-06-01',
  });

  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['HIGH_RISK']);
  assert.deepEqual(forecast.recommendation?.supplementalText, supplementalText);
}

function assertJapaneseEncephalitisCompleteHighRisk() {
  const forecast = evaluateJapaneseEncephalitis({
    birthDate: '2000-01-01',
    immunizations: [
      jeDose('je-complete-dose-1', '134', '2026-01-01'),
      jeDose('je-complete-dose-2', '134', '2026-01-08'),
    ],
  });

  assert.equal(forecast.status, 'complete');
  assert.equal(forecast.recommendation?.status, 'conditionally-recommended');
  assert.deepEqual(forecast.recommendation?.reasons, ['COMPLETE_HIGH_RISK']);
  assert.deepEqual(forecast.recommendation?.supplementalText, supplementalText);
}

function assertJapaneseEncephalitisSupplementalText() {
  const forecasts = [
    evaluateJapaneseEncephalitis({
      birthDate: '2026-05-01',
      evaluationDate: '2026-06-01',
    }),
    evaluateJapaneseEncephalitis({
      birthDate: '2026-03-01',
      evaluationDate: '2026-06-01',
    }),
    evaluateJapaneseEncephalitis({
      birthDate: '2000-01-01',
      immunizations: [
        jeDose('je-supp-dose-1', '134', '2026-01-01'),
        jeDose('je-supp-dose-2', '134', '2026-01-08'),
      ],
    }),
  ];

  for (const forecast of forecasts) {
    assert.deepEqual(forecast.recommendation?.supplementalText, supplementalText);
  }
}

function assertJapaneseEncephalitisAcceleratedForecastAt66() {
  const forecast = evaluateJapaneseEncephalitis({
    seriesId: 'JEVC_RISK_2_DOSE_ACCELERATED_SERIES',
    birthDate: '1960-01-10',
    evaluationDate: '2026-01-05',
    immunizations: [jeDose('je-near-66-dose-1', '134', '2026-01-04')],
  });

  assert.equal(forecast.nextDoseForecast?.earliestRecommendedDate, '2026-02-01');
  assert.equal(forecast.nextDoseForecast?.recommendedDate, '2026-02-01');
  assert.equal(forecast.nextDoseForecast?.overdueDate, undefined);
}

function evaluateJapaneseEncephalitis({
  seriesId = 'JEVC_RISK_2_DOSE_SERIES',
  birthDate = '2000-01-01',
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  const [forecast] = evaluateIceSeries({
    dataset,
    seriesId,
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
  assert.ok(forecast, 'Expected Japanese Encephalitis forecast');
  return forecast;
}

function selectJapaneseEncephalitis({
  birthDate,
  evaluationDate = '2026-06-01',
  immunizations = [],
}) {
  return selectIceSeries({
    dataset,
    vaccineGroup: 'JAPANESE_ENCEPHALITIS',
    evaluationDate,
    patient: { birthDate },
    immunizations,
  });
}

function jeDose(id, vaccineCode, date) {
  return {
    id,
    vaccineName: 'Japanese Encephalitis',
    vaccineCode,
    date,
  };
}
