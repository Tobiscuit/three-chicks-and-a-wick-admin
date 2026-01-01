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
  MapPin, Calendar, Mail, Sparkles, Loader2
} from "lucide-react"
import { useState, useEffect } from "react"
import { addTagsToOrder, ShopifyOrder } from "@/services/shopify"
import { format } from "date-fns"
import { useMediaQuery } from "@/hooks/use-media-query"

type OrderDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: ShopifyOrder | null;
  onOrderUpdated?: (order: ShopifyOrder) => void;
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

// Animated counter hook for total display
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

// Staggered animation wrapper
function AnimatedCard({ children, index, className = "" }: { 
  children: React.ReactNode; 
  index: number;
  className?: string;
}) {
  const delay = Math.min(index * 75, 400); // 75ms stagger, max 400ms
  
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`
        motion-safe:motion-preset-fade-lg
        motion-safe:motion-translate-y-in-[10px]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Shared content component with all bleeding-edge enhancements
function OrderContent({ order, isUpdating, onStatusUpdate }: {
  order: ShopifyOrder;
  isUpdating: boolean;
  onStatusUpdate: (stepId: string) => void;
}) {
  const isCustomOrder = order.lineItems.edges.some((edge: any) =>
    edge.node.customAttributes.some((attr: any) => attr.key.startsWith('_recipe_')) ||
    edge.node.product?.title?.toLowerCase().includes('magic request')
  );

  // @ts-ignore - tags might not be in the type yet but come from API
  const currentStatus = PRODUCTION_STEPS.findLast(step => order.tags?.includes(step.tag))?.id || 'pending';
  const currentStepIndex = PRODUCTION_STEPS.findIndex(s => s.id === currentStatus);

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const customerName = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest';
  const customerInitials = order.customer ? `${order.customer.firstName[0]}${order.customer.lastName[0]}` : 'G';

  // Animated total (in cents for precision)
  const totalCents = Math.round(parseFloat(order.totalPriceSet.shopMoney.amount) * 100);
  const animatedCents = useAnimatedCounter(totalCents, 800);
  const animatedTotal = (animatedCents / 100).toFixed(2);

  let cardIndex = 0;

  return (
    <div className="space-y-6">
      {/* Production Status (Custom Only) - Animated Stepper */}
      {isCustomOrder && (
        <AnimatedCard index={cardIndex++}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Production Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between relative px-4 py-2">
                {/* Animated Connecting Line - fills as progress advances */}
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full -z-10 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-700 ease-out motion-reduce:transition-none"
                    style={{ 
                      width: `${currentStepIndex >= 0 ? ((currentStepIndex + 1) / PRODUCTION_STEPS.length) * 100 : 0}%` 
                    }}
                  />
                </div>

                {PRODUCTION_STEPS.map((step, index) => {
                  const isCompleted = currentStepIndex >= index;
                  const isCurrent = currentStepIndex === index;
                  const Icon = step.icon;

                  return (
                    <div key={step.id} className="flex flex-col items-center bg-background px-3 z-10">
                      <Button
                        variant={isCompleted ? "default" : "outline"}
                        size="icon"
                        className={`
                          rounded-full w-12 h-12 
                          transition-all duration-300 motion-reduce:transition-none
                          ${isCompleted 
                            ? 'bg-primary shadow-lg shadow-primary/25 ring-4 ring-primary/20' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }
                          ${isCurrent && !isUpdating ? 'animate-pulse' : ''}
                        `}
                        onClick={() => onStatusUpdate(step.id)}
                        disabled={isUpdating}
                      >
                        {isUpdating && isCurrent ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </Button>
                      <span className={`
                        text-xs mt-2 font-medium transition-colors duration-300
                        ${isCompleted ? 'text-primary' : 'text-muted-foreground'}
                      `}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* Order Status - with spinner badges for pending states */}
      <AnimatedCard index={cardIndex++}>
        <Card className="transition-shadow duration-300 hover:shadow-md motion-reduce:transition-none">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-base font-semibold">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment</span>
              <Badge 
                variant={order.displayFinancialStatus === 'PAID' ? 'default' : 'secondary'} 
                className={`
                  transition-all duration-300 motion-reduce:transition-none
                  ${order.displayFinancialStatus === 'PAID' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'flex items-center gap-1.5'
                  }
                `}
              >
                {order.displayFinancialStatus !== 'PAID' && order.displayFinancialStatus !== 'REFUNDED' && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {order.displayFinancialStatus || 'PENDING'}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fulfillment</span>
              <Badge 
                variant={order.displayFulfillmentStatus === 'FULFILLED' ? 'default' : 'outline'}
                className="transition-all duration-300 motion-reduce:transition-none flex items-center gap-1.5"
              >
                {order.displayFulfillmentStatus !== 'FULFILLED' && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {order.displayFulfillmentStatus || 'UNFULFILLED'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Order Items - with hover lift effect */}
      <AnimatedCard index={cardIndex++}>
        <Card className="transition-shadow duration-300 hover:shadow-md motion-reduce:transition-none">
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
              {order.lineItems.edges.map((edge: any, itemIndex: number) => {
                const item = edge.node;
                const recipeAttr = item.customAttributes.find((attr: any) => attr.key === '_recipe_');
                const recipe = recipeAttr ? JSON.parse(recipeAttr.value) : null;
                
                // Check for custom attributes (fallback when no _recipe_)
                const candleNameAttr = item.customAttributes.find((attr: any) => attr.key === 'Candle Name');
                const promptAttr = item.customAttributes.find((attr: any) => attr.key === 'Original Prompt');
                
                // Determine if this is a custom item
                const isCustomItem = recipe || candleNameAttr || item.product?.title?.toLowerCase().includes('magic request');
                
                // Get display values
                const candleName = recipe?.name || candleNameAttr?.value;
                const containerType = item.title; // e.g., "Metal Tin 8oz"
                const variant = item.variant?.title !== 'Default Title' ? item.variant?.title : null;
                const inspiration = recipe?.prompt || promptAttr?.value;

                return (
                  <div 
                    key={item.id} 
                    className="
                      p-4 
                      transition-all duration-200 motion-reduce:transition-none
                      hover:bg-muted/10 hover:shadow-sm hover:-translate-y-0.5
                      cursor-default
                    "
                  >
                    <div className="flex gap-3 items-start">
                      {/* Thumbnail with hover zoom */}
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border overflow-hidden group">
                        {item.product?.featuredImage ? (
                          <img
                            src={item.product.featuredImage.url}
                            alt={item.product.featuredImage.altText || item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground/50" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            {isCustomItem && candleName ? (
                              <>
                                {/* Custom Item: Candle name is the title */}
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm leading-tight truncate">{candleName}</h4>
                                  <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0 h-4 bg-primary/90">
                                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                    Custom
                                  </Badge>
                                </div>
                                {/* Container type as metadata */}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {containerType}{variant ? ` · ${variant}` : ''}
                                </p>
                              </>
                            ) : (
                              <>
                                {/* Standard Item: Product name is the title */}
                                <h4 className="font-medium text-sm leading-tight">{item.title}</h4>
                                {variant && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{variant}</p>
                                )}
                              </>
                            )}
                          </div>
                          <span className="text-sm font-semibold bg-muted/50 px-2 py-0.5 rounded shrink-0">×{item.quantity}</span>
                        </div>

                        {/* Custom details - inline, not a nested card */}
                        {isCustomItem && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
                            {/* Recipe specs in compact horizontal layout */}
                            {recipe && (
                              <div className="space-y-2">
                                {/* Wax, Wick, Color row */}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                  <span><span className="text-muted-foreground">Wax:</span> <span className="font-medium">{recipe.wax}</span></span>
                                  <span><span className="text-muted-foreground">Wick:</span> <span className="font-medium">{recipe.wick}</span></span>
                                  <span><span className="text-muted-foreground">Color:</span> <span className="font-medium">{recipe.color || 'Natural'}</span></span>
                                </div>
                                
                                {/* Fragrances - the key production data */}
                                {recipe.fragrances && recipe.fragrances.length > 0 && (
                                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                                    <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1.5">
                                      🧪 Fragrance Blend
                                    </div>
                                    <div className="space-y-1">
                                      {recipe.fragrances.map((frag: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                          <span className="font-medium text-foreground">{frag.name}</span>
                                          <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded text-[11px]">
                                            {frag.percentage}%
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Legacy single fragrance fallback */}
                                {recipe.fragrance && !recipe.fragrances?.length && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Scent:</span> <span className="font-medium">{recipe.fragrance}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Customer's inspiration as a subtle quote */}
                            {inspiration && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Inspiration:</span>{' '}
                                <span className="italic text-foreground/80">"{inspiration}"</span>
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
      </AnimatedCard>

      {/* Customer Card - with gradient avatar */}
      <AnimatedCard index={cardIndex++}>
        <Card className="transition-shadow duration-300 hover:shadow-md motion-reduce:transition-none">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-base font-semibold">Customer</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              {/* Gradient avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 text-sm">
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
      </AnimatedCard>

      {/* Summary Card - with animated total counter */}
      <AnimatedCard index={cardIndex++}>
        <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-none shadow-inner">
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
              <span className="font-bold text-xl tabular-nums">
                ${animatedTotal}
              </span>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    </div>
  );
}

export function OrderDetailsModal({ isOpen, onClose, order, onOrderUpdated }: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!order) return null;

  const handleStatusUpdate = async (stepId: string) => {
    setIsUpdating(true);
    try {
      const step = PRODUCTION_STEPS.find(s => s.id === stepId);
      if (step) {
        await addTagsToOrder(order.id, [step.tag]);
        
        // Refresh the order to get updated tags immediately
        const { getOrder } = await import('@/services/shopify');
        const updatedOrder = await getOrder(order.id);
        if (updatedOrder && onOrderUpdated) {
          onOrderUpdated(updatedOrder);
        }
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
      <Button 
        variant="outline" 
        size="sm" 
        className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transition-none"
        onClick={() => {
          const orderNumber = order.name.replace('#', '');
          handlePrint(`/orders/${orderNumber}/ticket`);
        }}
      >
        <Printer className="w-4 h-4 mr-1.5" />
        Ticket
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transition-none"
        onClick={() => {
          const orderNumber = order.name.replace('#', '');
          handlePrint(`/orders/${orderNumber}/receipt`);
        }}
      >
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
          <div className="p-6 border-b bg-gradient-to-r from-muted/30 to-transparent">
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
        <DrawerHeader className="text-left border-b pb-4 bg-gradient-to-r from-muted/30 to-transparent">
          <DrawerTitle>{headerContent}</DrawerTitle>
          <DrawerDescription className="sr-only">Order details</DrawerDescription>
          {actionButtons}
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-4 overflow-auto max-h-[calc(90vh-180px)]">
          <OrderContent 
            order={order} 
            isUpdating={isUpdating} 
            onStatusUpdate={handleStatusUpdate}
          />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
