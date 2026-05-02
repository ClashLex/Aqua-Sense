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
import NotFound from "@/pages/not-found";
import { useSensorData, SensorDataProvider } from "./hooks/useSensorData";
import { CopilotChat } from "./components/CopilotChat";

const queryClient = new QueryClient();

function getPageTitle(location: string): string {
  if (location === "/" || location === "") return "Dashboard";
  if (location.startsWith("/analytics")) return "Analytics";
  if (location.startsWith("/alerts")) return "Alerts";
  if (location.startsWith("/assistant")) return "AI Assistant";
  return "AquaSense";
}

function AppShell() {
  const { lastUpdated, anomalies } = useSensorData();
  const activeAlerts = anomalies.filter((a) => !a.resolved).length;
  const [location] = useLocation();

  const pageTitle = getPageTitle(location);
  const isLive = true;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Fixed left sidebar */}
      <Sidebar alertCount={activeAlerts} isLive={isLive} lastUpdated={lastUpdated} />

      {/* Main area — offset by sidebar width on desktop */}
      <div className="md:ml-[240px] flex flex-col min-h-screen">
        {/* Sticky top bar */}
        <TopBar
          title={pageTitle}
          lastUpdated={lastUpdated}
          isLive={isLive}
          alertCount={activeAlerts}
        />

        {/* Page content */}
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
        <SensorDataProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell />
          </WouterRouter>
        </SensorDataProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
