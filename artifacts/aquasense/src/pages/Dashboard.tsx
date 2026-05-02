import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Zap, WifiOff } from "lucide-react";
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
    currentReadings, history, anomalies, selectedSensor,
    acknowledgeAnomaly, setSelectedSensor, rainEvent, offlineSensor,
    crisisEndTime, triggerCrisis,
  } = useSensorData();

  const displaySensor: SensorName = selectedSensor ?? SENSORS[0];
  const snap = currentReadings[displaySensor];
  const hist = history[displaySensor];
  const isDisplayOffline = snap.offline;
  const score = calcScore(snap);

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const crisisSecsLeft = crisisEndTime ? Math.max(0, Math.ceil((crisisEndTime - nowMs) / 1000)) : 0;
  const isCrisis = crisisSecsLeft > 0;

  return (
    <div className="space-y-4" data-testid="dashboard-page">

      {/* Top row: banners + gauge */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">

        <div className="flex-1 min-w-0 space-y-2 w-full">
          <AnimatePresence>
            {isCrisis && (
              <motion.div
                key="crisis-banner"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap"
                style={{
                  background:  "rgba(220, 38, 38, 0.08)",
                  borderColor: "rgba(220, 38, 38, 0.30)",
                }}
                data-testid="crisis-banner"
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="w-2 h-2 rounded-full bg-[#dc2626] shrink-0"
                />
                <span className="text-[#dc2626] text-xs font-semibold">
                  Crisis simulation active
                </span>
                <span className="text-xs hidden sm:block" style={{ color: "var(--app-text-2)" }}>
                  All metrics forced to danger range
                </span>
                <span className="ml-auto text-xs font-semibold tabular-nums text-[#dc2626]" style={{ fontFamily: "var(--app-font-mono)" }}>
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
                style={{ background: "var(--app-primary-tint)", borderColor: "var(--app-primary-tint-border)" }}
                data-testid="rain-event-banner"
              >
                <motion.span animate={{ y: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-base shrink-0">🌧</motion.span>
                <span className="text-[#1d4ed8] text-xs font-semibold">Rain event active</span>
                <span className="text-xs hidden sm:block" style={{ color: "var(--app-text-2)" }}>
                  Turbidity +{rainEvent.intensity.toFixed(1)} NTU · TDS rising
                </span>
                <Droplets className="w-4 h-4 text-[#3b82f6] ml-auto shrink-0" />
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
                style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
                data-testid="offline-sensor-banner"
              >
                <WifiOff className="w-4 h-4 shrink-0" style={{ color: "var(--app-text-3)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--app-text-1)" }}>Sensor offline</span>
                <span className="text-xs" style={{ color: "var(--app-text-2)" }}>{offlineSensor} — reconnecting…</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnomalyBanner anomalies={anomalies} onDismiss={acknowledgeAnomaly} />
        </div>

        {/* Right: gauge + crisis button */}
        <div className="flex flex-col gap-2 items-center sm:items-end shrink-0 w-full sm:w-auto">
          <WaterQualityGauge score={score} sensorName={displaySensor} offline={isDisplayOffline} />
          <motion.button
            onClick={triggerCrisis}
            disabled={isCrisis}
            whileHover={{ scale: isCrisis ? 1 : 1.02 }}
            whileTap={{ scale: isCrisis ? 1 : 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
            style={{
              borderColor: isCrisis ? "#fca5a5" : "#fecaca",
              background: isCrisis ? "#fef2f2" : "transparent",
              color: isCrisis ? "#dc2626" : "#b91c1c",
            }}
            data-testid="simulate-crisis-btn"
          >
            {isCrisis ? (
              <>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
                Crisis: {crisisSecsLeft}s
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

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((metric, i) => (
          <MetricCard
            key={metric}
            metric={metric}
            label={snap[metric].label}
            value={snap[metric].value}
            unit={snap[metric].unit}
            status={snap[metric].status}
            index={i}
            offline={isDisplayOffline}
          />
        ))}
      </div>

      {/* Chart + Sensor map */}
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
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-medium text-[#2563eb] text-center"
          data-testid="sensor-filter-indicator"
        >
          Filtered to {selectedSensor} — click sensor to clear
        </motion.p>
      )}
    </div>
  );
}
