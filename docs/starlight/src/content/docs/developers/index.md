---
title: "Developer Guide"
description: "How to work on Mere Medical's apps, packages, integrations, and docs."
sidebar:
  order: 1
---

Mere Medical is an Nx monorepo with a React web app, a NestJS API, FHIR/OAuth integration libraries, local-first data packages, and this Starlight documentation site.

Use this guide when you want to build a feature, fix an integration, update the data model, or understand where a change belongs.

## Repository Map

| Path | Purpose |
| --- | --- |
| `apps/web` | React application built with Vite. Most product UI, local database access, FHIR sync orchestration, AI features, and user workflows live here. |
| `apps/api` | NestJS API used for static serving, public runtime config, OAuth helper endpoints, patient portal proxying, and server-side integration support. |
| `apps/web-e2e` | Playwright end-to-end tests for the web app. |
| `libs/fhir-oauth` | Shared OAuth and SMART-on-FHIR client helpers used by the web app and provider-specific integrations. |
| `libs/epic`, `libs/cerner`, `libs/healow`, `libs/veradigm` | Provider-specific metadata and helper libraries. |
| `libs/crypto` | Browser and shared crypto helpers, including JWT signing support used by SMART flows. |
| `libs/vector-storage` | Vector storage helpers used by semantic search and AI workflows. |
| `packages/domain` | Shared domain types, schemas, and ID helpers. Prefer these contracts for cross-package data shapes. |
| `packages/data` | Data client abstraction for application persistence. |
| `packages/local-dexie` | Dexie-backed local storage, import/export, migrations, and package format support. |
| `tools` | Data import and enrichment pipelines, including terminology and lab-reference tooling. |
| `docs/starlight` | Public documentation site. |

## Common Commands

Run commands from the repository root unless noted otherwise.

| Command | What it does |
| --- | --- |
| `npm install` | Install root workspace dependencies. Requires the Node and npm versions declared in the root `package.json`. |
| `npm run dev` | Start the API and web app together through Nx. |
| `npm run build` | Build the default Nx project graph targets. |
| `npm test` | Run the default Nx test target. |
| `npx nx test web` | Run web unit tests. |
| `npx nx test api` | Run API unit tests. |
| `npx nx e2e web-e2e` | Run Playwright tests with the app dev server. |
| `npm run docs:dev` | Start the Starlight docs locally. |
| `npm run docs:build` | Build the documentation site. |
| `npm run labs:references` | Run the lab reference pipeline. |
| `npm run labs:nonclinical` | Run the non-clinical lab classification pipeline. |

## Development Rules Of Thumb

- Keep browser-only code in `apps/web`, server-only code in `apps/api`, and reusable integration logic in `libs/*` or `packages/*`.
- Use the `@mere/*` TypeScript path aliases from `tsconfig.base.json` for cross-package imports.
- Treat `packages/domain` as the shared contract layer. If an app and a package need the same type or schema, put the stable contract there.
- Prefer repository and service helpers in `apps/web/src/repositories` and `apps/web/src/services` over direct database access from UI components.
- Add or update tests beside the behavior you change. The repo uses Jest for unit tests and Playwright for browser flows.
- Keep patient data and OAuth secrets out of fixtures, logs, commits, and docs examples.

## More Developer Pages

- [Local Development](/docs/developers/local-development/)
- [Architecture](/docs/developers/architecture/)
- [Data Model and Storage](/docs/developers/data-model-and-storage/)
- [FHIR Integrations](/docs/developers/fhir-integrations/)
- [Testing](/docs/developers/testing/)
- [Tooling and Data Pipelines](/docs/developers/tooling-and-data-pipelines/)
