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
    <div className="space-y-6" data-testid="dashboard-page">

      {/* Top row: banners + gauge */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">

        <div className="flex-1 min-w-0 space-y-3 w-full">
          <AnimatePresence>
            {isCrisis && (
              <motion.div
                key="crisis-banner"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-md border-[3px] border-black dark:border-white px-4 py-3 flex items-center gap-3 flex-wrap shadow-[3px_3px_0px_0px_#dc2626]"
                style={{
                  background:  "var(--app-surface)",
                }}
                data-testid="crisis-banner"
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shrink-0 border border-black"
                />
                <span className="text-[#dc2626] text-xs font-black uppercase tracking-wider">
                  Crisis simulation active
                </span>
                <span className="text-xs hidden sm:block font-bold" style={{ color: "var(--app-text-3)" }}>
                  All metrics forced to danger range
                </span>
                <span className="ml-auto text-xs font-black tracking-wider tabular-nums text-[#dc2626]" style={{ fontFamily: "var(--app-font-mono)" }}>
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
                className="rounded-md border-[3px] border-black dark:border-white px-4 py-3 flex items-center gap-3 shadow-[3px_3px_0px_0px_#2563eb]"
                style={{ background: "var(--app-surface)" }}
                data-testid="rain-event-banner"
              >
                <motion.span animate={{ y: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-base shrink-0">🌧</motion.span>
                <span className="text-[#1d4ed8] text-xs font-black uppercase tracking-wider">Rain event active</span>
                <span className="text-xs hidden sm:block font-bold" style={{ color: "var(--app-text-3)" }}>
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
                className="rounded-md border-[3px] border-black dark:border-white px-4 py-3 flex items-center gap-3 shadow-[3px_3px_0px_0px_#64748b]"
                style={{ background: "var(--app-surface)" }}
                data-testid="offline-sensor-banner"
              >
                <WifiOff className="w-4 h-4 shrink-0 text-[#64748b]" />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--app-text-1)" }}>Sensor offline</span>
                <span className="text-xs font-bold" style={{ color: "var(--app-text-3)" }}>{offlineSensor} — reconnecting…</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnomalyBanner anomalies={anomalies} onDismiss={acknowledgeAnomaly} />
        </div>

        {/* Right: gauge + crisis button */}
        <div className="flex flex-col gap-3 items-center sm:items-end shrink-0 w-full sm:w-auto">
          <WaterQualityGauge score={score} sensorName={displaySensor} offline={isDisplayOffline} />
          <button
            onClick={triggerCrisis}
            disabled={isCrisis}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-extrabold uppercase border-[3px] border-black dark:border-white disabled:cursor-not-allowed transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            style={{
              background:  isCrisis ? "#fca5a5" : "#fee2e2",
              boxShadow:   isCrisis ? "2px 2px 0px 0px #000" : "3px 3px 0px 0px #000",
              color:       "#b91c1c",
            }}
            data-testid="simulate-crisis-btn"
          >
            {isCrisis ? (
              <>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-2 h-2 rounded-full bg-[#dc2626] shrink-0 border border-black" />
                Demo active · {crisisSecsLeft}s
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 shrink-0" />
                Demo: Trigger Alert
              </>
            )}
          </button>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          className="text-xs font-black uppercase text-[#2563eb] text-center border-[3px] border-black bg-sky-100 p-2 rounded-md max-w-sm mx-auto shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
          onClick={() => setSelectedSensor(null)}
          data-testid="sensor-filter-indicator"
        >
          Filtered to {selectedSensor} — click to clear filter
        </motion.div>
      )}
    </div>
  );
}
