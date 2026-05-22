# RxDB → Dexie migration

Mere has been an RxDB app for years. The migration target is a Dexie-backed
store with a `@mere/data` `AppDataClient` interface in front, so the
storage layer can be swapped for Convex later without touching the UI.
This doc tracks where we are.

## Feature flag

The migration is gated on a runtime flag in `localStorage`. The flag is
read on every repository call, so toggling it takes effect immediately for
new operations.

```js
// Enable
localStorage.setItem('mere.useDexieRepos', 'true');

// Disable
localStorage.removeItem('mere.useDexieRepos');
```

| Flag state    | Repositories hit  | Everything else hits  |
| ------------- | ----------------- | --------------------- |
| off (default) | RxDB              | RxDB                  |
| on            | Dexie             | RxDB                  |

When on, **the two stores will drift** for any data that's written from a
non-repository code path (FHIR sync, vectors, etc.). Use the flag only
when you're not exercising portal sync or vectors in the same session.

The flag constant is exported as `DEXIE_REPOS_FLAG` from
`apps/web/src/repositories/dexie-bridge/`.

## Status by call site

A grep for `from 'rxdb'` returns ~67 files. Below is the migration status
per logical group.

### Done

| Location                                                  | What changed                                 |
| --------------------------------------------------------- | -------------------------------------------- |
| `apps/web/src/repositories/UserRepository.ts`             | Flag-gated; delegates to `AppDataClient.users`. |
| `apps/web/src/repositories/ConnectionRepository.ts`       | Flag-gated; delegates to `AppDataClient.connections`. |
| `apps/web/src/repositories/ClinicalDocumentRepository.ts` | Flag-gated; delegates to `AppDataClient.clinicalDocuments`. |
| `apps/web/src/features/settings/components/UserDataSettingsGroup.tsx` | New `.emrpkg` export/import row, always uses RxDB through `apps/web/src/services/emrpkg/`. |

### Not migrated (deliberately, for now)

| Location                                                       | Why it was skipped                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/web/src/services/fhir/Epic.ts`                           | ~1000 LOC, OAuth + ingestion. Requires live Epic sandbox to validate. |
| `apps/web/src/services/fhir/Cerner.ts`                         | Same — needs live Cerner sandbox.                                   |
| `apps/web/src/services/fhir/Veradigm.ts`                       | Same.                                                               |
| `apps/web/src/services/fhir/Healow.ts`                         | Same.                                                               |
| `apps/web/src/services/fhir/VA.ts`                             | Same.                                                               |
| `apps/web/src/services/fhir/OnPatient.ts`                      | OnPatient is deprecated upstream — verify it still works first.     |
| `apps/web/src/features/sync/SyncJobProvider.tsx`               | Orchestrates the above; migrate after them.                         |
| `apps/web/src/features/vectors/providers/VectorStorageProvider.tsx` | Uses a `vector_storage` RxDB collection that isn't yet in `@mere/domain`. |
| `apps/web/src/features/vectors/providers/VectorGeneratorSyncer.tsx` | Same dependency.                                                    |
| `apps/web/src/features/summary/SummaryTab.tsx`                 | Direct `db.clinical_documents.find(...)` queries; read-only.        |
| `apps/web/src/features/timeline/TimelineTab.tsx`               | Same shape as summary.                                              |
| `apps/web/src/features/timeline/hooks/useRecordQuery.tsx`      | Pageable queries; needs `clinicalDocuments.observe` with cursors.   |
| `apps/web/src/app/providers/AppConfigProvider.tsx`             | Stores arbitrary `AppConfig` fields directly on the row; `@mere/domain`'s `InstanceConfig` doesn't model them yet. |
| `apps/web/src/app/providers/UserPreferencesProvider.tsx`       | Tractable; not done because it's not on the critical path.          |
| `apps/web/src/features/ai-recommendations/services/USPSTFRecommendationsGenerator.tsx` | Uses `uspstf_recommendation_documents` collection not in `@mere/domain` yet. |
| `apps/web/src/features/settings/components/PrivacyAndSecuritySettingsGroup.tsx` | Calls `db.remove()` to wipe the database — straightforward, just not done. |

## Recommended ordering for the rest

1. **Schema additions in `@mere/domain`** — add the tables that don't
   exist yet (`vector_storage`, `uspstf_recommendations`, an
   `app_config` table that's distinct from `instance_config`). Bump
   the package schema version.
2. **Read-only providers** — `AppConfigProvider`, `UserPreferencesProvider`,
   `SummaryTab`, `TimelineTab`, `useRecordQuery`. Same flag-gated pattern
   as the leaf repositories. Low risk because they don't write.
3. **`SyncJobProvider`** — refactor it to use the repositories (it already
   uses some of them; finish the job). This is the bridgehead for the FHIR
   services because they're called from here.
4. **FHIR services**, one portal at a time, each behind its own manual
   test against the sandbox.
5. **Vectors** — `VectorStorageProvider` and `VectorGeneratorSyncer`
   together, since they're coupled.
6. **Flip the flag to default-on** once a full session can be run without
   ever touching RxDB.
7. **Remove RxDB** and the flag.

## Importing legacy data

Users who upgrade from an RxDB-only build will already have all their
data in `IndexedDB` under the RxDB collections. Two routes for them:

- **Path A: dual-life.** Leave RxDB alone; flag stays off; everything
  works as before. Use `.emrpkg` if you want to move data between
  devices.
- **Path B: one-time copy.** Export `.emrpkg` from the RxDB side, flip the
  flag, then import it back through the Dexie side. The Dexie store now
  has the data and the flag-gated reads pick it up.

(Path B will get easier once the "smart importer" lands — see
[emrpkg-format.md](./emrpkg-format.md#record-shapes).)

## Risks the flag exposes

If you flip the flag on while still using portal sync, expect:

- Existing data **disappears from views** that go through the migrated
  repositories (because their reads hit the empty Dexie store).
- New connections you add via the connections UI **land in Dexie**, but
  the FHIR sync service can't see them (it reads from RxDB).
- Sync writes new clinical documents into RxDB, but the summary/timeline
  pages (still on RxDB direct reads) keep showing them — until you
  migrate those code paths too.

The split-brain unwinds itself once all the entries in the "Not migrated"
table above are migrated. The flag is a tool for staged rollout, not a
production toggle.
