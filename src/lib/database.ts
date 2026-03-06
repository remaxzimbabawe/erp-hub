import initialData from '@/data/data.json';
import { initAuditLog, logAction } from './auditLog';
import type { 
  Database, 
  ProductCategory, 
  ProductTemplate, 
  Shop, 
  Product, 
  ProductSold, 
  Client, 
  NotificationList,
  User,
  UserRole,
  UserShopAssignment,
  Permission,
  AuditLog,
  PermissionKey,
  RoleType,
  StockTransfer,
  StockTransferStatus,
} from '@/types';

// In-memory database that persists to localStorage
const STORAGE_KEY = 'erp_database';

function loadDatabase(): Database {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const db = JSON.parse(stored);
      // Ensure new collections exist
      if (!db.users) db.users = (initialData as any).users || [];
      if (!db.userRoles) db.userRoles = (initialData as any).userRoles || [];
      if (!db.userShopAssignments) db.userShopAssignments = (initialData as any).userShopAssignments || [];
      if (!db.permissions) db.permissions = (initialData as any).permissions || [];
      if (!db.auditLogs) db.auditLogs = [];
      if (!db.stockTransfers) db.stockTransfers = [];
      return db;
    } catch {
      return initialData as unknown as Database;
    }
  }
  return initialData as unknown as Database;
}

function saveDatabase(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let database = loadDatabase();

// Init audit log with access to db
initAuditLog(() => ({ db: database, save: saveDatabase }));

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// --- Current user context for audit logging ---
let _currentUserId: string | null = null;
export function setCurrentAuditUser(userId: string | null) {
  _currentUserId = userId;
}

function audit(action: string, entityType: string, entityId: string, changes: { field: string; from: unknown; to: unknown }[], description: string) {
  if (_currentUserId) {
    logAction(_currentUserId, action, entityType, entityId, changes, description);
  }
}

function diffFields(oldObj: Record<string, any>, newData: Record<string, any>): { field: string; from: unknown; to: unknown }[] {
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  for (const key of Object.keys(newData)) {
    if (key === '_id' || key === '_creationTime') continue;
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newData[key])) {
      changes.push({ field: key, from: oldObj[key], to: newData[key] });
    }
  }
  return changes;
}

// Users
export function getUsers(): User[] {
  return database.users;
}

export function getUser(id: string): User | undefined {
  return database.users.find(u => u._id === id);
}

export function createUser(data: Omit<User, '_id' | '_creationTime'>): User {
  const user: User = { ...data, _id: generateId('user'), _creationTime: Date.now() };
  database.users.push(user);
  saveDatabase(database);
  audit('create', 'user', user._id, [{ field: 'name', from: null, to: data.name }], `Created user "${data.name}"`);
  return user;
}

export function updateUser(id: string, data: Partial<User>): User | undefined {
  const index = database.users.findIndex(u => u._id === id);
  if (index === -1) return undefined;
  const old = { ...database.users[index] };
  database.users[index] = { ...old, ...data };
  saveDatabase(database);
  audit('update', 'user', id, diffFields(old, data), `Updated user "${database.users[index].name}"`);
  return database.users[index];
}

export function deleteUser(id: string): boolean {
  const index = database.users.findIndex(u => u._id === id);
  if (index === -1) return false;
  const user = database.users[index];
  database.users.splice(index, 1);
  // Also remove related roles, assignments, permissions
  database.userRoles = database.userRoles.filter(r => r.userId !== id);
  database.userShopAssignments = database.userShopAssignments.filter(a => a.userId !== id);
  database.permissions = database.permissions.filter(p => p.userId !== id);
  saveDatabase(database);
  audit('delete', 'user', id, [{ field: 'name', from: user.name, to: null }], `Deleted user "${user.name}"`);
  return true;
}

// User Roles
export function getUserRoles(): UserRole[] {
  return database.userRoles;
}

export function setUserRole(userId: string, role: RoleType): UserRole {
  const existing = database.userRoles.findIndex(r => r.userId === userId);
  const oldRole = existing >= 0 ? database.userRoles[existing].role : null;
  if (existing >= 0) {
    database.userRoles[existing].role = role;
  } else {
    database.userRoles.push({ _id: generateId('role'), userId, role });
  }
  saveDatabase(database);
  const user = getUser(userId);
  audit('update', 'userRole', userId, [{ field: 'role', from: oldRole, to: role }], `Set role to "${role}" for user "${user?.name}"`);
  return database.userRoles.find(r => r.userId === userId)!;
}

