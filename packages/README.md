# Mere — local-first / Convex-shaped scaffold

This directory is a **greenfield scaffold** sitting alongside the existing Nx
apps. It is intentionally not yet wired into the Nx workspace. None of these
packages are imported by `apps/web` or `apps/api` today — the existing RxDB
data layer is untouched.

## Why it exists

The long-term plan is:

```
Phase 1: local-only browser app, IndexedDB storage          (Dexie)
Phase 2: same app, cloud-backed                              (Convex)
Phase 3: optional local-first + Convex sync
```

To avoid rewriting the UI when we move from Phase 1 to Phase 2, the UI talks
to an **`AppDataClient`** interface, never to Dexie or Convex directly. The
local implementation is a Dexie adapter; a future Convex adapter implements
the same interface and the UI doesn't notice.

```
UI → @mere/data (AppDataClient) → @mere/local-dexie  (today)
                                → @mere/convex       (later)
```

## Packages

| Package              | Purpose                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `@mere/domain`       | Entity types, zod schemas, app-level ID helpers. No runtime dependency on storage.     |
| `@mere/data`         | The `AppDataClient` interface + a `createDataClient(mode)` factory + React hook stubs. |
| `@mere/local-dexie`  | Dexie schema + `DexieDataClient` implementation + ZIP import/export with encryption.   |

## Conventions

1. **App-level IDs.** Every record carries an `id: string` generated client-side
   (`createId()` in `@mere/domain`). When we move to Convex, that becomes the
   `appId` field — Convex's internal `_id` is never leaked into app code.
2. **Plain JSON-shaped records.** No `Date` objects, `Map`, `Set`, or class
   instances in stored values. Timestamps are `number` (epoch ms). Documents
   stay under Convex's 1 MB / nesting limits.
3. **Commands, not raw CRUD.** UI calls things like `client.connections.create(...)`,
   not `db.connections.add(...)`. The Dexie/Convex adapter implements the verbs.
4. **Indexes are designed for the Convex world.** The Dexie schema mirrors the
   indexes we'd want on Convex tables, so queries port over without rework.

## ZIP package format

The export format is documented in
[`local-dexie/src/package-format.ts`](./local-dexie/src/package-format.ts).
Summary:

- Outer file extension: `.emrpkg`
- Unencrypted variant: a plain ZIP with `manifest.json`, `tables/*.json`,
  `attachments/<id>` (raw bytes).
- Encrypted variant: an envelope `MEREPKG1` header followed by the AES-GCM
  ciphertext of the above ZIP. Key derived from passphrase via PBKDF2-SHA256.

## Is `apps/api` still needed?

The NestJS server in `apps/api` is **optional**. It exists only to handle OAuth
callbacks for medical portals (Epic, Cerner, Veradigm, Healow, VA) — exchanging
auth codes for access tokens that the browser can't request directly because
of CORS and client-secret handling. None of your medical data ever lives on
the server; it goes straight into the browser store.

- **If you only ever ingest data via `.emrpkg` import**, you can serve
  `apps/web` as a static bundle from anywhere (file://, a CDN, or Electron)
  and never run the API. This is the "fully serverless" mode.
  For local preview, run `npm exec nx -- build web` and then
  `npm run preview:web:local`; that preview server provides SPA route
  fallback and an empty `/api/v1/instance-config` response.
  For GitHub Pages, use the `Deploy GitHub Pages` workflow; it builds with
  the correct Pages base path and uploads the static bundle.
- **If you want live portal sync**, you still need `apps/api` running
  somewhere reachable from the browser — the `PUBLIC_URL` env var points the
  web app at it.

The Dexie store and the `.emrpkg` format don't care which mode you're in.

## Wiring into the existing app

The three leaf repositories — `UserRepository`, `ConnectionRepository`, and
`ClinicalDocumentRepository` (in `apps/web/src/repositories/`) — now branch
on a runtime flag:

```js
// Enable
localStorage.setItem('mere.useDexieRepos', 'true');

// Disable
localStorage.removeItem('mere.useDexieRepos');
```

When the flag is on, those three repositories delegate to a Dexie-backed
`AppDataClient` via `apps/web/src/repositories/dexie-bridge/`. When off,
they use the existing RxDB code path unchanged. Default is off, so the app
behaves exactly as before until you opt in.

### ⚠️ Split-brain warning

Some app flows still do NOT go through the repositories. With the flag on:

- Reads/writes through the migrated repositories hit **Dexie**.
- FHIR sync writes clinical documents through `ClinicalDocumentRepository`,
  and connection token/timestamp updates through `ConnectionRepository`, so
  `SyncJobProvider`, `Epic.ts`, `Cerner.ts`, `Veradigm.ts`, `Healow.ts`, and
  `VA.ts` no longer create a clinical-document split-brain for the flagged
  path.
- Vectors, summary, timeline, AI search, and other direct collection users
  still hit
  **RxDB**.

So the flag is still intended for development of the new Dexie store and
the `.emrpkg` flow, not for making Dexie the default store yet. The vector
pipeline is disabled while `mere.useDexieRepos` is enabled because it still
depends on RxDB collections.

### .emrpkg in the Settings UI

The "Encrypted package (.emrpkg)" row in `UserDataSettingsGroup` exports the
current RxDB store as a `.emrpkg` and imports one back, with an optional
passphrase (AES-GCM, PBKDF2-SHA256, 600,000 iterations). The reader/writer
is split into two layers:

- `@mere/local-dexie` (`packEmrpkg`, `unpackEmrpkg`, `inspectEmrpkg`) — pure
  envelope + zip + encryption helpers. No Dexie dependency.
- `apps/web/src/services/emrpkg/` — RxDB-side adapter that reads from / writes
  to the existing RxDB collections (`user_documents`, `clinical_documents`,
  `connection_documents`, etc.) using the pure helpers.

The Dexie-native `createPackageCommands(dbName)` continues to read from /
write to the new Dexie store and uses the same pure helpers. So the same
`.emrpkg` envelope format is shared between the two source stores, but the
record shapes inside differ: RxDB-sourced packages contain snake_case
documents (`user_documents`, etc.), Dexie-sourced packages contain
camelCase domain rows (`users`, etc.). The manifest's `tables` array is
how a future "smart importer" would tell them apart.

### What's still to do

1. Migrate the remaining call sites that bypass the repositories — start
   with the vector/RAG pipeline and timeline/summary readers — so the flag
   can become the default. Portal sync still needs manual OAuth validation,
   but its clinical-document persistence now goes through the flagged
   repository path.
2. Extract embedded FHIR attachments (`DocumentReference.content[].attachment.data`,
   etc.) into the `attachments/` folder of the zip on export, and re-embed
   on import. Today they ship as base64 inside the JSON dump — functionally
   correct but bigger.
3. Add a "smart import" that can ingest either an RxDB-shaped or
   Dexie-shaped `.emrpkg` and route into the active store.
4. Remove the RxDB path once everything is on Dexie.
