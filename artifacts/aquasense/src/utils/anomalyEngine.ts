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

function getSeverity(status: StatusType): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (status === "DANGER") return "CRITICAL";
  return "HIGH";
}

const METRIC_UNITS: Record<MetricType, string> = {
  pH: "",
  Turbidity: " NTU",
  Temperature: "°C",
  DO: " mg/L",
  TDS: " ppm",
};

export function checkAnomaly(
  sensor: string,
  metric: MetricType,
  value: number,
  existingAnomalies: AnomalyEvent[],
  consecutiveCounts: Record<string, number>
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

  return {
    id: `${key}-${Date.now()}`,
    sensor,
    metric,
    value,
    threshold: `${metric}: ${value.toFixed(2)}${METRIC_UNITS[metric]} — ${status}`,
    severity: getSeverity(status),
    timestamp: new Date(),
    resolved: false,
  };
}

export function resetConsecutiveCount(
  sensor: string,
  metric: MetricType,
  consecutiveCounts: Record<string, number>
): void {
  consecutiveCounts[`${sensor}-${metric}`] = 0;
}
