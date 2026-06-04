import { motion, AnimatePresence } from "framer-motion";
import { Radio, WifiOff } from "lucide-react";
import { SensorName, SENSORS, SensorSnapshot } from "../hooks/useSensorData";
import { StatusType } from "../utils/thresholds";

const STATUS_COLORS: Record<StatusType, string> = {
  SAFE: "#16a34a",
  WARNING: "#d97706",
  DANGER: "#dc2626",
};

const SENSOR_POSITIONS: Record<SensorName, { x: string; y: string }> = {
  "River Station A":      { x: "20%", y: "30%" },
  "Treatment Plant B":    { x: "55%", y: "55%" },
  "Distribution Point C": { x: "78%", y: "25%" },
};

interface SensorMapProps {
  readings: Record<SensorName, SensorSnapshot>;
  selected: SensorName | null;
  onSelect: (sensor: SensorName | null) => void;
  rainEvent?: { active: boolean; intensity: number };
  offlineSensor?: SensorName | null;
}

function getSensorOverallStatus(snap: SensorSnapshot): StatusType {
  if (snap.offline) return "SAFE";
  const statuses = [snap.pH.status, snap.Turbidity.status, snap.Temperature.status, snap.DO.status, snap.TDS.status];
  if (statuses.includes("DANGER")) return "DANGER";
  if (statuses.includes("WARNING")) return "WARNING";
  return "SAFE";
}

export function SensorMap({ readings, selected, onSelect, rainEvent }: SensorMapProps) {
  const isRaining = rainEvent?.active ?? false;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--app-surface)",
        borderColor: "var(--app-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      }}
      data-testid="sensor-map"
    >
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-4 h-4 text-[#2563eb]" />
        <span className="text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>Sensor Network</span>

        <AnimatePresence>
          {isRaining && (
            <motion.div
              key="rain-badge"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-1"
              style={{
                background: "var(--app-primary-tint)",
                border: "1px solid var(--app-primary-tint-border)",
                color: "#2563eb",
              }}
            >
              <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>🌧</motion.span>
              Rain
            </motion.div>
          )}
        </AnimatePresence>

        {selected && (
          <button
            onClick={() => onSelect(null)}
            className="ml-auto text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
            data-testid="clear-sensor-filter"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Map area */}
      <div
        className="relative w-full rounded-lg overflow-hidden"
        style={{
          height: 160,
          background: isRaining ? "var(--app-primary-tint)" : "var(--app-surface-2)",
          border: "1px solid var(--app-border)",
          transition: "background 1s ease",
        }}
      >
        {/* Rain overlay */}
        <AnimatePresence>
          {isRaining && (
            <motion.div
              key="rain-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(37,99,235,0.04) 18px, rgba(37,99,235,0.04) 19px)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h-${i}`} x1="0" y1={`${(i + 1) * (100 / 7)}%`} x2="100%" y2={`${(i + 1) * (100 / 7)}%`} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`v-${i}`} x1={`${(i + 1) * (100 / 9)}%`} y1="0" x2={`${(i + 1) * (100 / 9)}%`} y2="100%" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
          ))}
          <line x1="20%" y1="30%" x2="55%" y2="55%" stroke="rgba(37,99,235,0.2)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="55%" y1="55%" x2="78%" y2="25%" stroke="rgba(37,99,235,0.2)" strokeWidth="1" strokeDasharray="4,4" />
        </svg>

        {SENSORS.map((sensor) => {
          const pos = SENSOR_POSITIONS[sensor];
          const snap = readings[sensor];
          const isOffline = snap.offline;
          const status = getSensorOverallStatus(snap);
          const color = isOffline ? "var(--app-text-3)" : STATUS_COLORS[status];
          const isSelected = selected === sensor;

          return (
            <button
              key={sensor}
              onClick={() => onSelect(isSelected ? null : sensor)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: pos.x, top: pos.y }}
              data-testid={`sensor-node-${sensor.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {!isOffline && (
                <motion.div
                  className="absolute rounded-full"
                  animate={{ scale: [1, 2.8], opacity: [0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  style={{ backgroundColor: STATUS_COLORS[status], width: 12, height: 12, left: -6, top: -6 }}
                />
              )}
              <motion.div
                className="relative w-3 h-3 rounded-full border-2"
                style={{
                  background: "var(--app-surface)",
                  borderColor: isOffline ? "#94a3b8" : STATUS_COLORS[status],
                  outline: isSelected ? `2px solid ${isOffline ? "#94a3b8" : STATUS_COLORS[status]}` : undefined,
                  outlineOffset: 3,
                }}
                animate={isOffline ? { opacity: [0.4, 0.9, 0.4] } : {}}
                transition={isOffline ? { repeat: Infinity, duration: 1.5 } : {}}
                whileHover={{ scale: 1.5 }}
              />
              {isOffline && (
                <div className="absolute -top-1.5 -right-1.5">
                  <WifiOff className="w-2.5 h-2.5" style={{ color: "var(--app-text-3)" }} />
                </div>
              )}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div
                  className="px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                  style={{
                    background: "var(--app-surface)",
                    border: "1px solid var(--app-border)",
                    color: "var(--app-text-1)",
                  }}
                >
                  {sensor}
                  <span className="ml-2 font-semibold" style={{ color: isOffline ? "#94a3b8" : STATUS_COLORS[status] }}>
                    {isOffline ? "Offline" : status}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {SENSORS.map((sensor) => {
          const snap = readings[sensor];
          const isOffline = snap.offline;
          const status = getSensorOverallStatus(snap);
          const color = isOffline ? "#94a3b8" : STATUS_COLORS[status];
          const isSelected = selected === sensor;

          return (
            <button
              key={sensor}
              onClick={() => onSelect(isSelected ? null : sensor)}
              className="flex items-center gap-1.5 transition-opacity"
              style={{ opacity: selected && !isSelected ? 0.4 : 1 }}
            >
              <motion.span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isOffline ? "transparent" : color, border: isOffline ? `1px solid ${color}` : undefined }}
                animate={{ opacity: isOffline ? [0.4, 0.9, 0.4] : [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: isOffline ? 1.5 : 2.5 }}
              />
              <span className="text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
                {sensor}
                {isOffline && <span className="ml-1" style={{ color: "var(--app-text-3)" }}>(offline)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
