---
title: "Tooling and Data Pipelines"
description: "Developer notes for terminology, lab reference, and supporting scripts."
sidebar:
  order: 7
---

The repository includes scripts for maintaining reference data and generated packages. These scripts live in `tools` and are intended to be run from the repository root.

## Pipeline Commands

| Command | Purpose |
| --- | --- |
| `npm run labs:references` | Runs the lab reference pipeline with `--all`. |
| `npm run labs:nonclinical` | Runs the non-clinical lab classification pipeline with `--all`. |
| `node tools/build-terminology-pack.mjs` | Builds terminology package artifacts. |
| `node tools/fetch-terminology-snapshots.mjs` | Fetches terminology snapshots. |
| `node tools/build-ahs-mychart-emrpkg.mjs` | Builds an AHS MyChart EMR package fixture/artifact. |
| `node tools/build-diabetes-records-emrpkg.mjs` | Builds diabetes record EMR package data. |
| `node tools/parse-health-summary.mjs` | Parses health-summary source data. |

## Data Directories

| Path | Contents |
| --- | --- |
| `data/lab-reference-imports` | Source analysis and promoted lab reference standards. |
| `data/lab-reference-imports/loincMetadata` | LOINC metadata sources and analysis. |
| `data/lab-reference-imports/plausibilityRanges` | Plausibility-range source data and analysis. |
| `data/terminology-snapshots` | Terminology snapshot documentation and generated data. |

## Working With Generated Data

- Keep source provenance in the data directory README or source-analysis file.
- Prefer deterministic scripts over manual edits to generated artifacts.
- Keep large generated churn out of unrelated feature changes.
- If a pipeline changes user-visible interpretation of labs or terminology, document the source and add a test or fixture that captures the expected behavior.

## EMR Packages

The EMR package format is documented in the repository-level docs at `docs/emrpkg-format.md`. App-level import/export implementation lives in `apps/web/src/services/emrpkg` and `packages/local-dexie`.

Use the package helpers when creating fixtures so import/export behavior stays compatible with the app.
