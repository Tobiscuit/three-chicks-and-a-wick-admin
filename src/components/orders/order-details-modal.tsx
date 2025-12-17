'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2, Clock, Package, Printer,
  MapPin, Calendar, Mail, Sparkles
} from "lucide-react"
import { useState } from "react"
import { addTagsToOrder, ShopifyOrder } from "@/services/shopify"
import { format } from "date-fns"
import { useMediaQuery } from "@/hooks/use-media-query"

type OrderDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: ShopifyOrder | null;
}

type ProductionStep = {
  id: string;
  label: string;
  tag: string;
  icon: any;
}

const PRODUCTION_STEPS: ProductionStep[] = [
  { id: 'poured', label: 'Poured', tag: 'status:poured', icon: Package },
  { id: 'curing', label: 'Curing', tag: 'status:curing', icon: Clock },
  { id: 'ready', label: 'Ready', tag: 'status:ready', icon: CheckCircle2 },
];

// Shared content component to avoid duplication
function OrderContent({ order, isUpdating, onStatusUpdate, onPrint }: {
  order: ShopifyOrder;
  isUpdating: boolean;
  onStatusUpdate: (stepId: string) => void;
  onPrint: (url: string) => void;
}) {
  const isCustomOrder = order.lineItems.edges.some((edge: any) =>
    edge.node.customAttributes.some((attr: any) => attr.key.startsWith('_recipe_')) ||
    edge.node.product?.title?.toLowerCase().includes('magic request')
  );

  // @ts-ignore - tags might not be in the type yet but come from API
  const currentStatus = PRODUCTION_STEPS.findLast(step => order.tags?.includes(step.tag))?.id || 'pending';

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const customerName = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest';
  const customerInitials = order.customer ? `${order.customer.firstName[0]}${order.customer.lastName[0]}` : 'G';

  return (
    <div className="space-y-6">
      {/* Production Status (Custom Only) */}
      {isCustomOrder && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Production Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between relative px-2 py-2">
              {/* Connecting Line */}
              <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10" />

              {PRODUCTION_STEPS.map((step, index) => {
                const isCompleted = PRODUCTION_STEPS.findIndex(s => s.id === currentStatus) >= index;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex flex-col items-center bg-background px-2 z-10">
                    <Button
                      variant={isCompleted ? "default" : "outline"}
                      size="icon"
                      className={`rounded-full w-10 h-10 transition-all ${isCompleted ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}`}
                      onClick={() => onStatusUpdate(step.id)}
                      disabled={isUpdating}
                    >
                      <Icon className="w-5 h-5" />
                    </Button>
                    <span className={`text-xs mt-2 font-medium ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Status */}
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-base font-semibold">Order Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Payment</span>
            <Badge variant={order.displayFinancialStatus === 'PAID' ? 'default' : 'secondary'} className={order.displayFinancialStatus === 'PAID' ? 'bg-green-600 hover:bg-green-700' : ''}>
              {order.displayFinancialStatus || 'PENDING'}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Fulfillment</span>
            <Badge variant={order.displayFulfillmentStatus === 'FULFILLED' ? 'default' : 'outline'}>
              {order.displayFulfillmentStatus || 'UNFULFILLED'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-base font-semibold flex justify-between items-center">
            <span>Items</span>
            <Badge variant="outline" className="font-normal">
              {order.lineItems.edges.reduce((acc: number, edge: any) => acc + edge.node.quantity, 0)} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {order.lineItems.edges.map((edge: any) => {
              const item = edge.node;
              const recipeAttr = item.customAttributes.find((attr: any) => attr.key === '_recipe_');
              const recipe = recipeAttr ? JSON.parse(recipeAttr.value) : null;

              return (
                <div key={item.id} className="p-4 hover:bg-muted/5 transition-colors">
                  <div className="flex gap-3 items-start">
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0 border overflow-hidden">
                      {item.product?.featuredImage ? (
                        <img
                          src={item.product.featuredImage.url}
                          alt={item.product.featuredImage.altText || item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-medium text-sm leading-tight">{item.title}</h4>
                          {item.variant?.title !== 'Default Title' && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant?.title}</p>
                          )}
                        </div>
                        <span className="text-sm font-medium">x{item.quantity}</span>
                      </div>

                      {/* Recipe Card */}
                      {(recipe || item.customAttributes.length > 0) && (
                        <div className="mt-2 bg-accent/30 border border-accent rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="w-3 h-3 text-primary fill-primary/20" />
                            <span className="font-semibold text-xs text-primary">Custom Creation</span>
                          </div>

                          {recipe ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Wax:</span> {recipe.wax}</div>
                              <div><span className="text-muted-foreground">Wick:</span> {recipe.wick}</div>
                              <div><span className="text-muted-foreground">Scent:</span> {recipe.fragrance}</div>
                              <div><span className="text-muted-foreground">Color:</span> {recipe.color}</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {item.customAttributes
                                .filter((attr: any) => !attr.key.startsWith('_'))
                                .map((attr: any) => (
                                  <div key={attr.key}>
                                    <span className="text-muted-foreground">{attr.key}:</span> {attr.value}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer Card */}
      <Card>
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-base font-semibold">Customer</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 text-sm">
              {customerInitials}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{customerName}</div>
              {order.customer?.email && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{order.customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {order.shippingAddress && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  Shipping
                </div>
                <div className="text-sm leading-relaxed pl-[18px]">
                  <div>{order.shippingAddress.address1}</div>
                  <div>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{order.totalShippingPriceSet ? formatCurrency(order.totalShippingPriceSet.shopMoney.amount, order.totalShippingPriceSet.shopMoney.currencyCode) : '--'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{order.totalTaxSet ? formatCurrency(order.totalTaxSet.shopMoney.amount, order.totalTaxSet.shopMoney.currencyCode) : '--'}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">
              {formatCurrency(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!order) return null;

  const handleStatusUpdate = async (stepId: string) => {
    setIsUpdating(true);
    try {
      const step = PRODUCTION_STEPS.find(s => s.id === stepId);
      if (step) {
        await addTagsToOrder(order.id, [step.tag]);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = (url: string) => {
    const iframeId = 'print-iframe';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => iframe.contentWindow?.print();
  };

  const isCustomOrder = order.lineItems.edges.some((edge: any) =>
    edge.node.customAttributes.some((attr: any) => attr.key.startsWith('_recipe_')) ||
    edge.node.product?.title?.toLowerCase().includes('magic request')
  );

  // Header content (shared)
  const headerContent = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">{order.name}</span>
        <Badge variant={isCustomOrder ? "default" : "secondary"} className="rounded-full text-xs">
          {isCustomOrder ? "Custom" : "Standard"}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
        <Calendar className="w-3.5 h-3.5" />
        {format(new Date(order.createdAt), "PPP 'at' p")}
      </div>
    </>
  );

  // Action buttons
  const actionButtons = (
    <div className="flex gap-2 mt-3">
      <Button variant="outline" size="sm" onClick={() => {
        const orderNumber = order.name.replace('#', '');
        handlePrint(`/orders/${orderNumber}/ticket`);
      }}>
        <Printer className="w-4 h-4 mr-1.5" />
        Ticket
      </Button>
      <Button variant="outline" size="sm" onClick={() => {
        const orderNumber = order.name.replace('#', '');
        handlePrint(`/orders/${orderNumber}/receipt`);
      }}>
        <Printer className="w-4 h-4 mr-1.5" />
        Receipt
      </Button>
    </div>
  );

  // Desktop: Side Sheet
  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[540px] sm:max-w-[540px] p-0 flex flex-col"
        >
          <div className="p-6 border-b bg-muted/30">
            <SheetHeader className="space-y-0">
              <SheetTitle className="text-left">{headerContent}</SheetTitle>
              <SheetDescription className="sr-only">Order details</SheetDescription>
            </SheetHeader>
            {actionButtons}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <OrderContent 
                order={order} 
                isUpdating={isUpdating} 
                onStatusUpdate={handleStatusUpdate}
                onPrint={handlePrint}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Mobile: Bottom Drawer (swipe to dismiss)
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b pb-4">
          <DrawerTitle>{headerContent}</DrawerTitle>
          <DrawerDescription className="sr-only">Order details</DrawerDescription>
          {actionButtons}
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-4 overflow-auto max-h-[calc(90vh-180px)]">
          <OrderContent 
            order={order} 
            isUpdating={isUpdating} 
            onStatusUpdate={handleStatusUpdate}
            onPrint={handlePrint}
          />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
