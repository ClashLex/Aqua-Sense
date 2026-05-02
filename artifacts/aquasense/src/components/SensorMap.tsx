import { motion } from "framer-motion";
import { MapPin, Radio } from "lucide-react";
import { SensorName, SENSORS, SensorSnapshot } from "../hooks/useSensorData";
import { StatusType } from "../utils/thresholds";

const STATUS_COLORS: Record<StatusType, string> = {
  SAFE: "#39ff14",
  WARNING: "#ffaa00",
  DANGER: "#ff2d55",
};

const SENSOR_POSITIONS: Record<SensorName, { x: string; y: string }> = {
  "River Station A": { x: "20%", y: "30%" },
  "Treatment Plant B": { x: "55%", y: "55%" },
  "Distribution Point C": { x: "78%", y: "25%" },
};

interface SensorMapProps {
  readings: Record<SensorName, SensorSnapshot>;
  selected: SensorName | null;
  onSelect: (sensor: SensorName | null) => void;
}

function getSensorOverallStatus(snap: SensorSnapshot): StatusType {
  const statuses = [snap.pH.status, snap.Turbidity.status, snap.Temperature.status, snap.DO.status, snap.TDS.status];
  if (statuses.includes("DANGER")) return "DANGER";
  if (statuses.includes("WARNING")) return "WARNING";
  return "SAFE";
}

export function SensorMap({ readings, selected, onSelect }: SensorMapProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "#0d1f3c",
        borderColor: "rgba(0,245,255,0.15)",
        boxShadow: "0 0 20px rgba(0,245,255,0.05)",
      }}
      data-testid="sensor-map"
    >
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-4 h-4 text-[#00f5ff]" />
        <span className="text-[#e2e8f0] text-xs font-mono tracking-widest uppercase">
          Sensor Network
        </span>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            className="ml-auto text-[10px] text-[#64748b] hover:text-[#00f5ff] font-mono tracking-wider transition-colors"
            data-testid="clear-sensor-filter"
          >
            CLEAR FILTER
          </button>
        )}
      </div>

      {/* Map area */}
      <div
        className="relative w-full rounded-lg overflow-hidden"
        style={{
          height: 160,
          background: "radial-gradient(ellipse at 50% 50%, rgba(0,245,255,0.04) 0%, transparent 70%), #020817",
          border: "1px solid rgba(0,245,255,0.08)",
        }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {Array.from({ length: 6 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1="0" y1={`${(i + 1) * (100 / 7)}%`}
              x2="100%" y2={`${(i + 1) * (100 / 7)}%`}
              stroke="rgba(0,245,255,0.05)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i + 1) * (100 / 9)}%`} y1="0"
              x2={`${(i + 1) * (100 / 9)}%`} y2="100%"
              stroke="rgba(0,245,255,0.05)"
              strokeWidth="1"
            />
          ))}
          {/* Connection lines between sensors */}
          <line x1="20%" y1="30%" x2="55%" y2="55%" stroke="rgba(0,245,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="55%" y1="55%" x2="78%" y2="25%" stroke="rgba(0,245,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />
        </svg>

        {SENSORS.map((sensor) => {
          const pos = SENSOR_POSITIONS[sensor];
          const snap = readings[sensor];
          const status = getSensorOverallStatus(snap);
          const color = STATUS_COLORS[status];
          const isSelected = selected === sensor;

          return (
            <button
              key={sensor}
              onClick={() => onSelect(isSelected ? null : sensor)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: pos.x, top: pos.y }}
              data-testid={`sensor-node-${sensor.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                style={{ backgroundColor: color, width: 12, height: 12, left: -6, top: -6 }}
              />

              {/* Node */}
              <motion.div
                className="relative w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: color,
                  borderColor: color,
                  boxShadow: `0 0 8px ${color}`,
                  outline: isSelected ? `2px solid ${color}` : undefined,
                  outlineOffset: 3,
                }}
                whileHover={{ scale: 1.5 }}
              />

              {/* Label tooltip */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                <div
                  className="px-2 py-1 rounded text-[10px] font-mono"
                  style={{
                    background: "#0d1f3c",
                    border: `1px solid ${color}40`,
                    color: "#e2e8f0",
                  }}
                >
                  {sensor}
                  <span
                    className="ml-2 font-bold"
                    style={{ color }}
                  >
                    {status}
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
          const status = getSensorOverallStatus(snap);
          const color = STATUS_COLORS[status];
          const isSelected = selected === sensor;

          return (
            <button
              key={sensor}
              onClick={() => onSelect(isSelected ? null : sensor)}
              className="flex items-center gap-2 transition-opacity"
              style={{ opacity: selected && !isSelected ? 0.4 : 1 }}
            >
              <motion.span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <span className="text-[10px] font-mono text-[#64748b]">{sensor}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