// User Shop Assignments
export function getUserShopAssignments(): UserShopAssignment[] {
  return database.userShopAssignments;
}

export function assignUserToShop(userId: string, shopId: string): UserShopAssignment {
  const exists = database.userShopAssignments.find(a => a.userId === userId && a.shopId === shopId);
  if (exists) return exists;
  const assignment: UserShopAssignment = { _id: generateId('assign'), userId, shopId };
  database.userShopAssignments.push(assignment);
  saveDatabase(database);
  audit('create', 'shopAssignment', assignment._id, [{ field: 'shopId', from: null, to: shopId }], `Assigned user to shop`);
  return assignment;
}

export function removeUserFromShop(userId: string, shopId: string): boolean {
  const index = database.userShopAssignments.findIndex(a => a.userId === userId && a.shopId === shopId);
  if (index === -1) return false;
  database.userShopAssignments.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'shopAssignment', `${userId}_${shopId}`, [{ field: 'shopId', from: shopId, to: null }], `Removed user from shop`);
  return true;
}

// Permissions
export function getPermissions(): Permission[] {
  return database.permissions;
}

export function getUserPermissions(userId: string): Permission[] {
  return database.permissions.filter(p => p.userId === userId);
}

export function grantPermission(userId: string, permission: PermissionKey, shopId?: string): Permission {
  const exists = database.permissions.find(p => p.userId === userId && p.permission === permission && p.shopId === shopId);
  if (exists) return exists;
  const perm: Permission = { _id: generateId('perm'), userId, permission, shopId };
  database.permissions.push(perm);
  saveDatabase(database);
  audit('create', 'permission', perm._id, [{ field: 'permission', from: null, to: permission }], `Granted "${permission}" to user`);
  return perm;
}

export function revokePermission(userId: string, permission: PermissionKey, shopId?: string): boolean {
  const index = database.permissions.findIndex(p => p.userId === userId && p.permission === permission && (shopId ? p.shopId === shopId : !p.shopId));
  if (index === -1) return false;
  database.permissions.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'permission', `${userId}_${permission}`, [{ field: 'permission', from: permission, to: null }], `Revoked "${permission}" from user`);
  return true;
}

export function setUserPermissions(userId: string, perms: { permission: PermissionKey; shopId?: string }[]): void {
  // Remove all existing permissions for user
  database.permissions = database.permissions.filter(p => p.userId !== userId);
  // Add new ones
  perms.forEach(({ permission, shopId }) => {
    database.permissions.push({ _id: generateId('perm'), userId, permission, shopId });
  });
  saveDatabase(database);
  audit('update', 'permissions', userId, [{ field: 'permissions', from: 'bulk', to: perms.map(p => p.permission).join(', ') }], `Updated permissions for user`);
}

// Audit Logs
export function getAuditLogs(): AuditLog[] {
  return database.auditLogs || [];
}

// Product Categories
export function getProductCategories(): ProductCategory[] {
  return database.productCategories;
}

export function getProductCategory(id: string): ProductCategory | undefined {
  return database.productCategories.find(c => c._id === id);
}

export function createProductCategory(data: Omit<ProductCategory, '_id' | '_creationTime'>): ProductCategory {
  const category: ProductCategory = { ...data, _id: generateId('cat'), _creationTime: Date.now() };
  database.productCategories.push(category);
  saveDatabase(database);
  audit('create', 'productCategory', category._id, [{ field: 'name', from: null, to: data.name }], `Created category "${data.name}"`);
  return category;
}

export function updateProductCategory(id: string, data: Partial<ProductCategory>): ProductCategory | undefined {
  const index = database.productCategories.findIndex(c => c._id === id);
  if (index === -1) return undefined;
  const old = { ...database.productCategories[index] };
  database.productCategories[index] = { ...old, ...data };
  saveDatabase(database);
  audit('update', 'productCategory', id, diffFields(old, data), `Updated category "${database.productCategories[index].name}"`);
  return database.productCategories[index];
}

