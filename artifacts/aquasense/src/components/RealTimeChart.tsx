import { useState } from "react";
import { WifiOff } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MetricType } from "../utils/thresholds";
import { MetricHistory } from "../hooks/useSensorData";

const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#00f5ff",
  Turbidity: "#39ff14",
  Temperature: "#ffaa00",
  DO: "#c084fc",
  TDS: "#60a5fa",
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
    pH: true,
    Turbidity: true,
    Temperature: true,
    DO: true,
    TDS: false,
  });

  const data = Array.from({ length: history.pH.length }, (_, i) => {
    const point: Record<string, number | string> = { t: i };
    for (const m of METRICS) point[m] = Number(history[m][i]?.toFixed(2) ?? 0);
    return point;
  });

  const toggleMetric = (m: MetricType) => {
    setVisible((prev) => ({ ...prev, [m]: !prev[m] }));
  };

  return (
    <div
      className="rounded-xl border p-4 relative"
      style={{
        background: "#0d1f3c",
        borderColor: offline ? "rgba(71,85,105,0.3)" : "rgba(0,245,255,0.15)",
        boxShadow: "0 0 20px rgba(0,245,255,0.05)",
        opacity: offline ? 0.6 : 1,
      }}
      data-testid="realtime-chart"
    >
      {offline && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[rgba(2,8,23,0.6)] z-10">
          <div className="flex flex-col items-center gap-2 text-[#475569]">
            <WifiOff className="w-8 h-8" />
            <span className="text-xs font-mono tracking-widest">SENSOR OFFLINE</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[#e2e8f0] text-xs font-mono tracking-widest uppercase mr-2">
          Live Metrics
        </span>
        {METRICS.map((m) => (
          <button
            key={m}
            onClick={() => toggleMetric(m)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-all border"
            style={{
              borderColor: visible[m] ? METRIC_COLORS[m] + "60" : "rgba(255,255,255,0.1)",
              background: visible[m] ? METRIC_COLORS[m] + "15" : "transparent",
              color: visible[m] ? METRIC_COLORS[m] : "#64748b",
            }}
            data-testid={`toggle-metric-${m.toLowerCase()}`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: visible[m] ? METRIC_COLORS[m] : "#64748b" }}
            />
            {m}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,245,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(0,245,255,0.1)" }}
            label={{ value: "Time (5s intervals)", position: "insideBottom", fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono", offset: -2 }}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#0a1628",
              border: "1px solid rgba(0,245,255,0.2)",
              borderRadius: 8,
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              color: "#e2e8f0",
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
