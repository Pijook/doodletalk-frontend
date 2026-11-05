# DoodleTalk frontend

React + TypeScript application connected to the sibling `doodletalk-backend` Spring Boot project.
Vite handles development/builds, TanStack Query manages server state, and native WebSocket
notifications keep rooms synchronized. The interface is responsive and supports all three roles.

## Start locally

Requirements: Node 22.12+ (Node 24 LTS recommended), npm, and the running backend.

```powershell
# Terminal 1: start the backend and PostgreSQL
cd D:\IdeaProjects\doodletalk-backend
docker compose up -d postgres
.\mvnw.cmd spring-boot:run

# Terminal 2: start React
cd D:\IdeaProjects\doodletalk-frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Use `localhost`, matching the backend’s default allowed WebSocket origins.
The frontend development server proxies `/api`, `/ws`, and `/health` to `http://127.0.0.1:8080`.
There is no mocked gameplay or separate frontend database.

If the backend already runs, start only the frontend. `npm run build` produces `dist/`;
`npm run preview` serves that build on the same port with the same development proxy.
Stop the development server before starting preview.

## Start the whole stack with Docker

Keep the projects side by side:

```text
IdeaProjects/
  doodletalk-backend/
  doodletalk-frontend/
```

From `doodletalk-frontend`:

```sh
docker compose up --build -d
```

Open **http://localhost:5173**. The frontend image serves the production React build through
Nginx and proxies REST/WebSocket traffic to the backend container. This Compose project owns
its own PostgreSQL volume. Do not run the separate backend Compose stack on the same ports
at the same time. Set `POSTGRES_PASSWORD` and `ALLOWED_ORIGINS` for your deployment.

For HTTPS, terminate TLS at your reverse proxy and allow the exact public frontend origin
in the backend. WebSocket upgrades must reach `/ws`. Nginx disables access logging for
that path because its query contains short-lived tickets.

## Configuration

Copy `.env.example` to `.env.local` when necessary:

- `BACKEND_URL`: Vite development/preview proxy target; defaults to `http://127.0.0.1:8080`.
- `VITE_API_BASE_URL`: optional public backend origin, e.g. `https://api.example.com`.
  Leave empty when using the included same-origin proxies. It is embedded at build time.
  When set, configure backend CORS and WebSocket allowed origins explicitly.
- `BACKEND_ORIGIN`: Nginx container upstream, default `http://backend:8080`.

No secrets belong in `VITE_*` variables: they are public browser configuration.

## Included flows

- Guest nickname and session persistence; create rooms or join via code/invite link.
- Room list, participants, audience, round history, live connection status and host controls.
- Host: private reference upload, start, text descriptions, reveal, close voting, next round,
  close room. Irreversible transitions have confirmation dialogs.
- Artist: pencil colors, brush sizes, eraser, undo, clear, PNG download and submission.
  Alternatively upload PNG/JPEG. Replace a submission until reveal.
- Viewer: wait without seeing private images, compare the revealed gallery, confirm one vote,
  then see final results and tied ranks. Empty voting rounds do not claim an audience favorite.
- Client image checks mirror backend limits: PNG/JPEG, 5 MiB, 4096 pixels per side, 16 megapixels.
- Authenticated image fetches create temporary object URLs; Bearer tokens never go in image URLs.
- Responsive layouts, labeled controls, keyboard focus, reduced-motion support and dialogs.

The host’s voice call remains outside DoodleTalk. Written descriptions are optional.
The illustration on the homepage is illustrative artwork, not a pre-populated game.

## Session and draft behavior

The guest session is stored in `localStorage` and expires according to the backend response.
401 responses clear the session. Switching guests asks for confirmation because the original
guest identity cannot be recovered without its token. Keep this origin free of untrusted scripts.

All tabs on the same origin share one guest identity. Use separate browser profiles, a private
window, or different devices to test host/player/viewer simultaneously. Changes to the guest
session synchronize across tabs and clear cached private data.

Canvas drafts are stored in `sessionStorage` per guest and round, so they survive reloads in
the same tab. They are not uploaded automatically. A draft in a closed tab may be lost;
download it or submit it before closing. The frontend handles storage quota failures with a
download reminder. Undo retains the most recent 20 snapshots.

