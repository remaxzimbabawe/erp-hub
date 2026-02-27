import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Store, Package, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopSchema, ShopFormData } from "@/lib/schemas";
import {
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getProductsByShop,
  getClientsByShop,
} from "@/lib/database";
import type { Shop } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function ShopForm({ defaultValues, onSubmit, submitLabel }: {
  defaultValues: ShopFormData;
  onSubmit: (data: ShopFormData) => void;
  submitLabel: string;
}) {
  const form = useForm<ShopFormData>({ resolver: zodResolver(shopSchema), defaultValues });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Shop Name</FormLabel><FormControl><Input placeholder="e.g., Downtown Store" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe this shop location..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full">{submitLabel}</Button>
      </form>
    </Form>
  );
}

export default function ShopsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasRole, isShopAccessible } = useAuth();
  const [shops, setShops] = React.useState<Shop[]>(getShops());
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Shop | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<Shop | null>(null);

  const isSuperAdmin = hasRole('super_admin');
  const refreshData = () => setShops(getShops());

  const filteredShops = shops.filter(s => isShopAccessible(s._id));

  const handleCreate = (data: ShopFormData) => {
    createShop({ name: data.name, description: data.description });
    refreshData(); setIsCreateOpen(false);
    toast({ title: "Shop created", description: `${data.name} has been added.` });
  };

  const handleUpdate = (data: ShopFormData) => {
    if (!editItem) return;
    updateShop(editItem._id, { name: data.name, description: data.description });
    refreshData(); setEditItem(null);
    toast({ title: "Shop updated" });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteShop(deleteItem._id); refreshData(); setDeleteItem(null);
    toast({ title: "Shop deleted" });
  };

  const handleView = (shop: Shop) => navigate(`/pos?shop=${shop._id}`);

  const columns = [
    { key: "name" as const, header: "Name" },
    { key: "description" as const, header: "Description" },
    { key: "products" as const, header: "Products", render: (item: Shop) => getProductsByShop(item._id).length },
    { key: "clients" as const, header: "Clients", render: (item: Shop) => getClientsByShop(item._id).length },
  ];

  const renderGridItem = (shop: Shop) => {
    const products = getProductsByShop(shop._id);
    const clients = getClientsByShop(shop._id);
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handleView(shop)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-2"><Store className="h-4 w-4 text-primary-foreground" /></div>
            <CardTitle className="text-base">{shop.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{shop.description}</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-1 text-sm"><Package className="h-4 w-4 text-muted-foreground" /><span>{products.length} products</span></div>
            <div className="flex items-center gap-1 text-sm"><Users className="h-4 w-4 text-muted-foreground" /><span>{clients.length} clients</span></div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Shops" description="Manage your store locations">
        {isSuperAdmin && <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Shop</Button>}
      </PageHeader>
      <DataView
        data={filteredShops} columns={columns} keyExtractor={(item) => item._id}
        searchKeys={["name", "description"]} searchPlaceholder="Search shops..."
        onView={handleView}
        onEdit={isSuperAdmin ? (item) => setEditItem(item) : undefined}
        onDelete={isSuperAdmin ? (item) => setDeleteItem(item) : undefined}
        viewModes={["grid", "table", "list"]} defaultView="grid"
        renderGridItem={renderGridItem} emptyMessage="No shops found."
      />
      <ModalForm open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Add Shop" description="Create a new store location">
        <ShopForm defaultValues={{ name: "", description: "" }} onSubmit={handleCreate} submitLabel="Create Shop" />
      </ModalForm>
      {editItem && (
        <ModalForm open={true} onOpenChange={(open) => !open && setEditItem(null)} title="Edit Shop" description="Update shop details">
          <ShopForm key={editItem._id} defaultValues={{ name: editItem.name, description: editItem.description }} onSubmit={handleUpdate} submitLabel="Update Shop" />
        </ModalForm>
      )}
      <ConfirmModal open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)} title="Delete Shop" description={`Are you sure you want to delete "${deleteItem?.name}"?`} onConfirm={handleDelete} confirmLabel="Delete" variant="destructive" />
    </div>
  );
}
