---
title: "Agent Tasks"
description: "Common AI-agent workflows for Mere Medical."
sidebar:
  order: 2
---

Use these workflows as starting points. They are intentionally narrow so agents can make useful changes without drifting into high-risk areas.

## Fix Or Add Documentation

1. Inspect `docs/starlight/astro.config.mjs` and the relevant page under `docs/starlight/src/content/docs`.
2. Keep links rooted at `/docs/.../` because the site is served with `base: /docs`.
3. Run `npm run docs:build`.
4. Mention any pages that still need human review for product accuracy.

## Add A Runtime Config Field

1. Add server exposure in `apps/api/src/app/config/config.service.ts` only if the value is safe for the browser.
2. Add the matching client type and cache handling in `apps/web/src/app/providers/AppConfigProvider.tsx`.
3. If the field controls a provider module, update `apps/api/src/app/app.module.ts`.
4. Add or update config tests.

Never expose secrets, refresh tokens, private keys, or patient-specific data through instance config.

## Debug A Portal Sync Issue

1. Identify the provider service in `apps/web/src/services/fhir`.
2. Check whether the flow uses direct browser calls, `libs/fhir-oauth`, or the API proxy.
3. Inspect mapper tests for `DSTU2.ts` or `R4.ts` before changing resource conversion.
4. Verify sync timestamps use `recordSyncSuccess` and `recordSyncError` correctly.
5. Avoid adding logs for raw bundles or tokens.

## Update Data Import Or `.emrpkg`

1. Read `docs/emrpkg-format.md` and `packages/README.md`.
2. Use helpers in `packages/local-dexie/src/package-format.ts` and `apps/web/src/services/emrpkg`.
3. Keep RxDB-shaped and Dexie-shaped package differences explicit.
4. Add fixture coverage with synthetic data.

## Work On AI Features

1. Inspect `apps/web/src/services/ai/types.ts` for the provider contract.
2. Inspect `apps/web/src/features/ai-chat` for chat and RAG orchestration.
3. Inspect `libs/vector-storage` and `apps/web/src/features/vectors` for vector lifecycle.
4. Confirm whether `mere.useDexieRepos` affects the path you are touching.
5. Do not add telemetry or logs containing prompts built from health records.
