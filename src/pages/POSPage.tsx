import * as React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getShops, getProductsByShop, getProductTemplates, getProductCategories, getClientsByShop, createProductSold, formatPrice, getProductsSoldByShop } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Search, Plus, Minus, Trash2, User, ArrowRight, Printer } from "lucide-react";
import type { Product, ProductTemplate, ProductCategory, Client, CartItem, SaleSummary } from "@/types";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, hasRole, hasPermission, getUserShopIds, isShopAccessible } = useAuth();

  const allShops = getShops();
  const role = hasRole('super_admin') ? 'super_admin' : hasRole('manager') ? 'manager' : null;
  const userShopIds = getUserShopIds();
  const accessibleShops = role === 'super_admin' || role === 'manager'
    ? allShops
    : allShops.filter(s => userShopIds.includes(s._id));

  // Auto-select shop for shop_manager/app_user with single shop
  const shopIdParam = searchParams.get("shop");
  const shopId = shopIdParam || (accessibleShops.length === 1 ? accessibleShops[0]._id : null);

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [lastSale, setLastSale] = React.useState<SaleSummary | null>(null);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [currentSale, setCurrentSale] = React.useState<SaleSummary | null>(null);

  const shop = allShops.find(s => s._id === shopId);
  const products = shopId ? getProductsByShop(shopId) : [];
  const templates = getProductTemplates();
  const categories = getProductCategories();
  const clients = shopId ? getClientsByShop(shopId) : [];

  const cashierName = currentUser?.name || "Unknown";

  // Check sell permission
  const canSell = hasRole('super_admin') || hasPermission('sell', shopId || undefined);

  if (!shopId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Select a Shop</CardTitle></CardHeader>
          <CardContent>
            <Select onValueChange={(val) => navigate(`/pos?shop=${val}`)}>
              <SelectTrigger><SelectValue placeholder="Choose a shop..." /></SelectTrigger>
              <SelectContent>{accessibleShops.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canSell) {
    return <div className="p-8 text-center text-muted-foreground">You don't have permission to sell at this shop.</div>;
  }

  const getProductInfo = (product: Product) => {
    const template = templates.find(t => t._id === product.productTemplateId)!;
    const category = categories.find(c => c._id === template?.productCategoryId)!;
    const price = product.useDefaultPrice ? template?.priceInCents || 0 : product.priceInCentsAtShop || 0;
    return { template, category, price };
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aInStock = a.quantity > 0;
    const bInStock = b.quantity > 0;
    if (aInStock && !bInStock) return -1;
    if (!aInStock && bInStock) return 1;
    return 0;
  });

  const filteredProducts = sortedProducts.filter(p => {
    const { template, category, price } = getProductInfo(p);
    const query = searchQuery.toLowerCase();
    return template?.name.toLowerCase().includes(query) ||
      category?.name.toLowerCase().includes(query) ||
      formatPrice(price).toLowerCase().includes(query);
  });

  const addToCart = (product: Product) => {
    const { template, category, price } = getProductInfo(product);
    setCart(prev => {
      const existing = prev.find(c => c.product._id === product._id);
      if (existing) return prev.map(c => c.product._id === product._id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, template, category, quantity: 1, priceInCents: price }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => c.product._id === productId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.priceInCents * c.quantity, 0);

  const completeSale = () => {
    cart.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        createProductSold({ name: item.template.name, productId: item.product._id, shopId: shopId!, priceInCents: item.priceInCents, cashierBogusName: cashierName, clientId: selectedClient?._id });
      }
    });
    const sale: SaleSummary = { items: [...cart], total: cartTotal, client: selectedClient || undefined, cashierName, shopId: shopId!, timestamp: Date.now() };
    setCurrentSale(sale);
    setLastSale(sale);
    setShowReceipt(true);
    setCart([]);
    setSelectedClient(null);
    toast({ title: "Sale completed!", description: formatPrice(cartTotal) });
  };

  const printReceipt = () => {
    window.print();
    setShowReceipt(false);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)] animate-fade-in">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, category, or price..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="secondary">{shop?.name}</Badge>
          <Badge variant="outline">{cashierName}</Badge>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg">
          <div className="grid grid-cols-4">
            {filteredProducts.map(product => {
              const { template, category, price } = getProductInfo(product);
              const isOutOfStock = product.quantity <= 0;
              return (
                <div key={product._id} onClick={() => addToCart(product)} className={cn(
                  "border-r border-b p-3 cursor-pointer hover:bg-muted/50 transition-colors aspect-square flex flex-col justify-between",
                  isOutOfStock && "bg-destructive/10 hover:bg-destructive/15"
                )}>
                  <div>
                    <p className="font-medium text-sm line-clamp-2">{template?.name}</p>
                    <p className="text-xs text-muted-foreground">{category?.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{formatPrice(price)}</span>
                    <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="text-xs">{product.quantity}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {lastSale && (
          <Card className="mt-4 cursor-pointer hover:bg-muted/50" onClick={() => { setCurrentSale(lastSale); setShowReceipt(true); }}>
            <CardContent className="p-3 flex items-center justify-between">
              <div><p className="text-sm font-medium">Last Sale</p><p className="text-xs text-muted-foreground">{new Date(lastSale.timestamp).toLocaleTimeString()}</p></div>
              <span className="font-bold">{formatPrice(lastSale.total)}</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cart */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cart</CardTitle>
            <Select value={selectedClient?._id || "walk-in"} onValueChange={(val) => setSelectedClient(val === "walk-in" ? null : clients.find(c => c._id === val) || null)}>
              <SelectTrigger className="w-40"><User className="h-3 w-3 mr-2" /><SelectValue placeholder="Walk-in" /></SelectTrigger>
              <SelectContent><SelectItem value="walk-in">Walk-in</SelectItem>{clients.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2">
          {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Tap products to add to cart</p>}
          {cart.map(item => (
            <div key={item.product._id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.template.name}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(item.priceInCents)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.product._id, -1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.product._id, 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setCart(prev => prev.filter(c => c.product._id !== item.product._id))}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </CardContent>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{cart.reduce((s, c) => s + c.quantity, 0)} items</span>
            <Button variant="outline" size="sm" onClick={() => setCart([])} disabled={cart.length === 0}>Clear</Button>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold">{formatPrice(cartTotal)}</span>
          </div>
          <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={completeSale}>
            Complete Sale <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sale Complete</DialogTitle></DialogHeader>
          {currentSale && (
            <div className="receipt space-y-4">
              <div className="text-center border-b pb-2">
                <h3 className="font-bold">{shop?.name}</h3>
                <p className="text-xs text-muted-foreground">{new Date(currentSale.timestamp).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                {currentSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.template.name} x{item.quantity}</span>
                    <span>{formatPrice(item.priceInCents * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span><span>{formatPrice(currentSale.total)}</span>
              </div>
              {currentSale.client && <p className="text-xs">Client: {currentSale.client.name}</p>}
              <p className="text-xs text-muted-foreground">Cashier: {currentSale.cashierName}</p>
              <div className="flex gap-2 no-print">
                <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(false)}>Next Sale</Button>
                <Button className="flex-1" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" />Print</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
