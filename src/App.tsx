import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// Eagerly loaded (landing + menu are entry points)
import Index from "./pages/Index";
import Menu from "./pages/Menu";

// Lazy loaded admin pages - only fetched when user navigates to them
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminAuth = lazy(() => import("./pages/SuperAdminAuth"));
const RegistrationPending = lazy(() => import("./pages/RegistrationPending"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always fetch fresh data
      gcTime: 5 * 60 * 1000, // 5 min garbage collection
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cardapio/:slug" element={<Menu />} />
            <Route path="/criar-conta" element={<Signup />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/super-admin/auth" element={<SuperAdminAuth />} />
            <Route path="/cadastro-pendente" element={<RegistrationPending />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
