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
            animate={{
              opacity: 1,
              y: 0,
              scaleY: 1,
              x: [0, -6, 6, -3, 3, 0],
            }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{
              opacity: { duration: 0.25 },
              y: { duration: 0.25 },
              scaleY: { duration: 0.25 },
              x: { duration: 0.45, delay: 0.25 },
            }}
            className="relative overflow-hidden rounded-xl px-4 py-3 border flex items-center gap-3 bg-[#fef2f2]"
            style={{ borderColor: "#fca5a5" }}
            data-testid={`anomaly-banner-${anomaly.id}`}
          >
            <AlertTriangle className="w-5 h-5 text-[#dc2626] shrink-0" />

            <div className="flex-1 min-w-0">
              <span className="text-[#dc2626] text-xs font-semibold">
                Anomaly detected
              </span>
              <span className="text-[#374151] text-xs ml-2">
                {anomaly.threshold} at {anomaly.sensor}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]"
              >
                {anomaly.severity}
              </span>
              <button
                onClick={() => onDismiss(anomaly.id)}
                className="text-[#94a3b8] hover:text-[#374151] transition-colors p-0.5"
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
