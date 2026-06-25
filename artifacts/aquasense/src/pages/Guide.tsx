import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info, Cpu, Wifi, SlidersHorizontal, Code2, AlertTriangle,
  CheckCircle2, Zap, ChevronRight, Terminal, BookOpen,
} from "lucide-react";

const TABS = [
  { id: "overview",         label: "Overview",       icon: Info },
  { id: "hardware",         label: "Hardware",        icon: Cpu },
  { id: "network",          label: "Network",         icon: Wifi },
  { id: "calibration",      label: "Calibration",     icon: SlidersHorizontal },
  { id: "api",              label: "API Reference",   icon: Code2 },
  { id: "troubleshooting",  label: "Troubleshooting", icon: AlertTriangle },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div
        className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-xs font-black mt-0.5 border-2 border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] bg-sky-200"
        style={{ color: "#2563eb" }}
      >
        {n}
      </div>
      <div className="flex-1 text-sm font-bold leading-relaxed" style={{ color: "var(--app-text-1)" }}>{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre
      className="rounded-md p-4 overflow-x-auto text-[11px] leading-relaxed mt-2 border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
      style={{
        background: "var(--app-surface-2)",
        color: "var(--app-text-1)",
        fontFamily: "var(--app-font-mono)",
      }}
    >
      {children.trim()}
    </pre>
  );
}

function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "tip" }) {
  const styles = {
    info:    { bg: "var(--app-primary-tint)", shadow: "#2563eb", icon: <Info className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />, label: "Note" },
    warning: { bg: "#fef3c7", shadow: "#d97706", icon: <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />, label: "Warning" },
    tip:     { bg: "#dcfce7", shadow: "#16a34a", icon: <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />, label: "Tip" },
  }[variant];

  return (
    <div
      className="flex gap-3 rounded-md p-4 text-sm border-[3px] border-black dark:border-white font-bold"
      style={{
        background: styles.bg,
        boxShadow: `3px 3px 0px 0px ${styles.shadow}`
      }}
    >
      {styles.icon}
      <div style={{ color: "var(--app-text-1)" }}>
        <span className="font-black uppercase tracking-wider mr-1 text-[11px] block sm:inline">{styles.label}:</span>
        {children}
      </div>
    </div>
  );
}

