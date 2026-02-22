import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Rules from "./pages/Rules";
import Pairings from "./pages/Pairings";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import LlmSuggestions from "./pages/LlmSuggestions";
import Settings from "./pages/Settings";
import WidgetPreview from "./pages/WidgetPreview";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/rules" component={Rules} />
      <Route path="/pairings" component={Pairings} />
      <Route path="/products" component={Products} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/llm" component={LlmSuggestions} />
      <Route path="/settings" component={Settings} />
      <Route path="/widget-preview" component={WidgetPreview} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.16 0.010 45)",
                border: "1px solid oklch(0.25 0.010 45)",
                color: "oklch(0.93 0.015 65)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
