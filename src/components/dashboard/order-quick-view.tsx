'use client';

import Link from 'next/link';
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, User, DollarSign, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

type Order = {
  orderId: string;
  customer?: string;
  type: 'CUSTOM' | 'STANDARD';
  total?: string;
  status?: string;
};

type OrderQuickViewProps = {
  order: Order;
  onClose?: () => void;
};

export function OrderQuickView({ order, onClose }: OrderQuickViewProps) {
  // Parse the order ID (format: #1815)
  const orderNumber = order.orderId.replace('#', '');
  
  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="space-y-4">
        <div>
          <SheetTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Order {order.orderId}
          </SheetTitle>
          <SheetDescription className="mt-1">
            View order details and take quick actions.
          </SheetDescription>
        </div>
      </SheetHeader>

      <Separator className="my-4" />

      {/* Order Details */}
      <div className="space-y-4 mb-6">
        {/* Customer */}
        <div className={cn(
          "p-4 rounded-lg bg-muted/50 flex items-center gap-3",
          "motion-safe:animate-in fade-in slide-in-from-bottom-2 duration-200"
        )}>
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</p>
            <p className="text-sm font-medium">{order.customer || 'Guest'}</p>
          </div>
        </div>

        {/* Total */}
        <div className={cn(
          "p-4 rounded-lg bg-muted/50 flex items-center gap-3",
          "motion-safe:animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75"
        )}>
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-lg font-bold font-mono tabular-nums">{order.total || 'N/A'}</p>
          </div>
        </div>

        {/* Type Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type:</span>
          <Badge variant={order.type === 'CUSTOM' ? 'default' : 'secondary'}>
            {order.type}
          </Badge>
        </div>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <SheetFooter className="flex-col gap-2 sm:flex-col">
        <Button asChild className="w-full">
          <Link href={`/orders`} onClick={onClose}>
            View All Orders
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full">
          <a 
            href={`https://admin.shopify.com/store/threechicksandawick/orders`}
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View in Shopify
          </a>
        </Button>
      </SheetFooter>
    </div>
  );
}
