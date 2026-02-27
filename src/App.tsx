import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import ShopsPage from "./pages/ShopsPage";
import CategoriesPage from "./pages/CategoriesPage";
import TemplatesPage from "./pages/TemplatesPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import SalesPage from "./pages/SalesPage";
import NotificationsPage from "./pages/NotificationsPage";
import POSPage from "./pages/POSPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/shops" element={<ShopsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
