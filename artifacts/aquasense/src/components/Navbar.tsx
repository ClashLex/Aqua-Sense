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
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-white/95 backdrop-blur-sm flex items-center px-4 gap-4"
        style={{ borderColor: "#e2e8f0" }}
      >
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="nav-logo">
          <Droplets className="w-5 h-5 text-[#2563eb]" />
          <span
            style={{ fontFamily: "var(--app-font-display)", fontWeight: 800 }}
            className="text-[#0f172a] text-sm tracking-tight"
          >
            AquaSense
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#eff6ff] text-[#2563eb]"
            style={{ fontFamily: "var(--app-font-display)" }}
          >
            2.0
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 ml-4">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = path === "/" ? location === path : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                data-testid={`nav-link-${label.toLowerCase()}`}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "text-[#2563eb] bg-[#eff6ff]"
                    : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {label === "Alerts" && alertCount > 0 && (
                  <span className="bg-[#dc2626] text-white text-[10px] rounded-full px-1.5 min-w-[18px] text-center leading-5">
                    {alertCount}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#2563eb]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5" data-testid="status-indicator">
            {isLive ? (
              <>
                <motion.span
                  className="w-2 h-2 rounded-full bg-[#16a34a]"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <span className="text-[#16a34a] text-xs font-medium">Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
                <span className="text-[#dc2626] text-xs font-medium">Offline</span>
              </>
            )}
          </div>
          <span
            className="hidden sm:block text-[#94a3b8] text-xs font-mono tabular-nums"
            data-testid="live-clock"
          >
            {timeStr}
          </span>
          <button
            className="md:hidden text-[#64748b] hover:text-[#0f172a] p-1 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-14 left-0 right-0 z-40 bg-white border-b p-3 flex flex-col gap-1 md:hidden"
            style={{ borderColor: "#e2e8f0" }}
          >
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const active = path === "/" ? location === path : location.startsWith(path);
              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "text-[#2563eb] bg-[#eff6ff]"
                      : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {label === "Alerts" && alertCount > 0 && (
                    <span className="ml-auto bg-[#dc2626] text-white text-[9px] rounded-full px-1.5 leading-5">
                      {alertCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t flex items-center justify-around px-2"
        style={{ borderColor: "#e2e8f0" }}
      >
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = path === "/" ? location === path : location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-[#2563eb]" : "text-[#94a3b8] hover:text-[#64748b]"
              }`}
              data-testid={`bottom-nav-${label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-0.5 left-3 right-3 h-0.5 rounded-full bg-[#2563eb]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {label === "Alerts" && alertCount > 0 && (
                <span className="absolute top-0.5 right-1 w-4 h-4 bg-[#dc2626] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
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
