---
title: Serverless Mode
description: Running Mere Medical without the optional API service.
---

Mere Medical can run without `apps/api` when records are brought in through `.emrpkg` files instead of live portal sync. In that mode, the browser client and local storage are the core runtime.

## What changes

- Portal OAuth callback routes are unavailable.
- `.emrpkg` import/export becomes the primary ingest and egress path.
- The app remains useful for local review, organization, and portability workflows.

## Related files

| File | Purpose |
| --- | --- |
| `docs/serverless-mode.md` | Existing detailed serverless mode notes. |
| `scripts/serve-web-local.mjs` | Local static web preview helper. |
| `Dockerfile` | Main app container build. |
| `Dockerfile-docs` | Existing Docusaurus docs container build. |
