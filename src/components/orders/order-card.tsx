'use client';

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { ShopifyOrder } from "@/services/shopify";

type OrderCardProps = {
  order: ShopifyOrder;
  onClick?: () => void;
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

export function OrderCard({ order, onClick }: OrderCardProps) {
  const type = getOrderType(order);
  const status = order.displayFulfillmentStatus || "Unfulfilled";
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : "Guest";

  return (
    <div
      onClick={onClick}
      className="rounded-lg border bg-card p-4 cursor-pointer active:bg-muted/50 transition-colors touch-manipulation"
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
