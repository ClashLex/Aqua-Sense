import { motion } from "framer-motion";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface TopBarProps {
  title: string;
  lastUpdated: Date;
  isLive: boolean;
  alertCount: number;
}

export function TopBar({ title, lastUpdated, isLive, alertCount }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  const timeStr = lastUpdated.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{ background: "var(--app-surface)", borderBottom: "1px solid var(--app-border)" }}
      data-testid="top-bar"
    >
      {/* Page title */}
      <h1
        className="text-xl font-bold leading-none"
        style={{ fontFamily: "var(--app-font-display)", color: "var(--app-text-1)" }}
        data-testid="page-title"
      >
        {title}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Alert bell */}
        {alertCount > 0 && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative">
            <Bell className="w-4 h-4" style={{ color: "var(--app-text-2)" }} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#dc2626] rounded-full text-[8px] text-white flex items-center justify-center font-bold">
              {alertCount}
            </span>
          </motion.div>
        )}

        {/* Last updated */}
        <span
          className="hidden sm:block text-xs tabular-nums"
          style={{ fontFamily: "var(--app-font-mono)", color: "var(--app-text-3)" }}
          data-testid="last-updated"
        >
          {timeStr}
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)" }}
          data-testid="theme-toggle"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <motion.div
            key={theme}
            initial={{ scale: 0.7, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.18 }}
          >
            {theme === "dark"
              ? <Sun className="w-3.5 h-3.5 text-[#d97706]" />
              : <Moon className="w-3.5 h-3.5" style={{ color: "var(--app-text-2)" }} />
            }
          </motion.div>
        </button>

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
