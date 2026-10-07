# Docker progress: AI Performance Intelligence backend (Project A)

A stage is ticked only after its exit check has been run and the output was seen.

- [x] A0. Setup and orientation (Docker installed, nginx experiment) — 2026-10-05
- [x] A1. Read the app (`.env.example` exists, `.env` is gitignored) — 2026-10-05
- [x] A2. First Dockerfile (single stage) — 2026-10-06
- [x] A3. `.dockerignore` and image size — 2026-10-06
- [x] A4. Compose with PostgreSQL — 2026-10-06
- [x] A5. Healthchecks and startup order — 2026-10-06
- [x] A6. Production-grade image (multi-stage, non-root, scan) — 2026-10-07
- [ ] A7. CI to GitHub Container Registry
- [ ] A8. Run it for real (optional)
- [ ] A9. Stretch

## Measured numbers

| Measurement | Value |
|---|---|
| Build context size before `.dockerignore` | 60.51 MB (first transfer, 46.9 s) |
| Image size, single stage, before `.dockerignore` | 503 MB disk usage / 107 MB content size (`docker images perf-api:a2`) |
| Image size after `.dockerignore` | 405 MB disk usage / 94.5 MB content size (was 504 / 107). Build context transfer: 1.94 kB (incremental, not comparable with the 60.51 MB first transfer) |
| Image size after multi-stage build | 285 MB disk usage / 67.6 MB content size (`perf-api:a6`; was 405 / 94.5 after `.dockerignore`, 504 / 107 at the start). Base `node:24.21.0-alpine3.24` alone is 242 MB / 62 MB |

## Notes (what I learned, one line per stage)

- A0: image = read-only blueprint, container = running copy (one image, many containers). Edits inside a container vanish on `docker rm`; a volume keeps data outside it. A registry (Docker Hub) is an online store: build, push, pull, run.
- A1: the app listens on `PORT` (default 3000), starts with `node server.js`, needs `JWT_SECRET` and `DATABASE_URL`, schema comes from `node run_migration.js`. `DB_SSL` defaults to on, so a local Postgres container needs `DB_SSL=false`.
- A2: base `node:24.21.0-alpine3.24`. Source-only change reran just `COPY . .` (12.8 s); a `package.json` change reran `COPY package*.json` and `npm ci` (27.4 s). With no `.dockerignore`, `COPY . .` put `.env` (with a real `DATABASE_URL`) into the image, so the container connected to the DB without being given a URL. A later layer cannot shrink an earlier one: `npm ci` layer 130 MB plus a second `node_modules` in `COPY . .` 86 MB.
- A3: `.dockerignore` took the image from 504 MB to 405 MB disk usage (107 MB to 94.5 MB content size) and removed `.env`, `.git` and the Windows `node_modules` from it (`ls -a /app` shows none of them). `COPY . .` dropped from 5.5 s to 0.1 s.
- A4: `compose.yaml` runs `api` (built from the Dockerfile) and `db` (`postgres:18.6-alpine3.24`) with config from `.env.docker`; the API reaches Postgres at host `db` over the Compose network, and only the API port is published. Volume `pgdata` is mounted at `/var/lib/postgresql` (Postgres 18 keeps data in `/var/lib/postgresql/18/docker`). Schema: `docker compose run --rm api node run_migration.js`. A row survived `down` + `up` and was gone after `down -v` (`count(*)` = 0). Errors met on the way: `.env` junk broke `docker compose config`, a half-created `api` container after a port clash gave `EAI_AGAIN db`, and `ECONNREFUSED` / `psql` socket errors right after `up` are the startup race A5 fixes.
- A5: `db` healthcheck `pg_isready`, `api` waits with `depends_on: condition: service_healthy` (`up -d` showed `db Healthy 6.3s`, then `api Started 6.5s`; logs `DB connected`, no `ECONNREFUSED`), `restart: unless-stopped` on both, `api` healthcheck with `wget --spider /health`. `docker compose ps` shows `healthy` for both. Limits seen: with `db` stopped the API still reported `healthy` because `/health` does not query the database, and a restart policy only acts when a container exits.
- A6: two-stage Dockerfile (`deps` runs `npm ci --omit=dev`; final stage copies only `node_modules`, `package*.json`, `server.js`, `run_migration.js`, `src`), `NODE_ENV=production`, `USER node` (`whoami` prints `node`). Size 405 MB to 285 MB disk (94.5 to 67.6 MB content). hadolint: one info, DL3066 (non-numeric `USER`). Trivy HIGH/CRITICAL: Alpine OS packages 0; 19 findings in npm packages (1 critical, 18 high): 11 in the app's `node_modules` (`proxy-addr` critical, `path-to-regexp`, `ws`, and `brace-expansion`/`minimatch` under `glob`) and 8 in the npm that ships inside the base image (`/usr/local/lib/node_modules/npm`), which the app never runs. Docker Scout needs a Docker login, so Trivy was used.
