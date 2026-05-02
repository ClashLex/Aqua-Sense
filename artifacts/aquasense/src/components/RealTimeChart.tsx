import { useState } from "react";
import { WifiOff } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, TooltipProps,
} from "recharts";
import { MetricType } from "../utils/thresholds";
import { MetricHistory } from "../hooks/useSensorData";
import { useTheme } from "../contexts/ThemeContext";

// ── Palette ─────────────────────────────────────────────────────────────────

const METRIC_COLORS: Record<MetricType, string> = {
  pH:          "#2563eb",   // blue
  Turbidity:   "#0d9488",   // teal
  Temperature: "#f59e0b",   // amber
  DO:          "#f43f5e",   // rose
  TDS:         "#7c3aed",   // violet
};

const METRIC_LABELS: Record<MetricType, string> = {
  pH:          "pH",
  Turbidity:   "Turbidity",
  Temperature: "Temperature",
  DO:          "Dissolved O₂",
  TDS:         "TDS",
};

const METRIC_UNITS: Record<MetricType, string> = {
  pH:          "",
  Turbidity:   " NTU",
  Temperature: "°C",
  DO:          " mg/L",
  TDS:         " ppm",
};

const STATUS_COLORS: Record<string, string> = {
  SAFE:    "#16a34a",
  WARNING: "#d97706",
  DANGER:  "#dc2626",
};

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

// ── Types ────────────────────────────────────────────────────────────────────

interface RealTimeChartProps {
  history: MetricHistory;
  offline?: boolean;
}

interface ChartPoint {
  t: number;
  pH: number;
  Turbidity: number;
  Temperature: number;
  DO: number;
  TDS: number;
  [key: string]: number;
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background:   "var(--app-surface)",
        border:       "1px solid var(--app-border)",
        borderRadius: 10,
        padding:      "10px 14px",
        boxShadow:    "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        minWidth:     160,
      }}
    >
      <p
        style={{
          fontSize:     10,
          fontFamily:   "DM Mono, monospace",
          color:        "var(--app-text-3)",
          marginBottom: 8,
          letterSpacing: "0.04em",
        }}
      >
        T-{(60 - Number(label)) * 5}s ago
      </p>
      {payload.map((entry) => {
        const metric = entry.dataKey as MetricType;
        const color  = METRIC_COLORS[metric] ?? entry.color;
        const unit   = METRIC_UNITS[metric] ?? "";
        const val    = typeof entry.value === "number" ? entry.value : 0;
        return (
          <div
            key={metric}
            className="flex items-center justify-between gap-4"
            style={{ marginBottom: 5 }}
          >
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  display:      "inline-block",
                  width:        8,
                  height:       8,
                  borderRadius: "50%",
                  background:   color,
                  flexShrink:   0,
                }}
              />
              <span
                style={{
                  fontSize:   11,
                  color:      "var(--app-text-2)",
                  fontFamily: "var(--app-font-sans)",
                  fontWeight: 500,
                }}
              >
                {METRIC_LABELS[metric]}
              </span>
            </div>
            <span
              style={{
                fontSize:   11,
                fontFamily: "DM Mono, monospace",
                fontWeight: 500,
                color:      "var(--app-text-1)",
              }}
            >
              {val.toFixed(metric === "TDS" ? 0 : 2)}{unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function RealTimeChart({ history, offline = false }: RealTimeChartProps) {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const [visible, setVisible] = useState<Record<MetricType, boolean>>({
    pH: true, Turbidity: true, Temperature: true, DO: true, TDS: false,
  });

  const toggleMetric = (m: MetricType) =>
    setVisible((prev) => ({ ...prev, [m]: !prev[m] }));

  // Build chart data
  const data: ChartPoint[] = Array.from({ length: history.pH.length }, (_, i) => {
    const point: ChartPoint = { t: i, pH: 0, Turbidity: 0, Temperature: 0, DO: 0, TDS: 0 };
    for (const m of METRICS) point[m] = Number(history[m][i]?.toFixed(3) ?? 0);
    return point;
  });

  // Subtle horizontal grid: adapt for dark / light
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
  const tickColor = isDark ? "#475569" : "#94a3b8";

  return (
    <div
      className="rounded-xl border relative"
      style={{
        background:   "var(--app-surface)",
        borderColor:  "var(--app-border)",
        boxShadow:    "0 1px 3px rgba(0,0,0,0.06)",
        opacity:      offline ? 0.55 : 1,
      }}
      data-testid="realtime-chart"
    >

      {/* Offline overlay */}
      {offline && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
          style={{ background: "var(--app-surface)" }}
        >
          <div className="flex flex-col items-center gap-2" style={{ color: "var(--app-text-3)" }}>
            <WifiOff className="w-8 h-8" />
            <span className="text-xs font-medium tracking-wide">Sensor Offline</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4"
        style={{ borderBottom: "1px solid var(--app-border)" }}
      >
        {/* Title */}
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}
          >
            Live Sensor Readings
          </h3>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}
          >
            {history.pH.length} data points · 5s interval
          </p>
        </div>

        {/* Toggle pills */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Metric toggles">
          {METRICS.map((m) => {
            const isOn = visible[m];
            return (
              <button
                key={m}
                onClick={() => toggleMetric(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: isOn ? METRIC_COLORS[m] : (isDark ? "rgba(255,255,255,0.07)" : "#f1f5f9"),
                  color:      isOn ? "#ffffff"          : "var(--app-text-2)",
                  border:     `1px solid ${isOn ? "transparent" : "var(--app-border)"}`,
                }}
                data-testid={`toggle-metric-${m.toLowerCase()}`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="px-2 pt-4 pb-3">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 20, bottom: 24, left: -8 }}
          >
            {/* Only horizontal grid lines, no vertical */}
            <CartesianGrid
              strokeDasharray="0"
              stroke={gridColor}
              vertical={false}
              horizontal={true}
            />

            <XAxis
              dataKey="t"
              tick={{ fill: tickColor, fontSize: 10, fontFamily: "DM Mono" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const secsAgo = (60 - Number(v)) * 5;
                if (secsAgo === 0)   return "now";
                if (secsAgo === 300) return "-5m";
                if (secsAgo % 60 === 0) return `-${secsAgo / 60}m`;
                return "";
              }}
              interval={9}
              label={{
                value:     "← older                                               newer →",
                position:  "insideBottom",
                offset:    -12,
                fill:      tickColor,
                fontSize:  9,
                fontFamily: "DM Mono",
              }}
            />

            <YAxis
              tick={{ fill: tickColor, fontSize: 10, fontFamily: "DM Mono" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke:      isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                strokeWidth: 1,
                strokeDasharray: "4 3",
              }}
            />

            {METRICS.map((m) =>
              visible[m] ? (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  stroke={METRIC_COLORS[m]}
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                  name={METRIC_LABELS[m]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null,
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend strip ── */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-4"
        style={{ borderTop: "1px solid var(--app-border-subtle)" }}
      >
        {METRICS.filter((m) => visible[m]).map((m) => (
          <div key={m} className="flex items-center gap-1.5 pt-3">
            <svg width="18" height="2" className="shrink-0">
              <line x1="0" y1="1" x2="18" y2="1" stroke={METRIC_COLORS[m]} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontSize:   10,
                color:      "var(--app-text-2)",
                fontFamily: "var(--app-font-sans)",
                fontWeight: 500,
              }}
            >
              {METRIC_LABELS[m]}
              <span style={{ color: "var(--app-text-3)", marginLeft: 3 }}>
                {METRIC_UNITS[m] || ""}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
