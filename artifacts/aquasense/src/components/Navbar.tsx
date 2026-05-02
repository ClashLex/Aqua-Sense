import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, BarChart2, Bell, Bot, Menu, X, Droplets } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Alerts", path: "/alerts", icon: Bell },
  { label: "Assistant", path: "/assistant", icon: Bot },
];

interface NavbarProps {
  isLive: boolean;
  lastUpdated: Date;
  alertCount: number;
}

export function Navbar({ isLive, alertCount }: NavbarProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[rgba(0,245,255,0.15)] bg-[#020817]/95 backdrop-blur-sm flex items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="nav-logo">
          <Droplets className="w-5 h-5 text-[#00f5ff]" />
          <span
            style={{ fontFamily: "var(--app-font-display)" }}
            className="text-[#00f5ff] font-bold text-sm tracking-widest uppercase"
          >
            AquaSense
          </span>
          <span
            style={{ fontFamily: "var(--app-font-display)" }}
            className="text-[rgba(0,245,255,0.5)] text-xs tracking-widest"
          >
            2.0
          </span>
        </Link>

        {/* Desktop nav — uses layoutId underline for smooth slide */}
        <div className="hidden md:flex items-center gap-1 flex-1 ml-4">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = path === "/" ? location === path : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                data-testid={`nav-link-${label.toLowerCase()}`}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono tracking-wider uppercase transition-colors ${
                  active
                    ? "text-[#00f5ff] bg-[rgba(0,245,255,0.07)]"
                    : "text-[#64748b] hover:text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {label === "Alerts" && alertCount > 0 && (
                  <span className="bg-[#ff2d55] text-white text-[10px] rounded-full px-1.5 min-w-[18px] text-center">
                    {alertCount}
                  </span>
                )}
                {/* Glowing underline indicator — slides between tabs via layoutId */}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{
                      background: "#00f5ff",
                      boxShadow: "0 0 8px #00f5ff, 0 0 18px rgba(0,245,255,0.55)",
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2" data-testid="status-indicator">
            {isLive ? (
              <>
                <motion.span
                  className="w-2 h-2 rounded-full bg-[#39ff14]"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span className="text-[#39ff14] text-xs font-mono tracking-widest">LIVE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#ff2d55]" />
                <span className="text-[#ff2d55] text-xs font-mono">OFFLINE</span>
              </>
            )}
          </div>
          <span
            className="hidden sm:block text-[#64748b] text-xs font-mono tabular-nums"
            data-testid="live-clock"
          >
            {timeStr}
          </span>
          <button
            className="md:hidden text-[#64748b] hover:text-[#e2e8f0] p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 z-40 bg-[#020817]/98 border-b border-[rgba(0,245,255,0.15)] p-4 flex flex-col gap-2 md:hidden"
          >
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const active = path === "/" ? location === path : location.startsWith(path);
              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm font-mono tracking-wider uppercase relative overflow-hidden ${
                    active
                      ? "text-[#00f5ff] bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.25)]"
                      : "text-[#64748b] hover:text-[#e2e8f0]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {label === "Alerts" && alertCount > 0 && (
                    <span className="ml-auto bg-[#ff2d55] text-white text-[9px] rounded-full px-1.5">
                      {alertCount}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[#00f5ff]"
                      style={{ boxShadow: "0 0 8px #00f5ff" }}
                    />
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#020817]/95 backdrop-blur-sm border-t border-[rgba(0,245,255,0.15)] flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = path === "/" ? location === path : location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-[#00f5ff]" : "text-[#475569] hover:text-[#94a3b8]"
              }`}
              data-testid={`bottom-nav-${label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-mono tracking-wider uppercase">{label}</span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-0.5 left-3 right-3 h-[2px] rounded-full"
                  style={{
                    background: "#00f5ff",
                    boxShadow: "0 0 6px #00f5ff",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {label === "Alerts" && alertCount > 0 && (
                <span className="absolute top-0.5 right-1.5 w-4 h-4 bg-[#ff2d55] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
