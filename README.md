# AI Performance Intelligence Backend

A clean-architecture Node.js backend that collects Flutter performance metrics,
aggregates telemetry data, and generates AI-powered optimization insights using Google Gemini.

## 🚀 Features
- Collects Flutter app performance metrics
- Aggregates render time and frame drops
- AI-powered analysis using Google Gemini
- Severity scoring (low / medium / high)
- Clean Architecture with separation of concerns
- Unit testing with Jest

## 🧱 Tech Stack
- Node.js (ES Modules)
- Express.js
- Google Gemini AI
- Jest + Supertest
- Render (Deployment)

## 📡 API Endpoints
| Method | Endpoint | Description |
|------|--------|------------|
| POST | /metrics | Collect performance metric |
| GET | /metrics/summary | Aggregated metrics |
| POST | /metrics/analyze | AI performance analysis |
| GET | /metrics/health | Health check |

## ⚙️ Setup
```bash
npm install
cp .env.example .env
npm run dev
