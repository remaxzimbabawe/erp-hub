import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, ClientFormData } from "@/lib/schemas";
import { getClients, getShops, createClient, updateClient, deleteClient } from "@/lib/database";
import type { Client } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ClientForm({ defaultValues, shops, onSubmit, submitLabel }: {
  defaultValues: ClientFormData; shops: { _id: string; name: string }[]; onSubmit: (data: ClientFormData) => void; submitLabel: string;
}) {
  const form = useForm<ClientFormData>({ resolver: zodResolver(clientSchema), defaultValues });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
          <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., +1234567890" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="shopId" render={({ field }) => (
          <FormItem><FormLabel>Shop</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a shop" /></SelectTrigger></FormControl>
              <SelectContent>{shops.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full">{submitLabel}</Button>
      </form>
    </Form>
  );
}

export default function ClientsPage() {
  const { toast } = useToast();
  const { hasRole, hasPermission, isShopAccessible } = useAuth();
  const [clients, setClients] = React.useState<Client[]>(getClients());
  const allShops = getShops();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Client | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<Client | null>(null);

  const isSuperAdmin = hasRole('super_admin');
  const canCreate = isSuperAdmin || hasPermission('create_client');
  const canEdit = isSuperAdmin || hasPermission('manage_clients');
  const canDelete = isSuperAdmin || hasPermission('delete_client');
  const accessibleShops = allShops.filter(s => isShopAccessible(s._id));

  const refreshData = () => setClients(getClients());
  const filteredClients = clients.filter(c => isShopAccessible(c.shopId));
  const getShopName = (id: string) => allShops.find(s => s._id === id)?.name || "Unknown";

  const handleCreate = (data: ClientFormData) => {
    createClient({ name: data.name, phoneNumber: data.phoneNumber, shopId: data.shopId });
    refreshData(); setIsCreateOpen(false); toast({ title: "Client created" });
  };
  const handleUpdate = (data: ClientFormData) => {
    if (!editItem) return;
    updateClient(editItem._id, { name: data.name, phoneNumber: data.phoneNumber, shopId: data.shopId });
    refreshData(); setEditItem(null); toast({ title: "Client updated" });
  };
  const handleDelete = () => {
    if (!deleteItem) return;
    deleteClient(deleteItem._id); refreshData(); setDeleteItem(null); toast({ title: "Client deleted" });
  };

  const columns = [
    { key: "name" as const, header: "Name" },
    { key: "phoneNumber" as const, header: "Phone", render: (item: Client) => <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{item.phoneNumber}</div> },
    { key: "shopId" as const, header: "Shop", render: (item: Client) => <Badge variant="outline">{getShopName(item.shopId)}</Badge> },
    { key: "_creationTime" as const, header: "Joined", render: (item: Client) => new Date(item._creationTime).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Clients" description="Manage customer records across your shops">
        {canCreate && <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Client</Button>}
      </PageHeader>
      <DataView data={filteredClients} columns={columns} keyExtractor={(item) => item._id} searchKeys={["name", "phoneNumber"]} searchPlaceholder="Search clients..."
        onEdit={canEdit ? (item) => setEditItem(item) : undefined}
        onDelete={canDelete ? (item) => setDeleteItem(item) : undefined}
        emptyMessage="No clients found."
      />
      <ModalForm open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Add Client" description="Add a new customer record">
        <ClientForm defaultValues={{ name: "", phoneNumber: "", shopId: accessibleShops[0]?._id || "" }} shops={accessibleShops} onSubmit={handleCreate} submitLabel="Add Client" />
      </ModalForm>
      {editItem && (
        <ModalForm open={true} onOpenChange={(open) => !open && setEditItem(null)} title="Edit Client" description="Update client details">
          <ClientForm key={editItem._id} defaultValues={{ name: editItem.name, phoneNumber: editItem.phoneNumber, shopId: editItem.shopId }} shops={accessibleShops} onSubmit={handleUpdate} submitLabel="Update Client" />
        </ModalForm>
      )}
      <ConfirmModal open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)} title="Delete Client" description={`Delete "${deleteItem?.name}"?`} onConfirm={handleDelete} confirmLabel="Delete" variant="destructive" />
    </div>
  );
}
