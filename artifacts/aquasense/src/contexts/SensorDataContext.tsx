import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MetricType, StatusType, getStatus } from "../utils/thresholds";
import { AnomalyEvent, checkAnomaly, resetConsecutiveCount } from "../utils/anomalyEngine";

// ─── Public types ────────────────────────────────────────────────────────────

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
  offline: boolean;
}

export type MetricHistory = Record<MetricType, number[]>;

export interface SensorDataContextValue {
  currentReadings: Record<SensorName, SensorSnapshot>;
  history: Record<SensorName, MetricHistory>;
  anomalies: AnomalyEvent[];
  lastUpdated: Date;
  selectedSensor: SensorName | null;
  rainEvent: { active: boolean; intensity: number };
  offlineSensor: SensorName | null;
  acknowledgeAnomaly: (id: string) => void;
  setSelectedSensor: (sensor: SensorName | null) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

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

// Sensor-specific baseline drifts
const BASELINE: Record<SensorName, Partial<Record<MetricType, number>>> = {
  "River Station A":      { pH: -0.15, Turbidity: 0.8 },
  "Treatment Plant B":    { TDS: 40, DO: 0.3 },
  "Distribution Point C": { Temperature: 1.2, pH: 0.1 },
};

// ─── Physics state (mutable, held in a ref) ──────────────────────────────────

interface AcidSpike {
  active: boolean;
  recovering: boolean;
  target: number;
  ticksLeft: number;
}

interface RainEvent {
  phase: "idle" | "building" | "peak" | "recovering";
  bonus: number;        // current turbidity bonus (NTU above baseline)
  peakBonus: number;    // target peak during this event
  ticksLeft: number;    // general countdown
  nextIn: number;       // ticks until next event (only used in idle)
}

interface OfflineState {
  sensor: SensorName | null;
  ticksLeft: number;
  nextCheckIn: number;
}

interface PhysicsState {
  values: Record<SensorName, Record<MetricType, number>>;
  pHVel: Record<SensorName, number>;
  acidSpike: Record<SensorName, AcidSpike>;
  rain: RainEvent;
  offline: OfflineState;
  consecutiveCounts: Record<string, number>;
}

function getBaseline(sensor: SensorName, metric: MetricType): number {
  const base: Record<MetricType, number> = {
    pH: 7.2, Turbidity: 2.5, Temperature: 20, DO: 8, TDS: 350,
  };
  return base[metric] + (BASELINE[sensor][metric] ?? 0);
}

function initPhysics(): PhysicsState {
  const values: Partial<Record<SensorName, Record<MetricType, number>>> = {};
  const pHVel: Partial<Record<SensorName, number>> = {};
  const acidSpike: Partial<Record<SensorName, AcidSpike>> = {};

  for (const s of SENSORS) {
    const v: Partial<Record<MetricType, number>> = {};
    for (const m of METRICS) v[m] = getBaseline(s, m);
    values[s] = v as Record<MetricType, number>;
    pHVel[s] = 0;
    acidSpike[s] = { active: false, recovering: false, target: 7, ticksLeft: 0 };
  }

  return {
    values: values as Record<SensorName, Record<MetricType, number>>,
    pHVel: pHVel as Record<SensorName, number>,
    acidSpike: acidSpike as Record<SensorName, AcidSpike>,
    rain: { phase: "idle", bonus: 0, peakBonus: 0, ticksLeft: 0, nextIn: 20 + Math.floor(Math.random() * 20) },
    offline: { sensor: null, ticksLeft: 0, nextCheckIn: 60 + Math.floor(Math.random() * 30) },
    consecutiveCounts: {},
  };
}

function initHistory(): Record<SensorName, MetricHistory> {
  const h: Partial<Record<SensorName, MetricHistory>> = {};
  const INIT_NOISE: Record<MetricType, number> = { pH: 0.05, Turbidity: 0.3, Temperature: 0.5, DO: 0.2, TDS: 15 };
  for (const s of SENSORS) {
    const mh: Partial<MetricHistory> = {};
    for (const m of METRICS) {
      const base = getBaseline(s, m);
      mh[m] = Array.from({ length: 60 }, () => base + (Math.random() - 0.5) * INIT_NOISE[m] * 2);
    }
    h[s] = mh as MetricHistory;
  }
  return h as Record<SensorName, MetricHistory>;
}

// ─── Per-tick physics update ─────────────────────────────────────────────────

function advanceRain(rain: RainEvent): void {
  switch (rain.phase) {
    case "idle":
      rain.nextIn--;
      if (rain.nextIn <= 0) {
        rain.phase = "building";
        rain.peakBonus = 7 + Math.random() * 10;  // 7–17 NTU spike
        rain.ticksLeft = 3 + Math.floor(Math.random() * 3); // 3-5 build ticks
      }
      break;

    case "building":
      // Ramp bonus toward peak
      rain.bonus += rain.peakBonus / (rain.ticksLeft + 1);
      rain.ticksLeft--;
      if (rain.ticksLeft <= 0) {
        rain.bonus = rain.peakBonus;
        rain.phase = "peak";
        rain.ticksLeft = 1 + Math.floor(Math.random() * 2);
      }
      break;

    case "peak":
      rain.ticksLeft--;
      if (rain.ticksLeft <= 0) {
        rain.phase = "recovering";
        rain.ticksLeft = 14 + Math.floor(Math.random() * 12); // 14-26 recovery ticks
      }
      break;

    case "recovering":
      rain.bonus *= 0.82; // exponential decay
      rain.ticksLeft--;
      if (rain.ticksLeft <= 0 || rain.bonus < 0.15) {
        rain.bonus = 0;
        rain.phase = "idle";
        rain.nextIn = 30 + Math.floor(Math.random() * 28);
      }
      break;
  }
}

function advanceOffline(offline: OfflineState): void {
  if (offline.sensor !== null) {
    offline.ticksLeft--;
    if (offline.ticksLeft <= 0) {
      offline.sensor = null;
    }
  } else {
    offline.nextCheckIn--;
    if (offline.nextCheckIn <= 0) {
      offline.nextCheckIn = 55 + Math.floor(Math.random() * 35);
      if (Math.random() < 0.28) {
        const idx = Math.floor(Math.random() * SENSORS.length);
        offline.sensor = SENSORS[idx];
        offline.ticksLeft = 6; // 30 seconds at 5s per tick
      }
    }
  }
}

function updateSensorPhysics(phys: PhysicsState, s: SensorName): void {
  if (phys.offline.sensor === s) return; // don't update offline sensor

  const v = phys.values[s];
  const drift = BASELINE[s];

  // ── pH: velocity-based slow drift ──────────────────────────────────────
  const pHBase = 7.2 + (drift.pH ?? 0);
  const spike = phys.acidSpike[s];

  if (!spike.active) {
    // Normal slow drift
    phys.pHVel[s] += (Math.random() - 0.5) * 0.012;
    phys.pHVel[s] *= 0.88; // strong damping → very slow drift
    phys.pHVel[s] = Math.max(-0.05, Math.min(0.05, phys.pHVel[s]));
    v.pH += phys.pHVel[s];
    v.pH = v.pH * 0.985 + pHBase * 0.015; // very gentle mean reversion

    // Trigger acid spike (0.4% chance per tick per sensor = ~every 20 minutes)
    if (Math.random() < 0.004) {
      spike.active = true;
      spike.recovering = false;
      spike.target = 4.9 + Math.random() * 0.7;  // 4.9–5.6
      spike.ticksLeft = 6 + Math.floor(Math.random() * 5);
    }
  } else if (!spike.recovering) {
    // Descending toward acid target
    phys.pHVel[s] = -0.07;
    v.pH += phys.pHVel[s];
    spike.ticksLeft--;
    if (v.pH <= spike.target || spike.ticksLeft <= 0) {
      spike.recovering = true;
      spike.ticksLeft = 10 + Math.floor(Math.random() * 8);
      phys.pHVel[s] = 0;
    }
  } else {
    // Recovering back toward baseline
    v.pH += (pHBase - v.pH) * 0.09;
    spike.ticksLeft--;
    if (spike.ticksLeft <= 0 || Math.abs(v.pH - pHBase) < 0.08) {
      spike.active = false;
      spike.recovering = false;
      phys.pHVel[s] = 0;
    }
  }
  v.pH = Math.max(3.5, Math.min(10.5, v.pH));

  // ── Temperature: slow random walk ──────────────────────────────────────
  const tempBase = 20 + (drift.Temperature ?? 0);
  v.Temperature += (Math.random() - 0.5) * 0.25;
  v.Temperature = v.Temperature * 0.975 + tempBase * 0.025;
  v.Temperature = Math.max(8, Math.min(40, v.Temperature));

  // ── DO: inversely correlated with temperature ──────────────────────────
  // Henry's law: DO saturation decreases ~0.2 mg/L per °C rise
  const doSetpoint = (8 + (drift.DO ?? 0)) - 0.20 * (v.Temperature - 20);
  v.DO += (Math.random() - 0.5) * 0.10;
  v.DO = v.DO * 0.88 + doSetpoint * 0.12; // stronger pull toward correlated setpoint
  v.DO = Math.max(0.5, Math.min(14, v.DO));

  // ── Turbidity: driven by rain event ────────────────────────────────────
  const turbBase = 2.5 + (drift.Turbidity ?? 0);
  // River station gets hit harder by rain
  const sensorRainMultiplier = s === "River Station A" ? 1.4 : s === "Treatment Plant B" ? 0.7 : 1.0;
  const turbTarget = turbBase + phys.rain.bonus * sensorRainMultiplier;

  v.Turbidity += (Math.random() - 0.5) * 0.18;
  if (phys.rain.phase !== "idle") {
    // During rain: fast reversion toward elevated target
    v.Turbidity = v.Turbidity * 0.55 + turbTarget * 0.45;
  } else {
    // Dry: slow reversion toward baseline
    v.Turbidity = v.Turbidity * 0.90 + turbBase * 0.10;
  }
  v.Turbidity = Math.max(0.1, v.Turbidity);

  // ── TDS: slow walk + positive correlation with rain ────────────────────
  const tdsBase = 350 + (drift.TDS ?? 0);
  const tdsPush = phys.rain.bonus * 22; // rain washes minerals into water
  v.TDS += (Math.random() - 0.5) * 7;
  v.TDS = v.TDS * 0.93 + (tdsBase + tdsPush) * 0.07;
  v.TDS = Math.max(50, Math.min(1800, v.TDS));
}

// ─── Snapshot builder ────────────────────────────────────────────────────────

function buildSnapshot(
  values: Record<MetricType, number>,
  offline: boolean
): SensorSnapshot {
  const snap: Partial<SensorSnapshot> = { timestamp: new Date(), offline };
  for (const m of METRICS) {
    const value = values[m];
    snap[m] = {
      value,
      status: offline ? "SAFE" : getStatus(m, value),
      unit: UNITS[m],
      label: LABELS[m],
    };
  }
  return snap as SensorSnapshot;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const SensorDataContext = createContext<SensorDataContextValue | null>(null);

export function SensorDataProvider({ children }: { children: React.ReactNode }) {
  const physRef = useRef<PhysicsState>(initPhysics());
  const historyRef = useRef<Record<SensorName, MetricHistory>>(initHistory());

  const [state, setState] = useState<Omit<SensorDataContextValue, "acknowledgeAnomaly" | "setSelectedSensor">>(() => {
    const p = physRef.current;
    const h = historyRef.current;
    const readings: Partial<Record<SensorName, SensorSnapshot>> = {};
    for (const s of SENSORS) {
      readings[s] = buildSnapshot(p.values[s], false);
    }
    return {
      currentReadings: readings as Record<SensorName, SensorSnapshot>,
      history: h,
      anomalies: [],
      lastUpdated: new Date(),
      selectedSensor: null,
      rainEvent: { active: false, intensity: 0 },
      offlineSensor: null,
    };
  });

  const tick = useCallback(() => {
    const phys = physRef.current;
    const h = historyRef.current;

    // 1. Advance global events
    advanceRain(phys.rain);
    advanceOffline(phys.offline);

    // 2. Update each sensor's physics
    for (const s of SENSORS) updateSensorPhysics(phys, s);

    // 3. Push to history
    for (const s of SENSORS) {
      if (phys.offline.sensor === s) continue;
      for (const m of METRICS) {
        h[s][m].push(phys.values[s][m]);
        if (h[s][m].length > 60) h[s][m].shift();
      }
    }

    // 4. Update React state
    setState((prev) => {
      const readings: Partial<Record<SensorName, SensorSnapshot>> = {};
      const anomalies = [...prev.anomalies];

      for (const s of SENSORS) {
        const isOffline = phys.offline.sensor === s;
        readings[s] = buildSnapshot(phys.values[s], isOffline);

        if (isOffline) {
          // Reset consecutive counts so no anomalies fire while offline
          for (const m of METRICS) resetConsecutiveCount(s, m, phys.consecutiveCounts);
        } else {
          // Check for anomalies
          for (const m of METRICS) {
            const anomaly = checkAnomaly(s, m, phys.values[s][m], anomalies, phys.consecutiveCounts);
            if (anomaly) anomalies.push(anomaly);
          }
        }
      }

      return {
        ...prev,
        currentReadings: readings as Record<SensorName, SensorSnapshot>,
        history: { ...h },
        anomalies,
        lastUpdated: new Date(),
        rainEvent: {
          active: phys.rain.phase !== "idle",
          intensity: phys.rain.bonus,
        },
        offlineSensor: phys.offline.sensor,
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

  return (
    <SensorDataContext.Provider value={{ ...state, acknowledgeAnomaly, setSelectedSensor }}>
      {children}
    </SensorDataContext.Provider>
  );
}

export function useSensorData(): SensorDataContextValue {
  const ctx = useContext(SensorDataContext);
  if (!ctx) throw new Error("useSensorData must be used inside <SensorDataProvider>");
  return ctx;
}
