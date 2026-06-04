import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, Waves, Thermometer, Wind, Filter, WifiOff,
} from "lucide-react";
import { StatusType, MetricType } from "../utils/thresholds";

interface MetricCardProps {
  metric: MetricType;
  label: string;
  value: number;
  unit: string;
  status: StatusType;
  index: number;
  offline?: boolean;
}

const METRIC_ICONS: Record<MetricType, React.ElementType> = {
  pH:          FlaskConical,
  Turbidity:   Waves,
  Temperature: Thermometer,
  DO:          Wind,
  TDS:         Filter,
};

const METRIC_ICON_COLORS: Record<MetricType, string> = {
  pH:          "#2563eb",
  Turbidity:   "#16a34a",
  Temperature: "#d97706",
  DO:          "#7c3aed",
  TDS:         "#0891b2",
};

const STATUS_BAR: Record<StatusType, string> = {
  SAFE:    "#16a34a",
  WARNING: "#d97706",
  DANGER:  "#dc2626",
};

const STATUS_PILL: Record<StatusType, { bg: string; text: string; border: string }> = {
  SAFE:    { bg: "#dcfce7", text: "#15803d", border: "var(--app-border)" },
  WARNING: { bg: "#ffedd5", text: "#c2410c", border: "var(--app-border)" },
  DANGER:  { bg: "#fee2e2", text: "#b91c1c", border: "var(--app-border)" },
};

function useCountUp(target: number, duration = 500) {
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
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplay(start + diff * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export function MetricCard({
  metric, label, value, unit, status, index, offline = false,
}: MetricCardProps) {
  const displayed = useCountUp(value);
  const decimals   = metric === "TDS" ? 0 : 2;
  const Icon       = METRIC_ICONS[metric];
  const iconColor  = METRIC_ICON_COLORS[metric];
  const barColor   = offline ? "var(--app-border)" : STATUS_BAR[status];
  const pill       = STATUS_PILL[status];
  const isDanger   = !offline && status === "DANGER";

  const cardShadow = offline
    ? "4px 4px 0px 0px var(--app-border)"
    : `4px 4px 0px 0px ${STATUS_BAR[status]}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`metric-card relative flex flex-col overflow-hidden${isDanger ? " animate-pulse-danger" : ""}`}
      style={{
        background:    "var(--app-surface)",
        border:        "3px solid var(--app-border)",
        borderRadius:  6,
        boxShadow:     cardShadow,
        opacity:       offline ? 0.72 : 1,
        paddingBottom: 3,          /* reserve space for the 3-px bar */
      }}
      data-testid={`metric-card-${metric.toLowerCase()}`}
    >

      {/* ── Top: icon + label ────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2"
          style={{
            background: offline ? "var(--app-surface-2)" : `${iconColor}22`,
            borderColor: "var(--app-border)",
          }}
        >
          {offline
            ? <WifiOff className="w-3.5 h-3.5" style={{ color: "var(--app-text-3)" }} />
            : <Icon    className="w-4 h-4"     style={{ color: iconColor }} />
          }
        </div>
        <span
          className="text-[11px] font-extrabold tracking-wider"
          style={{ color: "var(--app-text-1)", textTransform: "uppercase" }}
        >
          {label}
        </span>
      </div>

      {/* ── Middle: large value + unit ────────────────────────── */}
      <div className="flex items-end gap-1.5 px-4 pt-2.5 pb-3">
        <span
          className="leading-none"
          style={{
            fontSize:      48,
            fontFamily:    "DM Mono, monospace",
            fontWeight:    700,
            color:         offline ? "var(--app-text-3)" : "var(--app-text-1)",
            letterSpacing: "-0.02em",
          }}
          data-testid={`value-${metric.toLowerCase()}`}
        >
          {offline ? "—" : displayed.toFixed(decimals)}
        </span>
        {!offline && unit && (
          <span
            className="mb-1.5 text-sm font-bold"
            style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}
          >
            {unit.trim()}
          </span>
        )}
      </div>

      {/* ── Bottom: status pill ───────────────────────────────── */}
      <div className="px-4 pb-3.5">
        {offline ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-extrabold border-2"
            style={{
              color:      "var(--app-text-3)",
              background: "var(--app-surface-2)",
              borderColor: "var(--app-border)",
            }}
            data-testid={`status-${metric.toLowerCase()}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
            OFFLINE
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-extrabold border-2"
            style={{
              color:      pill.text,
              background: pill.bg,
              borderColor: pill.border,
            }}
            data-testid={`status-${metric.toLowerCase()}`}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: pill.text }}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ repeat: Infinity, duration: isDanger ? 0.75 : 2.2 }}
            />
            {status}
          </span>
        )}
      </div>

      {/* ── 3 px status bar at very bottom ────────────────────── */}
      <div
        aria-hidden
        style={{
          position:     "absolute",
          bottom:       0,
          left:         0,
          right:        0,
          height:       4,
          background:   barColor,
          transition:   "background 0.5s ease",
        }}
      />
    </motion.div>
  );
}
