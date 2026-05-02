import { useState, useEffect, useCallback, useRef } from "react";
import { MetricType, StatusType, getStatus } from "../utils/thresholds";
import { checkAnomaly, AnomalyEvent } from "../utils/anomalyEngine";

export const SENSORS = ["River Station A", "Treatment Plant B", "Distribution Point C"] as const;
export type SensorName = (typeof SENSORS)[number];

export interface SensorReading {
  value: number;
  status: StatusType;
  unit: string;
  label: string;
}

export interface SensorSnapshot {
  pH: SensorReading;
  Turbidity: SensorReading;
  Temperature: SensorReading;
  DO: SensorReading;
  TDS: SensorReading;
  timestamp: Date;
}

export type MetricHistory = Record<MetricType, number[]>;

interface SensorState {
  currentReadings: Record<SensorName, SensorSnapshot>;
  history: Record<SensorName, MetricHistory>;
  anomalies: AnomalyEvent[];
  lastUpdated: Date;
  selectedSensor: SensorName | null;
}

const BASE_VALUES: Record<MetricType, number> = {
  pH: 7.2,
  Turbidity: 2.5,
  Temperature: 20,
  DO: 8,
  TDS: 350,
};

const UNITS: Record<MetricType, string> = {
  pH: "",
  Turbidity: " NTU",
  Temperature: "°C",
  DO: " mg/L",
  TDS: " ppm",
};

const LABELS: Record<MetricType, string> = {
  pH: "pH Level",
  Turbidity: "Turbidity",
  Temperature: "Temperature",
  DO: "Dissolved Oxygen",
  TDS: "TDS",
};

const DRIFT: Record<SensorName, Partial<Record<MetricType, number>>> = {
  "River Station A": { Turbidity: 0.5, pH: -0.1 },
  "Treatment Plant B": { TDS: 30, DO: 0.3 },
  "Distribution Point C": { Temperature: 1, pH: 0.1 },
};

function walk(current: number, base: number, scale: number): number {
  const delta = (Math.random() - 0.5) * scale;
  const newVal = current + delta;
  return newVal * 0.85 + base * 0.15;
}

function maybeSpike(val: number, metric: MetricType): number {
  if (Math.random() < 0.05) {
    const spikes: Record<MetricType, number> = {
      pH: metric === "pH" ? (Math.random() < 0.5 ? 5.5 : 9.8) : val,
      Turbidity: 15,
      Temperature: 38,
      DO: 2.5,
      TDS: 1200,
    };
    return spikes[metric];
  }
  return val;
}

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];
const WALK_SCALE: Record<MetricType, number> = {
  pH: 0.08,
  Turbidity: 0.3,
  Temperature: 0.4,
  DO: 0.15,
  TDS: 10,
};

function initHistory(): Record<SensorName, MetricHistory> {
  const h: Partial<Record<SensorName, MetricHistory>> = {};
  for (const s of SENSORS) {
    const mh: Partial<MetricHistory> = {};
    for (const m of METRICS) {
      const base = BASE_VALUES[m] + (DRIFT[s][m] ?? 0);
      mh[m] = Array.from({ length: 60 }, () => base + (Math.random() - 0.5) * WALK_SCALE[m] * 3);
    }
    h[s] = mh as MetricHistory;
  }
  return h as Record<SensorName, MetricHistory>;
}

function buildSnapshot(history: MetricHistory, sensor: SensorName): SensorSnapshot {
  const snap: Partial<SensorSnapshot> = { timestamp: new Date() };
  for (const m of METRICS) {
    const arr = history[m];
    const value = arr[arr.length - 1];
    snap[m] = {
      value,
      status: getStatus(m, value),
      unit: UNITS[m],
      label: LABELS[m],
    };
  }
  return snap as SensorSnapshot;
}

export function useSensorData() {
  const historyRef = useRef<Record<SensorName, MetricHistory>>(initHistory());
  const [state, setState] = useState<SensorState>(() => {
    const h = historyRef.current;
    const readings: Partial<Record<SensorName, SensorSnapshot>> = {};
    for (const s of SENSORS) readings[s] = buildSnapshot(h[s], s);
    return {
      currentReadings: readings as Record<SensorName, SensorSnapshot>,
      history: h,
      anomalies: [],
      lastUpdated: new Date(),
      selectedSensor: null,
    };
  });

  const tick = useCallback(() => {
    const h = historyRef.current;
    const newAnomalies: AnomalyEvent[] = [];

    for (const s of SENSORS) {
      for (const m of METRICS) {
        const arr = h[s][m];
        const last = arr[arr.length - 1];
        const base = BASE_VALUES[m] + (DRIFT[s][m] ?? 0);
        let next = walk(last, base, WALK_SCALE[m]);
        next = maybeSpike(next, m);
        arr.push(next);
        if (arr.length > 60) arr.shift();
      }
    }

    setState((prev) => {
      const readings: Partial<Record<SensorName, SensorSnapshot>> = {};
      const addedAnomalies = [...prev.anomalies];

      for (const s of SENSORS) {
        readings[s] = buildSnapshot(h[s], s);
        for (const m of METRICS) {
          const arr = h[s][m];
          const anomaly = checkAnomaly(s, m, arr[arr.length - 1], addedAnomalies);
          if (anomaly) {
            addedAnomalies.push(anomaly);
            newAnomalies.push(anomaly);
          }
        }
      }

      return {
        ...prev,
        currentReadings: readings as Record<SensorName, SensorSnapshot>,
        history: { ...h },
        anomalies: addedAnomalies,
        lastUpdated: new Date(),
      };
    });
  }, []);

  useEffect(() => {
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [tick]);

  const acknowledgeAnomaly = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      anomalies: prev.anomalies.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    }));
  }, []);

  const setSelectedSensor = useCallback((sensor: SensorName | null) => {
    setState((prev) => ({ ...prev, selectedSensor: sensor }));
  }, []);

  return { ...state, acknowledgeAnomaly, setSelectedSensor };
}
