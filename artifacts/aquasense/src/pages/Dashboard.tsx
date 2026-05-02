import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, AlertTriangle, Zap } from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { RealTimeChart } from "../components/RealTimeChart";
import { AnomalyBanner } from "../components/AnomalyBanner";
import { SensorMap } from "../components/SensorMap";
import { WaterQualityGauge } from "../components/WaterQualityGauge";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType, StatusType } from "../utils/thresholds";
import type { SensorSnapshot } from "../hooks/useSensorData";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];
const WEIGHTS: Record<MetricType, number> = { pH: 25, Turbidity: 20, Temperature: 15, DO: 25, TDS: 15 };

function calcScore(snap: SensorSnapshot): number {
  if (snap.offline) return 0;
  let score = 0;
  for (const m of METRICS) {
    const s: StatusType = snap[m].status;
    score += s === "SAFE" ? WEIGHTS[m] : s === "WARNING" ? WEIGHTS[m] * 0.4 : 0;
  }
  return Math.round(score);
}

export function Dashboard() {
  const {
    currentReadings,
    history,
    anomalies,
    selectedSensor,
    acknowledgeAnomaly,
    setSelectedSensor,
    rainEvent,
    offlineSensor,
    crisisEndTime,
    triggerCrisis,
  } = useSensorData();

  const displaySensor: SensorName = selectedSensor ?? SENSORS[0];
  const snap = currentReadings[displaySensor];
  const hist = history[displaySensor];
  const isDisplayOffline = snap.offline;
  const score = calcScore(snap);

  // 1-second countdown for crisis timer
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const crisisSecsLeft = crisisEndTime ? Math.max(0, Math.ceil((crisisEndTime - nowMs) / 1000)) : 0;
  const isCrisis = crisisSecsLeft > 0;

  return (
    <div className="space-y-4" data-testid="dashboard-page">

      {/* ── Top row: banners (left) + WQS gauge + crisis button (right) ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">

        {/* Left: event + anomaly banners */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          <AnimatePresence>
            {/* Crisis active banner */}
            {isCrisis && (
              <motion.div
                key="crisis-banner"
                initial={{ opacity: 0, y: -14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap"
                style={{
                  background: "linear-gradient(135deg, rgba(255,45,85,0.15) 0%, #0d1f3c 100%)",
                  borderColor: "rgba(255,45,85,0.5)",
                  boxShadow: "0 0 24px rgba(255,45,85,0.12)",
                }}
                data-testid="crisis-banner"
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="w-2 h-2 rounded-full bg-[#ff2d55] shrink-0"
                />
                <span className="text-[#ff2d55] text-xs font-mono font-bold tracking-widest">
                  CRISIS SIMULATION ACTIVE
                </span>
                <span className="text-[#ff6b35] text-xs font-mono hidden sm:block">
                  All metrics forced to DANGER range
                </span>
                <span
                  className="ml-auto text-xs font-mono tabular-nums font-bold"
                  style={{ color: "#ff2d55", fontFamily: "var(--app-font-display)" }}
                >
                  {crisisSecsLeft}s
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {rainEvent.active && (
              <motion.div
                key="rain-banner"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border px-4 py-3 flex items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, #0d1f3c 100%)",
                  borderColor: "rgba(96,165,250,0.35)",
                  boxShadow: "0 0 18px rgba(96,165,250,0.12)",
                }}
                data-testid="rain-event-banner"
              >
                <motion.span
                  animate={{ y: [0, 2, 0] }}
                  transition={{ repeat: Infinity, duration: 1.0 }}
                  className="text-base shrink-0"
                >🌧</motion.span>
                <span className="text-[#60a5fa] text-xs font-mono font-bold tracking-widest">
                  RAIN EVENT ACTIVE
                </span>
                <span className="text-[#94a3b8] text-xs font-mono hidden sm:block">
                  Turbidity +{rainEvent.intensity.toFixed(1)} NTU · TDS rising
                </span>
                <Droplets className="w-4 h-4 text-[#60a5fa] ml-auto shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {offlineSensor && (
              <motion.div
                key="offline-banner"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border px-4 py-3 flex items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, rgba(71,85,105,0.18) 0%, #0d1f3c 100%)",
                  borderColor: "rgba(71,85,105,0.4)",
                }}
                data-testid="offline-sensor-banner"
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="w-2 h-2 rounded-full bg-[#475569] shrink-0"
                />
                <span className="text-[#94a3b8] text-xs font-mono font-bold tracking-widest">
                  SENSOR OFFLINE
                </span>
                <span className="text-[#64748b] text-xs font-mono">
                  {offlineSensor} — reconnecting…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnomalyBanner anomalies={anomalies} onDismiss={acknowledgeAnomaly} />
        </div>

        {/* Right: WQS gauge + crisis demo button */}
        <div className="flex flex-col gap-2 items-center sm:items-end shrink-0 w-full sm:w-auto">
          <WaterQualityGauge
            score={score}
            sensorName={displaySensor}
            offline={isDisplayOffline}
          />
          {/* Simulate Crisis button — demo tool */}
          <motion.button
            onClick={triggerCrisis}
            disabled={isCrisis}
            whileHover={{ scale: isCrisis ? 1 : 1.03 }}
            whileTap={{ scale: isCrisis ? 1 : 0.97 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase border transition-all disabled:cursor-not-allowed"
            style={{
              borderColor: isCrisis ? "rgba(255,45,85,0.55)" : "rgba(255,45,85,0.28)",
              background: isCrisis
                ? "rgba(255,45,85,0.14)"
                : "rgba(255,45,85,0.06)",
              color: isCrisis ? "#ff2d55" : "#ff5577",
              boxShadow: isCrisis ? "0 0 12px rgba(255,45,85,0.2)" : "none",
            }}
            data-testid="simulate-crisis-btn"
          >
            {isCrisis ? (
              <>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="w-1.5 h-1.5 rounded-full bg-[#ff2d55]"
                />
                Crisis: {crisisSecsLeft}s remaining
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Simulate Crisis
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Metric cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRICS.map((metric, i) => (
          <MetricCard
            key={metric}
            metric={metric}
            label={snap[metric].label}
            value={snap[metric].value}
            unit={snap[metric].unit}
            status={snap[metric].status}
            history={hist[metric].slice(-10)}
            index={i}
            offline={isDisplayOffline}
          />
        ))}
      </div>

      {/* ── Chart + Sensor map ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RealTimeChart history={hist} offline={isDisplayOffline} />
        </div>
        <div>
          <SensorMap
            readings={currentReadings}
            selected={selectedSensor}
            onSelect={setSelectedSensor}
            rainEvent={rainEvent}
            offlineSensor={offlineSensor}
          />
        </div>
      </div>

      {selectedSensor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] font-mono text-[#00f5ff] tracking-widest text-center"
          data-testid="sensor-filter-indicator"
        >
          FILTERED: {selectedSensor} — click sensor to clear
        </motion.div>
      )}
    </div>
  );
}
