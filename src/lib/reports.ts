/**
 * Report generation engine
 * Generates financial, sales, and inventory reports from in-memory database.
 */
import {
  getProductsSold,
  getProducts,
  getProductTemplates,
  getProductCategories,
  getShops,
  getClients,
  getStockTransfers,
  getShop,
  getProductTemplate,
  getProductCategory,
  getClient,
  formatPrice,
} from "./database";
import type { ExportColumn } from "./export";

export type ReportType =
  // Financial
  | "profit_loss"
  | "gross_profit"
  // Sales
  | "daily_sales"
  | "sales_by_product"
  | "sales_by_category"
  | "sales_by_shop"
  | "sales_by_cashier"
  | "hourly_sales"
  // Inventory
  | "current_stock"
  | "low_stock"
  | "out_of_stock"
  | "inventory_valuation"
  | "stock_aging"
  // Stock Transfers
  | "transfer_summary"
  | "transfer_history"
  // Customer
  | "customer_purchase_history"
  | "top_customers"
  | "customer_balance"
  // Product Performance
  | "best_selling_products"
  | "slow_moving_products"
  | "dead_stock";

export type ReportStatus = "pending" | "ready" | "error";

export interface ReportRequest {
  _id: string;
  _creationTime: number;
  type: ReportType;
  title: string;
  shopId?: string; // optional shop filter
  dateFrom?: number;
  dateTo?: number;
  status: ReportStatus;
  requestedBy: string;
  data: any[];
  columns: ExportColumn[];
  summary?: Record<string, string>;
}

export const REPORT_CATALOG: {
  type: ReportType;
  label: string;
  group: string;
  description: string;
}[] = [
  // Financial
  { type: "profit_loss", label: "Profit & Loss", group: "Financial", description: "Revenue minus cost of goods sold per shop" },
  { type: "gross_profit", label: "Gross Profit", group: "Financial", description: "Profit per product or category" },
  // Sales
  { type: "daily_sales", label: "Daily Sales", group: "Sales", description: "Total sales per shop per day" },
  { type: "sales_by_product", label: "Sales by Product", group: "Sales", description: "Quantity sold & revenue per product" },
  { type: "sales_by_category", label: "Sales by Category", group: "Sales", description: "Revenue breakdown by category" },
  { type: "sales_by_shop", label: "Sales by Shop", group: "Sales", description: "Compare performance across branches" },
  { type: "sales_by_cashier", label: "Sales by Cashier", group: "Sales", description: "Each POS operator's sales totals" },
  { type: "hourly_sales", label: "Hourly Sales", group: "Sales", description: "Sales distribution by hour of day" },
  // Inventory
  { type: "current_stock", label: "Current Stock", group: "Inventory", description: "Stock per product per shop" },
  { type: "low_stock", label: "Low Stock", group: "Inventory", description: "Items below reorder level (≤5)" },
  { type: "out_of_stock", label: "Out of Stock", group: "Inventory", description: "Items that reached zero or negative" },
  { type: "inventory_valuation", label: "Inventory Valuation", group: "Inventory", description: "Total value of stock per shop based on cost price" },
  { type: "stock_aging", label: "Stock Aging", group: "Inventory", description: "How long items have stayed in inventory" },
  // Stock Transfers
  { type: "transfer_summary", label: "Transfer Summary", group: "Stock Transfers", description: "Summary of transfers between shops with quantities and values" },
  { type: "transfer_history", label: "Transfer History", group: "Stock Transfers", description: "Detailed history of each transfer transaction" },
  // Customer
  { type: "customer_purchase_history", label: "Customer Purchase History", group: "Customer", description: "All purchases by each customer" },
  { type: "top_customers", label: "Top Customers", group: "Customer", description: "Customers ranked by total spending" },
  { type: "customer_balance", label: "Customer Balance", group: "Customer", description: "Credit account balances per customer" },
  // Product Performance
  { type: "best_selling_products", label: "Best Selling Products", group: "Product Performance", description: "Top items ranked by quantity sold" },
  { type: "slow_moving_products", label: "Slow Moving Products", group: "Product Performance", description: "Products with very few sales" },
  { type: "dead_stock", label: "Dead Stock", group: "Product Performance", description: "Stock that has not moved for a long time" },
];

