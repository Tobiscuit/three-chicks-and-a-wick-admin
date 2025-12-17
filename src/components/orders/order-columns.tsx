"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, Sparkles, MoreHorizontal, Copy, Printer, CheckCircle2 } from "lucide-react"
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
      <span className="data-id font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const customer = row.original.customer
      return (
        <span className="data-secondary">
          {customer ? `${customer.firstName} ${customer.lastName}` : "Guest"}
        </span>
      )
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
          <span className={type === "Custom" ? "font-medium text-amber-600 dark:text-amber-400" : ""}>{type}</span>
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
        <div className="data-money">
          {formatCurrency(amount, currencyCode)}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const order = row.original
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(order.name)
              }}
              className="cursor-pointer"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Order #
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                window.print()
              }}
              className="cursor-pointer"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Order
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => e.stopPropagation()}
              className="cursor-pointer text-green-600 dark:text-green-400"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Fulfilled
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

