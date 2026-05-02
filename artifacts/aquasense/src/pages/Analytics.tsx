import { useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis
} from "recharts";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType, getStatus } from "../utils/thresholds";
import { predictNext } from "../utils/linearRegression";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];
const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#00f5ff", Turbidity: "#39ff14", Temperature: "#ffaa00", DO: "#c084fc", TDS: "#60a5fa",
};
const METRIC_UNITS: Record<MetricType, string> = {
  pH: "", Turbidity: " NTU", Temperature: "°C", DO: " mg/L", TDS: " ppm",
};

const TIME_RANGES = ["1hr", "6hr", "24hr", "7d"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const POINTS_FOR_RANGE: Record<TimeRange, number> = { "1hr": 60, "6hr": 60, "24hr": 60, "7d": 60 };

function calcWaterScore(snap: Record<MetricType, { status: string }>): number {
  const weights: Record<MetricType, number> = { pH: 25, Turbidity: 20, Temperature: 15, DO: 25, TDS: 15 };
  let score = 0;
  for (const m of METRICS) {
    const s = snap[m].status;
    score += s === "SAFE" ? weights[m] : s === "WARNING" ? weights[m] * 0.5 : 0;
  }
  return Math.round(score);
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "EXCELLENT", color: "#39ff14" };
  if (score >= 50) return { label: "GOOD", color: "#ffaa00" };
  if (score >= 25) return { label: "POOR", color: "#ff6b35" };
  return { label: "CRITICAL", color: "#ff2d55" };
}

export function Analytics() {
  const { currentReadings, history, anomalies } = useSensorData();
  const [range, setRange] = useState<TimeRange>("1hr");
  const [activeSensor, setActiveSensor] = useState<SensorName>(SENSORS[0]);

  const points = POINTS_FOR_RANGE[range];
  const hist = history[activeSensor];

  const score = calcWaterScore(currentReadings[activeSensor]);
  const { label: scoreLabel2, color: scoreColor } = scoreLabel(score);

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header row */}
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
        </div>
      </div>

      {/* Water Quality Score + per-metric charts */}
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
        </motion.div>

        {/* Per-metric charts */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {METRICS.map((metric, idx) => {
            const values = hist[metric].slice(-points);
            const predictions = predictNext(values, 12);
            const color = METRIC_COLORS[metric];

            const chartData = [
              ...values.map((v, i) => ({ i, value: Number(v.toFixed(2)), pred: null })),
              ...predictions.map((v, i) => ({ i: values.length + i, value: null, pred: Number(v.toFixed(2)) })),
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
                    {currentReadings[activeSensor][metric].status}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: -28 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="i" hide />
                    <YAxis tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0d1f3c", border: `1px solid ${color}30`, borderRadius: 6, fontSize: 10, fontFamily: "JetBrains Mono", color: "#e2e8f0" }}
                    />
                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
                    <Line type="monotone" dataKey="pred" stroke={color} strokeWidth={1} strokeDasharray="4 2" dot={false} isAnimationActive={false} connectNulls={false} opacity={0.6} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Anomaly history table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "#0d1f3c", borderColor: "rgba(0,245,255,0.15)" }}
        data-testid="anomaly-history-table"
      >
        <div className="px-4 py-3 border-b border-[rgba(0,245,255,0.1)]">
          <span className="text-[#e2e8f0] text-xs font-mono tracking-widest uppercase">
            Anomaly History
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[rgba(0,245,255,0.08)]">
                {["Timestamp", "Sensor", "Metric", "Value", "Severity", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[#64748b] tracking-wider uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#64748b]">No anomalies recorded</td>
                </tr>
              ) : (
                anomalies.slice().reverse().map((a) => {
                  const sevColor = a.severity === "CRITICAL" ? "#ff2d55" : a.severity === "HIGH" ? "#ff6b35" : "#ffaa00";
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                      style={{ background: a.resolved ? "transparent" : `${sevColor}08` }}
                      data-testid={`anomaly-row-${a.id}`}
                    >
                      <td className="px-4 py-2 text-[#64748b]">{a.timestamp.toLocaleTimeString()}</td>
                      <td className="px-4 py-2 text-[#e2e8f0]">{a.sensor}</td>
                      <td className="px-4 py-2" style={{ color: METRIC_COLORS[a.metric] }}>{a.metric}</td>
                      <td className="px-4 py-2 text-[#e2e8f0]">{a.value.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest" style={{ color: sevColor, background: `${sevColor}20` }}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] tracking-wider ${a.resolved ? "text-[#39ff14]" : "text-[#ff2d55]"}`}>
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
