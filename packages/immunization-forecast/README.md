# @mere/immunization-forecast

TypeScript immunization forecasting workbench for Mere.

The package has two layers:

- Browser-safe forecasting exports from `@mere/immunization-forecast`.
- Node-only ICE dataset tooling from `@mere/immunization-forecast/ice`.

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

This is not a full ICE port yet. The first evaluator consumes imported ICE
series definitions and performs sequential CVX allowlist matching across doses.
It also enforces imported absolute minimum age and absolute minimum interval
constraints, returning invalid dose reasons when a shot is too early.
For incomplete series it computes next-dose forecast dates from imported
age and interval constraints, using the latest applicable candidate date for
each forecast category:

- absolute minimum
- minimum
- earliest recommended
- recommended
- overdue

Series selection has started with a generic progress-based fallback and an
HPV-specific selector modeled from ICE `SeriesSelection.drl` for the 2-dose vs
3-dose split.

Season support has started with a resolver that selects an explicitly dated ICE
season when present, then falls back to the default month/day window for groups
such as influenza and RSV.

Concept determination support has started with a typed `cdm.xml` importer and
source-code lookup helper. This preserves the ICE mapping from source concepts
such as CVX codes into OpenCDS concept codes like `VACCINE_CVX_165`.

Rule-port support has started with a typed catalog of the ICE Drools/DSL corpus.
It does not execute Drools; it inventories source files and rule metadata so TS
ports can be tracked against the Java rule corpus.

The first custom evaluation rule ports are:

- ICE HPV CVX 118 male-patient rule: CVX 118 is recorded as accepted with
  `VACCINE_NOT_LICENSED_FOR_MALES`, but is ignored for series completion and
  later dose forecasting.
- ICE HPV age-46 rule: HPV doses administered when the patient is at least 46
  years old and the series is not complete are recorded as accepted with
  `ABOVE_REC_AGE_SERIES`, but do not advance normal series completion.

The first custom recommendation rule ports are HPV-specific:

- Patients at least 46 years old are `not-recommended` with `TOO_OLD`.
- Patients whose next routine recommendation date would be at least age 46 are
  `not-recommended` with `TOO_OLD`.
- Patients age 27 through 45 with no completed HPV doses are
  `conditionally-recommended` with `CLINICAL_PATIENT_DISCRETION` and
  `HPV_NOT_ROUTINE_27_THROUGH_45` supplemental text.
- HPV 3-dose dose 3 uses the ICE custom dose-1-to-dose-3 recommendation
  intervals: earliest `5m`, recommended `6m`, and overdue `7m+4w` if dose 1
  was at age 15 or older, otherwise `13m+4w`.
- HPV 3-dose dose 3 evaluation uses ICE's pre/post-2016 absolute minimum
  interval split from dose 1: `16w-4d` for dose 3 before December 16, 2016,
  and `5m-4d` on or after that date.
- HPV 2-dose dose 2 repeat attempts after an invalid dose 2 must wait at least
  `12w-4d` from the most recent invalid dose 2.

Next work should broaden series selection, add seasonal rules, and port custom
rule behavior from ICE `.dslr` files.