// ── Generators ──────────────────────────────────────

function filterSales(shopId?: string, dateFrom?: number, dateTo?: number) {
  let sales = getProductsSold();
  if (shopId) sales = sales.filter((s) => s.shopId === shopId);
  if (dateFrom) sales = sales.filter((s) => s._creationTime >= dateFrom);
  if (dateTo) sales = sales.filter((s) => s._creationTime <= dateTo);
  return sales;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString();
}

export function generateReport(
  type: ReportType,
  shopId?: string,
  dateFrom?: number,
  dateTo?: number
): { data: any[]; columns: ExportColumn[]; summary?: Record<string, string> } {
  const sales = filterSales(shopId, dateFrom, dateTo);
  const products = getProducts();
  const templates = getProductTemplates();
  const categories = getProductCategories();
  const shops = getShops();

  switch (type) {
    // ── Financial ──
    case "profit_loss": {
      const shopMap: Record<string, { shopName: string; revenue: number; cogs: number }> = {};
      sales.forEach((s) => {
        const shop = getShop(s.shopId);
        if (!shopMap[s.shopId])
          shopMap[s.shopId] = { shopName: shop?.name || s.shopId, revenue: 0, cogs: 0 };
        shopMap[s.shopId].revenue += s.priceInCents;
        // COGS = template default price (assumed cost)
        const prod = products.find((p) => p._id === s.productId);
        const tmpl = prod ? templates.find((t) => t._id === prod.productTemplateId) : null;
        shopMap[s.shopId].cogs += tmpl ? tmpl.priceInCents * 0.6 : 0; // assume 60% cost
      });
      const data = Object.values(shopMap).map((r) => ({
        ...r,
        profit: r.revenue - r.cogs,
        margin: r.revenue ? (((r.revenue - r.cogs) / r.revenue) * 100).toFixed(1) + "%" : "0%",
      }));
      const totalRevenue = data.reduce((a, b) => a + b.revenue, 0);
      const totalProfit = data.reduce((a, b) => a + b.profit, 0);
      return {
        data,
        columns: [
          { header: "Shop", accessor: (r) => r.shopName },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
          { header: "COGS", accessor: (r) => formatPrice(r.cogs) },
          { header: "Profit", accessor: (r) => formatPrice(r.profit) },
          { header: "Margin", accessor: (r) => r.margin },
        ],
        summary: { "Total Revenue": formatPrice(totalRevenue), "Total Profit": formatPrice(totalProfit) },
      };
    }

    case "gross_profit": {
      const prodMap: Record<string, { name: string; category: string; revenue: number; cogs: number; qty: number }> = {};
      sales.forEach((s) => {
        const prod = products.find((p) => p._id === s.productId);
        const tmpl = prod ? templates.find((t) => t._id === prod.productTemplateId) : null;
        const cat = tmpl ? categories.find((c) => c._id === tmpl.productCategoryId) : null;
        const key = tmpl?._id || s.productId;
        if (!prodMap[key])
          prodMap[key] = { name: tmpl?.name || s.name, category: cat?.name || "Unknown", revenue: 0, cogs: 0, qty: 0 };
        prodMap[key].revenue += s.priceInCents;
        prodMap[key].cogs += tmpl ? tmpl.priceInCents * 0.6 : 0;
        prodMap[key].qty += 1;
      });
      const data = Object.values(prodMap).map((r) => ({
        ...r,
        profit: r.revenue - r.cogs,
        margin: r.revenue ? (((r.revenue - r.cogs) / r.revenue) * 100).toFixed(1) + "%" : "0%",
      }));
      return {
        data: data.sort((a, b) => b.profit - a.profit),
        columns: [
          { header: "Product", accessor: (r) => r.name },
          { header: "Category", accessor: (r) => r.category },
          { header: "Qty Sold", accessor: (r) => String(r.qty) },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
          { header: "COGS", accessor: (r) => formatPrice(r.cogs) },
          { header: "Gross Profit", accessor: (r) => formatPrice(r.profit) },
          { header: "Margin", accessor: (r) => r.margin },
        ],
      };
    }

    // ── Sales ──
    case "daily_sales": {
      const dayMap: Record<string, { date: string; shopName: string; totalSales: number; transactionCount: number }> = {};
      sales.forEach((s) => {
        const date = fmtDate(s._creationTime);
        const shop = getShop(s.shopId);
        const key = `${date}_${s.shopId}`;
        if (!dayMap[key])
          dayMap[key] = { date, shopName: shop?.name || s.shopId, totalSales: 0, transactionCount: 0 };
        dayMap[key].totalSales += s.priceInCents;
        dayMap[key].transactionCount += 1;
      });
      const data = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
      return {
        data,
        columns: [
          { header: "Date", accessor: (r) => r.date },
          { header: "Shop", accessor: (r) => r.shopName },
          { header: "Transactions", accessor: (r) => String(r.transactionCount) },
          { header: "Total Sales", accessor: (r) => formatPrice(r.totalSales) },
        ],
      };
    }

    case "sales_by_product": {
      const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      sales.forEach((s) => {
        if (!prodMap[s.name]) prodMap[s.name] = { name: s.name, qty: 0, revenue: 0 };
        prodMap[s.name].qty += 1;
        prodMap[s.name].revenue += s.priceInCents;
      });
      const data = Object.values(prodMap).sort((a, b) => b.qty - a.qty);
      return {
        data,
        columns: [
          { header: "Product", accessor: (r) => r.name },
          { header: "Qty Sold", accessor: (r) => String(r.qty) },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
          { header: "Avg Price", accessor: (r) => formatPrice(Math.round(r.revenue / r.qty)) },
        ],
      };
    }

    case "sales_by_category": {
      const catMap: Record<string, { category: string; qty: number; revenue: number }> = {};
      sales.forEach((s) => {
        const prod = products.find((p) => p._id === s.productId);
        const tmpl = prod ? templates.find((t) => t._id === prod.productTemplateId) : null;
        const cat = tmpl ? categories.find((c) => c._id === tmpl.productCategoryId) : null;
        const catName = cat?.name || "Unknown";
        if (!catMap[catName]) catMap[catName] = { category: catName, qty: 0, revenue: 0 };
        catMap[catName].qty += 1;
        catMap[catName].revenue += s.priceInCents;
      });
      return {
        data: Object.values(catMap).sort((a, b) => b.revenue - a.revenue),
        columns: [
          { header: "Category", accessor: (r) => r.category },
          { header: "Items Sold", accessor: (r) => String(r.qty) },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
        ],
      };
    }

    case "sales_by_shop": {
      const shopMap: Record<string, { shopName: string; qty: number; revenue: number }> = {};
      sales.forEach((s) => {
        const shop = getShop(s.shopId);
        if (!shopMap[s.shopId])
          shopMap[s.shopId] = { shopName: shop?.name || s.shopId, qty: 0, revenue: 0 };
        shopMap[s.shopId].qty += 1;
        shopMap[s.shopId].revenue += s.priceInCents;
      });
      return {
        data: Object.values(shopMap).sort((a, b) => b.revenue - a.revenue),
        columns: [
          { header: "Shop", accessor: (r) => r.shopName },
          { header: "Transactions", accessor: (r) => String(r.qty) },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
        ],
      };
    }

    case "sales_by_cashier": {
      const cashMap: Record<string, { cashier: string; qty: number; revenue: number }> = {};
      sales.forEach((s) => {
        if (!cashMap[s.cashierBogusName])
          cashMap[s.cashierBogusName] = { cashier: s.cashierBogusName, qty: 0, revenue: 0 };
        cashMap[s.cashierBogusName].qty += 1;
        cashMap[s.cashierBogusName].revenue += s.priceInCents;
      });
      return {
        data: Object.values(cashMap).sort((a, b) => b.revenue - a.revenue),
        columns: [
          { header: "Cashier", accessor: (r) => r.cashier },
          { header: "Transactions", accessor: (r) => String(r.qty) },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
        ],
      };
    }

    case "hourly_sales": {
      const hourMap: Record<number, { hour: number; qty: number; revenue: number }> = {};
      for (let i = 0; i < 24; i++) hourMap[i] = { hour: i, qty: 0, revenue: 0 };
      sales.forEach((s) => {
        const h = new Date(s._creationTime).getHours();
        hourMap[h].qty += 1;
        hourMap[h].revenue += s.priceInCents;
      });
      return {
        data: Object.values(hourMap),
        columns: [
          { header: "Hour", accessor: (r) => `${String(r.hour).padStart(2, "0")}:00` },
          { header: "Transactions", accessor: (r) => String(r.qty) },
          { header: "Revenue", accessor: (r) => formatPrice(r.revenue) },
        ],
      };
    }

    // ── Inventory ──
    case "current_stock": {
      const filtered = shopId ? products.filter((p) => p.shopId === shopId) : products;
      const data = filtered.map((p) => {
        const tmpl = templates.find((t) => t._id === p.productTemplateId);
        const cat = tmpl ? categories.find((c) => c._id === tmpl.productCategoryId) : null;
        const shop = getShop(p.shopId);
        const price = p.useDefaultPrice ? (tmpl?.priceInCents || 0) : (p.priceInCentsAtShop || 0);
        return {
          product: tmpl?.name || "Unknown",
          category: cat?.name || "Unknown",
          shop: shop?.name || p.shopId,
          quantity: p.quantity,
          unitPrice: price,
          totalValue: p.quantity * price,
        };
      });
      return {
        data: data.sort((a, b) => a.shop.localeCompare(b.shop)),
        columns: [
          { header: "Product", accessor: (r) => r.product },
          { header: "Category", accessor: (r) => r.category },
          { header: "Shop", accessor: (r) => r.shop },
          { header: "Quantity", accessor: (r) => String(r.quantity) },
          { header: "Unit Price", accessor: (r) => formatPrice(r.unitPrice) },
          { header: "Total Value", accessor: (r) => formatPrice(r.totalValue) },
        ],
      };
    }

    case "low_stock": {
      const filtered = (shopId ? products.filter((p) => p.shopId === shopId) : products).filter(
        (p) => p.quantity > 0 && p.quantity <= 5
      );
      const data = filtered.map((p) => {
        const tmpl = templates.find((t) => t._id === p.productTemplateId);
        const shop = getShop(p.shopId);
        return { product: tmpl?.name || "Unknown", shop: shop?.name || p.shopId, quantity: p.quantity };
      });
      return {
        data,
        columns: [
          { header: "Product", accessor: (r) => r.product },
          { header: "Shop", accessor: (r) => r.shop },
          { header: "Remaining Qty", accessor: (r) => String(r.quantity) },
        ],
        summary: { "Total Low Stock Items": String(data.length) },
      };
    }

    case "out_of_stock": {
      const filtered = (shopId ? products.filter((p) => p.shopId === shopId) : products).filter(
        (p) => p.quantity <= 0
      );
      const data = filtered.map((p) => {
        const tmpl = templates.find((t) => t._id === p.productTemplateId);
        const shop = getShop(p.shopId);
        return { product: tmpl?.name || "Unknown", shop: shop?.name || p.shopId, quantity: p.quantity };
      });
      return {
        data,
        columns: [
          { header: "Product", accessor: (r) => r.product },
          { header: "Shop", accessor: (r) => r.shop },
          { header: "Quantity", accessor: (r) => String(r.quantity) },
        ],
        summary: { "Total Out of Stock": String(data.length) },
      };
    }

    case "inventory_valuation": {
      const shopMap: Record<string, { shopName: string; totalItems: number; totalValue: number; productCount: number }> = {};
      const filtered = shopId ? products.filter((p) => p.shopId === shopId) : products;
      filtered.forEach((p) => {
        const shop = getShop(p.shopId);
        const tmpl = templates.find((t) => t._id === p.productTemplateId);
        const price = p.useDefaultPrice ? (tmpl?.priceInCents || 0) : (p.priceInCentsAtShop || 0);
        if (!shopMap[p.shopId])
          shopMap[p.shopId] = { shopName: shop?.name || p.shopId, totalItems: 0, totalValue: 0, productCount: 0 };
        shopMap[p.shopId].totalItems += Math.max(p.quantity, 0);
        shopMap[p.shopId].totalValue += Math.max(p.quantity, 0) * price;
        shopMap[p.shopId].productCount += 1;
      });
      const data = Object.values(shopMap);
      const grandTotal = data.reduce((a, b) => a + b.totalValue, 0);
      return {
        data,
        columns: [
          { header: "Shop", accessor: (r) => r.shopName },
          { header: "Products", accessor: (r) => String(r.productCount) },
          { header: "Total Items", accessor: (r) => String(r.totalItems) },
          { header: "Total Value", accessor: (r) => formatPrice(r.totalValue) },
        ],
        summary: { "Grand Total Valuation": formatPrice(grandTotal) },
      };
    }

    case "stock_aging": {
      const now = Date.now();
      const filtered = shopId ? products.filter((p) => p.shopId === shopId) : products;
      const data = filtered
        .filter((p) => p.quantity > 0)
        .map((p) => {
          const tmpl = templates.find((t) => t._id === p.productTemplateId);
          const shop = getShop(p.shopId);
          const days = Math.floor((now - p._creationTime) / (1000 * 60 * 60 * 24));
          return {
            product: tmpl?.name || "Unknown",
            shop: shop?.name || p.shopId,
            quantity: p.quantity,
            daysInStock: days,
            ageCategory: days > 90 ? "Over 90 days" : days > 30 ? "30-90 days" : "Under 30 days",
          };
        })
        .sort((a, b) => b.daysInStock - a.daysInStock);
      return {
        data,
        columns: [
          { header: "Product", accessor: (r) => r.product },
          { header: "Shop", accessor: (r) => r.shop },
          { header: "Quantity", accessor: (r) => String(r.quantity) },
          { header: "Days in Stock", accessor: (r) => String(r.daysInStock) },
          { header: "Age Category", accessor: (r) => r.ageCategory },
        ],
      };
    }

    // ── Stock Transfers ──
    case "transfer_summary": {
      const transfers = getStockTransfers();
      const filtered = shopId
        ? transfers.filter((t) => t.fromShopId === shopId || t.toShopId === shopId)
        : transfers;
      const routeMap: Record<string, { fromShop: string; toShop: string; totalQty: number; totalValue: number; count: number }> = {};
      filtered.forEach((t) => {
        const from = getShop(t.fromShopId);
        const to = getShop(t.toShopId);
        const tmpl = getProductTemplate(t.productTemplateId);
        const key = `${t.fromShopId}_${t.toShopId}`;
        if (!routeMap[key])
          routeMap[key] = { fromShop: from?.name || t.fromShopId, toShop: to?.name || t.toShopId, totalQty: 0, totalValue: 0, count: 0 };
        routeMap[key].totalQty += t.quantity;
        routeMap[key].totalValue += t.quantity * (tmpl?.priceInCents || 0);
        routeMap[key].count += 1;
      });
      const data = Object.values(routeMap).sort((a, b) => b.totalValue - a.totalValue);
      const grandValue = data.reduce((a, b) => a + b.totalValue, 0);
      return {
        data,
        columns: [
          { header: "From Shop", accessor: (r: any) => r.fromShop },
          { header: "To Shop", accessor: (r: any) => r.toShop },
          { header: "Transfers", accessor: (r: any) => String(r.count) },
          { header: "Total Qty", accessor: (r: any) => String(r.totalQty) },
          { header: "Total Value", accessor: (r: any) => formatPrice(r.totalValue) },
        ],
        summary: { "Total Transfers": String(filtered.length), "Total Value": formatPrice(grandValue) },
      };
    }

    case "transfer_history": {
      const transfers = getStockTransfers();
      let filtered = shopId
        ? transfers.filter((t) => t.fromShopId === shopId || t.toShopId === shopId)
        : transfers;
      if (dateFrom) filtered = filtered.filter((t) => t._creationTime >= dateFrom);
      if (dateTo) filtered = filtered.filter((t) => t._creationTime <= dateTo);
      const data = filtered
        .sort((a, b) => b._creationTime - a._creationTime)
        .map((t) => {
          const from = getShop(t.fromShopId);
          const to = getShop(t.toShopId);
          const tmpl = getProductTemplate(t.productTemplateId);
          return {
            date: new Date(t._creationTime).toLocaleString(),
            product: tmpl?.name || "Unknown",
            fromShop: from?.name || t.fromShopId,
            toShop: to?.name || t.toShopId,
            quantity: t.quantity,
            value: t.quantity * (tmpl?.priceInCents || 0),
            status: t.status,
            saleRef: t.saleReference || "—",
            notes: t.notes || "—",
          };
        });
      return {
        data,
        columns: [
          { header: "Date", accessor: (r: any) => r.date },
          { header: "Product", accessor: (r: any) => r.product },
          { header: "From", accessor: (r: any) => r.fromShop },
          { header: "To", accessor: (r: any) => r.toShop },
          { header: "Qty", accessor: (r: any) => String(r.quantity) },
          { header: "Value", accessor: (r: any) => formatPrice(r.value) },
          { header: "Status", accessor: (r: any) => r.status },
          { header: "Sale Ref", accessor: (r: any) => r.saleRef },
        ],
      };
    }

    // ── Customer ──
    case "customer_purchase_history": {
      const clients = getClients();
      const filteredClients = shopId ? clients.filter((c) => c.shopId === shopId) : clients;
      const allSales = filterSales(shopId, dateFrom, dateTo);
      const data: any[] = [];
      filteredClients.forEach((client) => {
        const clientSales = allSales.filter((s) => s.clientId === client._id);
        clientSales.forEach((s) => {
          const shop = getShop(s.shopId);
          data.push({
            customer: client.name,
            phone: client.phoneNumber,
            product: s.name,
            shop: shop?.name || s.shopId,
            price: s.priceInCents,
            date: fmtDate(s._creationTime),
          });
        });
      });
      return {
        data: data.sort((a, b) => a.customer.localeCompare(b.customer)),
        columns: [
          { header: "Customer", accessor: (r: any) => r.customer },
          { header: "Phone", accessor: (r: any) => r.phone },
          { header: "Product", accessor: (r: any) => r.product },
          { header: "Shop", accessor: (r: any) => r.shop },
          { header: "Price", accessor: (r: any) => formatPrice(r.price) },
          { header: "Date", accessor: (r: any) => r.date },
        ],
        summary: { "Total Customers": String(filteredClients.length), "Total Purchases": String(data.length) },
      };
    }

    case "top_customers": {
      const clients = getClients();
      const filteredClients = shopId ? clients.filter((c) => c.shopId === shopId) : clients;
      const allSales = filterSales(shopId, dateFrom, dateTo);
      const custMap: Record<string, { name: string; phone: string; shop: string; totalSpent: number; purchases: number }> = {};
      filteredClients.forEach((client) => {
        const clientSales = allSales.filter((s) => s.clientId === client._id);
        const shop = getShop(client.shopId);
        custMap[client._id] = {
          name: client.name,
          phone: client.phoneNumber,
          shop: shop?.name || client.shopId,
          totalSpent: clientSales.reduce((sum, s) => sum + s.priceInCents, 0),
          purchases: clientSales.length,
        };
      });
      const data = Object.values(custMap)
        .filter((c) => c.purchases > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent);
      return {
        data,
        columns: [
          { header: "Customer", accessor: (r: any) => r.name },
          { header: "Phone", accessor: (r: any) => r.phone },
          { header: "Shop", accessor: (r: any) => r.shop },
          { header: "Purchases", accessor: (r: any) => String(r.purchases) },
          { header: "Total Spent", accessor: (r: any) => formatPrice(r.totalSpent) },
        ],
      };
    }

    case "customer_balance": {
      // Simulated credit balance: customers with purchases tracked
      const clients = getClients();
      const filteredClients = shopId ? clients.filter((c) => c.shopId === shopId) : clients;
      const allSales = getProductsSold();
      const data = filteredClients.map((client) => {
        const clientSales = allSales.filter((s) => s.clientId === client._id);
        const totalSpent = clientSales.reduce((sum, s) => sum + s.priceInCents, 0);
        const shop = getShop(client.shopId);
        return {
          name: client.name,
          phone: client.phoneNumber,
          shop: shop?.name || client.shopId,
          totalPurchases: clientSales.length,
          totalSpent,
          balance: 0, // placeholder — credit system not implemented
        };
      });
      return {
        data: data.sort((a, b) => a.name.localeCompare(b.name)),
        columns: [
          { header: "Customer", accessor: (r: any) => r.name },
          { header: "Phone", accessor: (r: any) => r.phone },
          { header: "Shop", accessor: (r: any) => r.shop },
          { header: "Purchases", accessor: (r: any) => String(r.totalPurchases) },
          { header: "Total Spent", accessor: (r: any) => formatPrice(r.totalSpent) },
          { header: "Balance", accessor: (r: any) => formatPrice(r.balance) },
        ],
      };
    }

    // ── Product Performance ──
    case "best_selling_products": {
      const prodMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
      sales.forEach((s) => {
        const prod = products.find((p) => p._id === s.productId);
        const tmpl = prod ? templates.find((t) => t._id === prod.productTemplateId) : null;
        const cat = tmpl ? categories.find((c) => c._id === tmpl.productCategoryId) : null;
        const key = tmpl?._id || s.name;
        if (!prodMap[key]) prodMap[key] = { name: tmpl?.name || s.name, category: cat?.name || "Unknown", qty: 0, revenue: 0 };
        prodMap[key].qty += 1;
        prodMap[key].revenue += s.priceInCents;
      });
      const data = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 20);
      return {
        data,
        columns: [
          { header: "Rank", accessor: (_r: any, i: number) => String((i || 0) + 1) },
          { header: "Product", accessor: (r: any) => r.name },
          { header: "Category", accessor: (r: any) => r.category },
          { header: "Qty Sold", accessor: (r: any) => String(r.qty) },
          { header: "Revenue", accessor: (r: any) => formatPrice(r.revenue) },
        ],
      };
    }

    case "slow_moving_products": {
      // Products with stock but very few sales (≤2)
      const salesCount: Record<string, number> = {};
      sales.forEach((s) => {
        const prod = products.find((p) => p._id === s.productId);
        if (prod) {
          salesCount[prod.productTemplateId] = (salesCount[prod.productTemplateId] || 0) + 1;
        }
      });
      const filtered = shopId ? products.filter((p) => p.shopId === shopId) : products;
      const seen = new Set<string>();
      const data = filtered
        .filter((p) => p.quantity > 0)
        .filter((p) => {
          if (seen.has(p.productTemplateId)) return false;
          seen.add(p.productTemplateId);
          return (salesCount[p.productTemplateId] || 0) <= 2;
        })
        .map((p) => {
          const tmpl = templates.find((t) => t._id === p.productTemplateId);
          const cat = tmpl ? categories.find((c) => c._id === tmpl.productCategoryId) : null;
          return {
            product: tmpl?.name || "Unknown",
            category: cat?.name || "Unknown",
            stockQty: p.quantity,
            totalSold: salesCount[p.productTemplateId] || 0,
          };
        })
        .sort((a, b) => a.totalSold - b.totalSold);
      return {
        data,
        columns: [
          { header: "Product", accessor: (r: any) => r.product },
          { header: "Category", accessor: (r: any) => r.category },
          { header: "Current Stock", accessor: (r: any) => String(r.stockQty) },
          { header: "Total Sold", accessor: (r: any) => String(r.totalSold) },
        ],
        summary: { "Slow Moving Items": String(data.length) },
      };
    }

    case "dead_stock": {
      const now = Date.now();
      const DEAD_THRESHOLD_DAYS = 60;
      // Products in stock that haven't been sold recently
      const lastSaleMap: Record<string, number> = {};
      getProductsSold().forEach((s) => {
        const prod = products.find((p) => p._id === s.productId);
        if (prod) {
          lastSaleMap[prod.productTemplateId] = Math.max(
            lastSaleMap[prod.productTemplateId] || 0,
            s._creationTime
          );
        }
      });
      const filtered = shopId ? products.filter((p) => p.shopId === shopId) : products;
      const seen = new Set<string>();
      const data = filtered
        .filter((p) => p.quantity > 0)
        .filter((p) => {
          if (seen.has(`${p.productTemplateId}_${p.shopId}`)) return false;
          seen.add(`${p.productTemplateId}_${p.shopId}`);
          const lastSale = lastSaleMap[p.productTemplateId];
          const daysSinceLastSale = lastSale
            ? Math.floor((now - lastSale) / (1000 * 60 * 60 * 24))
            : 999;
          return daysSinceLastSale >= DEAD_THRESHOLD_DAYS;
        })
        .map((p) => {
          const tmpl = templates.find((t) => t._id === p.productTemplateId);
          const cat = tmpl ? categories.find((c) => c._id === tmpl.productCategoryId) : null;
          const shop = getShop(p.shopId);
          const lastSale = lastSaleMap[p.productTemplateId];
          const daysSince = lastSale
            ? Math.floor((now - lastSale) / (1000 * 60 * 60 * 24))
            : null;
          const price = p.useDefaultPrice ? (tmpl?.priceInCents || 0) : (p.priceInCentsAtShop || 0);
          return {
            product: tmpl?.name || "Unknown",
            category: cat?.name || "Unknown",
            shop: shop?.name || p.shopId,
            quantity: p.quantity,
            value: p.quantity * price,
            lastSold: daysSince !== null ? `${daysSince} days ago` : "Never sold",
          };
        })
        .sort((a, b) => b.value - a.value);
      const totalDeadValue = data.reduce((sum, d) => sum + d.value, 0);
      return {
        data,
        columns: [
          { header: "Product", accessor: (r: any) => r.product },
          { header: "Category", accessor: (r: any) => r.category },
          { header: "Shop", accessor: (r: any) => r.shop },
          { header: "Qty", accessor: (r: any) => String(r.quantity) },
          { header: "Value", accessor: (r: any) => formatPrice(r.value) },
          { header: "Last Sold", accessor: (r: any) => r.lastSold },
        ],
        summary: { "Dead Stock Items": String(data.length), "Dead Stock Value": formatPrice(totalDeadValue) },
      };
    }

    default:
      return { data: [], columns: [] };
  }
}
