import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, AlertOctagon, Check,
  CheckCircle2, Clock, FlaskConical, Waves, Thermometer,
  Wind, Filter, ChevronDown, ChevronUp,
} from "lucide-react";
import { useSensorData } from "../hooks/useSensorData";
import { THRESHOLDS, MetricType } from "../utils/thresholds";
import { useTheme } from "../contexts/ThemeContext";

// ── Constants ─────────────────────────────────────────────────────────────────

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

const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#2563eb", Turbidity: "#0d9488", Temperature: "#f59e0b", DO: "#f43f5e", TDS: "#7c3aed",
};

const SEV: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  CRITICAL: { text: "#dc2626", bg: "rgba(220,38,38,0.09)",  border: "rgba(220,38,38,0.25)", bar: "#dc2626" },
  HIGH:     { text: "#ea580c", bg: "rgba(234,88,12,0.09)",  border: "rgba(234,88,12,0.25)", bar: "#ea580c" },
  MEDIUM:   { text: "#d97706", bg: "rgba(217,119,6,0.09)",  border: "rgba(217,119,6,0.25)", bar: "#d97706" },
  LOW:      { text: "#16a34a", bg: "rgba(22,163,74,0.09)",  border: "rgba(22,163,74,0.25)", bar: "#16a34a" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function thresholdLimit(metric: MetricType, value: number): string {
  const t = THRESHOLDS[metric];
  const u = METRIC_UNITS[metric];
  if (t.minDanger  !== undefined && value < t.minDanger)  return `limit ≥ ${t.minDanger}${u}`;
  if (t.maxDanger  !== undefined && value > t.maxDanger)  return `limit ≤ ${t.maxDanger}${u}`;
  if (t.minWarning !== undefined && value < t.minWarning) return `limit ≥ ${t.minWarning}${u}`;
  if (t.maxWarning !== undefined && value > t.maxWarning) return `limit ≤ ${t.maxWarning}${u}`;
  return "";
}

// ── Summary chip ──────────────────────────────────────────────────────────────

function SummaryChip({
  icon: Icon, label, count, color,
}: { icon: React.ElementType; label: string; count: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl flex-1 min-w-[120px]"
      style={{
        background:  `${color}09`,
        border:      `1px solid ${color}28`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}28` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold leading-none tabular-nums" style={{ color, fontFamily: "DM Mono, monospace" }}>
          {count}
        </p>
        <p className="text-[10px] font-semibold mt-0.5 uppercase tracking-wider" style={{ color: `${color}bb` }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title, count, color = "#0f172a", action,
}: { title: string; count: number; color?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-bold" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
        {title}
      </h2>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
        style={{
          color,
          background: `${color}12`,
          border:     `1px solid ${color}28`,
          fontFamily: "DM Mono, monospace",
        }}
      >
        {count}
      </span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onAcknowledge,
  acknowledged,
}: {
  alert: {
    id: string;
    sensor: string;
    metric: MetricType;
    value: number;
    threshold: string;
    severity: string;
    timestamp: Date;
    resolved: boolean;
  };
  onAcknowledge?: () => void;
  acknowledged: boolean;
}) {
  const sev      = SEV[alert.severity] ?? SEV.MEDIUM;
  const MetIcon  = METRIC_ICONS[alert.metric];
  const mColor   = METRIC_COLORS[alert.metric];
  const limit    = thresholdLimit(alert.metric, alert.value);
  const isDone   = alert.resolved || acknowledged;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isDone ? 0.6 : 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-xl border relative overflow-hidden"
      style={{
        background:   "var(--app-surface)",
        borderColor:  "var(--app-border)",
        borderLeft:   `4px solid ${isDone ? "#94a3b8" : sev.bar}`,
        boxShadow:    "0 1px 4px rgba(0,0,0,0.05)",
      }}
      data-testid={`alert-card-${alert.id}`}
    >
      <div className="px-5 py-4">
        {/* Top row: metric + sensor + severity badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Metric icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${mColor}12`, border: `1px solid ${mColor}24` }}
            >
              <MetIcon className="w-4 h-4" style={{ color: mColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--app-text-1)" }}>
                {METRIC_LABELS[alert.metric]}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                {alert.sensor}
              </p>
            </div>
          </div>

          {/* Severity badge — top right */}
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{
              color:      isDone ? "#64748b" : sev.text,
              background: isDone ? "rgba(100,116,139,0.09)" : sev.bg,
              border:     `1px solid ${isDone ? "rgba(100,116,139,0.25)" : sev.border}`,
            }}
          >
            {isDone ? "RESOLVED" : alert.severity}
          </span>
        </div>

        {/* Value vs threshold row */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg mb-3"
          style={{ background: isDone ? "rgba(100,116,139,0.06)" : `${sev.text}06`, border: `1px solid ${isDone ? "rgba(100,116,139,0.12)" : sev.border}` }}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-medium" style={{ color: "var(--app-text-3)" }}>Reading</span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: isDone ? "#64748b" : sev.text, fontFamily: "DM Mono, monospace" }}
            >
              {alert.value.toFixed(alert.metric === "TDS" ? 0 : 2)}{METRIC_UNITS[alert.metric]}
            </span>
          </div>
          {limit && (
            <>
              <span style={{ color: "var(--app-border)", fontSize: 14 }}>·</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-medium" style={{ color: "var(--app-text-3)" }}>Threshold</span>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--app-text-2)", fontFamily: "DM Mono, monospace" }}>
                  {limit}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bottom row: time + acknowledge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" style={{ color: "var(--app-text-3)" }}>
            <Clock className="w-3 h-3" />
            <span className="text-[11px]" style={{ fontFamily: "DM Mono, monospace" }}>
              {relativeTime(alert.timestamp)}
            </span>
            <span className="text-[11px]">·</span>
            <span className="text-[11px]" style={{ fontFamily: "DM Mono, monospace" }}>
              {alert.timestamp.toLocaleTimeString()}
            </span>
          </div>

          {!isDone && onAcknowledge ? (
            <button
              onClick={onAcknowledge}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
              style={{
                borderColor: "var(--app-border)",
                color:       "var(--app-text-2)",
                background:  "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#16a34a";
                (e.currentTarget as HTMLButtonElement).style.color       = "#16a34a";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--app-border)";
                (e.currentTarget as HTMLButtonElement).style.color       = "var(--app-text-2)";
              }}
              data-testid={`acknowledge-alert-${alert.id}`}
            >
              <Check className="w-3 h-3" />
              Acknowledge
            </button>
          ) : isDone ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
              style={{ borderColor: "rgba(100,116,139,0.20)", color: "#94a3b8", background: "rgba(100,116,139,0.06)" }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Acknowledged
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ── Rules panel ───────────────────────────────────────────────────────────────

function RulesPanel() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
      {METRICS.map((metric, i) => {
        const t = THRESHOLDS[metric];
        const color = METRIC_COLORS[metric];
        const Icon  = METRIC_ICONS[metric];
        return (
          <motion.div
            key={metric}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border p-4"
            style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            data-testid={`rule-card-${metric.toLowerCase()}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}24` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <span className="text-sm font-semibold" style={{ color }}>
                {METRIC_LABELS[metric]}
              </span>
              <span className="text-[10px] ml-auto" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono" }}>
                {METRIC_UNITS[metric] || "unitless"}
              </span>
            </div>
            <div className="space-y-2">
              {t.minDanger !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px]" style={{ color: "var(--app-text-2)" }}>Min Danger</span>
                  <span className="text-[11px] font-bold" style={{ color: "#dc2626", fontFamily: "DM Mono" }}>&lt; {t.minDanger}</span>
                </div>
              )}
              {t.minWarning !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px]" style={{ color: "var(--app-text-2)" }}>Min Warning</span>
                  <span className="text-[11px] font-bold" style={{ color: "#d97706", fontFamily: "DM Mono" }}>&lt; {t.minWarning}</span>
                </div>
              )}
              {t.maxWarning !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px]" style={{ color: "var(--app-text-2)" }}>Max Warning</span>
                  <span className="text-[11px] font-bold" style={{ color: "#d97706", fontFamily: "DM Mono" }}>&gt; {t.maxWarning}</span>
                </div>
              )}
              {t.maxDanger !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px]" style={{ color: "var(--app-text-2)" }}>Max Danger</span>
                  <span className="text-[11px] font-bold" style={{ color: "#dc2626", fontFamily: "DM Mono" }}>&gt; {t.maxDanger}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid var(--app-border-subtle)" }}>
                <span className="text-[10px]" style={{ color: "var(--app-text-3)" }}>Trigger after</span>
                <span className="text-[10px] font-semibold" style={{ color: "#16a34a", fontFamily: "DM Mono" }}>3 consecutive readings</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Alerts() {
  const { anomalies, acknowledgeAnomaly } = useSensorData();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [localAcked, setLocalAcked] = useState<Set<string>>(new Set());
  const [showRules, setShowRules] = useState(false);

  const active   = anomalies.filter((a) => !a.resolved);
  const resolved = anomalies.filter((a) => a.resolved);

  const critCount = active.filter((a) => a.severity === "CRITICAL").length;
  const warnCount = active.filter((a) => a.severity === "HIGH" || a.severity === "MEDIUM").length;

  function handleAck(id: string) {
    setLocalAcked((prev) => new Set(prev).add(id));
    acknowledgeAnomaly(id);
  }

  return (
    <div className="space-y-6" data-testid="alerts-page">

      {/* ── Summary bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <SummaryChip icon={AlertOctagon} label="Critical"  count={critCount}        color="#dc2626" />
        <SummaryChip icon={AlertTriangle} label="Warning"  count={warnCount}        color="#d97706" />
        <SummaryChip icon={CheckCircle2}  label="Resolved" count={resolved.length}  color="#16a34a" />
      </div>

      {/* ── Active Alerts section ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Active Alerts"
          count={active.length}
          color={active.length > 0 ? "#dc2626" : "#16a34a"}
        />

        <AnimatePresence mode="popLayout">
          {active.length === 0 ? (
            <motion.div
              key="empty-active"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border py-14 px-8 flex flex-col items-center gap-4"
              style={{
                background:  isDark ? "rgba(22,163,74,0.06)" : "rgba(22,163,74,0.04)",
                borderColor: "rgba(22,163,74,0.20)",
              }}
              data-testid="empty-active-alerts"
            >
              {/* Minimal illustration */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(22,163,74,0.12)", border: "2px solid rgba(22,163,74,0.25)" }}
                >
                  <ShieldCheck className="w-8 h-8 text-[#16a34a]" strokeWidth={1.5} />
                </div>
                {/* Decorative rings */}
                <div
                  className="absolute -inset-2 rounded-2xl"
                  style={{ border: "1px solid rgba(22,163,74,0.12)" }}
                />
                <div
                  className="absolute -inset-4 rounded-3xl"
                  style={{ border: "1px solid rgba(22,163,74,0.07)" }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#16a34a]">All clear — no active alerts</p>
                <p className="text-xs mt-1.5" style={{ color: "var(--app-text-3)" }}>
                  All sensors are reading within safe thresholds
                </p>
              </div>
            </motion.div>
          ) : (
            active.map((alert, i) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAck(alert.id)}
                acknowledged={localAcked.has(alert.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ── Resolved Today section ────────────────────────────────────────── */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Resolved Today"
            count={resolved.length}
            color="#16a34a"
          />
          <AnimatePresence>
            {[...resolved].reverse().map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                acknowledged={true}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Alert Rules (collapsible) ─────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <button
          onClick={() => setShowRules((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 transition-colors"
          style={{ color: "var(--app-text-1)" }}
          data-testid="toggle-rules-btn"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.20)" }}>
              <AlertTriangle className="w-3 h-3 text-[#2563eb]" />
            </div>
            <span className="text-sm font-semibold" style={{ fontFamily: "var(--app-font-display)" }}>Detection Rules</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: "#2563eb", background: "rgba(37,99,235,0.09)", border: "1px solid rgba(37,99,235,0.22)", fontFamily: "DM Mono" }}
            >
              {METRICS.length}
            </span>
          </div>
          {showRules
            ? <ChevronUp   className="w-4 h-4" style={{ color: "var(--app-text-3)" }} />
            : <ChevronDown className="w-4 h-4" style={{ color: "var(--app-text-3)" }} />
          }
        </button>

        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ overflow: "hidden", borderTop: "1px solid var(--app-border)" }}
            >
              <div className="p-5">
                <RulesPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
