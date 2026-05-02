import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { SparklineChart } from "./SparklineChart";
import { StatusType, MetricType } from "../utils/thresholds";

interface MetricCardProps {
  metric: MetricType;
  label: string;
  value: number;
  unit: string;
  status: StatusType;
  history: number[];
  index: number;
  offline?: boolean;
}

const STATUS_COLORS: Record<StatusType, string> = {
  SAFE: "#39ff14",
  WARNING: "#ffaa00",
  DANGER: "#ff2d55",
};

const STATUS_GLOW: Record<StatusType, string> = {
  SAFE: "rgba(57,255,20,0.4)",
  WARNING: "rgba(255,170,0,0.4)",
  DANGER: "rgba(255,45,85,0.4)",
};

const STATUS_BG: Record<StatusType, string> = {
  SAFE: "rgba(57,255,20,0.08)",
  WARNING: "rgba(255,170,0,0.08)",
  DANGER: "rgba(255,45,85,0.08)",
};

function useCountUp(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.01) return;
    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      setDisplay(start + diff * t);
      if (t < 1) raf = requestAnimationFrame(animate);
      else prev.current = target;
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export function MetricCard({ metric, label, value, unit, status, history, index, offline = false }: MetricCardProps) {
  const displayed = useCountUp(value);
  const color = offline ? "#475569" : STATUS_COLORS[status];
  const glow = offline ? "rgba(71,85,105,0.2)" : STATUS_GLOW[status];
  const bg = offline ? "rgba(71,85,105,0.06)" : STATUS_BG[status];
  const isFlashing = !offline && status === "DANGER";
  const decimals = metric === "TDS" ? 0 : 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      data-testid={`metric-card-${metric.toLowerCase()}`}
      className={`relative rounded-xl border p-4 overflow-hidden ${isFlashing ? "animate-flash-red" : ""}`}
      style={{
        background: `linear-gradient(135deg, #0d1f3c 0%, ${bg} 100%)`,
        borderColor: offline ? "rgba(71,85,105,0.25)" : `${color}30`,
        boxShadow: offline
          ? "0 0 8px rgba(71,85,105,0.1)"
          : `0 0 15px ${glow}20, inset 0 1px 0 rgba(255,255,255,0.04)`,
        opacity: offline ? 0.65 : 1,
      }}
    >
      {/* Top label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#64748b] text-xs font-mono tracking-widest uppercase">{label}</span>
        {offline ? (
          <span
            className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: "#475569", backgroundColor: "rgba(71,85,105,0.12)", border: "1px solid rgba(71,85,105,0.3)" }}
            data-testid={`status-${metric.toLowerCase()}`}
          >
            <WifiOff className="w-2.5 h-2.5" />
            OFFLINE
          </span>
        ) : (
          <span
            className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full"
            style={{ color, backgroundColor: bg, border: `1px solid ${color}40` }}
            data-testid={`status-${metric.toLowerCase()}`}
          >
            {status}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-1 mb-3">
        {offline ? (
          <span
            className="text-3xl font-bold leading-none"
            style={{ fontFamily: "var(--app-font-display)", color: "#475569" }}
            data-testid={`value-${metric.toLowerCase()}`}
          >
            —
          </span>
        ) : (
          <>
            <span
              className="text-3xl font-bold leading-none"
              style={{ fontFamily: "var(--app-font-display)", color }}
              data-testid={`value-${metric.toLowerCase()}`}
            >
              {displayed.toFixed(decimals)}
            </span>
            {unit && (
              <span className="text-[#64748b] text-sm font-mono mb-0.5">{unit.trim()}</span>
            )}
          </>
        )}
      </div>

      {/* Sparkline */}
      <SparklineChart data={history} color={color} />

      {/* Live/offline dot */}
      {offline ? (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#475569]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        </div>
      ) : (
        <motion.div
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 2, delay: index * 0.3 }}
        />
      )}
    </motion.div>
  );
}
