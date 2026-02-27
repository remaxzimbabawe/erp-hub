import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCategorySchema, ProductCategoryFormData } from "@/lib/schemas";
import {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from "@/lib/database";
import type { ProductCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function CategoryForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues: ProductCategoryFormData;
  onSubmit: (data: ProductCategoryFormData) => void;
  submitLabel: string;
}) {
  const form = useForm<ProductCategoryFormData>({
    resolver: zodResolver(productCategorySchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Beverages" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., BEV" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = React.useState<ProductCategory[]>(getProductCategories());
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ProductCategory | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<ProductCategory | null>(null);

  const refreshData = () => setCategories(getProductCategories());

  const handleCreate = (data: ProductCategoryFormData) => {
    createProductCategory({ name: data.name, code: data.code });
    refreshData();
    setIsCreateOpen(false);
    toast({ title: "Category created", description: `${data.name} has been added.` });
  };

  const handleUpdate = (data: ProductCategoryFormData) => {
    if (!editItem) return;
    updateProductCategory(editItem._id, { name: data.name, code: data.code });
    refreshData();
    setEditItem(null);
    toast({ title: "Category updated", description: `${data.name} has been updated.` });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteProductCategory(deleteItem._id);
    refreshData();
    setDeleteItem(null);
    toast({ title: "Category deleted", description: "The category has been removed." });
  };

  const columns = [
    { key: "name" as const, header: "Name" },
    { key: "code" as const, header: "Code", render: (item: ProductCategory) => item.code || "—" },
    {
      key: "_creationTime" as const,
      header: "Created",
      render: (item: ProductCategory) => new Date(item._creationTime).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Product Categories"
        description="Manage product categories for organizing your inventory"
      >
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </PageHeader>

      <DataView
        data={categories}
        columns={columns}
        keyExtractor={(item) => item._id}
        searchKeys={["name", "code"]}
        searchPlaceholder="Search categories..."
        onEdit={(item) => setEditItem(item)}
        onDelete={(item) => setDeleteItem(item)}
        emptyMessage="No categories found. Create one to get started."
      />

      {/* Create Modal */}
      <ModalForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add Category"
        description="Create a new product category"
      >
        <CategoryForm
          defaultValues={{ name: "", code: "" }}
          onSubmit={handleCreate}
          submitLabel="Create Category"
        />
      </ModalForm>

      {/* Edit Modal */}
      {editItem && (
        <ModalForm
          open={!!editItem}
          onOpenChange={(open) => !open && setEditItem(null)}
          title="Edit Category"
          description="Update category details"
        >
          <CategoryForm
            key={editItem._id}
            defaultValues={{ name: editItem.name, code: editItem.code || "" }}
            onSubmit={handleUpdate}
            submitLabel="Update Category"
          />
        </ModalForm>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
