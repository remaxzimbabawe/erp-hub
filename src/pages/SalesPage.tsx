import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { Badge } from "@/components/ui/badge";
import { getProductsSold, getShops, getClients, formatPrice } from "@/lib/database";
import { useAuth } from "@/lib/auth";
import { ExportMenu } from "@/components/common/ExportMenu";
import type { ProductSold } from "@/types";
import type { ExportColumn } from "@/lib/export";

export default function SalesPage() {
  const { isShopAccessible } = useAuth();
  const allSales = getProductsSold();
  const shops = getShops();
  const clients = getClients();

  const filteredSales = allSales.filter(s => isShopAccessible(s.shopId));
  const sortedSales = filteredSales.sort((a, b) => b._creationTime - a._creationTime);
  const getShopName = (shopId: string) => shops.find(s => s._id === shopId)?.name || "Unknown";
  const getClientName = (clientId?: string) => clientId ? clients.find(c => c._id === clientId)?.name : "Walk-in";

  const columns = [
    { key: "name" as const, header: "Product" },
    { key: "shopId" as const, header: "Shop", render: (item: ProductSold) => <Badge variant="outline">{getShopName(item.shopId)}</Badge> },
    { key: "priceInCents" as const, header: "Price", render: (item: ProductSold) => <span className="font-semibold">{formatPrice(item.priceInCents)}</span> },
    { key: "cashierBogusName" as const, header: "Cashier" },
    { key: "clientId" as const, header: "Client", render: (item: ProductSold) => getClientName(item.clientId) || "—" },
    { key: "_creationTime" as const, header: "Date", render: (item: ProductSold) => new Date(item._creationTime).toLocaleString() },
  ];

  const exportColumns: ExportColumn[] = [
    { header: "Product", accessor: (item: ProductSold) => item.name },
    { header: "Shop", accessor: (item: ProductSold) => getShopName(item.shopId) },
    { header: "Price", accessor: (item: ProductSold) => formatPrice(item.priceInCents) },
    { header: "Cashier", accessor: (item: ProductSold) => item.cashierBogusName },
    { header: "Client", accessor: (item: ProductSold) => getClientName(item.clientId) || "Walk-in" },
    { header: "Source Shop", accessor: (item: ProductSold) => item.sourceShopName || "—" },
    { header: "Date", accessor: (item: ProductSold) => new Date(item._creationTime).toLocaleString() },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Sales History" description="View all completed transactions" />
        <ExportMenu data={sortedSales} columns={exportColumns} title="Sales Report" filename="sales-report" />
      </div>
      <DataView
        data={sortedSales}
        columns={columns}
        keyExtractor={(item) => item._id}
        searchKeys={["name", "cashierBogusName"]}
        searchPlaceholder="Search sales..."
        emptyMessage="No sales recorded yet."
      />
    </div>
  );
}
