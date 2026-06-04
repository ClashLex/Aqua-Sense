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
      style={{ background: "var(--app-surface)", borderBottom: "3px solid var(--app-border)" }}
      data-testid="top-bar"
    >
      <h1
        className="font-extrabold leading-none text-xl"
        style={{ fontFamily: "var(--app-font-display)", color: "var(--app-text-1)" }}
        data-testid="page-title"
      >
        {title}
      </h1>

      <div className="flex items-center gap-3 sm:gap-4">
        {alertCount > 0 && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative cursor-pointer">
            <Bell className="w-4.5 h-4.5" style={{ color: "var(--app-text-1)" }} />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#dc2626] rounded-md text-[8px] text-white flex items-center justify-center font-extrabold border-2 border-black dark:border-white">
              {alertCount}
            </span>
          </motion.div>
        )}

        <span
          className="hidden sm:block text-xs font-bold tabular-nums"
          style={{ fontFamily: "var(--app-font-mono)", color: "var(--app-text-2)" }}
          data-testid="last-updated"
        >
          {timeStr}
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-all border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          style={{ background: "var(--app-surface-2)" }}
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
              ? <Sun  className="w-3.5 h-3.5 text-[#d97706]" />
              : <Moon className="w-3.5 h-3.5" style={{ color: "var(--app-text-2)" }} />
            }
          </motion.div>
        </button>

        {/* Live badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2"
          style={{
            background: isLive ? "#dcfce7" : "#fee2e2",
            borderColor: "var(--app-border)",
            boxShadow: "2px 2px 0px 0px var(--app-border)",
          }}
          data-testid="live-badge"
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full shrink-0 border border-black"
            style={{ backgroundColor: isLive ? "#16a34a" : "#dc2626" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider"
            style={{ color: isLive ? "#15803d" : "#b91c1c" }}
          >
            {isLive ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
