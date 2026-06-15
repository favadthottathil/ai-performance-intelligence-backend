# AI Performance Intelligence Backend

A Node.js + PostgreSQL backend that ingests Flutter app performance telemetry
(from [flutter_metrics_sdk](https://pub.dev/packages/flutter_metrics_sdk)),
aggregates it, streams it to a dashboard in real time, and generates
AI-powered optimization insights using Google Gemini.

## 🚀 Features
- Batched and single-event metric ingestion, authenticated per-app via API key
- Server-Sent Events (SSE) stream for real-time dashboard updates
- Aggregation of render time, frame drops, API latency and crash counts per screen
- AI-powered analysis using Google Gemini, with severity scoring (low / medium / high)
- JWT authentication and per-app API key management with rotation
- Rate limiting on ingestion endpoints and a short-lived API key cache
- Clean Architecture with separation of concerns (routes / controllers / services / repositories)
- Unit testing with Jest + Supertest

## 🧱 Tech Stack
- Node.js (ES Modules), Express 5
- PostgreSQL (`pg`)
- Google Gemini AI
- Jest + Supertest
- Render (Deployment)

## ⚙️ Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GOOGLE_API_KEY
node run_migration.js  # creates/updates the users, apps and metrics tables
npm run dev
```

## 📡 API Endpoints

### Auth (`/auth`)
| Method | Endpoint | Description |
|------|--------|------------|
| POST | /auth/register | Create a user, returns a JWT |
| POST | /auth/login | Log in, returns a JWT |

### Apps (`/apps`, JWT required)
| Method | Endpoint | Description |
|------|--------|------------|
| POST | /apps | Create an app (or rotate its API key) |
| GET | /apps | List the current user's apps |

### Metrics (`/metrics`)
| Method | Endpoint | Auth | Description |
|------|--------|------|------------|
| POST | /metrics | API key (`x-api-key`) | Ingest a single metric event |
| POST | /metrics/batch | API key (`x-api-key`) | Ingest a batch of metric events (used by the SDK's flush) |
| GET | /metrics/stream?appId= | JWT | Server-Sent Events stream of newly-ingested metrics for an app |
| GET | /metrics/summary?appId= | JWT | Aggregated metrics per screen |
| GET | /metrics/analyze?appId= | JWT | AI-generated insights + severity for an app |

#### Example: batch ingestion

```bash
curl -X POST https://your-backend/metrics/batch \
  -H "x-api-key: app_live_xxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [
      { "event": "app_render", "screen": "home", "render_time": 14, "frame_dropped": false },
      { "event": "screen_open", "screen": "home", "screen_load_time": 320 }
    ]
  }'
```

Response:
```json
{ "message": "2 metrics collected successfully" }
```

## 🧪 Testing

```bash
npm test
```

Tests mock the database layer, so no live Postgres connection is required.
