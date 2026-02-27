import type { PermissionKey } from "@/types";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  create_product: "Create Products",
  edit_product: "Edit Products",
  delete_product: "Delete Products",
  sell: "Point of Sale",
  manage_clients: "Manage Clients",
  create_client: "Create Clients",
  delete_client: "Delete Clients",
  view_sales: "View Sales",
  view_products: "View Products",
  view_clients: "View Clients",
  manage_stock: "Manage Stock",
  view_dashboard: "View Dashboard",
  manage_notifications: "Manage Notifications",
};

export const PERMISSION_GROUPS: Record<string, PermissionKey[]> = {
  "Products": ["view_products", "create_product", "edit_product", "delete_product", "manage_stock"],
  "Sales": ["view_sales", "sell"],
  "Clients": ["view_clients", "create_client", "manage_clients", "delete_client"],
  "Other": ["view_dashboard", "manage_notifications"],
};

export const ALL_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSION_LABELS) as PermissionKey[];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  shop_manager: "Shop Manager",
  app_user: "App User",
};
