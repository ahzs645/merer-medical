# @mere/immunization-forecast

TypeScript immunization forecasting workbench for Mere.

The package has two layers:

- Browser-safe forecasting and ICE engine exports from
  `@mere/immunization-forecast`.
- Node-only ICE dataset tooling from `@mere/immunization-forecast/ice`.

## Package Usage

The reusable engine is pure TypeScript once an `IceDataset` is provided. That
keeps application code independent from the local ICE fork or file-system
loader:

```ts
import { createIceForecastEngine } from '@mere/immunization-forecast';

const engine = createIceForecastEngine(dataset);

const forecasts = engine.evaluate({
  patient: { birthDate: '1980-01-01' },
  evaluationDate: '2026-06-01',
  immunizations: [
    {
      id: 'hepb-1',
      vaccineCode: '43',
      vaccineName: 'Hep B, adult',
      date: '2025-01-01',
    },
  ],
});
```

For Mere, the package can stay in this monorepo or be mounted as a submodule.
Consumers import the engine API and pass in a normalized ICE dataset. The
Node-only `/ice` entry can be used by build tooling to load or export that
dataset from the ICE fork.

Build the package for standalone consumption:

```sh
npm --prefix packages/immunization-forecast run build
```

The build emits JavaScript and declaration files into
`packages/immunization-forecast/dist`.

## ICE Dataset Import

The ICE fork is mounted as a git submodule at `vendor/ice`. The importer reads
the portable YAML datasets from:

```text
vendor/ice/opencds-decision-support-service/src/main/resources/data
```

The normalized TypeScript shape currently extracts:

- supported CVX vaccines and product properties
- supported vaccine groups
- supported series
- supported seasons for seasonal vaccine groups
- concept determination mappings from ICE `cdm.xml`
- Drools/DSL rule catalog metadata
- series PlanDefinition YAML
- dose age constraints
- allowed/preferred CVX products per dose
- dose interval constraints
- dated and default seasonal windows for influenza, COVID-19, H1N1, and RSV
- source-code mappings from CVX, sex/gender, ICD, SNOMED, LOINC, and related
  systems into OpenCDS concept codes
- rule file and rule-name inventory for Drools `.drl`, `.dsl`, and `.dslr`
  files, including inferred rule kind, vaccine group, season, inheritance, and
  ruleflow metadata

Run a corpus summary after compiling the package:

```sh
npx tsc -p packages/immunization-forecast/tsconfig.json
node dist/out-tsc/packages/immunization-forecast/src/cli/summarizeIceDataset.js .
```

Export the normalized dataset to JSON:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/exportIceDataset.js . tmp/ice-dataset.normalized.json
```

Probe a data-driven series evaluation:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_2_DOSE_SERIES
```

Probe the first ported custom HPV evaluation rule:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_2_DOSE_SERIES male-cvx-118
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_2_DOSE_SERIES age-46
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_2_DOSE_SERIES age-27-no-doses
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_3_DOSE_SERIES three-dose-next-after-15
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_3_DOSE_SERIES pre-2016-dose3-valid
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeries.js . HPV_2_DOSE_SERIES invalid-dose2-repeat-too-soon
```

Probe data-driven series selection for a vaccine group:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSelection.js . HPV one-dose-before-15
```

Probe a seasonal vaccine window from ICE season data:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceSeason.js . COVID_19 2026-06-01
```

Probe a concept determination mapping for a source code such as CVX 165:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceConceptMapping.js . 165 2.16.840.1.113883.12.292
```

Probe the ICE rule catalog, optionally filtered by kind or vaccine group:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceRules.js . HPV
```

Probe implemented TS rule ports against the ICE rule catalog:

```sh
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceRulePorts.js .
node dist/out-tsc/packages/immunization-forecast/src/cli/probeIceRulePorts.js . HPV
```

Run the focused HPV rule regression checks after compiling:

```sh
npx tsc -p packages/immunization-forecast/tsconfig.json
node packages/immunization-forecast/test/ice-hpv-rules.mjs .
```

## Current Scope

The TypeScript ICE engine now tracks the ICE Java/Drools rule corpus through
`iceRulePorts.ts`. The rule-port probe currently reports zero unported concrete
rules and zero remaining abstract/meta rules.

The engine consumes imported ICE series definitions and implements the TS ports
for selection, evaluation, recommendation, seasonal handling, cross-series
spacing, and vaccine-group-specific custom logic. It does not execute Drools at
runtime; the Java ICE fork is the comparison/reference corpus and dataset
source.

The main evaluator is intentionally being split into smaller modules:

- `dtpRules.ts`
- `pneumococcalRules.ts`
- `covidRules.ts`
- `crossSeriesRules.ts`
- `iceSeriesEvaluator.ts` as the orchestration layer

Future refactors should continue this pattern by extracting additional
vaccine-group hooks into focused modules while preserving the public engine API.
