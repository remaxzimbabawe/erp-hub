import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Users,
  Bell,
  Tag,
  Layers,
  CreditCard,
  Shield,
  FileText,
  BarChart3,
  ArrowLeftRight,
  ClipboardList,
} from "lucide-react";

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { getUserRole, hasPermission, getUserShopIds } = useAuth();
  const role = getUserRole();

  const isActive = (path: string) => location.pathname === path;

  // Build nav items based on role
  const mainNavItems: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  
  // Dashboard - everyone gets it
  mainNavItems.push({ title: "Dashboard", url: "/", icon: LayoutDashboard });
  
  // Shops
  if (role === 'super_admin' || role === 'manager') {
    mainNavItems.push({ title: "Shops", url: "/shops", icon: Store });
  }

  // POS - shop_manager, app_user with sell, or super_admin
  if (role === 'super_admin' || hasPermission('sell')) {
    mainNavItems.push({ title: "Point of Sale", url: "/pos", icon: CreditCard });
  }

  const inventoryNavItems: typeof mainNavItems = [];
  if (role === 'super_admin' || role === 'manager') {
    inventoryNavItems.push({ title: "Categories", url: "/categories", icon: Tag });
    inventoryNavItems.push({ title: "Product Templates", url: "/templates", icon: Layers });
  }
  if (role === 'super_admin' || role === 'manager' || hasPermission('view_products')) {
    inventoryNavItems.push({ title: "Products", url: "/products", icon: Package });
    inventoryNavItems.push({ title: "Stock Overview", url: "/stock", icon: BarChart3 });
    inventoryNavItems.push({ title: "Stock Transfers", url: "/stock-transfers", icon: ArrowLeftRight });
  }

  const managementNavItems: typeof mainNavItems = [];
  if (role === 'super_admin' || role === 'manager' || hasPermission('view_clients')) {
    managementNavItems.push({ title: "Clients", url: "/clients", icon: Users });
  }
  if (role === 'super_admin' || role === 'manager' || hasPermission('view_sales')) {
    managementNavItems.push({ title: "Sales History", url: "/sales", icon: ShoppingCart });
  }
  if (role === 'super_admin' || (role === 'manager' && hasPermission('manage_notifications'))) {
    managementNavItems.push({ title: "Notifications", url: "/notifications", icon: Bell });
  }
  if (role === 'super_admin' || role === 'manager' || role === 'shop_manager') {
    managementNavItems.push({ title: "Reports", url: "/reports", icon: ClipboardList });
  }

  const adminNavItems: typeof mainNavItems = [];
  if (role === 'super_admin') {
    adminNavItems.push({ title: "User Management", url: "/users", icon: Shield });
    adminNavItems.push({ title: "Audit Logs", url: "/audit-logs", icon: FileText });
  }

  const NavItem = ({ item }: { item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> } }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
            isActive(item.url)
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="gradient-primary rounded-lg p-2">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sidebar-foreground">ERP System</h2>
              <p className="text-xs text-sidebar-foreground/60">Resource Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {inventoryNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {!collapsed && "Inventory"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {inventoryNavItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {managementNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {!collapsed && "Management"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementNavItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {adminNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {!collapsed && "Administration"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
