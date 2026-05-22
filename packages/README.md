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
- **If you want live portal sync**, you still need `apps/api` running
  somewhere reachable from the browser — the `PUBLIC_URL` env var points the
  web app at it.

The Dexie store and the `.emrpkg` format don't care which mode you're in.

## Wiring this into the existing app

The existing `apps/web` uses RxDB; this scaffold does not replace it yet.
Three reasonable next steps:

1. Add `@mere/data` as a thin facade over the existing RxDB repositories — the
   UI can start calling `AppDataClient` methods while storage stays RxDB.
2. Stand up a new screen/feature on `@mere/local-dexie` directly to validate
   the format end-to-end.
3. Replace RxDB import/export in `UserDataSettingsGroup.tsx` with the
   `.emrpkg` writer/reader from `@mere/local-dexie`.

None of those are done yet — this scaffold is the foundation only.
