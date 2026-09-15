# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start with nodemon (hot reload)
npm start            # production start
npm test             # run all Jest tests
npm test -- --testPathPattern=metrics   # run a single test file
```

Requires a `.env` file — copy `.env.example` and fill in values. `JWT_SECRET` is mandatory; the server throws on startup without it.

Run database migrations once before starting:
```bash
node run_migration.js
```

## Architecture

**Clean layered architecture**: `routes → controllers → services → repositories`

- [src/routes/](src/routes/) — Express routers, attach middleware chains
- [src/controllers/](src/controllers/) — Request validation, response shaping
- [src/services/](src/services/) — Business logic, AI, events, severity scoring
- [src/repositories/](src/repositories/) — All SQL queries (PostgreSQL via `pg`)
- [src/middlewares/](src/middlewares/) — Auth, rate limiting

The app entry point is [src/app.js](src/app.js); [server.js](server.js) just calls `app.listen`.

## Two Auth Systems

These are completely separate and must not be confused:

| Use case | Header | Verified by |
|---|---|---|
| Dashboard users (login, summary, analyze, stream) | `Authorization: Bearer <jwt>` | `authMiddleware` — `JWT_SECRET` |
| SDK / mobile apps (POST metrics) | `x-api-key: app_live_...` | `appAuthMiddleware` — queries `apps` table |

API keys are cached in a `Map` for 60 seconds in [src/middlewares/appAuth.middleware.js](src/middlewares/appAuth.middleware.js) to avoid per-request DB hits.

## Metrics Ingestion

- Single: `POST /metrics/` — validates `event` and `screen` are non-empty strings; `target` is optional but must be a non-empty string when present
- Batch: `POST /metrics/batch` — max 500 records, single multi-row `INSERT` with 13 columns per row (see `METRIC_COLUMNS` in [src/repositories/metrics.repository.js](src/repositories/metrics.repository.js))
- Rate limiter: 6000 req/min per `x-api-key` (or IP fallback), configurable via `METRICS_RATE_LIMIT`. One key is shared by every device running the host app, so the budget covers the whole installed base.

### `screen` vs `target`

`screen` always names a real, user-visible screen. `target` holds what the event
acted on when that differs — the request path for `api_call`/`api_error`, the
handler name for `app_crash`. Keeping endpoints out of `screen` is what stops
the per-screen aggregation from inventing phantom screens whose render metrics
are all zero.

### `client_timestamp`

The SDK stamps each event with its occurrence time, stored in
`client_timestamp`. `created_at` is server *arrival* time, which lags by up to a
flush interval (far longer if the device was offline) and collapses every event
in a batch to nearly the same value — prefer `client_timestamp` for ordering and
windowing. An unparseable value is stored as `NULL` rather than failing the
whole batch.

## SSE Streaming

`GET /metrics/stream` uses Server-Sent Events. The pub/sub is an in-process `EventEmitter` in [src/services/metrics.events.js](src/services/metrics.events.js) — `publishMetric(appId, metric)` / `subscribeToMetrics(appId, listener)`. The controller sends a heartbeat every 30s to keep the connection alive.

## AI Analysis (`GET /metrics/analyze`)

Pipeline: `buildAIPayload` (aggregates by screen) → `analyzePerformance` (Gemini `gemini-2.5-flash`) → `calculateSeverity` (thresholds in [src/services/severity.scorer.js](src/services/severity.scorer.js)).

Severity thresholds: `avg_render_time_ms > 1000` or `frame_drop_rate > 0.20` = high; `> 300` or `> 0.05` = medium.

**`frame_drop_rate` is a fraction in the range 0.0–1.0, not a percentage** —
`0.20` means "20% of frames missed their budget". Comparing it against `20`
would silently never fire.

Drop rates are only applied once a screen has at least 20 events, since a rate
over a handful of samples is noise. There is deliberately no absolute
`total_frame_drops` threshold: a busy screen accumulates a large absolute count
at a perfectly healthy rate, which previously flagged an app's most-used screens
as its worst.

A completed analysis is cached per app for `ANALYSIS_CACHE_TTL_MS` (default
120s) so dashboard refreshes don't trigger a billed Gemini call each time. A
degraded response (AI call failed) is deliberately not cached.

When `NODE_ENV=test`, [src/services/gemini.service.js](src/services/gemini.service.js) returns mock JSON instead of calling the API.

## Testing

Tests use ES Modules (`"type": "module"` in package.json) with `--experimental-vm-modules`. Mock DB connections with `jest.unstable_mockModule`:

```js
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: { query: jest.fn() },
}));
// dynamic import AFTER mocking
const { default: app } = await import('../src/app.js');
```

To test rate limiting, set `process.env.METRICS_RATE_LIMIT = '2'` **before** the dynamic import so the middleware picks up the override.

## Database Migrations

Numbered `.sql` files in [src/db/migrations/](src/db/migrations/) are run in sorted order by [run_migration.js](run_migration.js). Add new migrations as `007_...sql`, `008_...sql`, etc.

## Applications

- `POST /apps` — **always creates a new app.** It never rotates an existing key: doing so as a side effect of creation silently invalidated the key every already-shipped SDK client was using.
- `POST /apps/:appId/rotate-key` — explicit, separate rotation. Scoped by `user_id` so one user cannot rotate another's key, and it evicts the superseded key from the `appAuthMiddleware` cache so the old key stops working immediately rather than lingering for the 60s TTL.
- `GET /apps` — returns `200 []` for an account with no apps. An empty list is a valid state, not a 404.

## Error Handling

[src/app.js](src/app.js) registers a terminal error handler. Controllers and
middleware pass failures to `next(error)` rather than swallowing them; a
Postgres connection fault surfaces as a logged `503`. Express identifies that
handler by its four-parameter arity, so its unused `next` parameter must stay.

## API Key Format

Generated by [src/utils/generateApiKey.js](src/utils/generateApiKey.js): `app_live_<32 hex chars>` (e.g. `app_live_d9a39a8d4835972e2c1467d17b61ef37`).
