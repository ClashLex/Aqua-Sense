import { motion } from "framer-motion";
import { MetricCard } from "../components/MetricCard";
import { RealTimeChart } from "../components/RealTimeChart";
import { AnomalyBanner } from "../components/AnomalyBanner";
import { SensorMap } from "../components/SensorMap";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

export function Dashboard() {
  const { currentReadings, history, anomalies, lastUpdated, selectedSensor, acknowledgeAnomaly, setSelectedSensor } = useSensorData();

  const displaySensor: SensorName = selectedSensor ?? SENSORS[0];
  const snap = currentReadings[displaySensor];
  const hist = history[displaySensor];

  return (
    <div className="space-y-4" data-testid="dashboard-page">
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
          />
        ))}
      </div>

      {/* Chart + Map row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RealTimeChart history={hist} />
        </div>
        <div>
          <SensorMap
            readings={currentReadings}
            selected={selectedSensor}
            onSelect={setSelectedSensor}
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
