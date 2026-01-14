import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminAuth from "./pages/SuperAdminAuth";
import RegistrationPending from "./pages/RegistrationPending";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
