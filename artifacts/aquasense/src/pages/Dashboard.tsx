import { motion, AnimatePresence } from "framer-motion";
import { Droplets } from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { RealTimeChart } from "../components/RealTimeChart";
import { AnomalyBanner } from "../components/AnomalyBanner";
import { SensorMap } from "../components/SensorMap";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

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
  } = useSensorData();

  const displaySensor: SensorName = selectedSensor ?? SENSORS[0];
  const snap = currentReadings[displaySensor];
  const hist = history[displaySensor];
  const isDisplayOffline = snap.offline;

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      {/* Rain event banner */}
      <AnimatePresence>
        {rainEvent.active && (
          <motion.div
            key="rain-banner"
            initial={{ opacity: 0, y: -16 }}
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
            <motion.div
              animate={{ y: [0, 2, 0] }}
              transition={{ repeat: Infinity, duration: 1.0 }}
              className="text-base"
            >
              🌧
            </motion.div>
            <span className="text-[#60a5fa] text-xs font-mono font-bold tracking-widest">
              RAIN EVENT ACTIVE
            </span>
            <span className="text-[#94a3b8] text-xs font-mono">
              Elevated turbidity expected — intensity {rainEvent.intensity.toFixed(1)} NTU above baseline
            </span>
            <Droplets className="w-4 h-4 text-[#60a5fa] ml-auto shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline sensor banner */}
      <AnimatePresence>
        {offlineSensor && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -16 }}
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
              {offlineSensor} — connection lost, attempting reconnect...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anomaly banners */}
      <AnomalyBanner anomalies={anomalies} onDismiss={acknowledgeAnomaly} />

      {/* Metric cards */}
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

      {/* Chart + Map row */}
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

      {/* Selected sensor indicator */}
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
