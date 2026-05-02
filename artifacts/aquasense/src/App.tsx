import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { Alerts } from "./pages/Alerts";
import { Assistant } from "./pages/Assistant";
import NotFound from "@/pages/not-found";
import { useSensorData } from "./hooks/useSensorData";

const queryClient = new QueryClient();

function AppShell() {
  const { lastUpdated, anomalies } = useSensorData();
  const activeAlerts = anomalies.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-[#020817]">
      <Navbar isLive={true} lastUpdated={lastUpdated} alertCount={activeAlerts} />
      <main className="pt-14 pb-20 md:pb-8 px-4 md:px-6 max-w-[1600px] mx-auto py-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/assistant" component={Assistant} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
