import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ShopsPage from "./pages/ShopsPage";
import CategoriesPage from "./pages/CategoriesPage";
import TemplatesPage from "./pages/TemplatesPage";
import ProductsPage from "./pages/ProductsPage";
import ClientsPage from "./pages/ClientsPage";
import SalesPage from "./pages/SalesPage";
import NotificationsPage from "./pages/NotificationsPage";
import POSPage from "./pages/POSPage";
import UsersPage from "./pages/UsersPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import NotFound from "./pages/NotFound";
import { setCurrentAuditUser } from "@/lib/database";
import * as React from "react";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { currentUser } = useAuth();

  React.useEffect(() => {
    setCurrentAuditUser(currentUser?._id || null);
  }, [currentUser]);

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
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
        <Route path="/users" element={<UsersPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
