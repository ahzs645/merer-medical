# Electron desktop plan

This plan uses `/Users/ahmadjalil/Downloads/t3code-main` as a desktop
architecture reference. The useful lesson is not that Mere should copy that
app's backend, SSH, update, or Effect stack. The useful lesson is the
boundary:

```text
apps/web renderer -> shared data adapter -> Dexie/AppDataClient
                 \-> narrow preload bridge -> Electron main OS APIs
```

Electron should be a host for the same Mere web app and the same
`AppDataClient` boundary. It should not become another clinical data connector
or a second repository layer.

## Reference patterns worth copying

The reference app keeps Electron in a separate `apps/desktop` package with:

- A dedicated `package.json` whose `main` points to a compiled Electron main
  bundle.
- A main process bundle and a preload bundle, both built separately.
- A preload `contextBridge` exposing one typed `desktopBridge` object.
- Central IPC channel constants and one main-process handler registry.
- Runtime validation for IPC payloads/results before they cross the bridge.
- A custom desktop protocol for loading the built web app in production.
- A dev launcher that waits for the web server and Electron bundles before
  opening the desktop app.
- A smoke test that boots Electron and scans output for startup failures.
- Desktop settings stored as small JSON files, schema-decoded leniently, and
  written atomically with temp file plus rename.
- Safe storage wrappers around Electron `safeStorage` for secrets.

For Mere, these patterns are directly useful even if the implementation stays
plain TypeScript and zod instead of adopting the reference app's Effect layers.

## Reference patterns to avoid initially

The reference app does more than Mere needs for a first desktop release:

- It starts and supervises a bundled backend server.
- It scans ports and exposes a local server over network/Tailscale.
- It includes SSH environment management.
- It has a full updater/channel system.

Mere should only add a sidecar backend if a desktop workflow proves it needs
one, such as OAuth callback handling or a proxy for portal APIs. The first
desktop pass can be much smaller.

## Proposed Mere architecture

Add a new `apps/desktop` Nx app/package:

```text
apps/desktop
  src/main.ts
  src/preload.ts
  src/ipc/channels.ts
  src/ipc/handlers.ts
  src/ipc/methods/*.ts
  src/settings/*.ts
  src/protocol.ts
  src/window.ts
  scripts/dev-electron.mjs
  scripts/smoke-test.mjs
```

Keep `apps/web` as the renderer app. Desktop development loads the Vite dev
server. Production loads `dist/apps/web` through a desktop protocol such as
`mere://index.html`.

Set the desktop renderer build to:

```text
VITE_MERE_STORAGE_BACKEND=dexie
```

Do not set that default for the online web app until the RxDB migration
blockers in `docs/migration.md` are cleared.

## Desktop bridge surface

Expose a single object, for example `window.mereDesktop`, from preload. It
should be narrow and OS-focused:

- `app.getInfo()`: version, platform, packaged/dev, app data directory.
- `files.pickEmrpkg()`: open a native file picker and return bytes/name.
- `files.saveEmrpkg(bytes, suggestedName)`: save a package to user-chosen path.
- `files.chooseBackupDirectory()`: choose an automatic-backup directory.
- `backups.create()`, `backups.list()`, `backups.restore(id)`.
- `secureStorage.isAvailable()`, `get/set/delete(key)`.
- `shell.openExternal(url)`: open portal/help links safely.
- `oauth.startLocalCallback(options)`: only if portal sync needs a local
  callback helper.
- `updates.getState/check/download/install()`: later, when distribution needs
  automatic updates.

The renderer should never receive raw `fs`, `path`, `child_process`, or general
Node access. Every IPC method should validate input and output with zod or the
existing domain schemas.

## Data boundary

Health data stays behind `AppDataClient`:

```text
UI feature -> @mere/data hook/client -> @mere/local-dexie -> IndexedDB
```

Desktop-only APIs handle filesystem and secrets only. They should call package
helpers, not bypass the app data client for records.

The import/export path should become active-store aware:

- RxDB mode: keep using the current RxDB `.emrpkg` service.
- Dexie mode: use `AppDataClient.packages.export/import`.
- Smart import: accept both legacy RxDB-shaped packages and Dexie-shaped
  packages, then normalize through the active client.

## Work required before a real desktop beta

1. Finish AppDataClient coverage for remaining RxDB-only domains:
   notifications, workflow records, vectors, USPSTF/recommendations, and the
   summary/timeline read surfaces that still use collections directly.
2. Route `.emrpkg` import/export through the active store, including smart
   RxDB-shaped import into Dexie.
3. Add a first-run RxDB-to-Dexie migration. Do not delete RxDB data
   automatically in the first desktop release.
4. Decide the vector/RAG story for desktop Dexie mode: disable it explicitly,
   port vector metadata storage to AppDataClient, or regenerate vectors from
   Dexie clinical documents.
5. Move portal sync/FHIR services away from raw `RxDatabase` arguments, or gate
   them off in the desktop Dexie build until ported.
6. Replace browser-only import/export UX with bridge-backed native open/save
   dialogs when `window.mereDesktop` exists.
7. Add desktop settings JSON for non-clinical preferences:
   backup directory, update channel, window state, and desktop feature flags.
8. Add secure secret handling:
   use Electron `safeStorage` for API keys, OAuth tokens, and any package
   passphrase wrapping. Keep WebCrypto package encryption for `.emrpkg` itself.
9. Add file association support for `.emrpkg`, so opening a package can route
   to the import flow.
10. Add desktop smoke tests: build web, build main/preload, launch Electron,
    verify the window loads, and fail on startup console errors.

## Suggested implementation order

1. Scaffold `apps/desktop` with Electron, main/preload builds, and a dev
   launcher that opens `apps/web` on the Vite dev server.
2. Add `window.mereDesktop.getAppInfo()` and `shell.openExternal()` as the
   first typed IPC methods.
3. Add production loading through a `mere://` protocol that serves
   `dist/apps/web`.
4. Build native `.emrpkg` open/save methods and wire Settings -> Data to use
   them when desktop is present.
5. Add desktop settings and safe storage.
6. Finish active-store import/export and RxDB-to-Dexie migration.
7. Flip only the desktop build to Dexie by default.
8. Port or explicitly disable remaining RxDB-only features in desktop Dexie
   mode.
9. Add packaging with `electron-builder` after the app boots reliably in dev
   and production smoke tests.

## Decision

Dexie remains the right local store for this desktop direction. RxDB is still
important as the legacy live store, but making Electron depend on RxDB directly
would preserve the blocker the migration is trying to remove. The desktop app
should accelerate the `AppDataClient` migration rather than create a new data
path.