## Live updates

The frontend requests a one-use ticket, connects to `/ws?ticket=...`, and refreshes snapshots
after `CONNECTED`. Game events invalidate the appropriate cached room/round/results; duplicate
and foreign-room events are ignored. Replacing a drawing also refreshes private image caches.

Disconnects request a fresh ticket with exponential backoff capped at 15 seconds. A 15-second
snapshot refresh and focus refresh cover missed events. Backend snapshots remain authoritative;
there is no optimistic reveal or local-only voting result.

## Checks

```sh
npm test
npm run build
```

Vitest covers session expiry, Bearer handling, multipart boundaries, URL restrictions, domain
errors, image limits, WebSocket reconnection, duplicate events, cache invalidation and canvas undo history.

Verification completed on 3 November 2026: 12 automated tests passed and the production build
succeeded. Browser checks used the actual Spring backend with an isolated H2 test database:
host creation/upload/start/description/reveal/results, player canvas submission and reload
recovery, viewer join/privacy/vote, live updates, and a 390-pixel mobile layout. Docker Compose
configuration was validated; container image builds were not exercised in this environment.

Browser verification against the actual Spring backend should cover:

1. Create a host room, join as an artist and viewer in separate profiles.
2. Upload a reference, start, share a description; verify live state changes.
3. Draw, reload to restore the draft, submit, then optionally replace via upload.
4. Confirm other roles cannot see the reference or another artist’s work before reveal.
5. Reveal, confirm a viewer vote, close voting, inspect rankings and create another round.
6. Check narrow-screen layouts, refresh a nested room URL, and reconnect after a dropped socket.

Backend API details: `../doodletalk-backend/docs/API.md`.

## Source layout

- `src/lib`: typed API client, guest session provider, real-time synchronization.
- `src/pages`: studio entry and room orchestration.
- `src/components`: host/player/viewer panels, private images, upload validation, canvas, UI.
- `src/styles.css`: shared visual system and responsive breakpoints.
- `nginx/`, `Dockerfile`, `compose.yaml`: production build and full-stack local deployment.

Google Fonts provides the two display fonts; system fonts are used when it is unavailable.
Drawing images and session tokens are sent only to the configured backend.


## GitHub Actions: CI and Docker Hub

The workflow in `.github/workflows/ci-docker.yml` runs tests first, then builds the
existing Dockerfile for `linux/amd64`. Pull requests build without registry credentials
or publishing. Pushes to `main`/`master` run CI; only the repository's default branch
and `v*` tags publish. There is no automatic server deployment.

Configure each GitHub repository under **Settings → Secrets and variables → Actions**:

- Variable `DOCKERHUB_USERNAME`: Docker Hub login username.
- Secret `DOCKERHUB_TOKEN`: Docker Hub access token with write permission to the image repository.
- Optional variable `DOCKERHUB_NAMESPACE`: Docker Hub organization/namespace when different from the username.

Create the Docker Hub repository `doodletalk-frontend` under that namespace and choose its
visibility before the first push. Never commit the access token.

Published image: `<namespace>/doodletalk-frontend`.
Every published build gets `sha-<full commit SHA>`. Default-branch builds also get
`latest`. A tag such as `v1.2.3` adds `1.2.3` and `1.2`; prereleases retain their
prerelease version and do not replace `latest`.

To run manually, open **Actions → CI and Docker → Run workflow**. Select the default
branch and leave **publish** checked to push, or uncheck it for tests/build only.
Manual runs on other branches only test/build. To release, push a version tag:

```sh
git tag v1.0.0
git push origin v1.0.0
docker pull <namespace>/doodletalk-frontend:1.0.0
```

The frontend container accepts `BACKEND_ORIGIN` at runtime (default
`http://backend:8080`); the backend requires its database and allowed-origin
configuration as documented above. Publishing an image does not start either service.

Workflow actions are pinned to verified commit SHAs. Pipeline structure follows
[Docker's official GitHub Actions guide](https://docs.docker.com/build/ci/github-actions/).
