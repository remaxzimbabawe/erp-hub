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
