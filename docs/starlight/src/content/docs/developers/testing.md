---
title: "Testing"
description: "How to run and add tests for Mere Medical."
sidebar:
  order: 6
---

Mere Medical uses Jest for unit tests and Playwright for end-to-end browser tests. Nx owns the project targets.

## Run Tests

```bash
npx nx test web
npx nx test api
npx nx test epic
npx nx test cerner
npx nx test fhir-oauth
npx nx e2e web-e2e
```

You can also run the root default test command:

```bash
npm test
```

## Where Tests Live

| Area | Test location |
| --- | --- |
| Web app services and UI | `apps/web/src/**/*.spec.ts` and `apps/web/src/**/*.spec.tsx` |
| API modules | `apps/api/src/**/*.spec.ts` |
| Provider libraries | `libs/*/src/**/*.spec.ts` or library-level specs |
| Browser flows | `apps/web-e2e/src` |
| Test database helpers | `apps/web/src/test-utils` |

## What To Test

For integration changes, add focused tests around:

- OAuth URL, token, and session helpers.
- FHIR mapper output for each new resource type.
- Incremental sync behavior and failure recovery.
- Repository behavior that creates, updates, deletes, or cascades local records.
- API endpoints that handle callbacks, token exchange, proxying, or public config.

For UI changes, cover:

- The state transition or repository/service call behind the UI.
- Loading, empty, error, and success states when the workflow handles patient data.
- Keyboard and accessibility behavior for repeated workflows.

## Test Data

Keep fixtures synthetic and minimal. Do not commit real patient records, real tokens, real portal account details, or screenshots containing protected health information.

When a realistic FHIR shape matters, use a compact synthetic bundle entry with only the fields required by the mapper or service being tested.

## Docs Verification

When changing Starlight content, run:

```bash
npm run docs:build
```

This catches broken frontmatter, invalid MDX, and many internal content issues before deployment.
