'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Package, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUnfulfilledOrdersAction, fulfillOrderAction } from '@/app/dashboard/fulfillment-actions';

type UnfulfilledOrder = {
  id: string;
  name: string;
  createdAt: string;
  customer: { firstName: string; lastName: string } | null;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  displayFulfillmentStatus: string;
};

export function QuickFulfill() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<UnfulfilledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  // Fetch unfulfilled orders on mount
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const result = await getUnfulfilledOrdersAction();
      if (result.success) {
        setOrders(result.orders as UnfulfilledOrder[]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to load unfulfilled orders',
        });
      }
      setLoading(false);
    }
    fetchOrders();
  }, [toast]);

  async function handleFulfill(orderId: string) {
    setFulfillingId(orderId);
    try {
      const result = await fulfillOrderAction(orderId);
      if (result.success) {
        // Remove from list
        setOrders(prev => prev.filter(o => o.id !== orderId));
        toast({
          title: 'Order Fulfilled! 🎉',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Fulfillment Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fulfill order',
      });
    } finally {
      setFulfillingId(null);
    }
  }

  // Don't render if no unfulfilled orders
  if (!loading && orders.length === 0) {
    return null;
  }

  return (
    <Card className={cn(
      "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-700",
      "hover:shadow-md hover:border-primary/20 transition-all",
      "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            <CardTitle className="font-semibold tracking-tight">Quick Fulfill</CardTitle>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-500/50">
            {loading ? '...' : orders.length} pending
          </Badge>
        </div>
        <CardDescription>
          One-click fulfillment for pending orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => {
              const isFulfilling = fulfillingId === order.id;
              const customerName = order.customer 
                ? `${order.customer.firstName} ${order.customer.lastName}` 
                : 'Guest';
              const total = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: order.totalPriceSet.shopMoney.currencyCode,
              }).format(parseFloat(order.totalPriceSet.shopMoney.amount));

              return (
                <div 
                  key={order.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-2 -mx-2 rounded-lg",
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums font-medium">
                        {order.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {customerName}
                      </span>
                    </div>
                    <p className="text-sm font-mono tabular-nums text-muted-foreground">
                      {total}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFulfill(order.id)}
                    disabled={isFulfilling}
                    className={cn(
                      "min-w-[80px]",
                      !isFulfilling && "hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/50"
                    )}
                  >
                    {isFulfilling ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        <span>...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        <span>Ship</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
            {orders.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{orders.length - 5} more orders
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
