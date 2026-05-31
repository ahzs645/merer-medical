---
title: Project Overview
description: What Mere Medical is, who the developer docs are for, and where the major code areas live.
---

Mere Medical is a self-hosted, privacy-focused personal health record. The web app aggregates clinical data from patient portals and portable record files, keeps the working copy in the browser, and supports export through `.emrpkg`.

These docs are for maintainers, contributors, and reviewers working on implementation details. End-user material can continue to live in the existing `apps/docs` site.

## Repository areas

| Area | Purpose |
| --- | --- |
| `apps/web` | React client, routes, repositories, FHIR services, clinical feature tabs, and local persistence providers. |
| `apps/api` | Optional NestJS API for portal OAuth callbacks and proxy behavior. |
| `packages/domain` | Shared entity types, schemas, and ID helpers. |
| `packages/data` | Store-neutral `AppDataClient` interface and factory. |
| `packages/local-dexie` | Dexie implementation of the local data client and package import/export helpers. |
| `docs` | Developer markdown sources and this Starlight docs app. |

## Documentation split

The new Starlight docs app is intended for structured developer documentation. Keep implementation references, architecture decisions, and internal contracts here. The existing Docusaurus app can remain the end-user documentation surface until it is intentionally migrated.
