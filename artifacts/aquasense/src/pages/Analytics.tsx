import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  ReferenceLine, ReferenceArea,
} from "recharts";
import { ClipboardCopy, Check, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType, StatusType, getStatus } from "../utils/thresholds";
import { predictNext } from "../utils/linearRegression";

// ── Constants ──────────────────────────────────────────────────────────────

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#00f5ff", Turbidity: "#39ff14", Temperature: "#ffaa00", DO: "#c084fc", TDS: "#60a5fa",
};
const METRIC_UNITS: Record<MetricType, string> = {
  pH: "", Turbidity: " NTU", Temperature: "°C", DO: " mg/L", TDS: " ppm",
};
const METRIC_LABELS: Record<MetricType, string> = {
  pH: "pH Level", Turbidity: "Turbidity", Temperature: "Temperature", DO: "Dissolved O₂", TDS: "TDS",
};

const TIME_RANGES = ["1hr", "6hr", "24hr", "7d"] as const;
type TimeRange = (typeof TIME_RANGES)[number];
const POINTS_FOR_RANGE: Record<TimeRange, number> = { "1hr": 60, "6hr": 60, "24hr": 60, "7d": 60 };

type SortCol = "timestamp" | "sensor" | "metric" | "value" | "severity" | "status";
type SortDir = "asc" | "desc";
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#ff2d55", HIGH: "#ff6b35", MEDIUM: "#ffaa00",
};

// ── Helper functions ────────────────────────────────────────────────────────

function calcWaterScore(snap: Record<MetricType, { status: string }>): number {
  const w: Record<MetricType, number> = { pH: 25, Turbidity: 20, Temperature: 15, DO: 25, TDS: 15 };
  let s = 0;
  for (const m of METRICS) s += snap[m].status === "SAFE" ? w[m] : snap[m].status === "WARNING" ? w[m] * 0.5 : 0;
  return Math.round(s);
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "EXCELLENT", color: "#39ff14" };
  if (score >= 50) return { label: "GOOD", color: "#ffaa00" };
  if (score >= 25) return { label: "POOR", color: "#ff6b35" };
  return { label: "CRITICAL", color: "#ff2d55" };
}

/** Deterministic heatmap: 5 metrics × 24 hours, last column = actual current status */
function genHeatmap(
  sensor: SensorName,
  currentStatuses: Record<MetricType, StatusType>,
): StatusType[][] {
  const seed = sensor.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 3), 0);
  return METRICS.map((metric, mi) =>
    Array.from({ length: 24 }, (_, h): StatusType => {
      if (h === 23) return currentStatuses[metric];
      const r = Math.abs(Math.sin(seed * 0.017 + mi * 2.718 + h * 0.523));
      return r > 0.91 ? "DANGER" : r > 0.74 ? "WARNING" : "SAFE";
    }),
  );
}

function generateReportText(
  sensorName: string,
  snap: Record<MetricType, { value: number; unit: string; status: string; label: string }>,
  anomalies: Array<{ timestamp: Date; sensor: string; metric: MetricType; value: number; severity: string; resolved: boolean }>,
): string {
  const hr = "━".repeat(46);
  const now = new Date();
  const lines: string[] = [
    hr,
    "  AQUASENSE 2.0 — WATER QUALITY REPORT",
    `  Generated : ${now.toLocaleString()}`,
    `  Sensor    : ${sensorName}`,
    hr,
    "",
    "  CURRENT READINGS",
    "  " + "─".repeat(36),
    ...METRICS.map((m) => {
      const r = snap[m];
      const label = METRIC_LABELS[m].padEnd(15);
      const val = `${r.value.toFixed(m === "TDS" ? 0 : 2)}${r.unit}`.padEnd(12);
      return `    ${label} ${val} [${r.status}]`;
    }),
    "",
    "  24-HOUR ANOMALY SUMMARY",
    "  " + "─".repeat(36),
    `    Total anomalies  : ${anomalies.length}`,
    `    Active alerts    : ${anomalies.filter((a) => !a.resolved).length}`,
    `    Critical events  : ${anomalies.filter((a) => a.severity === "CRITICAL").length}`,
    `    High severity    : ${anomalies.filter((a) => a.severity === "HIGH").length}`,
    `    Medium severity  : ${anomalies.filter((a) => a.severity === "MEDIUM").length}`,
    "",
    "  ANOMALY LOG (last 10)",
    "  " + "─".repeat(36),
    ...(anomalies.length === 0
      ? ["    No anomalies recorded in this session."]
      : [...anomalies]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10)
          .map((a) => {
            const ts = a.timestamp.toLocaleTimeString();
            return `    [${ts}] ${a.sensor} / ${a.metric} — ${a.value.toFixed(2)}${METRIC_UNITS[a.metric]}  (${a.severity})`;
          })),
    "",
    hr,
  ];
  return lines.join("\n");
}

