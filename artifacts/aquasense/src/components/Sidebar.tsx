import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { LayoutDashboard, BarChart2, Bell, Bot, Droplets } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Alerts", path: "/alerts", icon: Bell },
  { label: "Assistant", path: "/assistant", icon: Bot },
];

interface SidebarProps {
  alertCount: number;
  isLive: boolean;
  lastUpdated: Date;
}

function useNow() {
  const [now, setNow] = import.meta.hot ? [new Date(), () => {}] : [new Date(), () => {}];
  return now;
}

export function Sidebar({ alertCount, isLive, lastUpdated }: SidebarProps) {
  const [location] = useLocation();

  const timeStr = lastUpdated.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 w-[240px] flex-col bg-white z-40"
        style={{ borderRight: "1px solid #e2e8f0" }}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 h-16 px-5 shrink-0"
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#eff6ff] flex items-center justify-center shrink-0">
            <Droplets className="w-4 h-4 text-[#2563eb]" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-[13px] font-bold text-[#0f172a] tracking-tight"
              style={{ fontFamily: "var(--app-font-display)" }}
            >
              AquaSense
            </span>
            <span className="text-[10px] text-[#94a3b8] font-medium mt-0.5">
              Water Quality Monitor
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#94a3b8] tracking-widest uppercase px-5 pt-2 pb-1">
            Navigation
          </p>
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = path === "/" ? location === path || location === "" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                data-testid={`sidebar-link-${label.toLowerCase()}`}
                className="relative flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all group hover:bg-[#f8fafc]"
                style={{
                  background: active ? "#eff6ff" : undefined,
                  boxShadow: active ? "inset 3px 0 0 #2563eb" : undefined,
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0 transition-colors"
                  style={{ color: active ? "#2563eb" : "#94a3b8" }}
                />
                <span
                  className="text-sm font-medium transition-colors"
                  style={{ color: active ? "#0f172a" : "#64748b" }}
                >
                  {label}
                </span>
                {label === "Alerts" && alertCount > 0 && (
                  <span className="ml-auto bg-[#dc2626] text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-[18px]">
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom live status */}
        <div
          className="shrink-0 p-4"
          style={{ borderTop: "1px solid #e2e8f0" }}
          data-testid="sidebar-status"
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.span
              className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-xs font-semibold text-[#16a34a]">
              {isLive ? "Live monitoring" : "Offline"}
            </span>
          </div>
          <p className="text-[10px] text-[#94a3b8] leading-relaxed">
            Updated {timeStr}
          </p>
          <p className="text-[10px] text-[#94a3b8]">3 sensors active</p>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (icons only) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white flex items-center justify-around px-2"
        style={{ borderTop: "1px solid #e2e8f0" }}
        data-testid="bottom-tab-bar"
      >
        {NAV_ITEMS.map(({ path, icon: Icon }) => {
          const active = path === "/" ? location === path || location === "" : location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className="relative flex items-center justify-center w-12 h-12 rounded-xl transition-all"
              style={{
                background: active ? "#eff6ff" : "transparent",
                color: active ? "#2563eb" : "#94a3b8",
              }}
              data-testid={`bottom-tab-${path.replace("/", "") || "dashboard"}`}
            >
              <Icon className="w-5 h-5" />
              {path === "/alerts" && alertCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#dc2626] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
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
