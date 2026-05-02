import { useState } from "react";
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

export function Navbar({ isLive, lastUpdated, alertCount }: NavbarProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const timeStr = lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[rgba(0,245,255,0.15)] bg-[#020817]/95 backdrop-blur-sm flex items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="nav-logo">
          <Droplets className="w-5 h-5 text-[#00f5ff]" />
          <span style={{ fontFamily: "var(--app-font-display)" }} className="text-[#00f5ff] font-bold text-sm tracking-widest uppercase">
            AquaSense
          </span>
          <span style={{ fontFamily: "var(--app-font-display)" }} className="text-[rgba(0,245,255,0.5)] text-xs tracking-widest">
            2.0
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 flex-1 ml-4">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = location === path || (path !== "/" && location.startsWith(path));
            return (
              <Link
                key={path}
                href={path}
                data-testid={`nav-link-${label.toLowerCase()}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono tracking-wider uppercase transition-all ${
                  active
                    ? "text-[#00f5ff] bg-[rgba(0,245,255,0.1)] border border-[rgba(0,245,255,0.3)]"
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
          <span className="hidden sm:block text-[#64748b] text-xs font-mono" data-testid="last-updated">
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

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 z-40 bg-[#020817]/98 border-b border-[rgba(0,245,255,0.15)] p-4 flex flex-col gap-2 md:hidden"
          >
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const active = location === path || (path !== "/" && location.startsWith(path));
              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm font-mono tracking-wider uppercase ${
                    active
                      ? "text-[#00f5ff] bg-[rgba(0,245,255,0.1)] border border-[rgba(0,245,255,0.3)]"
                      : "text-[#64748b] hover:text-[#e2e8f0]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tabs on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#020817]/95 backdrop-blur-sm border-t border-[rgba(0,245,255,0.15)] flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <Link
              key={path}
              href={path}
              className={`flex flex-col items-center gap-1 px-3 py-1 ${
                active ? "text-[#00f5ff]" : "text-[#64748b]"
              }`}
              data-testid={`bottom-nav-${label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-mono tracking-wider uppercase">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
