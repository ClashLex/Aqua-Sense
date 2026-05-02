import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Shield, Clock } from "lucide-react";
import { useSensorData } from "../hooks/useSensorData";
import { THRESHOLDS, MetricType } from "../utils/thresholds";
import { AnomalyEvent } from "../utils/anomalyEngine";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];
const METRIC_UNITS: Record<MetricType, string> = {
  pH: "", Turbidity: " NTU", Temperature: "°C", DO: " mg/L", TDS: " ppm",
};

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#ff2d55",
  HIGH: "#ff6b35",
  MEDIUM: "#ffaa00",
  LOW: "#39ff14",
};

export function Alerts() {
  const { anomalies, acknowledgeAnomaly } = useSensorData();
  const [tab, setTab] = useState<"active" | "rules" | "log">("active");

  const active = anomalies.filter((a) => !a.resolved);
  const resolved = anomalies.filter((a) => a.resolved);

  return (
    <div className="space-y-4" data-testid="alerts-page">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[rgba(0,245,255,0.1)] pb-0">
        {(["active", "rules", "log"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-3 px-4 text-xs font-mono tracking-widest uppercase transition-all relative"
            style={{ color: tab === t ? "#00f5ff" : "#64748b" }}
            data-testid={`alerts-tab-${t}`}
          >
            {t === "active" && active.length > 0 && (
              <span className="mr-1.5 bg-[#ff2d55] text-white text-[9px] rounded-full px-1.5">{active.length}</span>
            )}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {tab === t && (
              <motion.div
                layoutId="alert-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5ff]"
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
              className="rounded-xl border border-[rgba(57,255,20,0.2)] bg-[rgba(57,255,20,0.05)] p-8 text-center"
            >
              <Shield className="w-8 h-8 text-[#39ff14] mx-auto mb-2" />
              <p className="text-[#39ff14] font-mono text-sm tracking-widest">ALL SYSTEMS NOMINAL</p>
              <p className="text-[#64748b] font-mono text-xs mt-1">No active alerts</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {active.map((alert, i) => {
                const color = SEV_COLORS[alert.severity] ?? "#ffaa00";
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border p-4"
                    style={{
                      background: `linear-gradient(135deg, ${color}08 0%, #0d1f3c 100%)`,
                      borderColor: `${color}30`,
                    }}
                    data-testid={`alert-card-${alert.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full"
                            style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-[#64748b] text-[10px] font-mono">{alert.sensor}</span>
                          <span className="text-[#64748b] text-[10px] font-mono ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[#e2e8f0] text-sm font-mono">{alert.threshold}</p>
                        <p className="text-[#64748b] text-xs font-mono mt-1">
                          Current: <span style={{ color }}>{alert.value.toFixed(2)}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => acknowledgeAnomaly(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono tracking-wider transition-all hover:bg-[rgba(57,255,20,0.1)]"
                        style={{ borderColor: "rgba(57,255,20,0.3)", color: "#39ff14" }}
                        data-testid={`acknowledge-alert-${alert.id}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        ACK
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
          <p className="text-[#64748b] text-xs font-mono tracking-wider">Configured thresholds for anomaly detection engine</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {METRICS.map((metric, i) => {
              const t = THRESHOLDS[metric];
              return (
                <motion.div
                  key={metric}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border p-4"
                  style={{ background: "#0d1f3c", borderColor: "rgba(0,245,255,0.12)" }}
                  data-testid={`rule-card-${metric.toLowerCase()}`}
                >
                  <span className="text-[#00f5ff] text-xs font-mono font-bold tracking-widest uppercase block mb-3">
                    {metric}{METRIC_UNITS[metric]}
                  </span>
                  <div className="space-y-1.5">
                    {t.minDanger !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b] text-[10px] font-mono">Min Danger</span>
                        <span className="text-[#ff2d55] text-[10px] font-mono">&lt; {t.minDanger}</span>
                      </div>
                    )}
                    {t.minWarning !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b] text-[10px] font-mono">Min Warning</span>
                        <span className="text-[#ffaa00] text-[10px] font-mono">&lt; {t.minWarning}</span>
                      </div>
                    )}
                    {t.maxWarning !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b] text-[10px] font-mono">Max Warning</span>
                        <span className="text-[#ffaa00] text-[10px] font-mono">&gt; {t.maxWarning}</span>
                      </div>
                    )}
                    {t.maxDanger !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b] text-[10px] font-mono">Max Danger</span>
                        <span className="text-[#ff2d55] text-[10px] font-mono">&gt; {t.maxDanger}</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                      <span className="text-[#64748b] text-[10px] font-mono">Trigger</span>
                      <span className="text-[#39ff14] text-[10px] font-mono">3+ readings</span>
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
            <p className="text-[#64748b] font-mono text-xs text-center py-8">No alerts logged yet</p>
          ) : (
            [...anomalies].reverse().map((alert, i) => {
              const color = SEV_COLORS[alert.severity] ?? "#ffaa00";
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 py-3 px-4 rounded-lg border"
                  style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                  data-testid={`log-entry-${alert.id}`}
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e2e8f0] text-xs font-mono">{alert.threshold}</p>
                    <p className="text-[#64748b] text-[10px] font-mono mt-0.5">{alert.sensor} · {alert.timestamp.toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] font-mono tracking-wider shrink-0 ${alert.resolved ? "text-[#39ff14]" : "text-[#ff2d55]"}`}>
                    {alert.resolved ? "RESOLVED" : "ACTIVE"}
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
