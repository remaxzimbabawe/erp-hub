import initialData from '@/data/data.json';
import type { 
  Database, 
  ProductCategory, 
  ProductTemplate, 
  Shop, 
  Product, 
  ProductSold, 
  Client, 
  NotificationList 
} from '@/types';

// In-memory database that persists to localStorage
const STORAGE_KEY = 'erp_database';

function loadDatabase(): Database {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return initialData as Database;
    }
  }
  return initialData as Database;
}

function saveDatabase(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let database = loadDatabase();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Product Categories
export function getProductCategories(): ProductCategory[] {
  return database.productCategories;
}

export function getProductCategory(id: string): ProductCategory | undefined {
  return database.productCategories.find(c => c._id === id);
}

export function createProductCategory(data: Omit<ProductCategory, '_id' | '_creationTime'>): ProductCategory {
  const category: ProductCategory = {
    ...data,
    _id: generateId('cat'),
    _creationTime: Date.now(),
  };
  database.productCategories.push(category);
  saveDatabase(database);
  return category;
}

export function updateProductCategory(id: string, data: Partial<ProductCategory>): ProductCategory | undefined {
  const index = database.productCategories.findIndex(c => c._id === id);
  if (index === -1) return undefined;
  database.productCategories[index] = { ...database.productCategories[index], ...data };
  saveDatabase(database);
  return database.productCategories[index];
}

export function deleteProductCategory(id: string): boolean {
  const index = database.productCategories.findIndex(c => c._id === id);
  if (index === -1) return false;
  database.productCategories.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Product Templates
export function getProductTemplates(): ProductTemplate[] {
  return database.productTemplates;
}

export function getProductTemplate(id: string): ProductTemplate | undefined {
  return database.productTemplates.find(t => t._id === id);
}

export function createProductTemplate(data: Omit<ProductTemplate, '_id' | '_creationTime'>): ProductTemplate {
  const template: ProductTemplate = {
    ...data,
    _id: generateId('temp'),
    _creationTime: Date.now(),
  };
  database.productTemplates.push(template);
  saveDatabase(database);
  return template;
}

export function updateProductTemplate(id: string, data: Partial<ProductTemplate>): ProductTemplate | undefined {
  const index = database.productTemplates.findIndex(t => t._id === id);
  if (index === -1) return undefined;
  database.productTemplates[index] = { ...database.productTemplates[index], ...data };
  saveDatabase(database);
  return database.productTemplates[index];
}

export function deleteProductTemplate(id: string): boolean {
  const index = database.productTemplates.findIndex(t => t._id === id);
  if (index === -1) return false;
  database.productTemplates.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Shops
export function getShops(): Shop[] {
  return database.shops;
}

export function getShop(id: string): Shop | undefined {
  return database.shops.find(s => s._id === id);
}

export function createShop(data: Omit<Shop, '_id' | '_creationTime'>): Shop {
  const shop: Shop = {
    ...data,
    _id: generateId('shop'),
    _creationTime: Date.now(),
  };
  database.shops.push(shop);
  saveDatabase(database);
  return shop;
}

export function updateShop(id: string, data: Partial<Shop>): Shop | undefined {
  const index = database.shops.findIndex(s => s._id === id);
  if (index === -1) return undefined;
  database.shops[index] = { ...database.shops[index], ...data };
  saveDatabase(database);
  return database.shops[index];
}

export function deleteShop(id: string): boolean {
  const index = database.shops.findIndex(s => s._id === id);
  if (index === -1) return false;
  database.shops.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Products
export function getProducts(): Product[] {
  return database.products;
}

export function getProductsByShop(shopId: string): Product[] {
  return database.products.filter(p => p.shopId === shopId);
}

export function getProduct(id: string): Product | undefined {
  return database.products.find(p => p._id === id);
}

export function createProduct(data: Omit<Product, '_id' | '_creationTime'>): Product {
  const product: Product = {
    ...data,
    _id: generateId('prod'),
    _creationTime: Date.now(),
  };
  database.products.push(product);
  saveDatabase(database);
  return product;
}

export function updateProduct(id: string, data: Partial<Product>): Product | undefined {
  const index = database.products.findIndex(p => p._id === id);
  if (index === -1) return undefined;
  database.products[index] = { ...database.products[index], ...data };
  saveDatabase(database);
  return database.products[index];
}

export function deleteProduct(id: string): boolean {
  const index = database.products.findIndex(p => p._id === id);
  if (index === -1) return false;
  database.products.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Products Sold
export function getProductsSold(): ProductSold[] {
  return database.productsSold;
}

export function getProductsSoldByShop(shopId: string): ProductSold[] {
  return database.productsSold.filter(p => p.shopId === shopId);
}

export function getProductsSoldToday(): ProductSold[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return database.productsSold.filter(p => p._creationTime >= today.getTime());
}

export function getProductsSoldYesterday(): ProductSold[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return database.productsSold.filter(
    p => p._creationTime >= yesterday.getTime() && p._creationTime < today.getTime()
  );
}

export function createProductSold(data: Omit<ProductSold, '_id' | '_creationTime'>): ProductSold {
  const sale: ProductSold = {
    ...data,
    _id: generateId('sold'),
    _creationTime: Date.now(),
  };
  database.productsSold.push(sale);
  
  // Update product quantity
  const product = database.products.find(p => p._id === data.productId);
  if (product) {
    product.quantity -= 1;
  }
  
  saveDatabase(database);
  return sale;
}

// Clients
export function getClients(): Client[] {
  return database.clients;
}

export function getClientsByShop(shopId: string): Client[] {
  return database.clients.filter(c => c.shopId === shopId);
}

export function getClient(id: string): Client | undefined {
  return database.clients.find(c => c._id === id);
}

export function createClient(data: Omit<Client, '_id' | '_creationTime'>): Client {
  const client: Client = {
    ...data,
    _id: generateId('client'),
    _creationTime: Date.now(),
  };
  database.clients.push(client);
  saveDatabase(database);
  return client;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const index = database.clients.findIndex(c => c._id === id);
  if (index === -1) return undefined;
  database.clients[index] = { ...database.clients[index], ...data };
  saveDatabase(database);
  return database.clients[index];
}

export function deleteClient(id: string): boolean {
  const index = database.clients.findIndex(c => c._id === id);
  if (index === -1) return false;
  database.clients.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Notification List
export function getNotificationList(): NotificationList[] {
  return database.notificationList;
}

export function createNotification(data: Omit<NotificationList, '_id' | '_creationTime'>): NotificationList {
  const notification: NotificationList = {
    ...data,
    _id: generateId('notif'),
    _creationTime: Date.now(),
  };
  database.notificationList.push(notification);
  saveDatabase(database);
  return notification;
}

export function deleteNotification(id: string): boolean {
  const index = database.notificationList.findIndex(n => n._id === id);
  if (index === -1) return false;
  database.notificationList.splice(index, 1);
  saveDatabase(database);
  return true;
}

// Utility functions
export function resetDatabase(): void {
  database = initialData as Database;
  saveDatabase(database);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Analytics helpers
export function getSalesByShopToday(): Record<string, number> {
  const sales = getProductsSoldToday();
  return sales.reduce((acc, sale) => {
    acc[sale.shopId] = (acc[sale.shopId] || 0) + sale.priceInCents;
    return acc;
  }, {} as Record<string, number>);
}

export function getTopSellingProducts(limit = 5): { templateId: string; count: number; revenue: number }[] {
  const sales = database.productsSold;
  const productStats: Record<string, { count: number; revenue: number; templateId: string }> = {};
  
  sales.forEach(sale => {
    const product = database.products.find(p => p._id === sale.productId);
    if (product) {
      if (!productStats[product.productTemplateId]) {
        productStats[product.productTemplateId] = { count: 0, revenue: 0, templateId: product.productTemplateId };
      }
      productStats[product.productTemplateId].count += 1;
      productStats[product.productTemplateId].revenue += sale.priceInCents;
    }
  });
  
  return Object.values(productStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getLowStockProducts(threshold = 5): Product[] {
  return database.products.filter(p => p.quantity <= threshold && p.quantity > 0);
}

export function getOutOfStockProducts(): Product[] {
  return database.products.filter(p => p.quantity <= 0);
}

export function getTopClients(limit = 5): { clientId: string; totalSpent: number; orderCount: number }[] {
  const sales = database.productsSold.filter(s => s.clientId);
  const clientStats: Record<string, { clientId: string; totalSpent: number; orderCount: number }> = {};
  
  sales.forEach(sale => {
    if (sale.clientId) {
      if (!clientStats[sale.clientId]) {
        clientStats[sale.clientId] = { clientId: sale.clientId, totalSpent: 0, orderCount: 0 };
      }
      clientStats[sale.clientId].totalSpent += sale.priceInCents;
      clientStats[sale.clientId].orderCount += 1;
    }
  });
  
  return Object.values(clientStats)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}
