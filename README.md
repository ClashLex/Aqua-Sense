# 💧 AquaSense 2.0
### Smart Water Quality Monitoring Platform — From IoT Concept to Live Platform

[![Status](https://img.shields.io/badge/Status-Live-brightgreen)](https://aqua-sense-builder--ansilmuhammed91.replit.app/)
[![Buildathon](https://img.shields.io/badge/Replit-10th%20Anniversary%20Buildathon-orange)](.)
[![Department](https://img.shields.io/badge/Department-Computer%20Science%20%26%20Engineering-blue)](.)
[![College](https://img.shields.io/badge/College-KMEA%20Engineering%20College-blue)](.)
[![Built With](https://img.shields.io/badge/Built%20With-Replit%20Agent-red)](.)

> *Started as an S2 CSE academic IoT project. Built into a live deployable platform in 24 hours using Replit Agent.*

**🌐 Live Demo: [aqua-sense-builder--ansilmuhammed91.replit.app](https://aqua-sense-builder--ansilmuhammed91.replit.app/)**

---

## 📌 Overview

**AquaSense** is a real-time smart water quality monitoring platform that uses IoT sensors, AI/ML algorithms, and cloud intelligence to monitor, detect anomalies, and predict unsafe water conditions — for homes, industries, and municipalities.

**AquaSense 2.0** is the live web platform built during the Replit 10th Anniversary Buildathon. It brings the original four-layer fault-tolerant IoT architecture to life as a fully functional dashboard with AI-powered anomaly detection, predictive analytics, and a Claude-powered water quality assistant.

---

## 🚨 The Problem

Traditional water monitoring systems fail in three dangerous ways:

- **Goes Silent** — stops receiving data and assumes everything is normal
- **Misclassifies** — confuses an unknown event with a known pattern
- **Crashes** — entire system halts with no alerts or automation

> *"A third party closes the external water supply valve. Flow sensors read zero. Pressure drops. The system cannot distinguish this from 'all taps off' — so it raises no alert. The user has no water and no idea why."*

AquaSense solves this with a system that **NEVER fails silently**.

---

## ✨ Features

### 📊 Live Dashboard
- Real-time readings for 5 water quality metrics across 3 monitoring stations
- Animated metric cards with instant status indicators — Safe / Warning / Danger
- Live updating line chart (every 5 seconds)
- Overall Water Quality Score (0–100, color coded)

### 🔬 Metrics Monitored
| Metric | Safe Range | Warning | Danger |
|--------|------------|---------|--------|
| pH Level | 6.5 – 8.5 | 6.0–6.5 or 8.5–9.0 | < 6.0 or > 9.0 |
| Turbidity | < 4 NTU | 4–10 NTU | > 10 NTU |
| Temperature | 15 – 25 °C | 25–35 °C | > 35 °C |
| Dissolved Oxygen | > 6 mg/L | 4–6 mg/L | < 4 mg/L |
| TDS | < 500 ppm | 500–1000 ppm | > 1000 ppm |

### ⚠️ AI Anomaly Detection
- Monitors every reading against safety thresholds in real time
- Triggers alerts after 3 consecutive unsafe readings (no false positives)
- Severity levels: Critical / High / Medium / Low
- Full alert history with acknowledge functionality
- Simulates sensor offline events (Watchdog Heartbeat system)

### 📈 Predictive Analytics
- Historical trend charts with time range selection (1h / 6h / 24h / 7d)
- 2-hour predictive forecast using linear regression on last 20 readings
- Anomaly heatmap — metrics vs time, colored by severity
- One-click exportable water quality summary report

### 🤖 AI Water Quality Assistant
- Embedded Claude AI (`claude-sonnet-4-20250514`) with live sensor context
- Every response is grounded in your actual current readings
- Ask: *"Is this water safe to drink?"*, *"What's causing high turbidity?"*, *"Predict pH trend"*
- Floating quick-chat available on every page — no need to leave the dashboard

---

## 🏗️ Original System Architecture (IoT Layer)

AquaSense was designed on a **four-layer fault-tolerant architecture**:

```
Layer 1 — SENSING
    Ultrasonic flow sensors + Pressure sensors + Smart motorized valve
    Each sensor sends heartbeat ping every 30 seconds

Layer 2 — CONNECTIVITY (Redundant Stack)
    Primary  : WiFi + Zigbee mesh
    Backup 1 : 4G SIM (auto-activates if WiFi drops)
    Backup 2 : LoRaWAN (operates even when WiFi + 4G fail)
    Offline  : Edge AI on gateway (runs locally, syncs on reconnect)

Layer 3 — CLOUD INTELLIGENCE (AI Engine)
    Baseline Profiling    → 7-day learning of normal usage patterns
    Known Anomaly         → Isolation Forest (leaks, high usage, dry pipe)
    Unknown Anomaly       → Autoencoder Neural Network
    Watchdog Monitor      → Heartbeat tracker, 2-min timeout alert
    Cross-Validation      → Multi-sensor contradiction detection

Layer 4 — USER INTERFACE (AquaSense 2.0 — this repo)
    Web Dashboard         → React + Vite (live platform)
    Mobile App            → React Native (planned)
    SMS Alerts            → Backup for critical events
```

---

## 🛡️ Fault Tolerance Framework

### Four Integrated Mechanisms

#### 1. 🧠 AI Anomaly Detection
- Autoencoder Neural Network flags unrecognizable patterns
- 5-state classification: `Normal` | `Known Leak` | `Known High Usage` | `Known Dry Pipe` | `Unknown Interference`
- Unknown events trigger: *"Unrecognized event detected — please inspect physically"*

#### 2. ⏱️ Watchdog Heartbeat System
Every sensor pings the cloud every 30 seconds independently of data.

| State | Condition | Response |
|-------|-----------|----------|
| 🟢 Active | Heartbeat received, data normal | Continue monitoring |
| 🟡 Degraded | Heartbeat received, data suspicious | Flag + alert user |
| 🔴 Dead | No heartbeat for 2+ minutes | ALERT: Sensor offline |

#### 3. 📡 Multi-Sensor Cross-Validation

| Flow | Pressure | Valve | Heartbeat | Conclusion |
|------|----------|-------|-----------|------------|
| Zero | Normal | Open | Active | ⚠️ UNKNOWN: Pipe blocked |
| Zero | Zero | Open | Active | ⚠️ UNKNOWN: External supply cut |
| High | Dropping | Open | Active | 💧 Known: Leak detected |
| Zero | Zero | Closed | Active | ✅ Normal: User closed valve |
| Any | Any | Any | Dead | 🚨 CRITICAL: Sensor offline |

#### 4. 🔋 Redundant Communication

| Layer | Technology | When Active |
|-------|------------|-------------|
| Primary | WiFi + Cloud AI | Normal operation |
| Backup 1 | 4G SIM | WiFi drops |
| Backup 2 | LoRaWAN | WiFi + 4G fail |
| Offline | Edge AI on Gateway | All internet down |
| Restore | Auto cloud sync | Internet restored |

---

## 🛠️ Tech Stack

### AquaSense 2.0 Platform (This Repo)
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| AI Assistant | Claude API (`claude-sonnet-4-20250514`) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Deployment | Replit |

### Full IoT System (Hardware Layer)
```
IoT Hardware  : ESP32, Ultrasonic Flow Sensors, Pressure Sensors, Zigbee, LoRaWAN
Communication : MQTT, WiFi, 4G SIM, LoRaWAN
Cloud         : AWS IoT Core, Lambda, DynamoDB
AI/ML         : Python, TensorFlow (Autoencoder), Scikit-learn (Isolation Forest)
Edge AI       : TensorFlow Lite on ESP32 / Raspberry Pi gateway
Security      : AES-256, TLS 1.3
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/ClashLex/Aquasense.git
cd Aquasense

# Install dependencies
npm install

# Add your API key
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env

# Start the dev server
npm run dev
```

### Or try the live demo instantly
👉 **[aqua-sense-builder--ansilmuhammed91.replit.app](https://aqua-sense-builder--ansilmuhammed91.replit.app/)**  
No setup needed. Opens straight to the live dashboard.

---

## 📁 Project Structure

```
aquasense-2.0/
├── src/
│   ├── hooks/
│   │   └── useSensorData.js       # Sensor simulation + data engine
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── MetricCard.jsx
│   │   ├── RealTimeChart.jsx
│   │   ├── AnomalyBanner.jsx
│   │   └── ChatMessage.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Analytics.jsx
│   │   ├── Alerts.jsx
│   │   └── Assistant.jsx
│   └── utils/
│       ├── thresholds.js          # Safety ranges per metric
│       ├── anomalyEngine.js       # Detection logic
│       └── linearRegression.js   # Prediction math
├── business-plan/
│   └── AquaSense_Business_Plan.docx
├── index.html
├── vite.config.js
└── tailwind.config.js
```

---

## 🧠 How the AI Assistant Works

Every message automatically injects live sensor context into Claude's system prompt:

```
Current Readings:
- pH: 7.2 (SAFE)
- Turbidity: 8.4 NTU (WARNING)
- Temperature: 22°C (SAFE)
- Dissolved Oxygen: 5.1 mg/L (WARNING)
- TDS: 320 ppm (SAFE)
- Overall Quality Score: 71/100
```

The AI doesn't give generic answers — it responds based on what your water actually looks like right now.

---

## 💰 Business Model

| Plan | Target | Price | Key Features |
|------|--------|-------|--------------|
| **Home** | Households | ₹199/month | 1 zone, leak alerts, mobile app |
| **Plus** | Apartments & Villas | ₹499/month | 5 zones, auto valve, 4G backup |
| **Pro** | Hotels, Hospitals, Offices | ₹1,999/month | 20 zones, all 4 resilience layers |
| **City** | Municipalities | Custom | City-scale, full redundancy, Govt. reporting |

### Market Opportunity
- 🌍 Global Smart Water Management: **USD 18B (2025) → USD 42B (2030)** at 18–22% CAGR
- 🇮🇳 India growing at **40%+ CAGR**, driven by Jal Jeevan Mission & Smart City projects
- 🏙️ Urban water distribution losses in India: **35–50%** — directly addressable by AquaSense

### Financial Projections
| Year | Revenue | Gross Margin | Net Profit |
|------|---------|--------------|------------|
| 2026 | ₹40 Lakhs | 44% | ₹7 Lakhs |
| 2027 | ₹1.6 Crores | 57% | ₹52 Lakhs |
| 2028 | ₹6 Crores | 67% | ₹2 Crores |

**Seed Funding Required: ₹40 Lakhs**

---

## 🔐 IPR Strategy

| IP Type | Asset |
|---------|-------|
| Patent | Autoencoder unknown anomaly detection |
| Patent | Watchdog heartbeat protocol |
| Patent | Multi-sensor cross-validation engine |
| Trade Secret | Trained AI models + thresholds |
| Copyright | Dashboard platform code |
| Trademark | AquaSense name, logo & tagline |

---

## 👥 Team

| Member | Role |
|--------|------|
| Ansil Muhammed N S | Lead Developer & Buildathon Participant |
| Muhammed Ihsan K I | Team Member |
| Muhammed Faiz K N | Team Member |
| Muhammed Aadhil M U | Team Member |

**Institution:** KMEA Engineering College (Autonomous), Aluva, Edathala, Kerala  
**Department:** Computer Science and Engineering — S2 CSE A

---

## 🌍 Real-World Impact

Unsafe water affects over 2 billion people globally. AquaSense makes continuous water quality monitoring accessible — no expensive enterprise hardware required for the dashboard layer. The platform is designed to connect to real IoT sensors via a simple data API, making deployment straightforward for municipalities, agricultural systems, and industrial facilities.

---

## 👨‍💻 Builder

**Ansil Muhammed N S**  
First-year B.Tech CSE @ KMEA Engineering College, Kerala  
GitHub: [@ClashLex](https://github.com/ClashLex)  
Live App: [aqua-sense-builder--ansilmuhammed91.replit.app](https://aqua-sense-builder--ansilmuhammed91.replit.app/)

---

## 📄 License

MIT License — free to use, modify, and deploy.

---

> *"The AquaSense system NEVER fails silently. Every unknown event, sensor failure, communication drop, or power interruption is detected, classified, logged, and communicated to the user."*

*© 2026 AquaSense — KMEA Engineering College, CSE Department*  
*Built for the Replit 10th Anniversary Buildathon — May 2026*
