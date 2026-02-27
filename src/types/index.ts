export type RoleType = 'super_admin' | 'manager' | 'shop_manager' | 'app_user';

export type PermissionKey =
  | 'create_product'
  | 'edit_product'
  | 'delete_product'
  | 'sell'
  | 'manage_clients'
  | 'create_client'
  | 'delete_client'
  | 'view_sales'
  | 'view_products'
  | 'view_clients'
  | 'manage_stock'
  | 'view_dashboard'
  | 'manage_notifications';

export type User = {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  password: string;
  isActive: boolean;
};

export type UserRole = {
  _id: string;
  userId: string;
  role: RoleType;
};

export type UserShopAssignment = {
  _id: string;
  userId: string;
  shopId: string;
};

export type Permission = {
  _id: string;
  userId: string;
  permission: PermissionKey;
  shopId?: string;
};

export type AuditLog = {
  _id: string;
  _creationTime: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: { field: string; from: unknown; to: unknown }[];
  description: string;
};

export type ProductCategory = {
  _id: string;
  _creationTime: number;
  name: string;
  code?: string;
};

export type ProductTemplate = {
  _id: string;
  _creationTime: number;
  productCategoryId: string;
  name: string;
  code?: string;
  priceInCents: number;
};

export type Shop = {
  _id: string;
  _creationTime: number;
  name: string;
  description: string;
};

export type Product = {
  _id: string;
  _creationTime: number;
  productTemplateId: string;
  shopId: string;
  quantity: number;
  useDefaultPrice: boolean;
  priceInCentsAtShop?: number;
};

export type ProductSold = {
  _id: string;
  _creationTime: number;
  name: string;
  productId: string;
  shopId: string;
  priceInCents: number;
  cashierBogusName: string;
  clientId?: string;
};

export type Client = {
  _id: string;
  _creationTime: number;
  name: string;
  phoneNumber: string;
  shopId: string;
};

export type NotificationList = {
  _id: string;
  _creationTime: number;
  name: string;
  whatsAppPhoneNumber: string;
};

export interface Database {
  productCategories: ProductCategory[];
  productTemplates: ProductTemplate[];
  shops: Shop[];
  products: Product[];
  productsSold: ProductSold[];
  clients: Client[];
  notificationList: NotificationList[];
  users: User[];
  userRoles: UserRole[];
  userShopAssignments: UserShopAssignment[];
  permissions: Permission[];
  auditLogs: AuditLog[];
}

// Cart item for POS
export interface CartItem {
  product: Product;
  template: ProductTemplate;
  category: ProductCategory;
  quantity: number;
  priceInCents: number;
}

// Sale summary
export interface SaleSummary {
  items: CartItem[];
  total: number;
  client?: Client;
  cashierName: string;
  shopId: string;
  timestamp: number;
}