export function deleteProductCategory(id: string): boolean {
  const index = database.productCategories.findIndex(c => c._id === id);
  if (index === -1) return false;
  const cat = database.productCategories[index];
  database.productCategories.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'productCategory', id, [{ field: 'name', from: cat.name, to: null }], `Deleted category "${cat.name}"`);
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
  const template: ProductTemplate = { ...data, _id: generateId('temp'), _creationTime: Date.now() };
  database.productTemplates.push(template);
  saveDatabase(database);
  audit('create', 'productTemplate', template._id, [{ field: 'name', from: null, to: data.name }], `Created template "${data.name}"`);
  return template;
}

export function updateProductTemplate(id: string, data: Partial<ProductTemplate>): ProductTemplate | undefined {
  const index = database.productTemplates.findIndex(t => t._id === id);
  if (index === -1) return undefined;
  const old = { ...database.productTemplates[index] };
  database.productTemplates[index] = { ...old, ...data };
  saveDatabase(database);
  audit('update', 'productTemplate', id, diffFields(old, data), `Updated template "${database.productTemplates[index].name}"`);
  return database.productTemplates[index];
}

export function deleteProductTemplate(id: string): boolean {
  const index = database.productTemplates.findIndex(t => t._id === id);
  if (index === -1) return false;
  const tmpl = database.productTemplates[index];
  database.productTemplates.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'productTemplate', id, [{ field: 'name', from: tmpl.name, to: null }], `Deleted template "${tmpl.name}"`);
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
  const shop: Shop = { ...data, _id: generateId('shop'), _creationTime: Date.now() };
  database.shops.push(shop);
  saveDatabase(database);
  audit('create', 'shop', shop._id, [{ field: 'name', from: null, to: data.name }], `Created shop "${data.name}"`);
  return shop;
}

export function updateShop(id: string, data: Partial<Shop>): Shop | undefined {
  const index = database.shops.findIndex(s => s._id === id);
  if (index === -1) return undefined;
  const old = { ...database.shops[index] };
  database.shops[index] = { ...old, ...data };
  saveDatabase(database);
  audit('update', 'shop', id, diffFields(old, data), `Updated shop "${database.shops[index].name}"`);
  return database.shops[index];
}

export function deleteShop(id: string): boolean {
  const index = database.shops.findIndex(s => s._id === id);
  if (index === -1) return false;
  const shop = database.shops[index];
  database.shops.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'shop', id, [{ field: 'name', from: shop.name, to: null }], `Deleted shop "${shop.name}"`);
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
  const product: Product = { ...data, _id: generateId('prod'), _creationTime: Date.now() };
  database.products.push(product);
  saveDatabase(database);
  audit('create', 'product', product._id, [{ field: 'quantity', from: null, to: data.quantity }], `Added product to shop`);
  return product;
}

export function updateProduct(id: string, data: Partial<Product>): Product | undefined {
  const index = database.products.findIndex(p => p._id === id);
  if (index === -1) return undefined;
  const old = { ...database.products[index] };
  database.products[index] = { ...old, ...data };
  saveDatabase(database);
  audit('update', 'product', id, diffFields(old, data), `Updated product`);
  return database.products[index];
}

export function deleteProduct(id: string): boolean {
  const index = database.products.findIndex(p => p._id === id);
  if (index === -1) return false;
  database.products.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'product', id, [], `Deleted product`);
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
  const sale: ProductSold = { ...data, _id: generateId('sold'), _creationTime: Date.now() };
  database.productsSold.push(sale);
  
  const product = database.products.find(p => p._id === data.productId);
  if (product) {
    product.quantity -= 1;
  }
  
  saveDatabase(database);
  audit('create', 'sale', sale._id, [{ field: 'product', from: null, to: data.name }, { field: 'price', from: null, to: data.priceInCents }], `Sold "${data.name}" for ${(data.priceInCents / 100).toFixed(2)}`);
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
  const client: Client = { ...data, _id: generateId('client'), _creationTime: Date.now() };
  database.clients.push(client);
  saveDatabase(database);
  audit('create', 'client', client._id, [{ field: 'name', from: null, to: data.name }], `Created client "${data.name}"`);
  return client;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const index = database.clients.findIndex(c => c._id === id);
  if (index === -1) return undefined;
  const old = { ...database.clients[index] };
  database.clients[index] = { ...old, ...data };
  saveDatabase(database);
  audit('update', 'client', id, diffFields(old, data), `Updated client "${database.clients[index].name}"`);
  return database.clients[index];
}

