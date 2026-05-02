# AquaSense 2.0 — IoT Water Quality Monitoring Platform

## Overview

Full-stack real-time IoT water quality monitoring platform with a dark cyberpunk-industrial aesthetic. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind v4 + Recharts + Framer Motion
- **AI**: Anthropic Claude via Replit AI Integrations (SSE streaming)

## Artifacts

- `artifacts/aquasense` — React+Vite frontend, serves at `/`
- `artifacts/api-server` — Express API server, serves at `/api`

## Frontend Pages

1. **Dashboard** (`/`) — 5 live metric cards with sparklines, real-time Recharts line chart, sensor network map with pulsing nodes, anomaly banners
2. **Analytics** (`/analytics`) — Water quality score gauge, per-metric trend charts with linear regression predictions, anomaly history table, sensor/time-range filters
3. **Alerts** (`/alerts`) — Active alerts with acknowledge, threshold rules viewer, full notification log
4. **Assistant** (`/assistant`) — Claude AI chat with SSE streaming, real-time sensor context injection, quick-prompt chips

## Frontend Structure

```
artifacts/aquasense/src/
├── utils/
│   ├── thresholds.ts       — metric thresholds + getStatus()
│   ├── anomalyEngine.ts    — 3-consecutive-breach anomaly detection
│   └── linearRegression.ts — trend + prediction helpers
├── hooks/
│   └── useSensorData.ts    — 3 sensors, 5 metrics, 5s interval simulation, 60-reading history
├── components/
│   ├── Navbar.tsx           — top nav + mobile bottom tabs
│   ├── MetricCard.tsx       — animated value card with sparkline
│   ├── SparklineChart.tsx   — SVG sparkline
│   ├── AnomalyBanner.tsx    — shake-in alert banner
│   ├── RealTimeChart.tsx    — Recharts multi-line chart with metric toggles
│   └── SensorMap.tsx        — pulsing sensor node map
└── pages/
    ├── Dashboard.tsx
    ├── Analytics.tsx
    ├── Alerts.tsx
    └── Assistant.tsx
```

## Design Theme

- Dark navy/black background (`#020817`)
- Neon cyan `#00f5ff` (primary accent)
- Neon green `#39ff14` (SAFE status)
- Amber `#ffaa00` (WARNING)
- Red `#ff2d55` (DANGER / CRITICAL)
- Fonts: Orbitron (display/headings), JetBrains Mono (body/mono)
- Scanline overlay via `body::after` pseudo-element
- `glow-cyan`, `glow-green`, `glow-amber`, `glow-red` CSS utility classes
- `animate-flash-red` for danger state cards

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## AI Integration

- Backend: `artifacts/api-server/src/routes/anthropic/index.ts`
- SSE streaming via `POST /api/anthropic/conversations/:id/messages`
- Sends `systemPrompt` field with live sensor readings as context
- Frontend uses raw `fetch` + `ReadableStream` for SSE consumption
- Conversations/messages stored in PostgreSQL

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
