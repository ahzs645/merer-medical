---
title: "Data Model and Storage"
description: "How Mere Medical represents records, connections, local storage, and imports."
sidebar:
  order: 4
---

Mere Medical stores health data locally in the browser. The app uses RxDB collections backed by Dexie/IndexedDB, with package-level helpers for import, export, encryption, and migrations.

## Main Concepts

| Concept | Where to look | Notes |
| --- | --- | --- |
| User documents | `apps/web/src/models/user-document` | Local user profile records. |
| Connection documents | `apps/web/src/models/connection-document` | Patient portal connection metadata, tokens, sync timestamps, and provider-specific fields. |
| Clinical documents | `apps/web/src/models/clinical-document` | Normalized wrapper around raw FHIR resources and imported records. |
| Instance config | `apps/web/src/models/instance-config` | Cached public server configuration. |
| Workflow records | `apps/web/src/models/workflow-record` | App workflow state. |
| Vector storage documents | `apps/web/src/models/vector-storage-document` | Local vector/search data used by AI and semantic search. |
| Domain contracts | `packages/domain` | Shared schemas, types, and ID helpers. |
| Local Dexie storage | `packages/local-dexie` | Dexie database implementation, migrations, package format, import/export, and crypto helpers. |

## Clinical Documents

FHIR resources are preserved as raw source data inside a clinical document. Mapper functions add a stable internal wrapper with:

- `user_id`
- `connection_record_id`
- `data_record.raw`
- `data_record.format`, such as `FHIR.DSTU2` or `FHIR.R4`
- `data_record.resource_type`
- `metadata`, such as source ID, display name, and date

Mapper functions live in:

- `apps/web/src/services/fhir/DSTU2.ts`
- `apps/web/src/services/fhir/R4.ts`

When adding a new FHIR resource type, update the relevant mapper and add a focused unit test with a realistic bundle entry.

## Connections And Sync State

Connection documents track provider-specific connection data and sync health. Shared sync helpers live in `apps/web/src/services/fhir/ConnectionService.ts`.

Important sync fields include:

- `last_refreshed`: time of the last successful sync
- `last_sync_attempt`: time of the last attempted sync
- `last_sync_was_error`: whether the last attempt failed

Incremental sync helpers live in `apps/web/src/services/fhir/incrementalSync.ts`. The app sends a `_lastUpdated` search parameter after successful syncs and includes a one-day overlap to reduce the chance of missing records updated during a previous sync.

## Import And Export

EMR package import/export support lives in:

- `apps/web/src/services/emrpkg`
- `packages/local-dexie/src/exportImport.ts`
- `packages/local-dexie/src/package-format.ts`
- `docs/emrpkg-format.md`

Prefer the package-format helpers over ad hoc JSON handling so versioning, validation, and compatibility stay centralized.

## AppDataClient And Dexie Bridge

The newer package scaffold is designed around an `AppDataClient` interface:

```text
UI -> @mere/data -> @mere/local-dexie
                -> future cloud/sync adapter
```

The existing app still defaults to RxDB. A development flag lets selected repositories use the Dexie-backed client:

```js
localStorage.setItem('mere.useDexieRepos', 'true');
localStorage.removeItem('mere.useDexieRepos');
```

This flag is for development, not general use. Some app flows still read and write RxDB directly. In particular, vectors, summary, timeline, AI search, and other direct collection users can still hit RxDB while migrated repositories hit Dexie. The vector pipeline is disabled while `mere.useDexieRepos` is enabled because it still depends on RxDB collections.

When adding new persistence behavior, prefer repository or `AppDataClient` commands over raw collection calls. That keeps the app easier to move from RxDB-only storage to the newer Dexie and future sync paths.

## Migrations

Local database migrations live near the storage implementation and collection schemas. When changing persisted document shapes:

1. Update the schema/type.
2. Add a migration for existing local data when needed.
3. Update test fixtures in `apps/web/src/test-utils`.
4. Add or update repository/service tests for the behavior that depends on the new shape.
