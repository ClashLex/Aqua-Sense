import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { Alerts } from "./pages/Alerts";
import { Assistant } from "./pages/Assistant";
import NotFound from "@/pages/not-found";
import { useSensorData, SensorDataProvider } from "./hooks/useSensorData";
import { CopilotChat } from "./components/CopilotChat";

const queryClient = new QueryClient();

function AppShell() {
  const { lastUpdated, anomalies } = useSensorData();
  const activeAlerts = anomalies.filter((a) => !a.resolved).length;
  const [location] = useLocation();

  return (
    <div
      className="min-h-screen bg-[#020817]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)",
        backgroundSize: "52px 52px",
      }}
    >
      <Navbar isLive={true} lastUpdated={lastUpdated} alertCount={activeAlerts} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pt-14 pb-20 md:pb-8 px-4 md:px-6 max-w-[1600px] mx-auto py-6"
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