function SensorRow({ name, pin, description }: { name: string; pin: string; description: string }) {
  return (
    <div
      className="flex items-start gap-3 py-3 border-b-2 last:border-b-0 border-dashed"
      style={{ borderColor: "var(--app-border-subtle)" }}
    >
      <code
        className="text-[10px] font-black px-2 py-1 rounded-md shrink-0 mt-0.5 border-2 border-black bg-sky-200 text-[#2563eb]"
        style={{ fontFamily: "var(--app-font-mono)" }}
      >
        {pin}
      </code>
      <div>
        <p className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--app-text-1)" }}>{name}</p>
        <p className="text-xs mt-0.5 font-bold" style={{ color: "var(--app-text-2)" }}>{description}</p>
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
          What is AquaSense 2.0?
        </h2>
        <p className="text-sm font-bold leading-relaxed" style={{ color: "var(--app-text-2)" }}>
          AquaSense 2.0 is a real-time water quality monitoring platform that connects physical
          IoT sensors to a live dashboard. It continuously collects data on five key water quality
          parameters — pH, turbidity, temperature, dissolved oxygen, and total dissolved solids —
          and alerts you when readings fall outside safe ranges.
        </p>
      </div>

      <div
        className="rounded-md border-[3px] border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        style={{ background: "var(--app-surface)" }}
      >
        <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "var(--app-text-1)" }}>How data flows</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          {["Physical Sensor", "Microcontroller\n(ESP32 / Arduino)", "Network\n(WiFi / MQTT)", "AquaSense API", "Live Dashboard"].map((s, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="px-3 py-2 rounded-md text-center border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] bg-sky-200"
                style={{ color: "#2563eb", minWidth: 110, whiteSpace: "pre-line", lineHeight: 1.3 }}
              >
                {s}
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 shrink-0 text-black dark:text-white" />}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--app-text-1)" }}>Monitored Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { metric: "pH", range: "6.5 – 8.5", unit: "pH", desc: "Acidity / alkalinity of water" },
            { metric: "Turbidity", range: "0 – 4 NTU", unit: "NTU", desc: "Cloudiness caused by particles" },
            { metric: "Temperature", range: "15 – 25°C", unit: "°C", desc: "Water temperature" },
            { metric: "Dissolved O₂", range: "≥ 6 mg/L", unit: "mg/L", desc: "Oxygen available for aquatic life" },
            { metric: "TDS", range: "0 – 500 ppm", unit: "ppm", desc: "Total dissolved solids" },
          ].map(({ metric, range, unit, desc }) => (
            <div
              key={metric}
              className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
              style={{ background: "var(--app-surface)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black uppercase tracking-wide text-[#2563eb]">{metric}</span>
                <span className="text-[10px] font-black font-mono border-2 border-black dark:border-white bg-[#faf9f5] dark:bg-[#27272a] px-1.5 py-0.5 rounded-md" style={{ color: "var(--app-text-3)", fontFamily: "var(--app-font-mono)" }}>{unit}</span>
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#16a34a]">Safe: {range}</p>
              <p className="text-[11px] mt-1 font-bold" style={{ color: "var(--app-text-2)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--app-text-1)" }}>Quick Start Checklist</h3>
        <div className="space-y-3">
          {[
            "Purchase or source the required sensors (see Hardware tab)",
            "Wire sensors to your ESP32 or Arduino microcontroller",
            "Flash the firmware and configure your WiFi credentials",
            "Set the API endpoint to your AquaSense server URL",
            "Power on the device and verify data appears on the Dashboard",
            "Run calibration (see Calibration tab) for accurate readings",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
              <span className="text-sm font-bold" style={{ color: "var(--app-text-2)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HardwareTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
          Required Hardware
        </h2>
        <p className="text-sm font-bold" style={{ color: "var(--app-text-2)" }}>
          AquaSense works with any ESP32 or Arduino-compatible board capable of WiFi or serial communication.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--app-text-1)" }}>Recommended Microcontrollers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "ESP32 DevKit", note: "Recommended — built-in WiFi & Bluetooth", badge: "Best", color: "#2563eb", badgeColor: "#eff6ff", badgeText: "#2563eb" },
            { name: "Arduino Mega 2560", note: "Use with ESP8266 WiFi module for connectivity", badge: "Legacy", color: "#d97706", badgeColor: "#fffbeb", badgeText: "#d97706" },
            { name: "Raspberry Pi (any)", note: "Python script, full Linux environment", badge: "Advanced", color: "#7c3aed", badgeColor: "#f5f3ff", badgeText: "#7c3aed" },
          ].map(({ name, note, badge, color, badgeColor, badgeText }) => (
            <div
              key={name}
              className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
              style={{ background: "var(--app-surface)" }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Cpu className="w-4 h-4 text-[#2563eb]" />
                <span className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--app-text-1)" }}>{name}</span>
                {badge && (
                  <span
                    className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border-2 border-black dark:border-white"
                    style={{ background: badgeColor, color: badgeText }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold" style={{ color: "var(--app-text-2)" }}>{note}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--app-text-1)" }}>Sensor Bill of Materials</h3>
        <div
          className="rounded-md border-[3px] border-black dark:border-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--app-surface-2)", borderBottom: "3px solid var(--app-border)" }}>
                {["Parameter", "Sensor Module", "Protocol", "Est. Cost"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-black uppercase tracking-wide border-r-2 border-black last:border-r-0" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-mono)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ background: "var(--app-surface)" }}>
              {[
                ["pH", "DFRobot Gravity pH Probe (SEN0169-V2)", "Analog / I²C", "$35–60"],
                ["Turbidity", "DFRobot SEN0189 Turbidity Sensor", "Analog", "$10–20"],
                ["Temperature", "DS18B20 Waterproof Probe", "1-Wire (GPIO)", "$5–10"],
                ["Dissolved O₂", "Atlas Scientific EZO-DO Circuit", "UART / I²C", "$150–200"],
                ["TDS", "DFRobot Gravity TDS Sensor (SEN0244)", "Analog", "$15–25"],
              ].map(([param, sensor, proto, cost]) => (
                <tr key={param} className="border-b-2 border-black last:border-b-0">
                  <td className="px-4 py-3 font-black uppercase text-[#2563eb] border-r-2 border-black">{param}</td>
                  <td className="px-4 py-3 font-bold border-r-2 border-black" style={{ color: "var(--app-text-1)" }}>{sensor}</td>
                  <td className="px-4 py-3 font-mono font-bold border-r-2 border-black" style={{ color: "var(--app-text-2)", fontFamily: "var(--app-font-mono)" }}>{proto}</td>
                  <td className="px-4 py-3 text-[#16a34a] font-black">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--app-text-1)" }}>ESP32 Pin Connections</h3>
        <div
          className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          style={{ background: "var(--app-surface)" }}
        >
          <SensorRow name="pH Sensor (DFRobot SEN0169-V2)" pin="GPIO34" description="Analog input — connect SIGNAL → GPIO34, VCC → 3.3V, GND → GND" />
          <SensorRow name="Turbidity Sensor (SEN0189)" pin="GPIO35" description="Analog input — connect SIGNAL → GPIO35, VCC → 5V, GND → GND" />
          <SensorRow name="Temperature (DS18B20)" pin="GPIO4" description="1-Wire data pin — place 4.7kΩ pull-up resistor between DATA and VCC (3.3V)" />
          <SensorRow name="Dissolved O₂ (Atlas EZO-DO)" pin="GPIO16/17" description="UART: TX → GPIO16, RX → GPIO17. Or use I²C: SDA → GPIO21, SCL → GPIO22" />
          <SensorRow name="TDS Sensor (SEN0244)" pin="GPIO32" description="Analog input — connect SIGNAL → GPIO32, VCC → 3.3V, GND → GND" />
        </div>
      </div>

      <InfoBox variant="warning">
        The turbidity sensor (SEN0189) requires 5V supply. Use a logic level shifter on its signal line before connecting to an ESP32 GPIO to avoid damaging the 3.3V I/O pins.
      </InfoBox>

      <InfoBox variant="tip">
        Use shielded cables for pH and DO probes to reduce electromagnetic interference, especially in environments near pumps or motors.
      </InfoBox>
    </div>
  );
}

function NetworkTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
          Network Configuration
        </h2>
        <p className="text-sm font-bold" style={{ color: "var(--app-text-2)" }}>
          AquaSense supports two connectivity modes: direct HTTP POST to the REST API, or MQTT pub/sub for lower-latency streaming.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "HTTP REST (Simple)", desc: "Your device POSTs a JSON payload every N seconds. Works over any WiFi network. Best for most setups.", badge: "Recommended" },
          { title: "MQTT (Low Latency)", desc: "Publish readings to a topic. AquaSense subscribes and ingests in real time. Best for high-frequency sensor arrays.", badge: "Advanced" },
        ].map(({ title, desc, badge }) => (
          <div
            key={title}
            className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
            style={{ background: "var(--app-surface)" }}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Wifi className="w-4 h-4 text-[#2563eb]" />
              <span className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--app-text-1)" }}>{title}</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border-2 border-black dark:border-white bg-[#eff6ff] text-[#2563eb]">{badge}</span>
            </div>
            <p className="text-xs font-bold" style={{ color: "var(--app-text-2)" }}>{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>Option 1 — HTTP REST (ESP32 / Arduino)</h3>
        <div className="space-y-3">
          <Step n={1}>
            Add your WiFi credentials and server URL to the firmware config section:
            <Code>{`// config.h
#define WIFI_SSID     "YourNetworkName"
#define WIFI_PASS     "YourPassword"
#define API_HOST      "your-aquasense-domain.com"
#define API_PATH      "/api/readings"
#define SENSOR_ID     "River Station A"
#define POST_INTERVAL 5000   // ms between readings`}</Code>
          </Step>
          <Step n={2}>
            Include the WiFi and HTTPClient libraries and implement the send function:
            <Code>{`#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void postReading(float ph, float turb, float temp,
                 float doVal, float tds) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin("https://" API_HOST API_PATH);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["sensor"]      = SENSOR_ID;
  doc["pH"]          = ph;
  doc["turbidity"]   = turb;
  doc["temperature"] = temp;
  doc["do"]          = doVal;
  doc["tds"]         = tds;
  doc["timestamp"]   = millis();

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
}`}</Code>
          </Step>
          <Step n={3}>
            In your <code className="text-[#2563eb] bg-[var(--app-primary-tint)] px-1.5 py-0.5 rounded-md border-2 border-black dark:border-white font-mono font-bold" style={{ fontFamily: "var(--app-font-mono)" }}>loop()</code>, call{" "}
            <code className="text-[#2563eb] bg-[var(--app-primary-tint)] px-1.5 py-0.5 rounded-md border-2 border-black dark:border-white font-mono font-bold" style={{ fontFamily: "var(--app-font-mono)" }}>postReading()</code> every{" "}
            <code className="text-[#2563eb] bg-[var(--app-primary-tint)] px-1.5 py-0.5 rounded-md border-2 border-black dark:border-white font-mono font-bold" style={{ fontFamily: "var(--app-font-mono)" }}>POST_INTERVAL</code> milliseconds.
          </Step>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>Option 2 — MQTT (Mosquitto / HiveMQ)</h3>
        <Code>{`// Install PubSubClient library
#include <PubSubClient.h>

#define MQTT_BROKER "broker.hivemq.com"
#define MQTT_PORT   1883
#define MQTT_TOPIC  "aquasense/readings/river-station-a"

WiFiClient espClient;
PubSubClient client(espClient);

void publishReading(float ph, float turb, float temp,
                    float doVal, float tds) {
  StaticJsonDocument<256> doc;
  doc["sensor"] = SENSOR_ID;
  doc["pH"]     = ph;
  // ... other fields ...
  String msg; serializeJson(doc, msg);
  client.publish(MQTT_TOPIC, msg.c_str());
}`}</Code>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>Python (Raspberry Pi)</h3>
        <Code>{`import requests, json, time

API_URL = "https://your-aquasense-domain.com/api/readings"

def post_reading(ph, turbidity, temperature, do_val, tds):
    payload = {
        "sensor": "River Station A",
        "pH": round(ph, 3),
        "turbidity": round(turbidity, 3),
        "temperature": round(temperature, 2),
        "do": round(do_val, 3),
        "tds": round(tds, 1),
    }
    try:
        r = requests.post(API_URL, json=payload, timeout=5)
        r.raise_for_status()
    except Exception as e:
        print(f"[AquaSense] POST failed: {e}")

while True:
    ph    = read_ph_sensor()
    turb  = read_turbidity()
    temp  = read_temperature()
    do    = read_dissolved_oxygen()
    tds   = read_tds()
    post_reading(ph, turb, temp, do, tds)
    time.sleep(5)`}</Code>
      </div>

      <InfoBox variant="info">
        Replace <code className="text-[#2563eb]" style={{ fontFamily: "var(--app-font-mono)" }}>your-aquasense-domain.com</code> with your actual live domain (like Cloudflare, Vercel, etc.). For local development, use your computer's local network IP address (e.g., <code className="text-[#2563eb]" style={{ fontFamily: "var(--app-font-mono)" }}>192.168.1.50:5173</code>).
      </InfoBox>
    </div>
  );
}

function CalibrationTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
          Sensor Calibration
        </h2>
        <p className="text-sm font-bold" style={{ color: "var(--app-text-2)" }}>
          Calibrate your sensors before first use and recalibrate every 1–3 months for accurate readings.
        </p>
      </div>

      {[
        {
          metric: "pH",
          color: "#2563eb",
          interval: "Monthly",
          steps: [
            "Rinse the pH probe with distilled water and pat dry gently.",
            "Immerse the probe in pH 7.0 buffer solution and wait 2 minutes for the reading to stabilize.",
            "In your firmware, note the raw ADC voltage at pH 7 — this is your mid-point calibration.",
            "Repeat with pH 4.0 buffer (acidic side) and pH 10.0 buffer (alkaline side).",
            "Compute the slope: slope = (V_pH4 − V_pH10) / (4.0 − 10.0). Update your firmware constants.",
            "Rinse with distilled water before returning to field use.",
          ],
          note: "Store the pH probe tip submerged in storage solution (pH 4 buffer or 3 mol/L KCl) when not in use.",
        },
        {
          metric: "Turbidity",
          color: "#16a34a",
          interval: "Quarterly",
          steps: [
            "Prepare a clean container with distilled (0 NTU) water.",
            "Submerge the turbidity sensor and observe the raw ADC output — this is your baseline (0 NTU).",
            "Use Formazin standard solutions at 100 NTU and 1000 NTU to establish the voltage-to-NTU mapping.",
            "Apply a linear regression: NTU = (ADC_raw − baseline_ADC) × scale_factor.",
            "Update scale_factor in firmware so 0 NTU reads ≤ 0.1 and 100 NTU reads within ±5 NTU.",
          ],
          note: "Clean the sensor lens with a lint-free cloth before each calibration to remove bio-fouling deposits.",
        },
        {
          metric: "Temperature",
          color: "#d97706",
          interval: "Rarely",
          steps: [
            "The DS18B20 is factory-calibrated to ±0.5°C accuracy — no calibration is typically required.",
            "Verify accuracy by placing the probe in an ice-water bath (0°C ± 0.5°C) and boiling water (100°C at sea level).",
            "If offset correction is needed, add a constant offset in firmware: corrected_T = raw_T + offset.",
          ],
          note: "Ensure the probe is fully immersed to at least 20mm depth for accurate readings.",
        },
        {
          metric: "Dissolved Oxygen",
          color: "#7c3aed",
          interval: "Weekly",
          steps: [
            "Perform a single-point air calibration: hold the probe in open air for 5 minutes.",
            "Use the Atlas Scientific EZO-DO command: send 'Cal' over serial — the module auto-calibrates to air-saturated O₂.",
            "Optionally perform a zero-point calibration using sodium sulfite solution to verify 0 mg/L reading.",
            "Confirm: air-saturated water at 25°C should read approximately 8.26 mg/L.",
          ],
          note: "Temperature significantly affects DO saturation. AquaSense automatically applies temperature compensation when both sensors are active.",
        },
        {
          metric: "TDS",
          color: "#0891b2",
          interval: "Quarterly",
          steps: [
            "Prepare a 1413 μS/cm conductivity calibration solution (commonly available in kit form).",
            "Submerge the TDS sensor in the calibration solution at 25°C.",
            "The expected TDS reading for 1413 μS/cm is approximately 707 ppm (using a 0.5 conversion factor).",
            "Adjust the K-value in firmware until the reading matches: K = measured_conductivity / raw_output.",
            "Rinse with distilled water and verify 0 ppm (< 5 ppm acceptable).",
          ],
          note: "TDS conversion factors vary: 0.5 for NaCl solutions, 0.64 for mixed mineral water. Use the factor appropriate for your water source.",
        },
      ].map(({ metric, color, interval, steps, note }) => (
        <div
          key={metric}
          className="rounded-md border-[3px] border-black dark:border-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        >
          <div
            className="px-4 py-3 flex items-center justify-between border-b-[3px] border-black dark:border-white"
            style={{ background: "var(--app-surface-2)" }}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" style={{ color }} />
              <span className="text-sm font-black uppercase tracking-wider" style={{ color }}>{metric} Calibration</span>
            </div>
            <span
              className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-2 border-black dark:border-white"
              style={{ background: `${color}14`, color }}
            >
              {interval}
            </span>
          </div>
          <div className="p-4 space-y-3" style={{ background: "var(--app-surface)" }}>
            {steps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
            <InfoBox variant="tip">{note}</InfoBox>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApiTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
          API Reference
        </h2>
        <p className="text-sm font-bold" style={{ color: "var(--app-text-2)" }}>
          The AquaSense REST API accepts sensor readings as JSON payloads over HTTPS.
        </p>
      </div>

      <div
        className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        style={{ background: "var(--app-surface)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-black uppercase px-2 py-1 rounded-md border-2 border-black bg-[#16a34a] text-white">POST</span>
          <code className="text-sm font-black font-mono" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-mono)" }}>/api/readings</code>
        </div>
        <p className="text-xs font-bold mb-3" style={{ color: "var(--app-text-2)" }}>Submit a new sensor reading. The server validates ranges and triggers anomaly detection.</p>

        <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>Request Body (JSON)</h4>
        <Code>{`{
  "sensor":      "River Station A",   // string — sensor identifier
  "pH":          7.25,                // number — 0–14
  "turbidity":   2.4,                 // number — NTU
  "temperature": 21.3,               // number — °C
  "do":          8.1,                // number — mg/L
  "tds":         320,                // number — ppm
  "timestamp":   1714500000000       // optional — Unix ms (defaults to server time)
}`}</Code>

        <h4 className="text-xs font-black uppercase tracking-wider mt-4 mb-2" style={{ color: "var(--app-text-1)" }}>Response</h4>
        <Code>{`// 201 Created
{
  "id": 42,
  "sensor": "River Station A",
  "received_at": "2025-05-02T14:30:00Z",
  "status": "ingested"
}

// 400 Bad Request
{ "error": "pH must be between 0 and 14" }

// 422 Unprocessable Entity
{ "error": "Missing required field: sensor" }`}</Code>
      </div>

      <div
        className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        style={{ background: "var(--app-surface)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-black uppercase px-2 py-1 rounded-md border-2 border-black bg-[#2563eb] text-white">GET</span>
          <code className="text-sm font-black font-mono" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-mono)" }}>/api/readings?sensor=River+Station+A&limit=100</code>
        </div>
        <p className="text-xs font-bold" style={{ color: "var(--app-text-2)" }}>Fetch recent readings for a sensor. Returns an array sorted by timestamp descending.</p>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>Valid Sensor Names</h3>
        <div className="flex flex-wrap gap-2">
          {["River Station A", "Treatment Plant B", "Distribution Point C"].map((s) => (
            <code
              key={s}
              className="text-xs px-3 py-1 rounded-md border-2 border-black dark:border-white font-mono font-bold bg-[#dbeafe] text-[#2563eb]"
              style={{ fontFamily: "var(--app-font-mono)" }}
            >
              {s}
            </code>
          ))}
        </div>
      </div>

      <InfoBox variant="info">
        The demo version of AquaSense uses simulated data. In a production deployment, readings submitted via the API will override the simulation for the corresponding sensor.
      </InfoBox>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>Test with cURL</h3>
        <Code>{`curl -X POST https://your-aquasense-domain.com/api/readings \\
  -H "Content-Type: application/json" \\
  -d '{
    "sensor": "River Station A",
    "pH": 7.2,
    "turbidity": 1.8,
    "temperature": 22.5,
    "do": 8.3,
    "tds": 280
  }'`}</Code>
      </div>
    </div>
  );
}

function TroubleshootingTab() {
  const issues = [
    {
      problem: "Sensor not appearing on dashboard",
      cause: "The sensor name in your firmware doesn't match any of the three configured sensor names.",
      fix: 'Set the SENSOR_ID in firmware to exactly one of: "River Station A", "Treatment Plant B", or "Distribution Point C" (case-sensitive).',
    },
    {
      problem: "pH reading drifts over time",
      cause: "pH probes are susceptible to drift due to temperature changes and fouling of the glass electrode.",
      fix: "Recalibrate monthly. Store the probe in storage solution (not distilled water) to keep the electrode hydrated.",
    },
    {
      problem: "Turbidity always reads 0 or max",
      cause: "The sensor is likely receiving incorrect voltage (5V signal directly to ESP32 3.3V pin) or the LED emitter is blocked.",
      fix: "Check the voltage divider / logic level shifter on the signal line. Clean the sensor optics. Ensure nothing is obstructing the IR beam.",
    },
    {
      problem: "DS18B20 temperature reads −127°C",
      cause: "−127°C is the DS18B20 error code indicating communication failure on the 1-Wire bus.",
      fix: "Verify the 4.7kΩ pull-up resistor is connected between DATA and VCC. Check for a cold-solder joint on the data pin. Try a shorter cable (max ~10m without active repeater).",
    },
    {
      problem: "DO sensor reads 0 or shows noise",
      cause: "Atlas Scientific EZO-DO requires a warm-up period and may read incorrectly if the probe cap is dry or the membrane is damaged.",
      fix: "Allow a 10-minute warm-up after powering on. Ensure the membrane cap is hydrated. Recalibrate with the 'Cal' command over serial.",
    },
    {
      problem: "TDS reads 2-3× expected value",
      cause: "Incorrect K-value (conversion factor) in firmware, or the cell constant of the probe doesn't match the default calculation.",
      fix: "Use a calibration solution and recalculate: K = expected_ppm / (raw_conductivity × 0.5). Update the K constant in firmware.",
    },
    {
      problem: "WiFi connection drops frequently",
      cause: "Power supply instability, RF interference from sensors, or ESP32 power-save mode waking too slowly.",
      fix: 'Disable WiFi sleep mode: WiFi.setSleep(false). Use a stable 5V/2A power supply. Add 100μF capacitors near the power pins.',
    },
    {
      problem: "API POST returns 401 or connection refused",
      cause: "The API endpoint URL is incorrect or your AquaSense instance is not running.",
      fix: "Verify the domain in your browser first. Check that your AquaSense dashboard is running and accessible over the network. Ensure HTTPS is used for live domains.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
          Troubleshooting Guide
        </h2>
        <p className="text-sm font-bold" style={{ color: "var(--app-text-2)" }}>
          Common issues and their solutions for setting up and operating AquaSense sensors.
        </p>
      </div>

      <div className="space-y-4">
        {issues.map(({ problem, cause, fix }) => (
          <div
            key={problem}
            className="rounded-md border-[3px] border-black dark:border-white overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
          >
            <div
              className="px-4 py-3 flex items-start gap-3 border-b-[3px] border-black dark:border-white"
              style={{ background: "var(--app-surface-2)" }}
            >
              <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
              <span className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--app-text-1)" }}>{problem}</span>
            </div>
            <div className="px-4 py-3 space-y-2 font-bold" style={{ background: "var(--app-surface)" }}>
              <p className="text-xs" style={{ color: "var(--app-text-2)" }}>
                <span className="font-black uppercase tracking-wider text-[10px] text-[#dc2626]">Cause: </span>
                {cause}
              </p>
              <p className="text-xs" style={{ color: "var(--app-text-2)" }}>
                <span className="font-black uppercase tracking-wider text-[10px] text-[#16a34a]">Fix: </span>
                {fix}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-md border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        style={{ background: "var(--app-surface)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-[#2563eb]" />
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--app-text-1)" }}>Debug Checklist</span>
        </div>
        <div className="space-y-2">
          {[
            "Open Serial Monitor (115200 baud) to see live sensor output",
            "Confirm WiFi connects and IP is assigned",
            "Test API endpoint manually with cURL before flashing firmware",
            "Check sensor power supply voltages with a multimeter",
            "Verify all GND connections are common (shared ground between MCU and sensors)",
            "Remove sensors one by one to isolate which one is causing issues",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 text-[#d97706] shrink-0 mt-0.5" />
              <span className="text-xs font-bold" style={{ color: "var(--app-text-2)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TAB_CONTENT: Record<TabId, React.ReactNode> = {
  overview:        <OverviewTab />,
  hardware:        <HardwareTab />,
  network:         <NetworkTab />,
  calibration:     <CalibrationTab />,
  api:             <ApiTab />,
  troubleshooting: <TroubleshootingTab />,
};

export function Guide() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6" data-testid="guide-page">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 border-[3px] border-black dark:border-white bg-[#2563eb] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
        >
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1
            className="text-lg font-black leading-none uppercase tracking-wider"
            style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}
          >
            Setup Guide
          </h1>
          <p className="text-xs mt-1 font-bold" style={{ color: "var(--app-text-2)" }}>
            Connect your water quality sensors to a local source
          </p>
        </div>
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        style={{ borderBottom: "3px solid var(--app-border)", scrollbarWidth: "none" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 whitespace-nowrap py-1.5 px-3 text-xs font-extrabold uppercase border-[3px] border-black dark:border-white rounded-md transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] shrink-0 cursor-pointer"
            style={{
              background: activeTab === id ? "#2563eb" : "var(--app-surface-2)",
              color: activeTab === id ? "#ffffff" : "var(--app-text-1)",
              boxShadow: activeTab === id ? "3px 3px 0px 0px var(--app-border)" : "1px 1px 0px 0px var(--app-border)",
            }}
            data-testid={`guide-tab-${id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          data-testid={`guide-content-${activeTab}`}
        >
          {TAB_CONTENT[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
