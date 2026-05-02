import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Shield, Clock } from "lucide-react";
import { useSensorData } from "../hooks/useSensorData";
import { THRESHOLDS, MetricType } from "../utils/thresholds";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];
const METRIC_UNITS: Record<MetricType, string> = {
  pH: "", Turbidity: " NTU", Temperature: "°C", DO: " mg/L", TDS: " ppm",
};

const SEV_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: "#dc2626", bg: "rgba(220, 38, 38, 0.09)",  border: "rgba(220, 38, 38, 0.28)" },
  HIGH:     { text: "#ea580c", bg: "rgba(234, 88, 12, 0.09)",  border: "rgba(234, 88, 12, 0.28)" },
  MEDIUM:   { text: "#d97706", bg: "rgba(217, 119, 6, 0.09)",  border: "rgba(217, 119, 6, 0.28)" },
  LOW:      { text: "#16a34a", bg: "rgba(22, 163, 74, 0.09)",  border: "rgba(22, 163, 74, 0.28)" },
};

export function Alerts() {
  const { anomalies, acknowledgeAnomaly } = useSensorData();
  const [tab, setTab] = useState<"active" | "rules" | "log">("active");

  const active = anomalies.filter((a) => !a.resolved);
  const resolved = anomalies.filter((a) => a.resolved);

  return (
    <div className="space-y-4" data-testid="alerts-page">
      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid var(--app-border)" }}>
        {(["active", "rules", "log"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-3 px-4 text-sm font-medium transition-colors relative"
            style={{ color: tab === t ? "#2563eb" : "var(--app-text-2)" }}
            data-testid={`alerts-tab-${t}`}
          >
            {t === "active" && active.length > 0 && (
              <span className="mr-1.5 bg-[#dc2626] text-white text-[9px] rounded-full px-1.5 leading-5 inline-block">{active.length}</span>
            )}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {tab === t && (
              <motion.div
                layoutId="alert-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Active Alerts */}
      {tab === "active" && (
        <div className="space-y-3" data-testid="active-alerts">
          {active.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border p-8 text-center"
              style={{
                background:  "rgba(22, 163, 74, 0.07)",
                borderColor: "rgba(22, 163, 74, 0.25)",
              }}
            >
              <Shield className="w-8 h-8 text-[#16a34a] mx-auto mb-2" />
              <p className="text-[#16a34a] font-semibold text-sm">All Systems Nominal</p>
              <p className="text-xs mt-1" style={{ color: "var(--app-text-2)" }}>No active alerts</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {active.map((alert, i) => {
                const sev = SEV_COLORS[alert.severity] ?? SEV_COLORS.MEDIUM;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border p-4"
                    style={{
                      background: "var(--app-surface)",
                      borderColor: sev.border,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      borderLeft: `3px solid ${sev.text}`,
                    }}
                    data-testid={`alert-card-${alert.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: sev.text, background: sev.bg, border: `1px solid ${sev.border}` }}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-xs" style={{ color: "var(--app-text-2)" }}>{alert.sensor}</span>
                          <span className="text-xs ml-auto flex items-center gap-1" style={{ color: "var(--app-text-3)" }}>
                            <Clock className="w-3 h-3" />
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>{alert.threshold}</p>
                        <p className="text-xs mt-0.5" style={{ fontFamily: "var(--app-font-mono)", color: "var(--app-text-2)" }}>
                          Value: <span style={{ color: sev.text }}>{alert.value.toFixed(2)}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => acknowledgeAnomaly(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:bg-[#f0fdf4]"
                        style={{ borderColor: "#bbf7d0", color: "#16a34a" }}
                        data-testid={`acknowledge-alert-${alert.id}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Alert Rules */}
      {tab === "rules" && (
        <div className="space-y-3" data-testid="alert-rules">
          <p className="text-sm" style={{ color: "var(--app-text-2)" }}>Configured thresholds for the anomaly detection engine.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {METRICS.map((metric, i) => {
              const t = THRESHOLDS[metric];
              return (
                <motion.div
                  key={metric}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border p-4"
                  style={{
                    background: "var(--app-surface)",
                    borderColor: "var(--app-border)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                  data-testid={`rule-card-${metric.toLowerCase()}`}
                >
                  <span className="text-[#2563eb] text-sm font-semibold block mb-3">
                    {metric}{METRIC_UNITS[metric]}
                  </span>
                  <div className="space-y-1.5">
                    {t.minDanger !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-xs" style={{ color: "var(--app-text-2)" }}>Min Danger</span>
                        <span className="text-xs font-mono text-[#dc2626]">&lt; {t.minDanger}</span>
                      </div>
                    )}
                    {t.minWarning !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-xs" style={{ color: "var(--app-text-2)" }}>Min Warning</span>
                        <span className="text-xs font-mono text-[#d97706]">&lt; {t.minWarning}</span>
                      </div>
                    )}
                    {t.maxWarning !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-xs" style={{ color: "var(--app-text-2)" }}>Max Warning</span>
                        <span className="text-xs font-mono text-[#d97706]">&gt; {t.maxWarning}</span>
                      </div>
                    )}
                    {t.maxDanger !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-xs" style={{ color: "var(--app-text-2)" }}>Max Danger</span>
                        <span className="text-xs font-mono text-[#dc2626]">&gt; {t.maxDanger}</span>
                      </div>
                    )}
                    <div
                      className="flex justify-between mt-2 pt-2"
                      style={{ borderTop: "1px solid var(--app-border-subtle)" }}
                    >
                      <span className="text-xs" style={{ color: "var(--app-text-2)" }}>Trigger</span>
                      <span className="text-xs font-mono text-[#16a34a]">3+ readings</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log */}
      {tab === "log" && (
        <div className="space-y-2" data-testid="notification-log">
          {anomalies.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--app-text-3)" }}>No alerts logged yet</p>
          ) : (
            [...anomalies].reverse().map((alert, i) => {
              const sev = SEV_COLORS[alert.severity] ?? SEV_COLORS.MEDIUM;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3 py-3 px-4 rounded-lg border"
                  style={{
                    background: "var(--app-surface)",
                    borderColor: "var(--app-border-subtle)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                  data-testid={`log-entry-${alert.id}`}
                >
                  <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: sev.text }} />
                  <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: sev.text }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: "var(--app-text-1)" }}>{alert.threshold}</p>
                    <p className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--app-text-3)" }}>
                      {alert.sensor} · {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold shrink-0 ${alert.resolved ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                    {alert.resolved ? "Resolved" : "Active"}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
