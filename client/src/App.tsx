import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasicLogin } from "@/components/BasicLogin";
import { useState, useEffect } from "react";
import Home from "@/pages/home";
import WeekView from "@/pages/week-view";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/week" component={WeekView} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const [showBasicLogin, setShowBasicLogin] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loginParam = urlParams.get('login');
    if (loginParam === 'basic') {
      setShowBasicLogin(true);
    }
  }, [location]);

  const handleLoginSuccess = () => {
    setShowBasicLogin(false);
    // Remove login parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('login');
    window.history.replaceState({}, '', url);
    
    // Refresh the page to load user data
    window.location.reload();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showBasicLogin && <BasicLogin onSuccess={handleLoginSuccess} />}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
