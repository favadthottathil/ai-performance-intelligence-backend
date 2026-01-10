# AI Performance Intelligence – Architecture

## Overview
A clean-architecture backend system that collects Flutter performance metrics,
aggregates them, and generates AI-powered optimization insights using Gemini.

## Layers
- Controllers: HTTP request handling
- Services: Business logic & AI integration
- Store: In-memory data storage (pluggable for DB)
- Aggregator: Converts raw metrics to summaries

## AI Flow
Raw Metrics → Aggregation → Severity Scoring → Gemini AI → Structured Insights

## Tech Stack
- Node.js (ES Modules)
- Express
- Google Gemini SDK
- Jest (Testing)
