"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ShopifyOrder } from "@/services/shopify"

// Helper to format currency
const formatCurrency = (amount: string, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(parseFloat(amount))
}

// Helper to get order type
const getOrderType = (order: ShopifyOrder): "Custom" | "Standard" => {
  return order.lineItems.edges.some((e) =>
    e.node.product?.title?.includes("Magic Request")
  )
    ? "Custom"
    : "Standard"
}

// Status badge variant mapping
const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  const normalizedStatus = (status || "UNFULFILLED").toUpperCase()
  switch (normalizedStatus) {
    case "FULFILLED":
      return "default"
    case "UNFULFILLED":
      return "secondary"
    case "ON_HOLD":
      return "outline"
    case "SCHEDULED":
      return "outline"
    default:
      return "secondary"
  }
}

export const orderColumns: ColumnDef<ShopifyOrder>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Order
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const customer = row.original.customer
      return customer
        ? `${customer.firstName} ${customer.lastName}`
        : "Guest"
    },
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = getOrderType(row.original)
      return (
        <div className="flex items-center gap-1.5">
          {type === "Custom" && (
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{type}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "displayFulfillmentStatus",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = (row.getValue("displayFulfillmentStatus") as string) || "Unfulfilled"
      return (
        <Badge variant={getStatusVariant(status)}>
          {status}
        </Badge>
      )
    },
  },
  {
    id: "total",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const { amount, currencyCode } = row.original.totalPriceSet.shopMoney
      return (
        <div className="text-right font-medium">
          {formatCurrency(amount, currencyCode)}
        </div>
      )
    },
  },
]
