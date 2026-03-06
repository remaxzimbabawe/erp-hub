import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProducts, getProductTemplates, getProductCategories, getShops, formatPrice } from "@/lib/database";
import { useAuth } from "@/lib/auth";
import { Search, AlertTriangle, PackageX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportMenu } from "@/components/common/ExportMenu";
import type { ExportColumn } from "@/lib/export";

const LOW_STOCK_THRESHOLD = 5;

type EnrichedProduct = ReturnType<typeof useEnrichedProducts>[number];

function useEnrichedProducts() {
  const products = getProducts();
  const templates = getProductTemplates();
  const categories = getProductCategories();
  const shops = getShops();

  return products.map(p => {
    const template = templates.find(t => t._id === p.productTemplateId);
    const category = template ? categories.find(c => c._id === template.productCategoryId) : null;
    const shop = shops.find(s => s._id === p.shopId);
    const price = p.useDefaultPrice ? template?.priceInCents || 0 : p.priceInCentsAtShop || 0;
    return { ...p, templateName: template?.name || "Unknown", categoryName: category?.name || "Unknown", shopName: shop?.name || "Unknown", price };
  });
}

export default function StockPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const enriched = useEnrichedProducts();

  const query = searchQuery.toLowerCase().trim();
  const filtered = query
    ? enriched.filter(p => p.templateName.toLowerCase().includes(query) || p.categoryName.toLowerCase().includes(query) || p.shopName.toLowerCase().includes(query))
    : enriched;

  const outOfStock = filtered.filter(p => p.quantity <= 0);
  const lowStock = filtered.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD);

  const groupByTemplate = (items: typeof enriched) => {
    const map = new Map<string, typeof enriched>();
    items.forEach(item => {
      const key = item.productTemplateId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries()).map(([templateId, products]) => ({
      templateId,
      templateName: products[0].templateName,
      categoryName: products[0].categoryName,
      products,
    }));
  };

  const exportColumns: ExportColumn[] = [
    { header: "Product", accessor: (item: EnrichedProduct) => item.templateName },
    { header: "Category", accessor: (item: EnrichedProduct) => item.categoryName },
    { header: "Shop", accessor: (item: EnrichedProduct) => item.shopName },
    { header: "Price", accessor: (item: EnrichedProduct) => formatPrice(item.price) },
    { header: "Stock", accessor: (item: EnrichedProduct) => String(item.quantity) },
    { header: "Status", accessor: (item: EnrichedProduct) => item.quantity <= 0 ? "Out of Stock" : item.quantity <= LOW_STOCK_THRESHOLD ? "Low Stock" : "In Stock" },
  ];

  const StockTable = ({ items }: { items: typeof enriched }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Shop</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
        ) : items.map(p => (
          <TableRow key={p._id}>
            <TableCell className="font-medium">{p.templateName}</TableCell>
            <TableCell>{p.categoryName}</TableCell>
            <TableCell><Badge variant="secondary">{p.shopName}</Badge></TableCell>
            <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={p.quantity <= 0 ? "destructive" : p.quantity <= LOW_STOCK_THRESHOLD ? "outline" : "secondary"}>
                {p.quantity}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const grouped = groupByTemplate(filtered.filter(p => p.quantity <= LOW_STOCK_THRESHOLD));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Overview</h1>
          <p className="text-muted-foreground">Monitor inventory levels across all shops</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2 flex items-center gap-2">
            <PackageX className="h-4 w-4 text-destructive" />
            <div className="text-center">
              <p className="text-xl font-bold text-destructive">{outOfStock.length}</p>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
            </div>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-foreground" />
            <div className="text-center">
              <p className="text-xl font-bold text-accent-foreground">{lowStock.length}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
          </Card>
          <ExportMenu data={filtered} columns={exportColumns} title="Inventory Report" filename="inventory-report" />
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by product, category, or shop..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="out">Out of Stock ({outOfStock.length})</TabsTrigger>
          <TabsTrigger value="low">Low Stock ({lowStock.length})</TabsTrigger>
          <TabsTrigger value="all">All Products</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          {grouped.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">All products are well stocked!</CardContent></Card>
          ) : grouped.map(group => (
            <Card key={group.templateId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{group.templateName}</CardTitle>
                  <Badge variant="outline">{group.categoryName}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {group.products.map(p => (
                    <div key={p._id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <span className="text-sm">{p.shopName}</span>
                      <Badge variant={p.quantity <= 0 ? "destructive" : "outline"} className="text-xs">{p.quantity} left</Badge>
                    </div>
                  ))}
                  {enriched.filter(ep => ep.productTemplateId === group.templateId && ep.quantity > LOW_STOCK_THRESHOLD).map(p => (
                    <div key={p._id} className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                      <span className="text-sm">{p.shopName}</span>
                      <Badge variant="secondary" className="text-xs">{p.quantity} in stock</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="out" className="mt-4">
          <Card><CardContent className="p-0"><StockTable items={outOfStock} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="low" className="mt-4">
          <Card><CardContent className="p-0"><StockTable items={lowStock} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card><CardContent className="p-0"><StockTable items={filtered} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
