'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2, Clock, Package, Printer,
  MapPin, Calendar, User, Mail
} from "lucide-react"
import { useState } from "react"
import { addTagsToOrder, ShopifyOrder } from "@/services/shopify"
import { format } from "date-fns"

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

export function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!order) return null;

  const isCustomOrder = order.lineItems.edges.some((edge: any) =>
    edge.node.customAttributes.some((attr: any) => attr.key.startsWith('_recipe_')) ||
    edge.node.product?.title?.toLowerCase().includes('magic request')
  );

  // @ts-ignore - tags might not be in the type yet but come from API
  const currentStatus = PRODUCTION_STEPS.findLast(step => order.tags?.includes(step.tag))?.id || 'pending';

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

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const customerName = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest';
  const customerInitials = order.customer ? `${order.customer.firstName[0]}${order.customer.lastName[0]}` : 'G';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-sm">

        {/* Header Section */}
        <div className="p-6 pr-12 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                {order.name}
                <Badge variant={isCustomOrder ? "default" : "secondary"} className="rounded-full px-3">
                  {isCustomOrder ? "Custom Order" : "Standard Order"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {format(new Date(order.createdAt), "PPP 'at' p")}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const orderNumber = order.name.replace('#', '');
                window.open(`/orders/${orderNumber}/ticket`, '_blank');
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Ticket
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const orderNumber = order.name.replace('#', '');
                window.open(`/orders/${orderNumber}/receipt`, '_blank');
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Receipt
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Main Content (Left Column) */}
            <div className="md:col-span-2 space-y-6">

              {/* Production Status (Custom Only) */}
              {isCustomOrder && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Production Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between relative px-4 py-2">
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
                              onClick={() => handleStatusUpdate(step.id)}
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
                          <div className="flex gap-4 items-start">
                            <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0 border">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-medium text-sm leading-tight">{item.title}</h4>
                                  {item.variant?.title !== 'Default Title' && (
                                    <p className="text-xs text-muted-foreground mt-1">{item.variant?.title}</p>
                                  )}
                                  {item.variant?.sku && (
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">SKU: {item.variant.sku}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium">x{item.quantity}</span>
                                </div>
                              </div>

                              {/* Recipe Card */}
                              {recipe && (
                                <div className="mt-3 bg-primary/5 border border-primary/10 rounded-md p-3">
                                  <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Custom Recipe
                                  </p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Wax:</span> <span>{recipe.wax}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Wick:</span> <span>{recipe.wick}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Scent:</span> <span>{recipe.fragrance}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Color:</span> <span>{recipe.color}</span></div>
                                  </div>
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
            </div>

            {/* Sidebar (Right Column) */}
            <div className="space-y-6">

              {/* Status Card */}
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

              {/* Customer Card */}
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <CardTitle className="text-base font-semibold">Customer</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                      {customerInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate" title={customerName}>{customerName}</div>
                      {order.customer?.email && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={order.customer.email}>
                          <Mail className="w-3 h-3" />
                          {order.customer.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5" />
                      Shipping Address
                    </div>
                    {order.shippingAddress ? (
                      <div className="text-sm pl-5.5 leading-relaxed text-foreground/90">
                        <div>{order.shippingAddress.address1}</div>
                        {order.shippingAddress.address2 && <div>{order.shippingAddress.address2}</div>}
                        <div>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">{order.shippingAddress.country}</div>
                      </div>
                    ) : (
                      <div className="pl-5.5 text-sm text-muted-foreground italic">No shipping address provided</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Card */}
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground">--</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-muted-foreground">--</span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
