# AquaSense 2.0
v1 - https://github.com/ClashLex/Aqua-Sense
Smart Water Quality Monitoring Platform

## Overview

AquaSense is a real-time smart water quality monitoring platform that uses IoT sensor simulation, AI-powered anomaly detection, and predictive analytics to monitor, detect anomalies, and predict unsafe water conditions. Includes an AI chatbot powered by free Chinese model APIs (DeepSeek, Qwen).

## Features

- **Live Dashboard** — Real-time readings for 5 water quality metrics across 3 monitoring stations
- **AI Assistant** — Chat with an AI that has live access to your sensor data
- **Floating Copilot** — Quick-access AI chat available on every page
- **Anomaly Detection** — Triggers alerts after 3 consecutive unsafe readings (no false positives)
- **Predictive Analytics** — 2-hour forecast using linear regression, trend charts, anomaly history
- **Alerts** — Active/resolved alerts with acknowledge workflow and detection rules
- **Setup Guide** — Comprehensive IoT hardware, calibration, and API documentation

## Metrics Monitored

| Metric | Safe Range | Warning | Danger |
|--------|------------|---------|--------|
| pH Level | 6.5 – 8.5 | 6.0–6.5 or 8.5–9.0 | < 6.0 or > 9.0 |
| Turbidity | < 4 NTU | 4–10 NTU | > 10 NTU |
| Temperature | 15 – 25 C | 25–35 C | > 35 C |
| Dissolved Oxygen | > 6 mg/L | 4–6 mg/L | < 4 mg/L |
| TDS | < 500 ppm | 500–1000 ppm | > 1000 ppm |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| Routing | wouter |
| AI | OpenRouter (DeepSeek V4 Flash free) |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Aqua-Sense-main

# Install dependencies
pnpm install

# Configure AI (optional but recommended)
cp artifacts/aquasense/.env.example artifacts/aquasense/.env
# Edit .env and add your free API key from openrouter.ai

# Start the dev server
pnpm dev
```

The app opens at `http://localhost:5173`.

### AI Setup (Free, 2 minutes)

1. Sign up at [openrouter.ai](https://openrouter.ai) (no credit card needed)
2. Create an API key in the dashboard
3. Create `artifacts/aquasense/.env`:
   ```
   VITE_AI_BASE_URL=https://openrouter.ai/api/v1
   VITE_AI_API_KEY=sk-or-v1-your-key-here
   VITE_AI_MODEL=deepseek/deepseek-v4-flash:free
   ```
4. Restart the dev server

See `api.md` for full provider setup details (DeepSeek, Qwen, others).

### Build for Production

```bash
pnpm build
pnpm preview
```

## Project Structure

```
Aqua-Sense-main/
├── artifacts/
│   └── aquasense/              # Main frontend application
│       ├── src/
│       │   ├── components/     # UI components (MetricCard, charts, sidebar, CopilotChat)
│       │   ├── contexts/       # SensorDataContext (physics engine), ThemeContext
│       │   ├── hooks/          # useSensorData, use-mobile, use-toast
│       │   ├── lib/            # ai-client.ts (streaming AI integration)
│       │   ├── pages/          # Dashboard, Analytics, Alerts, Assistant, Guide
│       │   └── utils/          # Thresholds, anomaly engine, linear regression
│       ├── .env.example        # AI configuration template
│       ├── vite.config.ts
│       └── package.json
├── api.md                      # API connection guide
├── walkthrough.md              # Hosting/deployment guide
├── attached_assets/            # Product requirements document
├── package.json                # Root workspace
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Documentation

- **[api.md](api.md)** — How to connect a free AI API (OpenRouter, DeepSeek, Qwen)
- **[walkthrough.md](walkthrough.md)** — Deploy to Vercel, Netlify, Cloudflare, Docker, or self-host

## License

MIT License
