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
            initial={{ opacity: 0, y: -20, scaleY: 0.8 }}
            animate={{
              opacity: 1,
              y: 0,
              scaleY: 1,
              x: [0, -8, 8, -4, 4, 0],
            }}
            exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 0.3 },
              scaleY: { duration: 0.3 },
              x: { duration: 0.5, delay: 0.3 },
            }}
            className="relative overflow-hidden rounded-xl px-4 py-3 border flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, rgba(255,45,85,0.15) 0%, rgba(13,31,60,0.9) 100%)",
              borderColor: "rgba(255,45,85,0.6)",
              boxShadow: "0 0 20px rgba(255,45,85,0.3), inset 0 0 20px rgba(255,45,85,0.05)",
            }}
            data-testid={`anomaly-banner-${anomaly.id}`}
          >
            {/* Pulsing background */}
            <motion.div
              className="absolute inset-0 rounded-xl"
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ background: "rgba(255,45,85,0.3)" }}
            />

            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <AlertTriangle className="w-5 h-5 text-[#ff2d55] shrink-0" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <span className="text-[#ff2d55] text-xs font-mono tracking-widest font-bold">
                ANOMALY DETECTED
              </span>
              <span className="text-[#e2e8f0] text-xs font-mono ml-2">
                {anomaly.threshold} at {anomaly.sensor}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full border"
                style={{
                  color: "#ff2d55",
                  borderColor: "rgba(255,45,85,0.5)",
                  background: "rgba(255,45,85,0.1)",
                }}
              >
                {anomaly.severity}
              </span>
              <button
                onClick={() => onDismiss(anomaly.id)}
                className="text-[#64748b] hover:text-[#e2e8f0] transition-colors p-1"
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
