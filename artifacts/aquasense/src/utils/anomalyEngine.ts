import { MetricType, StatusType, getStatus } from "./thresholds";

export interface AnomalyEvent {
  id: string;
  sensor: string;
  metric: MetricType;
  value: number;
  threshold: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  timestamp: Date;
  resolved: boolean;
}

const consecutiveCounts: Record<string, number> = {};

function getSeverity(status: StatusType): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (status === "DANGER") return "CRITICAL";
  return "HIGH";
}

export function checkAnomaly(
  sensor: string,
  metric: MetricType,
  value: number,
  existingAnomalies: AnomalyEvent[]
): AnomalyEvent | null {
  const key = `${sensor}-${metric}`;
  const status = getStatus(metric, value);

  if (status === "SAFE") {
    consecutiveCounts[key] = 0;
    return null;
  }

  consecutiveCounts[key] = (consecutiveCounts[key] ?? 0) + 1;

  if (consecutiveCounts[key] < 3) return null;

  const alreadyActive = existingAnomalies.some(
    (a) => a.sensor === sensor && a.metric === metric && !a.resolved
  );
  if (alreadyActive) return null;

  const metricUnit: Record<MetricType, string> = {
    pH: "",
    Turbidity: " NTU",
    Temperature: "°C",
    DO: " mg/L",
    TDS: " ppm",
  };

  return {
    id: `${key}-${Date.now()}`,
    sensor,
    metric,
    value,
    threshold: `${metric}: ${value.toFixed(2)}${metricUnit[metric]} — ${status}`,
    severity: getSeverity(status),
    timestamp: new Date(),
    resolved: false,
  };
}
