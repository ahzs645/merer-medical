---
title: "Local Development"
description: "Set up and run the Mere Medical monorepo locally."
sidebar:
  order: 2
---

## Prerequisites

The root workspace declares `node >=25.3.0` and `npm >=11.7.0`. The Starlight docs package declares `node >=22.12.0`.

Install dependencies from the repository root:

```bash
npm install
```

## Run The App

Start both the NestJS API and the React web app:

```bash
npm run dev
```

This runs the `web:serve-all` Nx target, which starts:

- `api:serve:development`
- `web:serve:development`

The API sets a global `/api` prefix. The web app uses `apps/web/proxy.conf.json` for local API proxying.

## Run The Docs

```bash
npm run docs:dev
```

Build the docs before opening a docs pull request:

```bash
npm run docs:build
```

## Runtime Configuration

The API exposes public instance configuration through `GET /api/v1/instance-config`. The web app caches that response locally so the UI can decide which integrations are available.

Common environment variables:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PUBLIC_URL` | API and web config | Public base URL used for OAuth callbacks and origin checks. |
| `PORT` | API | API listen port. Defaults to `80`. |
| `NODE_ENV` | API and web | Enables development behavior, including API development SSL loading. |
| `MERE_APP_VERSION` | API | Optional version string logged at startup. |
| `ONPATIENT_CLIENT_ID` | API and web config | Enables OnPatient integration. |
| `ONPATIENT_CLIENT_SECRET` | API | Enables OnPatient server-side OAuth support. |
| `EPIC_CLIENT_ID`, `EPIC_CLIENT_ID_DSTU2`, `EPIC_CLIENT_ID_R4` | API and web config | Enables Epic/MyChart integration. Version-specific IDs override the generic ID. |
| `EPIC_SANDBOX_CLIENT_ID`, `EPIC_SANDBOX_CLIENT_ID_DSTU2`, `EPIC_SANDBOX_CLIENT_ID_R4` | Web config | Sandbox client IDs displayed to the web app. |
| `CERNER_CLIENT_ID` | API and web config | Enables Cerner integration. |
| `VERADIGM_CLIENT_ID` | API and web config | Enables Veradigm integration. |
| `VA_CLIENT_ID` | Web config | Enables VA integration. |
| `HEALOW_CLIENT_ID` | API and web config | Enables Healow integration. |
| `HEALOW_CLIENT_SECRET` | API | Enables Healow confidential-client mode and refresh-token support. |

Do not put real OAuth secrets in committed examples. Prefer local shell exports, deployment environment variables, or ignored local files.

## Local HTTPS

In development, the API attempts to load certificates from `.dev/certs/localhost-key.pem` and `.dev/certs/localhost.pem`. If you run the API in `NODE_ENV=development`, make sure those files exist or adjust your environment before starting the server.

## Local Static Preview

For previewing the built web app without the full development server, use:

```bash
npm run preview:web:local
```
