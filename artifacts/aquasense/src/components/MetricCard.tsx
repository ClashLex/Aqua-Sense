import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
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
    if (Math.abs(diff) < 0.005) return;
    const t0 = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      setDisplay(start + diff * t);
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export function MetricCard({ metric, label, value, unit, status, history, index, offline = false }: MetricCardProps) {
  const displayed = useCountUp(value);
  const color = offline ? "#475569" : STATUS_COLORS[status];
  const bg = offline ? "rgba(71,85,105,0.06)" : STATUS_BG[status];
  const isDanger = !offline && status === "DANGER";
  const isWarning = !offline && status === "WARNING";
  const decimals = metric === "TDS" ? 0 : 2;

  const chartData = history.map((v, i) => ({ i, v }));
  const gradId = `spark-${metric}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      data-testid={`metric-card-${metric.toLowerCase()}`}
      className={`relative rounded-xl border p-4 overflow-hidden ${isDanger ? "animate-pulse-danger" : ""}`}
      style={{
        background: `linear-gradient(155deg, #0a1628 0%, ${bg} 100%)`,
        borderColor: offline
          ? "rgba(71,85,105,0.25)"
          : isDanger
          ? "rgba(255,45,85,0.35)"
          : isWarning
          ? "rgba(255,170,0,0.3)"
          : `${color}28`,
        boxShadow: offline
          ? "0 0 6px rgba(71,85,105,0.08)"
          : isDanger
          ? undefined // handled by pulse-danger CSS
          : `0 0 12px ${color}12, inset 0 1px 0 rgba(255,255,255,0.03)`,
        opacity: offline ? 0.6 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#64748b] text-[10px] font-mono tracking-widest uppercase leading-none">
          {label}
        </span>
        {offline ? (
          <span
            className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded-full"
            style={{ color: "#475569", backgroundColor: "rgba(71,85,105,0.12)", border: "1px solid rgba(71,85,105,0.3)" }}
            data-testid={`status-${metric.toLowerCase()}`}
          >
            <WifiOff className="w-2.5 h-2.5" />
            OFFLINE
          </span>
        ) : (
          <span
            className="text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded-full"
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
            style={{ fontFamily: "var(--app-font-display)", color: "#334155" }}
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

      {/* Recharts sparkline */}
      <div style={{ height: 44, marginLeft: -4, marginRight: -4 }} data-testid={`sparkline-${metric.toLowerCase()}`}>
        <ResponsiveContainer width="100%" height={44}>
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={offline ? 0.1 : 0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              isAnimationActive={false}
              strokeOpacity={offline ? 0.3 : 1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Live/offline indicator */}
      {offline ? (
        <motion.div
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#475569]"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        />
      ) : (
        <motion.div
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, delay: index * 0.28 }}
        />
      )}
    </motion.div>
  );
}
