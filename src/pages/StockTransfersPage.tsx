import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ExportMenu } from "@/components/common/ExportMenu";
import {
  getShops, getShop, getProductTemplates, getProductTemplate,
  getProductCategories, getProducts, getStockTransfers,
  createStockTransfer, updateStockTransferStatus,
  getUser, formatPrice, getProductsByShop,
} from "@/lib/database";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockTransferSchema, type StockTransferFormData } from "@/lib/schemas";
import { ArrowRight, Plus, Search, PackageCheck, PackageX, Package, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockTransfer } from "@/types";

export default function StockTransfersPage() {
  const { toast } = useToast();
  const { currentUser, hasRole } = useAuth();
  const [showCreate, setShowCreate] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [confirmAction, setConfirmAction] = React.useState<{ transfer: StockTransfer; action: 'completed' | 'rejected' } | null>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const shops = getShops();
  const templates = getProductTemplates();
  const categories = getProductCategories();
  const transfers = getStockTransfers().sort((a, b) => b._creationTime - a._creationTime);

  const canManage = hasRole('super_admin') || hasRole('manager');

  const form = useForm<StockTransferFormData>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: { fromShopId: '', toShopId: '', productTemplateId: '', quantity: 1, notes: '' },
  });

  const watchFromShop = form.watch('fromShopId');

  // Get available products for the selected source shop
  const availableProducts = React.useMemo(() => {
    if (!watchFromShop) return [];
    const shopProducts = getProductsByShop(watchFromShop);
    return shopProducts
      .map(p => {
        const tmpl = templates.find(t => t._id === p.productTemplateId);
        return { product: p, template: tmpl };
      })
      .filter(x => x.template && x.product.quantity > 0);
  }, [watchFromShop, templates]);

  const onSubmit = (data: StockTransferFormData) => {
    if (data.fromShopId === data.toShopId) {
      form.setError('toShopId', { message: 'Cannot transfer to the same shop' });
      return;
    }
    createStockTransfer({
      ...data,
      status: 'pending',
      requestedBy: currentUser?._id || '',
    });
    toast({ title: "Transfer requested", description: "Stock transfer order created successfully." });
    form.reset();
    setShowCreate(false);
    forceUpdate();
  };

  const handleAction = () => {
    if (!confirmAction) return;
    updateStockTransferStatus(confirmAction.transfer._id, confirmAction.action, currentUser?._id || '');
    toast({
      title: confirmAction.action === 'completed' ? 'Transfer completed' : 'Transfer rejected',
      description: confirmAction.action === 'completed'
        ? 'Stock has been moved between shops.'
        : 'Transfer request has been rejected.',
    });
    setConfirmAction(null);
    forceUpdate();
  };

  const filtered = transfers.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const tmpl = getProductTemplate(t.productTemplateId);
    const from = getShop(t.fromShopId);
    const to = getShop(t.toShopId);
    return (
      tmpl?.name.toLowerCase().includes(q) ||
      from?.name.toLowerCase().includes(q) ||
      to?.name.toLowerCase().includes(q) ||
      t.saleReference?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  });

  const pendingCount = transfers.filter(t => t.status === 'pending').length;
  const completedCount = transfers.filter(t => t.status === 'completed').length;

  const exportColumns = [
    { key: 'date', header: 'Date' },
    { key: 'product', header: 'Product' },
    { key: 'from', header: 'From Shop' },
    { key: 'to', header: 'To Shop' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'status', header: 'Status' },
    { key: 'saleRef', header: 'Sale Reference' },
    { key: 'notes', header: 'Notes' },
  ];

  const exportData = filtered.map(t => ({
    date: new Date(t._creationTime).toLocaleString(),
    product: getProductTemplate(t.productTemplateId)?.name || '',
    from: getShop(t.fromShopId)?.name || '',
    to: getShop(t.toShopId)?.name || '',
    quantity: t.quantity.toString(),
    status: t.status,
    saleRef: t.saleReference || '',
    notes: t.notes || '',
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground">Transfer inventory between shop locations</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={exportColumns} filename="stock-transfers" title="Stock Transfers Report" />
          {canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />New Transfer
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Package className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><PackageCheck className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><ArrowLeftRight className="h-5 w-5 text-muted-foreground" /></div>
            <div><p className="text-2xl font-bold">{transfers.length}</p><p className="text-xs text-muted-foreground">Total Transfers</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transfers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>From</TableHead>
                <TableHead></TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No transfers found</TableCell></TableRow>
              )}
              {filtered.map(t => {
                const tmpl = getProductTemplate(t.productTemplateId);
                const fromShop = getShop(t.fromShopId);
                const toShop = getShop(t.toShopId);
                const requester = getUser(t.requestedBy);
                return (
                  <TableRow key={t._id}>
                    <TableCell className="text-sm">{new Date(t._creationTime).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{tmpl?.name}</TableCell>
                    <TableCell><Badge variant="outline">{fromShop?.name}</Badge></TableCell>
                    <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell><Badge variant="outline">{toShop?.name}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{t.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={
                        t.status === 'completed' ? 'default' :
                        t.status === 'pending' ? 'secondary' :
                        'destructive'
                      } className={cn(
                        t.status === 'completed' && 'bg-primary/80',
                        t.status === 'pending' && 'bg-warning/80 text-warning-foreground',
                      )}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.saleReference ? (
                        <Badge variant="outline" className="text-xs">Sale: {t.saleReference.slice(0, 12)}…</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{requester?.name || 'System'}</TableCell>
                    <TableCell className="text-right">
                      {t.status === 'pending' && canManage && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="default" onClick={() => setConfirmAction({ transfer: t, action: 'completed' })}>
                            <PackageCheck className="h-3 w-3 mr-1" />Complete
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ transfer: t, action: 'rejected' })}>
                            <PackageX className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Transfer Modal */}
      <ModalForm
        title="Create Stock Transfer"
        description="Request inventory to be moved between shops"
        open={showCreate}
        onOpenChange={(open) => { setShowCreate(open); if (!open) form.reset(); }}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Shop</Label>
              <Controller control={form.control} name="fromShopId" render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue('productTemplateId', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select source..." /></SelectTrigger>
                  <SelectContent>{shops.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              {form.formState.errors.fromShopId && <p className="text-xs text-destructive">{form.formState.errors.fromShopId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>To Shop</Label>
              <Controller control={form.control} name="toShopId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
                  <SelectContent>{shops.filter(s => s._id !== watchFromShop).map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              {form.formState.errors.toShopId && <p className="text-xs text-destructive">{form.formState.errors.toShopId.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product</Label>
            <Controller control={form.control} name="productTemplateId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!watchFromShop}>
                <SelectTrigger><SelectValue placeholder={watchFromShop ? "Select product..." : "Select source shop first"} /></SelectTrigger>
                <SelectContent>
                  {availableProducts.map(({ product, template }) => (
                    <SelectItem key={template!._id} value={template!._id}>
                      {template!.name} (Stock: {product.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {form.formState.errors.productTemplateId && <p className="text-xs text-destructive">{form.formState.errors.productTemplateId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" min={1} {...form.register('quantity', { valueAsNumber: true })} />
            {form.formState.errors.quantity && <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Reason for transfer..." {...form.register('notes')} />
            {form.formState.errors.notes && <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); form.reset(); }}>Cancel</Button>
            <Button type="submit">Create Transfer</Button>
          </div>
        </form>
      </ModalForm>

      {/* Confirm Action Modal */}
      <ConfirmModal
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.action === 'completed' ? 'Complete Transfer' : 'Reject Transfer'}
        description={
          confirmAction?.action === 'completed'
            ? `This will move ${confirmAction.transfer.quantity} units from ${getShop(confirmAction.transfer.fromShopId)?.name} to ${getShop(confirmAction.transfer.toShopId)?.name}. Stock levels will be updated.`
            : 'Are you sure you want to reject this transfer request?'
        }
        onConfirm={handleAction}
        confirmLabel={confirmAction?.action === 'completed' ? 'Complete Transfer' : 'Reject'}
        variant={confirmAction?.action === 'rejected' ? 'destructive' : 'default'}
      />
    </div>
  );
}
