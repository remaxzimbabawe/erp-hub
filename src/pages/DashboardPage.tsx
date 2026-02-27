import * as React from "react";
import { PageHeader, Section } from "@/components/layout/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getShops,
  getProductsSold,
  getProductsSoldToday,
  getProductsSoldYesterday,
  getTopSellingProducts,
  getLowStockProducts,
  getOutOfStockProducts,
  getTopClients,
  getProductTemplates,
  getProducts,
  getClients,
  formatPrice,
} from "@/lib/database";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Store,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const shops = getShops();
  const templates = getProductTemplates();
  const products = getProducts();
  const clients = getClients();
  const allSales = getProductsSold();
  const todaySales = getProductsSoldToday();
  const yesterdaySales = getProductsSoldYesterday();
  const topProducts = getTopSellingProducts(5);
  const lowStock = getLowStockProducts(5);
  const outOfStock = getOutOfStockProducts();
  const topClients = getTopClients(5);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.priceInCents, 0);
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.priceInCents, 0);
  const revenueTrend = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
    : 0;

  // Sales by shop for pie chart
  const salesByShop = shops.map(shop => ({
    name: shop.name,
    value: todaySales.filter(s => s.shopId === shop._id).reduce((sum, s) => sum + s.priceInCents, 0) / 100,
  })).filter(s => s.value > 0);

  // Top products data
  const topProductsData = topProducts.map(tp => {
    const template = templates.find(t => t._id === tp.templateId);
    return {
      name: template?.name || "Unknown",
      sales: tp.count,
      revenue: tp.revenue / 100,
    };
  });

  // Recent sales trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const daySales = allSales.filter(
      s => s._creationTime >= date.getTime() && s._creationTime < nextDate.getTime()
    );
    
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      sales: daySales.length,
      revenue: daySales.reduce((sum, s) => sum + s.priceInCents, 0) / 100,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        description="Overview of your business performance"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatPrice(todayRevenue)}
          icon={DollarSign}
          trend={{ value: Math.round(revenueTrend), isPositive: revenueTrend >= 0 }}
          description="vs yesterday"
          variant="primary"
        />
        <StatCard
          title="Today's Sales"
          value={todaySales.length}
          icon={ShoppingCart}
          description={`${yesterdaySales.length} yesterday`}
        />
        <StatCard
          title="Total Products"
          value={products.length}
          icon={Package}
          description={`${outOfStock.length} out of stock`}
        />
        <StatCard
          title="Active Shops"
          value={shops.length}
          icon={Store}
          description={`${clients.length} total clients`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Shop Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Sales by Shop</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByShop.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={salesByShop}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {salesByShop.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No sales recorded today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue ($)" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  name="Sales Count" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProductsData} layout="vertical">
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120} 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="sales" name="Units Sold" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="revenue" name="Revenue ($)" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No sales data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-base">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <div className="space-y-3">
                {lowStock.map(product => {
                  const template = templates.find(t => t._id === product.productTemplateId);
                  const shop = shops.find(s => s._id === product.shopId);
                  return (
                    <div key={product._id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{template?.name}</p>
                        <p className="text-xs text-muted-foreground">{shop?.name}</p>
                      </div>
                      <StatusBadge status="warning">{product.quantity} left</StatusBadge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">All items well stocked</p>
            )}
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Package className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {outOfStock.length > 0 ? (
              <div className="space-y-3">
                {outOfStock.slice(0, 5).map(product => {
                  const template = templates.find(t => t._id === product.productTemplateId);
                  const shop = shops.find(s => s._id === product.shopId);
                  return (
                    <div key={product._id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{template?.name}</p>
                        <p className="text-xs text-muted-foreground">{shop?.name}</p>
                      </div>
                      <StatusBadge status="error">{product.quantity}</StatusBadge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No items out of stock</p>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-3">
                {topClients.map(tc => {
                  const client = clients.find(c => c._id === tc.clientId);
                  return (
                    <div key={tc.clientId} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{client?.name}</p>
                        <p className="text-xs text-muted-foreground">{tc.orderCount} orders</p>
                      </div>
                      <span className="font-semibold text-sm">{formatPrice(tc.totalSpent)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No client purchases yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
