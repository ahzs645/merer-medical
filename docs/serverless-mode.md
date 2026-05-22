# Serverless mode

Mere Medical can run as a static, fully offline app — no `apps/api`, no
NestJS, no server-side state. In this mode the only way data enters or
leaves the app is via `.emrpkg` import/export from the Data settings tab.

## What you give up

The NestJS API in `apps/api` exists to broker OAuth callbacks for the
medical portals: Epic, Cerner, Veradigm, Healow, VA, OnPatient. Browsers
can't perform these exchanges directly because the client secret and
some CORS-restricted token endpoints can't live in front-end code.

Serverless mode means **no live portal sync**. You're trading "pull
records from my hospital automatically" for "I own the deployment 100%
and there's no server to compromise."

## What you keep

- Everything the user has already imported into IndexedDB.
- Timeline, summary, search, AI features that run in-browser (subject to
  whichever local models / providers you've configured).
- `.emrpkg` import/export with optional AES-GCM passphrase encryption.
- The PWA install path — Mere registers a service worker and works
  offline once cached.

## How to deploy

The web app is a normal static bundle:

```sh
npx nx build web
# output: dist/apps/web/
```

Serve `dist/apps/web/` from any static host (object storage + CDN,
GitHub Pages, an Electron shell, `python -m http.server`, etc.). No
runtime dependencies.

You can also load the bundle from `file://` if you don't mind that the
service worker won't register from that origin.

## How users move data in and out

The "Encrypted package (.emrpkg)" row in Settings → Data is the only
ingress/egress. The format is documented in
[emrpkg-format.md](./emrpkg-format.md).

Typical flows:

| Flow                       | Steps                                                                |
| -------------------------- | -------------------------------------------------------------------- |
| New device                 | Export on old → save the file → open Mere on new device → Import.    |
| Backup                     | Export with passphrase → save the file to your usual backup target.  |
| Migrate off portal sync    | Use the full-fat build to sync, export `.emrpkg`, switch to serverless build, import. |
| Hand a copy to a clinician | Export with passphrase → send file + share passphrase out of band.   |

## Build flags / env vars

There are no extra env vars to set for serverless mode. The web app
gracefully degrades when `PUBLIC_URL` (used for portal callbacks)
is unset — the portal connection UIs disable, and the rest of the app
keeps working.

For a truly stripped build that removes the portal UIs and the OAuth
client code, see issue tracking for the upcoming `MERE_SERVERLESS=1`
build flag (not yet implemented — see [migration.md](./migration.md)
for what blocks it).

## Privacy properties

In serverless mode:

- No network egress at startup. The PWA install fetches assets once and
  then never phones home (workbox precaches a known asset list at build
  time).
- All PHI lives in the browser's IndexedDB or in `.emrpkg` files the
  user explicitly saved. Nothing transits a server you don't run.
- `.emrpkg` encryption uses WebCrypto (AES-256-GCM, PBKDF2-SHA256 with
  600k iterations by default). The passphrase never leaves the browser.

This is the deployment model for users who want the Mere UI but no
trust in any third party — including, deliberately, no trust in the
Mere project's hosted demo.
