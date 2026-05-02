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
  SAFE: "#16a34a",
  WARNING: "#d97706",
  DANGER: "#dc2626",
};

const STATUS_BG: Record<StatusType, string> = {
  SAFE: "#f0fdf4",
  WARNING: "#fffbeb",
  DANGER: "#fef2f2",
};

const STATUS_BORDER: Record<StatusType, string> = {
  SAFE: "#bbf7d0",
  WARNING: "#fde68a",
  DANGER: "#fecaca",
};

const STATUS_BADGE_BG: Record<StatusType, string> = {
  SAFE: "#dcfce7",
  WARNING: "#fef3c7",
  DANGER: "#fee2e2",
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
  const color = offline ? "#94a3b8" : STATUS_COLORS[status];
  const isDanger = !offline && status === "DANGER";
  const decimals = metric === "TDS" ? 0 : 2;
  const chartData = history.map((v, i) => ({ i, v }));
  const gradId = `spark-${metric}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      data-testid={`metric-card-${metric.toLowerCase()}`}
      className={`relative rounded-xl border p-4 overflow-hidden bg-white ${isDanger ? "animate-pulse-danger" : ""}`}
      style={{
        borderColor: offline
          ? "#e2e8f0"
          : isDanger
          ? "#fca5a5"
          : status === "WARNING"
          ? "#fde68a"
          : "#e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        opacity: offline ? 0.65 : 1,
      }}
    >
      {/* Status tint bar */}
      {!offline && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
          style={{ background: color }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#64748b] text-xs font-medium tracking-wide">
          {label}
        </span>
        {offline ? (
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#94a3b8] border border-[#e2e8f0]"
            data-testid={`status-${metric.toLowerCase()}`}
          >
            <WifiOff className="w-2.5 h-2.5" />
            Offline
          </span>
        ) : (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color,
              backgroundColor: STATUS_BADGE_BG[status],
              border: `1px solid ${STATUS_BORDER[status]}`,
            }}
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
            className="text-3xl font-semibold leading-none text-[#cbd5e1]"
            style={{ fontFamily: "var(--app-font-mono)" }}
            data-testid={`value-${metric.toLowerCase()}`}
          >
            —
          </span>
        ) : (
          <>
            <span
              className="text-3xl font-semibold leading-none"
              style={{ fontFamily: "var(--app-font-mono)", color }}
              data-testid={`value-${metric.toLowerCase()}`}
            >
              {displayed.toFixed(decimals)}
            </span>
            {unit && (
              <span className="text-[#94a3b8] text-sm font-mono mb-0.5">{unit.trim()}</span>
            )}
          </>
        )}
      </div>

      {/* Sparkline */}
      <div style={{ height: 40, marginLeft: -4, marginRight: -4 }} data-testid={`sparkline-${metric.toLowerCase()}`}>
        <ResponsiveContainer width="100%" height={40}>
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={offline ? 0.06 : 0.18} />
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
              strokeOpacity={offline ? 0.25 : 0.8}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Live pulse dot */}
      <motion.div
        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: offline ? "#cbd5e1" : color }}
        animate={{ opacity: offline ? [0.3, 0.7, 0.3] : [1, 0.3, 1] }}
        transition={{ repeat: Infinity, duration: offline ? 1.4 : 2.2, delay: index * 0.28 }}
      />
    </motion.div>
  );
}
