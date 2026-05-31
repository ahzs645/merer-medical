---
title: "Agent Guide"
description: "How AI coding agents should work safely in the Mere Medical repository."
sidebar:
  order: 1
---

This guide is for AI coding agents and agent-assisted contributors working in the Mere Medical repository. The project handles health data and OAuth integrations, so agents should optimize for small, reviewable, privacy-preserving changes.

## First Moves

1. Read the relevant developer guide page before editing.
2. Inspect the exact files you plan to change.
3. Check the working tree and avoid overwriting unrelated user changes.
4. Keep changes scoped to the request.
5. Run the narrowest meaningful verification command before handing work back.

Useful starting points:

- [Developer Guide](/docs/developers/)
- [Architecture](/docs/developers/architecture/)
- [FHIR Integrations](/docs/developers/fhir-integrations/)
- [Testing](/docs/developers/testing/)

## Privacy And Security Rules

- Do not commit real patient data, screenshots with patient details, OAuth tokens, refresh tokens, client secrets, or portal credentials.
- Do not add logging for raw FHIR bundles, tokens, patient identifiers, or AI prompts that contain record contents.
- Do not expose server-only secrets through `ConfigService`, `AppConfigProvider`, frontend environment variables, docs, or fixtures.
- Use synthetic test data and mark it clearly when the shape resembles real FHIR data.
- Treat AI provider integrations as data egress paths. Make user consent, configuration, and logging choices explicit.

## Codebase Ownership Map

| Task | Start here |
| --- | --- |
| Web UI workflow | `apps/web/src/features/<feature>` |
| Local data schema | `apps/web/src/models`, then `packages/domain` if shared |
| Database access | `apps/web/src/repositories`, `packages/data`, `packages/local-dexie` |
| FHIR resource mapping | `apps/web/src/services/fhir/DSTU2.ts` or `apps/web/src/services/fhir/R4.ts` |
| Provider sync flow | `apps/web/src/services/fhir/<Provider>.ts` |
| OAuth client logic | `libs/fhir-oauth` |
| Server-side provider support | `apps/api/src/app/<provider>` |
| Public runtime config | `apps/api/src/app/config/config.service.ts`, `apps/web/src/app/providers/AppConfigProvider.tsx` |
| Docs | `docs/starlight/src/content/docs` |

## Preferred Change Pattern

1. Make the smallest contract change that solves the problem.
2. Update the service or repository layer before touching UI.
3. Keep provider-specific branches inside provider modules.
4. Add or update focused tests next to the changed behavior.
5. Run the target-specific test or build command.
6. Summarize changed files, verification, and any remaining risk.

## Commands Agents Commonly Need

```bash
npx nx test web
npx nx test api
npx nx test fhir-oauth
npx nx e2e web-e2e
npm run docs:build
```

Use `rg` for search and prefer Nx project targets over ad hoc commands.

## When To Stop And Ask

Ask the maintainer before:

- Changing the EMR package format or local database migration strategy.
- Adding a new external AI provider or sending health data to a new service.
- Broadening OAuth scopes.
- Committing large generated data updates.
- Reworking deployment defaults, Docker files, or public callback URLs.
- Removing support for an existing patient portal or FHIR version.

## Review Checklist

Before returning work, check:

- The change does not leak secrets or patient data.
- New public config fields are safe to expose.
- FHIR mapper changes preserve raw source records.
- Sync failures do not mark a failed sync as successful.
- Tests or docs were updated for new behavior.
- Docs links use the `/docs/.../` base path used by the Starlight site.