export function deleteClient(id: string): boolean {
  const index = database.clients.findIndex(c => c._id === id);
  if (index === -1) return false;
  const client = database.clients[index];
  database.clients.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'client', id, [{ field: 'name', from: client.name, to: null }], `Deleted client "${client.name}"`);
  return true;
}

// Notification List
export function getNotificationList(): NotificationList[] {
  return database.notificationList;
}

export function createNotification(data: Omit<NotificationList, '_id' | '_creationTime'>): NotificationList {
  const notification: NotificationList = { ...data, _id: generateId('notif'), _creationTime: Date.now() };
  database.notificationList.push(notification);
  saveDatabase(database);
  audit('create', 'notification', notification._id, [{ field: 'name', from: null, to: data.name }], `Added notification contact "${data.name}"`);
  return notification;
}

export function deleteNotification(id: string): boolean {
  const index = database.notificationList.findIndex(n => n._id === id);
  if (index === -1) return false;
  const notif = database.notificationList[index];
  database.notificationList.splice(index, 1);
  saveDatabase(database);
  audit('delete', 'notification', id, [{ field: 'name', from: notif.name, to: null }], `Removed notification contact "${notif.name}"`);
  return true;
}

// Stock Transfers
export function getStockTransfers(): StockTransfer[] {
  if (!database.stockTransfers) database.stockTransfers = [];
  return database.stockTransfers;
}

export function getStockTransfersByShop(shopId: string): StockTransfer[] {
  if (!database.stockTransfers) database.stockTransfers = [];
  return database.stockTransfers.filter(t => t.fromShopId === shopId || t.toShopId === shopId);
}

export function createStockTransfer(data: Omit<StockTransfer, '_id' | '_creationTime'>): StockTransfer {
  if (!database.stockTransfers) database.stockTransfers = [];
  const transfer: StockTransfer = { ...data, _id: generateId('transfer'), _creationTime: Date.now() };
  database.stockTransfers.push(transfer);
  saveDatabase(database);
  const fromShop = getShop(data.fromShopId);
  const toShop = getShop(data.toShopId);
  const tmpl = getProductTemplate(data.productTemplateId);
  audit('create', 'stockTransfer', transfer._id, [
    { field: 'from', from: null, to: fromShop?.name },
    { field: 'to', from: null, to: toShop?.name },
    { field: 'quantity', from: null, to: data.quantity },
  ], `Stock transfer request: ${data.quantity}x "${tmpl?.name}" from ${fromShop?.name} to ${toShop?.name}`);
  return transfer;
}

export function updateStockTransferStatus(
  id: string,
  status: StockTransferStatus,
  processedBy: string
): StockTransfer | undefined {
  if (!database.stockTransfers) database.stockTransfers = [];
  const index = database.stockTransfers.findIndex(t => t._id === id);
  if (index === -1) return undefined;
  const old = { ...database.stockTransfers[index] };
  database.stockTransfers[index].status = status;
  database.stockTransfers[index].processedBy = processedBy;
  database.stockTransfers[index].processedAt = Date.now();

  // If completed, actually move the stock
  if (status === 'completed') {
    const transfer = database.stockTransfers[index];
    // Decrease source shop stock
    const sourceProduct = database.products.find(
      p => p.productTemplateId === transfer.productTemplateId && p.shopId === transfer.fromShopId
    );
    if (sourceProduct) {
      sourceProduct.quantity -= transfer.quantity;
    }
    // Increase destination shop stock (create if doesn't exist)
    let destProduct = database.products.find(
      p => p.productTemplateId === transfer.productTemplateId && p.shopId === transfer.toShopId
    );
    if (destProduct) {
      destProduct.quantity += transfer.quantity;
    } else {
      const tmpl = getProductTemplate(transfer.productTemplateId);
      destProduct = {
        _id: generateId('prod'),
        _creationTime: Date.now(),
        productTemplateId: transfer.productTemplateId,
        shopId: transfer.toShopId,
        quantity: transfer.quantity,
        useDefaultPrice: true,
      };
      database.products.push(destProduct);
    }
  }

  saveDatabase(database);
  audit('update', 'stockTransfer', id, [{ field: 'status', from: old.status, to: status }],
    `Stock transfer ${status}`);
  return database.stockTransfers[index];
}

// Utility functions
export function resetDatabase(): void {
  database = initialData as unknown as Database;
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
