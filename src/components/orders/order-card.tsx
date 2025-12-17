'use client';

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { ShopifyOrder } from "@/services/shopify";

type OrderCardProps = {
  order: ShopifyOrder;
  onClick?: () => void;
  index?: number; // For staggered animation
};

// Helper to format currency
const formatCurrency = (amount: string, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(parseFloat(amount));
};

// Helper to get order type
const getOrderType = (order: ShopifyOrder): "Custom" | "Standard" => {
  return order.lineItems.edges.some((e) =>
    e.node.product?.title?.includes("Magic Request")
  )
    ? "Custom"
    : "Standard";
};

// Status badge variant mapping
const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  const normalizedStatus = (status || "UNFULFILLED").toUpperCase();
  switch (normalizedStatus) {
    case "FULFILLED":
      return "default";
    case "UNFULFILLED":
      return "secondary";
    case "ON_HOLD":
      return "outline";
    case "SCHEDULED":
      return "outline";
    default:
      return "secondary";
  }
};

export function OrderCard({ order, onClick, index = 0 }: OrderCardProps) {
  const type = getOrderType(order);
  const status = order.displayFulfillmentStatus || "Unfulfilled";
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : "Guest";

  // Staggered animation delay (max 500ms for first 10 items)
  const animationDelay = Math.min(index * 50, 500);

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={`
        rounded-lg border bg-card p-4 
        cursor-pointer active:scale-[0.98] 
        transition-transform duration-150
        touch-manipulation
        motion-safe:motion-preset-slide-up-sm
        motion-safe:motion-opacity-in-0
      `}
    >
      {/* Top row: Order number + Status badge */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">{order.name}</span>
            {type === "Custom" && (
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{customerName}</p>
        </div>
        <Badge variant={getStatusVariant(status)} className="shrink-0">
          {status}
        </Badge>
      </div>

      {/* Bottom row: Type + Total */}
      <div className="flex justify-between items-center pt-3 border-t border-border/50">
        <span className="text-sm text-muted-foreground">
          {type} Order
        </span>
        <span className="font-semibold">
          {formatCurrency(
            order.totalPriceSet.shopMoney.amount,
            order.totalPriceSet.shopMoney.currencyCode
          )}
        </span>
      </div>
    </div>
  );
}
