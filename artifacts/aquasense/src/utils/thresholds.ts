export type MetricType = "pH" | "Turbidity" | "Temperature" | "DO" | "TDS";
export type StatusType = "SAFE" | "WARNING" | "DANGER";

export interface Threshold {
  minDanger?: number;
  minWarning?: number;
  maxWarning?: number;
  maxDanger?: number;
}

export const THRESHOLDS: Record<MetricType, Threshold> = {
  pH: {
    minDanger: 6.0,
    minWarning: 6.5,
    maxWarning: 8.5,
    maxDanger: 9.0
  },
  Turbidity: {
    maxWarning: 4,
    maxDanger: 10
  },
  Temperature: {
    minWarning: 15,
    maxWarning: 25,
    maxDanger: 35
  },
  DO: {
    minDanger: 4,
    minWarning: 6
  },
  TDS: {
    maxWarning: 500,
    maxDanger: 1000
  }
};

export function getStatus(metric: MetricType, value: number): StatusType {
  const t = THRESHOLDS[metric];
  
  if (t.minDanger !== undefined && value < t.minDanger) return "DANGER";
  if (t.maxDanger !== undefined && value > t.maxDanger) return "DANGER";
  
  if (t.minWarning !== undefined && value < t.minWarning) return "WARNING";
  if (t.maxWarning !== undefined && value > t.maxWarning) return "WARNING";
  
  return "SAFE";
}
