import { motion } from "framer-motion";
import { Bell } from "lucide-react";

interface TopBarProps {
  title: string;
  lastUpdated: Date;
  isLive: boolean;
  alertCount: number;
}

export function TopBar({ title, lastUpdated, isLive, alertCount }: TopBarProps) {
  const timeStr = lastUpdated.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header
      className="sticky top-0 z-30 h-16 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{ borderBottom: "1px solid #e2e8f0" }}
      data-testid="top-bar"
    >
      {/* Page title */}
      <h1
        className="text-xl font-bold text-[#0f172a] leading-none"
        style={{ fontFamily: "var(--app-font-display)" }}
        data-testid="page-title"
      >
        {title}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Alert bell — shown only when there are active alerts */}
        {alertCount > 0 && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <Bell className="w-4 h-4 text-[#64748b]" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#dc2626] rounded-full text-[8px] text-white flex items-center justify-center font-bold">
              {alertCount}
            </span>
          </motion.div>
        )}

        {/* Last updated */}
        <span
          className="hidden sm:block text-xs text-[#94a3b8] tabular-nums"
          style={{ fontFamily: "var(--app-font-mono)" }}
          data-testid="last-updated"
        >
          {timeStr}
        </span>

        {/* Live badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: isLive ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${isLive ? "#bbf7d0" : "#fca5a5"}`,
          }}
          data-testid="live-badge"
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: isLive ? "#16a34a" : "#dc2626" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span
            className="text-[11px] font-semibold"
            style={{ color: isLive ? "#16a34a" : "#dc2626" }}
          >
            {isLive ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
