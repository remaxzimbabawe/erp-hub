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
  | "stock_aging";

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

    default:
      return { data: [], columns: [] };
  }
}
