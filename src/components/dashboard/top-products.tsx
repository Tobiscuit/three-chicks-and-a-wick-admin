"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { ShopifyProduct } from "@/services/shopify"
import { Badge } from "../ui/badge"
import { ProductQuickView } from "./product-quick-view"

type TopProductsProps = {
  products: (ShopifyProduct & { sales: number })[]
}

export function TopProducts({ products }: TopProductsProps) {
  const [selectedProduct, setSelectedProduct] = useState<(ShopifyProduct & { sales: number }) | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <Card className={cn(
      "lg:col-span-3",
      "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300",
      "hover:shadow-md hover:border-primary/20 transition-all"
    )}>
      <CardHeader>
        <CardTitle className="font-semibold tracking-tight">Top Selling Products</CardTitle>
        <CardDescription>
          Your most popular products by number of orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => (
              <Sheet 
                key={product.id} 
                open={open && selectedProduct?.id === product.id}
                onOpenChange={(isOpen) => {
                  setOpen(isOpen)
                  if (!isOpen) setSelectedProduct(null)
                }}
              >
                <SheetTrigger asChild>
                  <button 
                    className="w-full flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => {
                      setSelectedProduct(product)
                      setOpen(true)
                    }}
                  >
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image
                        src={product.featuredImage?.url || "https://placehold.co/64"}
                        alt={product.title}
                        fill
                        className="rounded-md object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{product.title}</p>
                      <p className="text-sm text-muted-foreground font-mono tabular-nums">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.priceRange.minVariantPrice.currencyCode }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto flex-shrink-0">{product.sales} sales</Badge>
                  </button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                  {selectedProduct && (
                    <ProductQuickView 
                      product={selectedProduct} 
                      onClose={() => setOpen(false)} 
                    />
                  )}
                </SheetContent>
              </Sheet>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">No sales data available yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
