# Run the backend from the published image

The image `ghcr.io/favadthottathil/ai-performance-intelligence-backend` holds the
whole app, so a machine only needs Docker. It does not need Node, the source
code, or `npm install`. The image contains no secrets: they are passed in at run
time through an env file.

## Before you start

- Docker installed and running (on Windows, Docker Desktop shows "Engine running").
- If the GHCR package is private, run `docker login ghcr.io` with a GitHub classic
  token that has `read:packages`.
- The image is built for `linux/amd64`. It runs natively on Intel and AMD
  machines and under emulation on ARM (Apple Silicon).

## 1. Set up a folder

Make an empty folder and copy two files into it from this repo:

- `compose.deploy.yaml`, renamed to `compose.yaml`
- `.env.deploy.example`, renamed to `.env`

Edit `.env` and replace every placeholder. Use letters and digits only in the
Postgres password, because it is also placed inside `DATABASE_URL`. The password
in `POSTGRES_PASSWORD` and in `DATABASE_URL` must match. To pin a build, set
`API_TAG=sha-<short commit>` (each merge to `main` publishes one).

## 2. Start

```bash
docker compose up -d
docker compose ps
```

`db` should become `(healthy)`, then `api` starts.

## 3. Create the tables (first time only)

```bash
docker compose run --rm api node run_migration.js
```

Expect `All migrations completed successfully!`. The migrations are safe to
repeat.

## 4. Check it

```bash
curl http://localhost:3000/health
```

On Windows PowerShell use `curl.exe`. Expect `{"status":"ok"}`. If not, read
`docker compose logs api`.

## 5. Use it

1. `POST /auth/register` with `{"email": "...", "password": "..."}` returns a token.
2. `POST /apps` with header `Authorization: Bearer <token>` and `{"name": "my app"}`
   returns an `api_key` (`app_live_...`).
3. The SDK posts to `/metrics` with header `x-api-key: <that key>`. Other devices
   reach the API at this computer's IP address, not `localhost`.
4. A dashboard on another origin needs that origin in `CORS_ORIGINS`.

## Everyday commands

| What | Command |
|---|---|
| Logs | `docker compose logs -f api` |
| Stop, keep data | `docker compose down` |
| Start again | `docker compose up -d` |
| Update or roll back | change `API_TAG` in `.env`, then `docker compose up -d` |
| Back up the database | `docker compose exec db pg_dump -U perf -Fc -f /tmp/perf.dump perf`, then `docker compose cp db:/tmp/perf.dump ./perf.dump` |
| Delete all data | `docker compose down -v` (permanent) |

## Using a hosted database instead

Remove the `db` service and `depends_on` from the compose file, set `DATABASE_URL`
to the hosted connection string, and delete `DB_SSL=false` (the app turns SSL on
by default). Its tables usually exist already.

## Do not

- Put secrets in the image or in any file you commit.
- Run `down -v` against data you want to keep.
- Expose this over plain HTTP to the internet. Put it behind an HTTPS proxy.
