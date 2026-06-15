# AI Performance Intelligence – Architecture

## Overview
A clean-architecture backend system that collects Flutter performance metrics,
aggregates them, streams them to a dashboard in real time, and generates
AI-powered optimization insights using Gemini.

## Layers
- Routes: HTTP endpoint definitions and middleware wiring
- Controllers: HTTP request handling
- Middlewares: JWT auth, per-app API key auth (with caching), rate limiting
- Services: Business logic, aggregation, severity scoring, AI integration,
  and the real-time metrics event bus
- Repositories: PostgreSQL data access
- Aggregator: Converts raw metrics to per-screen summaries

## Ingestion Flow
SDK → `POST /metrics` or `/metrics/batch` → Postgres → event bus → `GET /metrics/stream` (SSE) → dashboard

## AI Flow
Raw Metrics → Aggregation → Severity Scoring → Gemini AI → Structured Insights

## Tech Stack
- Node.js (ES Modules)
- Express 5
- PostgreSQL (`pg`)
- Google Gemini SDK
- Jest + Supertest (Testing)