// ── Sort icon ───────────────────────────────────────────────────────────────

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronsUpDown className="w-3 h-3 opacity-30 inline ml-1" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-[#00f5ff] inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-[#00f5ff] inline ml-1" />;
}

// ── Component ───────────────────────────────────────────────────────────────

export function Analytics() {
  const { currentReadings, history, anomalies } = useSensorData();
  const [range, setRange] = useState<TimeRange>("1hr");
  const [activeSensor, setActiveSensor] = useState<SensorName>(SENSORS[0]);
  const [sortCol, setSortCol] = useState<SortCol>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [copied, setCopied] = useState(false);

  const points = POINTS_FOR_RANGE[range];
  const hist = history[activeSensor];
  const snap = currentReadings[activeSensor];

  const score = calcWaterScore(snap);
  const { label: scoreLabel2, color: scoreColor } = scoreLabel(score);

  // Heatmap: rows = METRICS, cols = last 24 hours
  const currentStatuses = Object.fromEntries(
    METRICS.map((m) => [m, snap[m].status as StatusType]),
  ) as Record<MetricType, StatusType>;
  const heatmapData = genHeatmap(activeSensor, currentStatuses);
  const now = new Date();
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    const h = (now.getHours() - 23 + i + 24) % 24;
    return h.toString().padStart(2, "0");
  });

  // Sorted anomaly table
  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "timestamp") cmp = a.timestamp.getTime() - b.timestamp.getTime();
    else if (sortCol === "sensor") cmp = a.sensor.localeCompare(b.sensor);
    else if (sortCol === "metric") cmp = a.metric.localeCompare(b.metric);
    else if (sortCol === "value") cmp = a.value - b.value;
    else if (sortCol === "severity") cmp = (SEVERITY_RANK[a.severity] ?? 0) - (SEVERITY_RANK[b.severity] ?? 0);
    else if (sortCol === "status") cmp = Number(a.resolved) - Number(b.resolved);
    return sortDir === "desc" ? -cmp : cmp;
  });

  // Export report
  const handleExport = useCallback(async () => {
    const text = generateReportText(activeSensor, snap as Record<MetricType, { value: number; unit: string; status: string; label: string }>, anomalies);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: create a temporary textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [activeSensor, snap, anomalies]);

  const TABLE_COLS: { key: SortCol; label: string }[] = [
    { key: "timestamp", label: "Timestamp" },
    { key: "sensor", label: "Sensor" },
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
    { key: "severity", label: "Severity" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6" data-testid="analytics-page">

      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[#e2e8f0] text-xs font-mono tracking-widest uppercase">Sensor:</span>
        {SENSORS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSensor(s)}
            className="px-3 py-1 rounded text-[10px] font-mono tracking-wider uppercase border transition-all"
            style={{
              borderColor: activeSensor === s ? "rgba(0,245,255,0.5)" : "rgba(255,255,255,0.1)",
              background: activeSensor === s ? "rgba(0,245,255,0.1)" : "transparent",
              color: activeSensor === s ? "#00f5ff" : "#64748b",
            }}
            data-testid={`sensor-tab-${s.replace(/\s+/g, "-").toLowerCase()}`}
          >
            {s}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded text-[10px] font-mono tracking-wider uppercase border transition-all"
              style={{
                borderColor: range === r ? "rgba(0,245,255,0.5)" : "rgba(255,255,255,0.1)",
                background: range === r ? "rgba(0,245,255,0.1)" : "transparent",
                color: range === r ? "#00f5ff" : "#64748b",
              }}
              data-testid={`time-range-${r}`}
            >
              {r}
            </button>
          ))}

          {/* Export Report */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1 rounded text-[10px] font-mono tracking-wider uppercase border transition-all"
            style={{
              borderColor: copied ? "rgba(57,255,20,0.5)" : "rgba(0,245,255,0.3)",
              background: copied ? "rgba(57,255,20,0.1)" : "rgba(0,245,255,0.06)",
              color: copied ? "#39ff14" : "#00f5ff",
            }}
            data-testid="export-report-btn"
          >
            {copied
              ? <><Check className="w-3 h-3" /> Copied!</>
              : <><ClipboardCopy className="w-3 h-3" /> Export Report</>}
          </button>
        </div>
      </div>

      {/* ── Score gauge + per-metric charts ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Score gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border p-4 flex flex-col items-center justify-center"
          style={{ background: "#0d1f3c", borderColor: "rgba(0,245,255,0.15)" }}
          data-testid="quality-score-gauge"
        >
          <span className="text-[#64748b] text-[10px] font-mono tracking-widest uppercase mb-2">
            Water Quality Score
          </span>
          <div className="relative">
            <RadialBarChart
              width={150}
              height={150}
              innerRadius={50}
              outerRadius={70}
              data={[{ value: score, fill: scoreColor }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "rgba(255,255,255,0.05)" }} />
            </RadialBarChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: scoreColor, fontFamily: "var(--app-font-display)" }}>
                {score}
              </span>
              <span className="text-[10px] font-mono" style={{ color: scoreColor }}>/ 100</span>
            </div>
          </div>
          <span className="text-sm font-bold mt-2 tracking-widest" style={{ color: scoreColor, fontFamily: "var(--app-font-display)" }}>
            {scoreLabel2}
          </span>
          {/* Forecast legend */}
          <div className="mt-4 flex flex-col gap-1.5 w-full">
            <div className="flex items-center gap-2">
              <svg width="20" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="20" y2="2" stroke="#00f5ff" strokeWidth="1.5" />
              </svg>
              <span className="text-[9px] font-mono text-[#64748b] tracking-wider">ACTUAL DATA</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="20" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="20" y2="2" stroke="#00f5ff" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
              </svg>
              <span className="text-[9px] font-mono text-[#64748b] tracking-wider">2HR FORECAST</span>
            </div>
          </div>
        </motion.div>

        {/* Per-metric charts with prediction */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {METRICS.map((metric, idx) => {
            const values = hist[metric].slice(-points);
            // 30 future steps ≈ 2 hours relative to displayed history
            const predictions = predictNext(values, 30);
            const color = METRIC_COLORS[metric];
            const pivot = values.length - 1;

            const chartData = [
              ...values.map((v, i) => ({ i, actual: +v.toFixed(3), pred: i === pivot ? +v.toFixed(3) : null })),
              ...predictions.map((v, i) => ({
                i: values.length + i,
                actual: null,
                pred: +v.toFixed(3),
              })),
            ];

            return (
              <motion.div
                key={metric}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border p-3"
                style={{ background: "#0a1628", borderColor: `${color}20` }}
                data-testid={`metric-chart-${metric.toLowerCase()}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color }}>
                    {metric}{METRIC_UNITS[metric]}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
                  >
                    {snap[metric].status}
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -28 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="i"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#475569", fontSize: 8, fontFamily: "JetBrains Mono" }}
                      tickFormatter={(v) => {
                        if (v === 0) return "─2hr";
                        if (v === pivot) return "now";
                        if (v === values.length + 29) return "+2hr";
                        return "";
                      }}
                      ticks={[0, pivot, values.length + 29]}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0d1f3c",
                        border: `1px solid ${color}30`,
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: "JetBrains Mono",
                        color: "#e2e8f0",
                      }}
                      formatter={(v: number, name: string) => [
                        `${v}${METRIC_UNITS[metric]}`,
                        name === "pred" ? "Forecast" : "Actual",
                      ]}
                      labelFormatter={() => ""}
                    />

                    {/* Forecast zone background */}
                    <ReferenceArea
                      x1={values.length}
                      x2={values.length + 29}
                      fill={`${color}06`}
                      stroke="none"
                    />

                    {/* NOW divider */}
                    <ReferenceLine
                      x={pivot}
                      stroke="rgba(255,255,255,0.12)"
                      strokeDasharray="3 2"
                      label={{
                        value: "NOW",
                        position: "insideTopLeft",
                        fill: "#475569",
                        fontSize: 8,
                        fontFamily: "JetBrains Mono",
                        dy: -2,
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke={color}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                      name="actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="pred"
                      stroke={color}
                      strokeWidth={1.2}
                      strokeDasharray="5 3"
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={true}
                      opacity={0.55}
                      name="pred"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Anomaly Heatmap ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border p-4"
        style={{ background: "#0d1f3c", borderColor: "rgba(0,245,255,0.15)" }}
        data-testid="anomaly-heatmap"
      >
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-[#e2e8f0] text-xs font-mono tracking-widest uppercase">
            24-Hour Anomaly Heatmap
          </span>
          <span className="text-[#475569] text-[10px] font-mono">{activeSensor}</span>

          {/* Legend */}
          <div className="ml-auto flex items-center gap-4">
            {(["SAFE", "WARNING", "DANGER"] as StatusType[]).map((s) => {
              const c = s === "SAFE" ? "#39ff14" : s === "WARNING" ? "#ffaa00" : "#ff2d55";
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: `${c}35`, border: `1px solid ${c}55` }}
                  />
                  <span className="text-[9px] font-mono tracking-wider" style={{ color: c }}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="shrink-0" style={{ width: 86 }} />
              {hourLabels.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 text-center"
                  style={{
                    fontSize: 8,
                    fontFamily: "JetBrains Mono",
                    color: i === 23 ? "#00f5ff" : "#334155",
                    fontWeight: i === 23 ? 700 : 400,
                    minWidth: 20,
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Metric rows */}
            {METRICS.map((metric, mi) => {
              const mColor = METRIC_COLORS[metric];
              return (
                <div key={metric} className="flex items-center mb-1.5">
                  <div
                    className="shrink-0 text-right pr-3"
                    style={{
                      width: 86,
                      fontSize: 9,
                      fontFamily: "JetBrains Mono",
                      color: mColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {metric}
                  </div>
                  {heatmapData[mi].map((status, hi) => {
                    const c = status === "SAFE" ? "#39ff14" : status === "WARNING" ? "#ffaa00" : "#ff2d55";
                    const isNow = hi === 23;
                    const opacity = status === "SAFE" ? "22" : status === "WARNING" ? "44" : "66";
                    return (
                      <div
                        key={hi}
                        className="flex-1 rounded-sm transition-all"
                        style={{
                          minWidth: 20,
                          height: 22,
                          background: `${c}${opacity}`,
                          border: `1px solid ${c}${isNow ? "99" : "33"}`,
                          margin: "0 1px",
                          cursor: "default",
                          boxShadow: isNow ? `0 0 6px ${c}50` : "none",
                          outline: isNow ? `1px solid ${c}50` : "none",
                        }}
                        title={`${metric} · ${hourLabels[hi]}:00 → ${status}`}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* "NOW" marker row */}
            <div className="flex mt-0.5">
              <div className="shrink-0" style={{ width: 86 }} />
              {hourLabels.map((_, i) => (
                <div key={i} className="flex-1 text-center" style={{ minWidth: 20 }}>
                  {i === 23 && (
                    <span style={{ fontSize: 7, color: "#00f5ff", fontFamily: "JetBrains Mono", letterSpacing: 1 }}>
                      NOW
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Sortable anomaly history table ─────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "#0d1f3c", borderColor: "rgba(0,245,255,0.15)" }}
        data-testid="anomaly-history-table"
      >
        <div className="px-4 py-3 border-b border-[rgba(0,245,255,0.1)] flex items-center justify-between">
          <span className="text-[#e2e8f0] text-xs font-mono tracking-widest uppercase">
            Anomaly History
          </span>
          <span className="text-[#475569] text-[10px] font-mono">
            {anomalies.length} record{anomalies.length !== 1 ? "s" : ""} — click headers to sort
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[rgba(0,245,255,0.08)]">
                {TABLE_COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-2.5 text-left tracking-wider uppercase text-[10px] cursor-pointer select-none transition-colors"
                    style={{
                      color: sortCol === key ? "#00f5ff" : "#64748b",
                    }}
                    data-testid={`sort-col-${key}`}
                  >
                    <span className="inline-flex items-center gap-0.5 hover:text-[#e2e8f0] transition-colors">
                      {label}
                      <SortIcon col={key} active={sortCol} dir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#475569] font-mono text-[11px] tracking-wider">
                    NO ANOMALIES RECORDED
                  </td>
                </tr>
              ) : (
                sortedAnomalies.map((a) => {
                  const sevColor = SEV_COLORS[a.severity] ?? "#ffaa00";
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors"
                      style={{ background: a.resolved ? "transparent" : `${sevColor}06` }}
                      data-testid={`anomaly-row-${a.id}`}
                    >
                      <td className="px-4 py-2.5 text-[#64748b] tabular-nums">
                        {a.timestamp.toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5 text-[#cbd5e1]">{a.sensor}</td>
                      <td className="px-4 py-2.5" style={{ color: METRIC_COLORS[a.metric] }}>
                        {a.metric}
                      </td>
                      <td className="px-4 py-2.5 text-[#e2e8f0] tabular-nums">
                        {a.value.toFixed(2)}{METRIC_UNITS[a.metric]}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest"
                          style={{ color: sevColor, background: `${sevColor}20`, border: `1px solid ${sevColor}35` }}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] tracking-wider font-semibold"
                          style={{ color: a.resolved ? "#39ff14" : "#ff2d55" }}
                        >
                          {a.resolved ? "RESOLVED" : "ACTIVE"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
