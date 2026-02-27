import * as React from "react";
import { PageHeader, Section } from "@/components/layout/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getShops, getProductsSold, getProductsSoldToday, getProductsSoldYesterday,
  getTopSellingProducts, getLowStockProducts, getOutOfStockProducts, getTopClients,
  getProductTemplates, getProducts, getClients, formatPrice, getAuditLogs, getUsers,
} from "@/lib/database";
import { useAuth } from "@/lib/auth";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, Store, FileText } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const { isShopAccessible, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const isManager = hasRole('manager');
  const showAll = isSuperAdmin || isManager;

  const shops = getShops().filter(s => isShopAccessible(s._id));
  const templates = getProductTemplates();
  const products = getProducts().filter(p => isShopAccessible(p.shopId));
  const clients = getClients().filter(c => isShopAccessible(c.shopId));
  const allSales = getProductsSold().filter(s => isShopAccessible(s.shopId));
  const todaySales = getProductsSoldToday().filter(s => isShopAccessible(s.shopId));
  const yesterdaySales = getProductsSoldYesterday().filter(s => isShopAccessible(s.shopId));
  const topProducts = getTopSellingProducts(5);
  const lowStock = getLowStockProducts(5).filter(p => isShopAccessible(p.shopId));
  const outOfStock = getOutOfStockProducts().filter(p => isShopAccessible(p.shopId));
  const topClients = getTopClients(5);
  const auditLogs = isSuperAdmin ? getAuditLogs().sort((a, b) => b._creationTime - a._creationTime).slice(0, 10) : [];
  const users = getUsers();

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.priceInCents, 0);
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.priceInCents, 0);
  const revenueTrend = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

  const salesByShop = shops.map(shop => ({
    name: shop.name,
    value: todaySales.filter(s => s.shopId === shop._id).reduce((sum, s) => sum + s.priceInCents, 0) / 100,
  })).filter(s => s.value > 0);

  const topProductsData = topProducts.map(tp => {
    const template = templates.find(t => t._id === tp.templateId);
    return { name: template?.name || "Unknown", sales: tp.count, revenue: tp.revenue / 100 };
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i)); date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);
    const daySales = allSales.filter(s => s._creationTime >= date.getTime() && s._creationTime < nextDate.getTime());
    return { date: date.toLocaleDateString('en-US', { weekday: 'short' }), sales: daySales.length, revenue: daySales.reduce((sum, s) => sum + s.priceInCents, 0) / 100 };
  });

  // Hourly distribution for today
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const today = new Date(); today.setHours(h, 0, 0, 0);
    const nextHour = new Date(today); nextHour.setHours(h + 1);
    const hourSales = todaySales.filter(s => s._creationTime >= today.getTime() && s._creationTime < nextHour.getTime());
    return { hour: `${h}:00`, count: hourSales.length, revenue: hourSales.reduce((sum, s) => sum + s.priceInCents, 0) / 100 };
  }).filter(h => h.count > 0 || h.hour === '9:00' || h.hour === '12:00' || h.hour === '17:00');

  const getUserName = (id: string) => users.find(u => u._id === id)?.name || id;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Overview of your business performance" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={formatPrice(todayRevenue)} icon={DollarSign}
          trend={{ value: Math.round(revenueTrend), isPositive: revenueTrend >= 0 }} description="vs yesterday" variant="primary" />
        <StatCard title="Today's Sales" value={todaySales.length} icon={ShoppingCart} description={`${yesterdaySales.length} yesterday`} />
        <StatCard title="Total Products" value={products.length} icon={Package} description={`${outOfStock.length} out of stock`} />
        <StatCard title="Active Shops" value={shops.length} icon={Store} description={`${clients.length} total clients`} />
      </div>

      {/* Yesterday vs Today comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Yesterday vs Today</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Yesterday</p>
                <p className="text-2xl font-bold">{formatPrice(yesterdayRevenue)}</p>
                <p className="text-sm text-muted-foreground">{yesterdaySales.length} sales</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{formatPrice(todayRevenue)}</p>
                <p className="text-sm text-muted-foreground">{todaySales.length} sales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Today's Sales by Shop</CardTitle></CardHeader>
          <CardContent>
            {salesByShop.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={salesByShop} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {salesByShop.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[200px] text-muted-foreground">No sales today</div>}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales Trend (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue ($)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-1))" }} />
                <Line type="monotone" dataKey="sales" name="Sales Count" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {hourlyData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Hourly Sales Distribution (Today)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="count" name="Sales" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Selling Products</CardTitle></CardHeader>
        <CardContent>
          {topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProductsData} layout="vertical">
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="sales" name="Units Sold" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="revenue" name="Revenue ($)" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground">No sales data</div>}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <div><p className="font-medium text-sm">{template?.name}</p><p className="text-xs text-muted-foreground">{shop?.name}</p></div>
                      <StatusBadge status="warning">{product.quantity} left</StatusBadge>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-muted-foreground text-sm">All items well stocked</p>}
          </CardContent>
        </Card>

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
                      <div><p className="font-medium text-sm">{template?.name}</p><p className="text-xs text-muted-foreground">{shop?.name}</p></div>
                      <StatusBadge status="error">{product.quantity}</StatusBadge>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-muted-foreground text-sm">No items out of stock</p>}
          </CardContent>
        </Card>

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
                      <div><p className="font-medium text-sm">{client?.name}</p><p className="text-xs text-muted-foreground">{tc.orderCount} orders</p></div>
                      <span className="font-semibold text-sm">{formatPrice(tc.totalSpent)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-muted-foreground text-sm">No client purchases yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity (Super Admin only) */}
      {isSuperAdmin && auditLogs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log._id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm">{log.description}</p>
                    <p className="text-xs text-muted-foreground">{getUserName(log.userId)} · {new Date(log._creationTime).toLocaleString()}</p>
                  </div>
                  <Badge variant={log.action === 'delete' ? 'destructive' : log.action === 'create' ? 'default' : 'secondary'} className="text-xs">{log.action}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
