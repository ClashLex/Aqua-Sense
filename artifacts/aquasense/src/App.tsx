import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { Alerts } from "./pages/Alerts";
import { Assistant } from "./pages/Assistant";
import { Guide } from "./pages/Guide";
import NotFound from "@/pages/not-found";
import { useSensorData, SensorDataProvider } from "./hooks/useSensorData";
import { CopilotChat } from "./components/CopilotChat";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient();

function getPageTitle(location: string): string {
  if (location === "/" || location === "") return "Dashboard";
  if (location.startsWith("/analytics")) return "Analytics";
  if (location.startsWith("/alerts")) return "Alerts";
  if (location.startsWith("/assistant")) return "AI Assistant";
  if (location.startsWith("/guide")) return "Setup Guide";
  return "AquaSense";
}

function AppShell() {
  const { lastUpdated, anomalies } = useSensorData();
  const activeAlerts = anomalies.filter((a) => !a.resolved).length;
  const [location] = useLocation();

  const pageTitle = getPageTitle(location);
  const isLive = Date.now() - lastUpdated.getTime() < 30_000;

  return (
    <div className="min-h-screen" style={{ background: "var(--app-bg)" }}>
      <Sidebar alertCount={activeAlerts} isLive={isLive} lastUpdated={lastUpdated} />

      <div className="md:ml-[240px] flex flex-col min-h-screen">
        <TopBar
          title={pageTitle}
          lastUpdated={lastUpdated}
          isLive={isLive}
          alertCount={activeAlerts}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8"
          >
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/alerts" component={Alerts} />
              <Route path="/assistant" component={Assistant} />
              <Route path="/guide" component={Guide} />
              <Route component={NotFound} />
            </Switch>
          </motion.main>
        </AnimatePresence>
      </div>

      <CopilotChat />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SensorDataProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
          </SensorDataProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
