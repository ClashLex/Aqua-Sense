import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, ClipboardCopy, Check,
  FlaskConical, Waves, Thermometer, Wind, Filter,
  Activity, ShieldAlert, Radio, Clock,
} from "lucide-react";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";
import { predictNext } from "../utils/linearRegression";
import { useTheme } from "../contexts/ThemeContext";

// ── Palette (matches RealTimeChart) ─────────────────────────────────────────

const METRIC_COLORS: Record<MetricType, string> = {
  pH:          "#2563eb",
  Turbidity:   "#0d9488",
  Temperature: "#f59e0b",
  DO:          "#f43f5e",
  TDS:         "#7c3aed",
};

const METRIC_UNITS: Record<MetricType, string> = {
  pH: "", Turbidity: " NTU", Temperature: "°C", DO: " mg/L", TDS: " ppm",
};

const METRIC_LABELS: Record<MetricType, string> = {
  pH: "pH Level", Turbidity: "Turbidity", Temperature: "Temperature", DO: "Dissolved O₂", TDS: "TDS",
};

const METRIC_ICONS: Record<MetricType, React.ElementType> = {
  pH: FlaskConical, Turbidity: Waves, Temperature: Thermometer, DO: Wind, TDS: Filter,
};

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#d97706", LOW: "#16a34a",
};

const TIME_RANGES = ["1h", "6h", "24h", "7d"] as const;
type TimeRange = typeof TIME_RANGES[number];

// ── Score helpers ────────────────────────────────────────────────────────────

function calcScore(snap: Record<MetricType, { status: string }>): number {
  const w: Record<MetricType, number> = { pH: 25, Turbidity: 20, Temperature: 15, DO: 25, TDS: 15 };
  let s = 0;
  for (const m of METRICS) {
    s += snap[m].status === "SAFE" ? w[m] : snap[m].status === "WARNING" ? w[m] * 0.5 : 0;
  }
  return Math.round(s);
}

function scoreInfo(s: number): { label: string; color: string } {
  if (s >= 80) return { label: "Excellent", color: "#16a34a" };
  if (s >= 50) return { label: "Good",      color: "#d97706" };
  if (s >= 25) return { label: "Poor",      color: "#ea580c" };
  return               { label: "Critical", color: "#dc2626" };
}

// ── Minimal SVG arc gauge ────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const cx = 110, cy = 104, R = 84, sw = 14;
  const startDeg = 135, totalSweep = 270;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arcPath = (a: number, b: number) => {
    const [sx, sy] = [cx + R * Math.cos(toRad(a)), cy + R * Math.sin(toRad(a))];
    const [ex, ey] = [cx + R * Math.cos(toRad(b)), cy + R * Math.sin(toRad(b))];
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  };

  const { label, color } = scoreInfo(score);
  const fillEnd = startDeg + Math.max(score, 1) / 100 * totalSweep;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 188" width="200" height="172">
        {/* Track */}
        <path
          d={arcPath(startDeg, startDeg + totalSweep)}
          fill="none"
          stroke="var(--app-border)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Fill */}
        {score > 0 && (
          <path
            d={arcPath(startDeg, fillEnd)}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            style={{ transition: "stroke 0.6s ease" }}
          />
        )}
        {/* Score number — large */}
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fill={color}
          fontSize="52"
          fontFamily="DM Mono, monospace"
          fontWeight="500"
          style={{ transition: "fill 0.6s ease" }}
        >
          {score}
        </text>
        {/* /100 */}
        <text
          x={cx}
          y={cy + 36}
          textAnchor="middle"
          fill="var(--app-text-3)"
          fontSize="12"
          fontFamily="DM Mono, monospace"
        >
          / 100
        </text>
      </svg>
      {/* Label below arc */}
      <span
        className="text-lg font-bold -mt-3"
        style={{ color, fontFamily: "var(--app-font-display)" }}
      >
        {label}
      </span>
      <span className="text-[11px] mt-1" style={{ color: "var(--app-text-3)" }}>
        Water Quality Score
      </span>
    </div>
  );
}

// ── Report generator ─────────────────────────────────────────────────────────

