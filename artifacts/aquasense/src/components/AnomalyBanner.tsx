import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { AnomalyEvent } from "../utils/anomalyEngine";

interface AnomalyBannerProps {
  anomalies: AnomalyEvent[];
  onDismiss: (id: string) => void;
}

export function AnomalyBanner({ anomalies, onDismiss }: AnomalyBannerProps) {
  const active = anomalies.filter((a) => !a.resolved);

  return (
    <div className="space-y-2" data-testid="anomaly-banners">
      <AnimatePresence>
        {active.slice(0, 3).map((anomaly) => (
          <motion.div
            key={anomaly.id}
            initial={{ opacity: 0, y: -12, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1, x: [0, -6, 6, -3, 3, 0] }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{
              opacity: { duration: 0.25 },
              y:       { duration: 0.25 },
              scaleY:  { duration: 0.25 },
              x:       { duration: 0.45, delay: 0.25 },
            }}
            className="relative overflow-hidden rounded-md px-4 py-3 border-[3px] border-black dark:border-white flex items-center gap-3 shadow-[3px_3px_0px_0px_#dc2626]"
            style={{
              background:   "var(--app-surface)",
            }}
            data-testid={`anomaly-banner-${anomaly.id}`}
          >
            <AlertTriangle className="w-5 h-5 text-[#dc2626] shrink-0" />

            <div className="flex-1 min-w-0">
              <span className="text-[#dc2626] text-xs font-extrabold uppercase tracking-wide">Anomaly detected</span>
              <span className="text-xs ml-2 font-bold" style={{ color: "var(--app-text-1)" }}>
                {anomaly.threshold} at {anomaly.sensor}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border-2 border-black dark:border-white"
                style={{
                  color:      "#b91c1c",
                  background: "#fee2e2",
                }}
              >
                {anomaly.severity}
              </span>
              <button
                onClick={() => onDismiss(anomaly.id)}
                className="transition-colors p-0.5"
                style={{ color: "var(--app-text-3)" }}
                data-testid={`dismiss-anomaly-${anomaly.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
