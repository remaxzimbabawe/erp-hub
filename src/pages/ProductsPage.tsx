import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { QuantityBadge } from "@/components/common/StatusBadge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, ProductFormData } from "@/lib/schemas";
import {
  getProducts,
  getShops,
  getProductTemplates,
  createProduct,
  updateProduct,
  deleteProduct,
  formatPrice,
} from "@/lib/database";
import type { Product, Shop, ProductTemplate } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function ProductForm({
  defaultValues,
  shops,
  templates,
  onSubmit,
  submitLabel,
}: {
  defaultValues: ProductFormData;
  shops: Shop[];
  templates: ProductTemplate[];
  onSubmit: (data: ProductFormData) => void;
  submitLabel: string;
}) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const useDefaultPrice = form.watch("useDefaultPrice");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="productTemplateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Template</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates.map((temp) => (
                    <SelectItem key={temp._id} value={temp._id}>
                      {temp.name} ({formatPrice(temp.priceInCents)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shopId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shop</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop._id} value={shop._id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 50"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="useDefaultPrice"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Use Template Price</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {!useDefaultPrice && (
          <FormField
            control={form.control}
            name="priceInCentsAtShop"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Price (in cents)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 300"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[]>(getProducts());
  const shops = getShops();
  const templates = getProductTemplates();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Product | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<Product | null>(null);

  const refreshData = () => setProducts(getProducts());

  const getTemplateName = (templateId: string) => {
    return templates.find((t) => t._id === templateId)?.name || "Unknown";
  };

  const getShopName = (shopId: string) => {
    return shops.find((s) => s._id === shopId)?.name || "Unknown";
  };

  const getProductPrice = (product: Product) => {
    if (!product.useDefaultPrice && product.priceInCentsAtShop !== undefined) {
      return product.priceInCentsAtShop;
    }
    const template = templates.find((t) => t._id === product.productTemplateId);
    return template?.priceInCents || 0;
  };

  const handleCreate = (data: ProductFormData) => {
    createProduct({
      productTemplateId: data.productTemplateId,
      shopId: data.shopId,
      quantity: data.quantity,
      useDefaultPrice: data.useDefaultPrice,
      priceInCentsAtShop: data.priceInCentsAtShop,
    });
    refreshData();
    setIsCreateOpen(false);
    toast({ title: "Product created", description: "Product has been added to the shop." });
  };

  const handleUpdate = (data: ProductFormData) => {
    if (!editItem) return;
    updateProduct(editItem._id, {
      productTemplateId: data.productTemplateId,
      shopId: data.shopId,
      quantity: data.quantity,
      useDefaultPrice: data.useDefaultPrice,
      priceInCentsAtShop: data.priceInCentsAtShop,
    });
    refreshData();
    setEditItem(null);
    toast({ title: "Product updated", description: "Product has been updated." });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteProduct(deleteItem._id);
    refreshData();
    setDeleteItem(null);
    toast({ title: "Product deleted", description: "The product has been removed." });
  };

  const columns = [
    {
      key: "productTemplateId" as const,
      header: "Product",
      render: (item: Product) => getTemplateName(item.productTemplateId),
    },
    {
      key: "shopId" as const,
      header: "Shop",
      render: (item: Product) => <Badge variant="outline">{getShopName(item.shopId)}</Badge>,
    },
    {
      key: "quantity" as const,
      header: "Stock",
      render: (item: Product) => <QuantityBadge quantity={item.quantity} />,
    },
    {
      key: "price" as const,
      header: "Price",
      render: (item: Product) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{formatPrice(getProductPrice(item))}</span>
          {!item.useDefaultPrice && (
            <Badge variant="secondary" className="text-xs">Custom</Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Products"
        description="Manage product inventory across all shops"
      >
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </PageHeader>

      <DataView
        data={products}
        columns={columns}
        keyExtractor={(item) => item._id}
        searchKeys={["productTemplateId", "shopId"]}
        searchPlaceholder="Search products..."
        onEdit={(item) => setEditItem(item)}
        onDelete={(item) => setDeleteItem(item)}
        emptyMessage="No products found. Add products to your shops."
      />

      {/* Create Modal */}
      <ModalForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add Product to Shop"
        description="Add a product template to a shop's inventory"
      >
        <ProductForm
          defaultValues={{
            productTemplateId: "",
            shopId: "",
            quantity: 0,
            useDefaultPrice: true,
            priceInCentsAtShop: undefined,
          }}
          shops={shops}
          templates={templates}
          onSubmit={handleCreate}
          submitLabel="Add Product"
        />
      </ModalForm>

      {/* Edit Modal */}
      {editItem && (
        <ModalForm
          open={true}
          onOpenChange={(open) => !open && setEditItem(null)}
          title="Edit Product"
          description="Update product details"
        >
          <ProductForm
            key={editItem._id}
            defaultValues={{
              productTemplateId: editItem.productTemplateId,
              shopId: editItem.shopId,
              quantity: editItem.quantity,
              useDefaultPrice: editItem.useDefaultPrice,
              priceInCentsAtShop: editItem.priceInCentsAtShop,
            }}
            shops={shops}
            templates={templates}
            onSubmit={handleUpdate}
            submitLabel="Update Product"
          />
        </ModalForm>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