function generateReport(
  sensor: SensorName,
  snap: Record<MetricType, { value: number; unit: string; status: string; label: string }>,
  anomalies: { timestamp: Date; sensor: string; metric: MetricType; value: number; severity: string; resolved: boolean }[],
): string {
  const hr = "━".repeat(46);
  const now = new Date();
  return [
    hr,
    "  AQUASENSE 2.0 — WATER QUALITY REPORT",
    `  Generated : ${now.toLocaleString()}`,
    `  Sensor    : ${sensor}`,
    hr,
    "",
    "  CURRENT READINGS",
    "  " + "─".repeat(36),
    ...METRICS.map((m) => {
      const r = snap[m];
      const lbl = METRIC_LABELS[m].padEnd(15);
      const val = `${r.value.toFixed(m === "TDS" ? 0 : 2)}${r.unit}`.padEnd(12);
      return `    ${lbl} ${val} [${r.status}]`;
    }),
    "",
    "  ANOMALY SUMMARY",
    "  " + "─".repeat(36),
    `    Total      : ${anomalies.length}`,
    `    Active     : ${anomalies.filter((a) => !a.resolved).length}`,
    `    Critical   : ${anomalies.filter((a) => a.severity === "CRITICAL").length}`,
    "",
    hr,
  ].join("\n");
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => p.dataKey !== "pred" && p.value != null);
  if (!visible.length) return null;

  return (
    <div
      style={{
        background:   "var(--app-surface)",
        border:       "3px solid var(--app-border)",
        borderRadius: 6,
        padding:      "10px 14px",
        boxShadow:    "3px 3px 0px 0px var(--app-border)",
        minWidth:     150,
      }}
    >
      <p style={{ fontSize: 10, fontFamily: "DM Mono", fontWeight: 700, color: "var(--app-text-3)", marginBottom: 8 }}>
        T-{(60 - Number(label)) * 5}s ago
      </p>
      {visible.map((entry) => {
        const m = entry.dataKey as MetricType;
        const unit = METRIC_UNITS[m] ?? "";
        return (
          <div key={m} className="flex items-center justify-between gap-4" style={{ marginBottom: 4 }}>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: entry.color, border: "1px solid var(--app-border)", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "var(--app-text-1)", fontWeight: 700 }}>{METRIC_LABELS[m]}</span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "DM Mono", fontWeight: 700, color: "var(--app-text-1)" }}>
              {Number(entry.value).toFixed(m === "TDS" ? 0 : 2)}{unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Analytics() {
  const { currentReadings, history, anomalies } = useSensorData();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [range, setRange] = useState<TimeRange>("1h");
  const [sensor, setSensor] = useState<SensorName>(SENSORS[0]);
  const [visible, setVisible] = useState<Record<MetricType, boolean>>({
    pH: true, Turbidity: true, Temperature: true, DO: true, TDS: false,
  });
  const [copied, setCopied] = useState(false);

  const hist   = history[sensor];
  const snap   = currentReadings[sensor];
  const score  = calcScore(snap);
  const { color: scoreColor } = scoreInfo(score);

  // Chart data: actuals
  const PRED_STEPS = 20;
  const actualLen  = hist.pH.length;
  const pivot      = actualLen - 1;
  const totalLen   = actualLen + PRED_STEPS;

  // Build first-visible-metric predictions for dashed line
  const predMetric = (METRICS.find((m) => visible[m]) ?? "pH") as MetricType;
  const predValues = predictNext(hist[predMetric], PRED_STEPS);

  // Unified chart data: actual points + prediction tail
  const chartData = Array.from({ length: totalLen }, (_, i) => {
    const point: Record<string, number | null> = { t: i };
    if (i < actualLen) {
      for (const m of METRICS) point[m] = Number(hist[m][i]?.toFixed(3) ?? 0);
      point.pred = null;
    } else {
      for (const m of METRICS) point[m] = null;
      // Stitch prediction to last actual value at pivot
      point.pred = Number(predValues[i - actualLen]?.toFixed(3) ?? 0);
    }
    return point;
  });
  // Connect pred at pivot
  if (chartData[pivot]) chartData[pivot].pred = chartData[pivot][predMetric];

  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9";
  const tickColor = isDark ? "#475569" : "#94a3b8";

  // Summary stats
  const activeAlerts = anomalies.filter((a) => !a.resolved).length;
  const worstMetric  = METRICS.reduce<MetricType | null>((worst, m) => {
    if (!worst) return snap[m].status !== "SAFE" ? m : null;
    const rank = (s: string) => s === "DANGER" ? 2 : s === "WARNING" ? 1 : 0;
    return rank(snap[m].status) > rank(snap[worst].status) ? m : worst;
  }, null);

  const handleExport = useCallback(async () => {
    const text = generateReport(sensor, snap as Record<MetricType, { value: number; unit: string; status: string; label: string }>, anomalies);
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [sensor, snap, anomalies]);

  const toggleMetric = (m: MetricType) =>
    setVisible((p) => ({ ...p, [m]: !p[m] }));

  // Sorted feed
  const feed = [...anomalies].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6" data-testid="analytics-page">

      {/* ── Global controls bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold uppercase" style={{ color: "var(--app-text-1)" }}>Sensor</span>
          {SENSORS.map((s) => (
            <button
              key={s}
              onClick={() => setSensor(s)}
              className="px-3 py-1 rounded-md text-xs font-extrabold uppercase border-2 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--app-border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_var(--app-border)]"
              style={{
                background: sensor === s ? "#2563eb" : "var(--app-surface-2)",
                color:      sensor === s ? "#fff"     : "var(--app-text-1)",
                borderColor: "var(--app-border)",
                boxShadow: sensor === s ? "2px 2px 0px 0px var(--app-border)" : "1px 1px 0px 0px var(--app-border)",
              }}
              data-testid={`sensor-tab-${s.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold uppercase border-[3px] border-black dark:border-white transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--app-border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_var(--app-border)]"
            style={{
              background:  copied ? "#dcfce7"  : "var(--app-surface-2)",
              color:       copied ? "#15803d"  : "var(--app-text-1)",
              boxShadow:   copied ? "2px 2px 0px 0px var(--app-border)" : "3px 3px 0px 0px var(--app-border)",
            }}
            data-testid="export-report-btn"
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><ClipboardCopy className="w-3.5 h-3.5" /> Export</>}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-6">

        {/* ── LEFT: Main chart card ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border-[3px] border-black dark:border-white flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          style={{ background: "var(--app-surface)" }}
          data-testid="main-chart-card"
        >
          {/* Card header */}
          <div
            className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-4"
            style={{ borderBottom: "3px solid var(--app-border)" }}
          >
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
                Sensor Trends
              </h2>
              <p className="text-[11px] mt-0.5 font-bold" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}>
                {sensor} · {hist.pH.length} pts · 5s interval
              </p>
            </div>

            {/* Time range pills */}
            <div className="flex items-center gap-1.5" role="group">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-3 py-1 rounded-md text-[11px] font-extrabold uppercase border-2 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--app-border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_var(--app-border)]"
                  style={{
                    background: range === r ? "#2563eb" : "var(--app-surface-2)",
                    color:      range === r ? "#ffffff" : "var(--app-text-1)",
                    borderColor: "var(--app-border)",
                    boxShadow: range === r ? "2px 2px 0px 0px var(--app-border)" : "1px 1px 0px 0px var(--app-border)",
                  }}
                  data-testid={`time-range-${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Metric toggle pills */}
          <div className="flex flex-wrap gap-1.5 px-6 pt-4">
            {METRICS.map((m) => {
              const on = visible[m];
              const isPred = on && m === predMetric;
              return (
                <button
                  key={m}
                  onClick={() => toggleMetric(m)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-extrabold uppercase border-2 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_var(--app-border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_var(--app-border)]"
                  style={{
                    background: on ? METRIC_COLORS[m] : "var(--app-surface-2)",
                    color:      on ? "#fff"            : "var(--app-text-1)",
                    borderColor: "var(--app-border)",
                    boxShadow: on ? "2px 2px 0px 0px var(--app-border)" : "1px 1px 0px 0px var(--app-border)",
                  }}
                  data-testid={`toggle-metric-${m.toLowerCase()}`}
                  title={isPred ? `${m} (forecast shown)` : m}
                >
                  {m}
                  {isPred && (
                    <span
                      className="text-[8px] px-1 py-0.5 rounded-md ml-0.5 border border-white"
                      style={{ background: "rgba(255,255,255,0.25)", fontWeight: 800, letterSpacing: "0.05em" }}
                    >
                      +pred
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="px-2 pt-4 pb-3 flex-1">
            <ResponsiveContainer width="100%" height={310}>
              <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 28, left: -4 }}>
                <CartesianGrid stroke={gridColor} strokeWidth={1.5} vertical={false} strokeDasharray="0" />

                <XAxis
                  dataKey="t"
                  tick={{ fill: tickColor, fontSize: 10, fontFamily: "DM Mono", fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const ago = (60 - Number(v)) * 5;
                    if (Number(v) >= actualLen) return "";
                    if (ago === 0)   return "now";
                    if (ago === 300) return "-5m";
                    if (ago % 60 === 0) return `-${ago / 60}m`;
                    return "";
                  }}
                  interval={9}
                  label={{
                    value: "← older                                             newer →",
                    position: "insideBottom",
                    offset: -14,
                    fill: tickColor,
                    fontSize: 9,
                    fontFamily: "DM Mono",
                    fontWeight: 700,
                  }}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 10, fontFamily: "DM Mono", fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />

                <Tooltip content={<ChartTooltip />} cursor={{ stroke: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", strokeWidth: 1.5, strokeDasharray: "4 3" }} />

                {/* NOW divider */}
                <ReferenceLine
                  x={pivot}
                  stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />

                {/* Predicted zone highlight + label */}
                <ReferenceArea
                  x1={pivot}
                  x2={totalLen - 1}
                  fill={isDark ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.06)"}
                  stroke="none"
                  label={{
                    value: "PREDICTED →",
                    position: "insideTopLeft",
                    fill: "#2563eb",
                    fontSize: 9,
                    fontFamily: "DM Mono",
                    fontWeight: 800,
                    letterSpacing: 1,
                    dx: 8,
                    dy: 6,
                  }}
                />

                {/* Actual metric lines */}
                {METRICS.map((m) =>
                  visible[m] ? (
                    <Line
                      key={`actual-${m}`}
                      type="monotone"
                      dataKey={m}
                      stroke={METRIC_COLORS[m]}
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null,
                )}

                {/* Prediction dashed line — blue, for first visible metric */}
                <Line
                  key="pred"
                  type="monotone"
                  dataKey="pred"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={true}
                  opacity={0.8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend strip */}
          <div
            className="flex flex-wrap gap-x-5 gap-y-1 px-6 pb-5 pt-3"
            style={{ borderTop: "3px solid var(--app-border)" }}
          >
            {METRICS.filter((m) => visible[m]).map((m) => (
              <div key={m} className="flex items-center gap-1.5">
                <svg width="16" height="4" className="shrink-0">
                  <line x1="0" y1="2" x2="16" y2="2" stroke={METRIC_COLORS[m]} strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 11, color: "var(--app-text-1)", fontWeight: 700 }}>
                  {METRIC_LABELS[m]}
                  <span style={{ color: "var(--app-text-3)", marginLeft: 2, fontFamily: "var(--app-font-mono)" }}>{METRIC_UNITS[m]}</span>
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 3" />
              </svg>
              <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 800 }}>Predicted</span>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT: Gauge + Stats stacked ──────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Water Quality Score gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.06 }}
            className="rounded-md border-[3px] border-black dark:border-white p-6 flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            style={{ background: "var(--app-surface)" }}
            data-testid="quality-score-gauge"
          >
            <ScoreGauge score={score} />

            {/* Per-metric pills below gauge */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-4 pt-4 w-full" style={{ borderTop: "3px solid var(--app-border)" }}>
              {METRICS.map((m) => {
                const s = snap[m].status;
                const c = s === "SAFE" ? "#16a34a" : s === "WARNING" ? "#d97706" : "#dc2626";
                const Icon = METRIC_ICONS[m];
                return (
                  <div
                    key={m}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold uppercase border-2"
                    style={{
                      color:      c,
                      background: `${c}22`,
                      borderColor: "var(--app-border)",
                    }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {m}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Summary stats panel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-md border-[3px] border-black dark:border-white p-5 flex flex-col gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            style={{ background: "var(--app-surface)" }}
            data-testid="summary-stats"
          >
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "var(--app-text-1)" }}>
              Session Summary
            </h3>

            {[
              {
                icon: ShieldAlert,
                label: "Active Alerts",
                value: activeAlerts,
                color: activeAlerts > 0 ? "#dc2626" : "#16a34a",
                valueStr: String(activeAlerts),
              },
              {
                icon: Activity,
                label: "Anomalies Logged",
                value: anomalies.length,
                color: "#d97706",
                valueStr: String(anomalies.length),
              },
              {
                icon: Radio,
                label: "Sensors Online",
                value: 3,
                color: "#16a34a",
                valueStr: "3 / 3",
              },
              {
                icon: Clock,
                label: "Worst Metric",
                value: 0,
                color: worstMetric ? METRIC_COLORS[worstMetric] : "#16a34a",
                valueStr: worstMetric ? METRIC_LABELS[worstMetric] : "All Safe",
              },
            ].map(({ icon: Icon, label, color, valueStr }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border-2 border-black"
                    style={{ background: `${color}22` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <span className="text-xs font-extrabold uppercase" style={{ color: "var(--app-text-1)" }}>{label}</span>
                </div>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color, fontFamily: "DM Mono, monospace" }}
                >
                  {valueStr}
                </span>
              </div>
            ))}

            {/* Current score bar */}
            <div className="pt-2" style={{ borderTop: "3px solid var(--app-border)" }}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase" style={{ color: "var(--app-text-1)" }}>Quality Score</span>
                <span className="text-[10px] font-black" style={{ color: scoreColor, fontFamily: "DM Mono" }}>{score} / 100</span>
              </div>
              <div className="w-full h-3 rounded-md overflow-hidden border-2 border-black dark:border-white" style={{ background: "var(--app-surface-2)" }}>
                <motion.div
                  className="h-full"
                  style={{ background: scoreColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Anomaly Timeline Feed ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="rounded-md border-[3px] border-black dark:border-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        style={{ background: "var(--app-surface)" }}
        data-testid="anomaly-timeline"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "3px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
              Anomaly History
            </h3>
            {anomalies.length > 0 && (
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border-2 border-black"
                style={{ background: "#fee2e2", color: "#dc2626" }}
              >
                {anomalies.length} event{anomalies.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(["SAFE", "WARNING", "DANGER"] as const).map((s) => {
              const c = s === "SAFE" ? "#16a34a" : s === "WARNING" ? "#d97706" : "#dc2626";
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-black" style={{ background: c }} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: c }}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feed */}
        <div
          className="divide-y-2 divide-black dark:divide-white overflow-y-auto"
          style={{
            maxHeight: 460,
            scrollbarWidth: "thin",
            scrollbarColor: "var(--app-border) transparent",
          }}
        >
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <CheckCircle2 className="w-9 h-9 text-[#16a34a]" />
              <p className="text-sm font-extrabold uppercase" style={{ color: "var(--app-text-1)" }}>No anomalies detected</p>
              <p className="text-xs font-bold" style={{ color: "var(--app-text-3)" }}>All sensors reading within safe ranges</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {feed.map((a, i) => {
                const sevColor = SEV_COLORS[a.severity] ?? "#d97706";
                const MetricIcon = METRIC_ICONS[a.metric];
                const metricColor = METRIC_COLORS[a.metric];
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="flex items-start gap-4 px-6 py-4 relative border-l-[6px]"
                    style={{ borderLeftColor: sevColor }}
                    data-testid={`anomaly-feed-${a.id}`}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 border-2 border-black"
                      style={{
                        background: a.resolved ? "#dcfce7" : "#fee2e2",
                      }}
                    >
                      {a.resolved
                        ? <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                        : <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Severity badge */}
                        <span
                          className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border-2 border-black"
                          style={{
                            color:      sevColor,
                            background: "#fafafa",
                          }}
                        >
                          {a.severity}
                        </span>
                        {/* Metric pill */}
                        <span
                          className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border-2 border-black"
                          style={{
                            color:      metricColor,
                            background: "#fafafa",
                          }}
                        >
                          <MetricIcon className="w-2.5 h-2.5" />
                          {a.metric}
                        </span>
                        {/* Resolved tag */}
                        {a.resolved && (
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border-2 border-black"
                            style={{ background: "#dcfce7", color: "#15803d" }}
                          >
                            Resolved
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs font-bold leading-relaxed" style={{ color: "var(--app-text-1)" }}>
                        {a.threshold}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap font-bold">
                        <span className="text-[10px]" style={{ color: "var(--app-text-3)" }}>
                          {a.sensor}
                        </span>
                        <span
                          className="text-[10px] font-extrabold tabular-nums"
                          style={{ color: sevColor, fontFamily: "DM Mono, monospace" }}
                        >
                          {a.value.toFixed(2)}{METRIC_UNITS[a.metric]}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-[10px] font-medium tabular-nums"
                        style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}
                      >
                        {relativeTime(a.timestamp)}
                      </span>
                      <span
                        className="text-[9px] tabular-nums"
                        style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}
                      >
                        {a.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

    </div>
  );
}
