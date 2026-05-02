import { useState } from "react";
import { WifiOff } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MetricType } from "../utils/thresholds";
import { MetricHistory } from "../hooks/useSensorData";

const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#2563eb",
  Turbidity: "#16a34a",
  Temperature: "#d97706",
  DO: "#7c3aed",
  TDS: "#0891b2",
};

const METRIC_LABELS: Record<MetricType, string> = {
  pH: "pH",
  Turbidity: "Turbidity (NTU)",
  Temperature: "Temp (°C)",
  DO: "DO (mg/L)",
  TDS: "TDS (ppm)",
};

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

interface RealTimeChartProps {
  history: MetricHistory;
  offline?: boolean;
}

export function RealTimeChart({ history, offline = false }: RealTimeChartProps) {
  const [visible, setVisible] = useState<Record<MetricType, boolean>>({
    pH: true, Turbidity: true, Temperature: true, DO: true, TDS: false,
  });

  const data = Array.from({ length: history.pH.length }, (_, i) => {
    const point: Record<string, number | string> = { t: i };
    for (const m of METRICS) point[m] = Number(history[m][i]?.toFixed(2) ?? 0);
    return point;
  });

  const toggleMetric = (m: MetricType) =>
    setVisible((prev) => ({ ...prev, [m]: !prev[m] }));

  return (
    <div
      className="rounded-xl border bg-white p-4 relative"
      style={{
        borderColor: "#e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        opacity: offline ? 0.6 : 1,
      }}
      data-testid="realtime-chart"
    >
      {offline && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/75 z-10">
          <div className="flex flex-col items-center gap-2 text-[#94a3b8]">
            <WifiOff className="w-8 h-8" />
            <span className="text-xs font-medium tracking-wide">Sensor Offline</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[#0f172a] text-sm font-semibold mr-1">
          Live Metrics
        </span>
        {METRICS.map((m) => (
          <button
            key={m}
            onClick={() => toggleMetric(m)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
            style={{
              borderColor: visible[m] ? METRIC_COLORS[m] + "50" : "#e2e8f0",
              background: visible[m] ? METRIC_COLORS[m] + "10" : "transparent",
              color: visible[m] ? METRIC_COLORS[m] : "#94a3b8",
            }}
            data-testid={`toggle-metric-${m.toLowerCase()}`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: visible[m] ? METRIC_COLORS[m] : "#cbd5e1" }}
            />
            {m}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "DM Mono" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            label={{ value: "Time (5s intervals)", position: "insideBottom", fill: "#94a3b8", fontSize: 10, fontFamily: "DM Mono", offset: -10 }}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "DM Mono" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontFamily: "DM Mono, monospace",
              fontSize: 11,
              color: "#0f172a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "#64748b", marginBottom: 4 }}
            labelFormatter={(v) => `T-${(60 - Number(v)) * 5}s`}
          />
          {METRICS.map((m) =>
            visible[m] ? (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={METRIC_COLORS[m]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                name={METRIC_LABELS[m]}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
