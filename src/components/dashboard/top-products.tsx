
"use client"

import Image from "next/image"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ShopifyProduct } from "@/services/shopify"
import { Badge } from "../ui/badge"

type TopProductsProps = {
  products: (ShopifyProduct & { sales: number })[]
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>
          Your most popular products by number of orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length > 0 ? (
        <div className="space-y-4">
          {products.map((product) => (
            <div className="flex items-center gap-4" key={product.id}>
              <div className="relative h-16 w-16 flex-shrink-0">
                <Image
                  src={product.featuredImage?.url || "https://placehold.co/64"}
                  alt={product.title}
                  fill
                  className="rounded-md object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-none truncate">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.priceRange.minVariantPrice.currencyCode }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">{product.sales} sales</Badge>
            </div>
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
