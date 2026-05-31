---
title: EMR Package Format
description: Overview of the portable `.emrpkg` record archive.
---

`.emrpkg` is Mere Medical's portable health record package. It is used for local import/export and for serverless deployments where portal sync is not available.

## Design goals

- Keep exported records portable across Mere deployments.
- Preserve enough manifest metadata for validation and future migrations.
- Avoid coupling the archive format to a single browser store.
- Support encrypted packages where required by the implementation path.

## Implementation areas

| Area | Purpose |
| --- | --- |
| `packages/local-dexie/src/exportImport.ts` | Import/export orchestration for the local Dexie client. |
| `packages/local-dexie/src/package-format.ts` | Package shape helpers and format-level definitions. |
| `docs/emrpkg-format.md` | Existing detailed source document for the package envelope and manifest. |

Use this page as the Starlight entry point and keep the lower-level format details synchronized with the source markdown while the docs are being migrated.
