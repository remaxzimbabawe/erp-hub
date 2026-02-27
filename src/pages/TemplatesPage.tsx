import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productTemplateSchema, ProductTemplateFormData } from "@/lib/schemas";
import { getProductTemplates, getProductCategories, createProductTemplate, updateProductTemplate, deleteProductTemplate, formatPrice } from "@/lib/database";
import type { ProductTemplate, ProductCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function TemplateForm({ defaultValues, categories, onSubmit, submitLabel }: {
  defaultValues: ProductTemplateFormData; categories: ProductCategory[]; onSubmit: (data: ProductTemplateFormData) => void; submitLabel: string;
}) {
  const form = useForm<ProductTemplateFormData>({ resolver: zodResolver(productTemplateSchema), defaultValues });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., Cola 500ml" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="code" render={({ field }) => (
          <FormItem><FormLabel>Product Code (Optional)</FormLabel><FormControl><Input placeholder="e.g., COLA500" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="productCategoryId" render={({ field }) => (
          <FormItem><FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
              <SelectContent>{categories.map(cat => <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="priceInCents" render={({ field }) => (
          <FormItem><FormLabel>Recommended Price (in cents)</FormLabel><FormControl>
            <Input type="number" placeholder="e.g., 250 for $2.50" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
          </FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full">{submitLabel}</Button>
      </form>
    </Form>
  );
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const [templates, setTemplates] = React.useState<ProductTemplate[]>(getProductTemplates());
  const [categories] = React.useState<ProductCategory[]>(getProductCategories());
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ProductTemplate | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<ProductTemplate | null>(null);

  const refreshData = () => setTemplates(getProductTemplates());
  const getCategoryName = (id: string) => categories.find(c => c._id === id)?.name || "Unknown";

  const handleCreate = (data: ProductTemplateFormData) => {
    createProductTemplate({ name: data.name, code: data.code, productCategoryId: data.productCategoryId, priceInCents: data.priceInCents });
    refreshData(); setIsCreateOpen(false); toast({ title: "Template created" });
  };
  const handleUpdate = (data: ProductTemplateFormData) => {
    if (!editItem) return;
    updateProductTemplate(editItem._id, { name: data.name, code: data.code, productCategoryId: data.productCategoryId, priceInCents: data.priceInCents });
    refreshData(); setEditItem(null); toast({ title: "Template updated" });
  };
  const handleDelete = () => {
    if (!deleteItem) return;
    deleteProductTemplate(deleteItem._id); refreshData(); setDeleteItem(null); toast({ title: "Template deleted" });
  };

  const columns = [
    { key: "name" as const, header: "Name" },
    { key: "code" as const, header: "Code", render: (item: ProductTemplate) => item.code || "—" },
    { key: "productCategoryId" as const, header: "Category", render: (item: ProductTemplate) => <Badge variant="secondary">{getCategoryName(item.productCategoryId)}</Badge> },
    { key: "priceInCents" as const, header: "Recommended Price", render: (item: ProductTemplate) => <span className="font-semibold">{formatPrice(item.priceInCents)}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Product Templates" description="Manage product templates with recommended pricing">
        {isSuperAdmin && <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Template</Button>}
      </PageHeader>
      <DataView data={templates} columns={columns} keyExtractor={(item) => item._id} searchKeys={["name", "code"]} searchPlaceholder="Search templates..."
        onEdit={isSuperAdmin ? (item) => setEditItem(item) : undefined}
        onDelete={isSuperAdmin ? (item) => setDeleteItem(item) : undefined}
        emptyMessage="No templates found."
      />
      <ModalForm open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Add Product Template" description="Create a new product template">
        <TemplateForm defaultValues={{ name: "", code: "", productCategoryId: "", priceInCents: 0 }} categories={categories} onSubmit={handleCreate} submitLabel="Create Template" />
      </ModalForm>
      {editItem && (
        <ModalForm open={true} onOpenChange={(open) => !open && setEditItem(null)} title="Edit Template" description="Update product template details">
          <TemplateForm key={editItem._id} defaultValues={{ name: editItem.name, code: editItem.code || "", productCategoryId: editItem.productCategoryId, priceInCents: editItem.priceInCents }} categories={categories} onSubmit={handleUpdate} submitLabel="Update Template" />
        </ModalForm>
      )}
      <ConfirmModal open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)} title="Delete Template" description={`Delete "${deleteItem?.name}"?`} onConfirm={handleDelete} confirmLabel="Delete" variant="destructive" />
    </div>
  );
}
