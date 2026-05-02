import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { LayoutDashboard, BarChart2, Bell, Bot, Droplets, BookOpen } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/",          icon: LayoutDashboard },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Alerts",    path: "/alerts",    icon: Bell },
  { label: "Assistant", path: "/assistant", icon: Bot },
  { label: "Guide",     path: "/guide",     icon: BookOpen },
];

interface SidebarProps {
  alertCount: number;
  isLive: boolean;
  lastUpdated: Date;
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
        className="hidden md:flex fixed inset-y-0 left-0 w-[240px] flex-col z-40"
        style={{ background: "var(--app-surface)", borderRight: "1px solid var(--app-border)" }}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 h-16 px-5 shrink-0"
          style={{ borderBottom: "1px solid var(--app-border)" }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--app-primary-tint)", border: "1px solid var(--app-primary-tint-border)" }}
          >
            <Droplets className="w-4 h-4 text-[#2563eb]" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-[13px] font-bold tracking-tight"
              style={{ fontFamily: "var(--app-font-display)", color: "var(--app-text-1)" }}
            >
              AquaSense
            </span>
            <span className="text-[10px] font-medium mt-0.5" style={{ color: "var(--app-text-3)" }}>
              Water Quality Monitor
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p
            className="text-[10px] font-semibold tracking-widest uppercase px-5 pt-2 pb-1"
            style={{ color: "var(--app-text-3)" }}
          >
            Navigation
          </p>
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = path === "/" ? location === path || location === "" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                data-testid={`sidebar-link-${label.toLowerCase()}`}
                className="relative flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: active ? "var(--app-primary-tint)" : undefined,
                  boxShadow: active ? "inset 3px 0 0 #2563eb" : undefined,
                  color: active ? "#2563eb" : "var(--app-text-2)",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--app-surface-2)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <Icon
                  className="w-4 h-4 shrink-0 transition-colors"
                  style={{ color: active ? "#2563eb" : "var(--app-text-3)" }}
                />
                <span
                  className="text-sm font-medium transition-colors"
                  style={{ color: active ? "var(--app-text-1)" : "var(--app-text-2)" }}
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
          style={{ borderTop: "1px solid var(--app-border)" }}
          data-testid="sidebar-status"
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: isLive ? "#16a34a" : "#dc2626" }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-xs font-semibold" style={{ color: isLive ? "#16a34a" : "#dc2626" }}>
              {isLive ? "Live monitoring" : "Offline"}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--app-text-3)" }}>
            Updated {timeStr}
          </p>
          <p className="text-[10px]" style={{ color: "var(--app-text-3)" }}>3 sensors active</p>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (icons only) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around px-2"
        style={{ background: "var(--app-surface)", borderTop: "1px solid var(--app-border)" }}
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
                background: active ? "var(--app-primary-tint)" : "transparent",
                color: active ? "#2563eb" : "var(--app-text-3)",
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
