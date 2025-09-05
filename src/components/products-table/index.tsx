
"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { ShopifyProduct } from "@/services/shopify"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import { Search, PlusCircle } from "lucide-react"

type ProductsTableProps = {
  products: ShopifyProduct[];
};

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (productId: string) => {
    router.push(`/products/${encodeURIComponent(productId)}`);
  };

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase();
    const titleMatch = product.title.toLowerCase().includes(term);
    const tagMatch = product.tags.some(tag => tag.toLowerCase().includes(term));
    return titleMatch || tagMatch;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search products by name or tag..."
                    className="w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <Button asChild>
                <Link href="/products/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Product
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                Image
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Price</TableHead>
              <TableHead className="hidden md:table-cell">
                Inventory
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow 
                key={product.id} 
                className="cursor-pointer"
                onClick={() => handleRowClick(product.id)}
              >
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={product.title}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={product.featuredImage?.url || 'https://placehold.co/64x64'}
                    width="64"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.title}</TableCell>
                <TableCell>
                  <Badge 
                    variant={product.status === "ACTIVE" ? "default" : "secondary"}
                    className={product.status === "ACTIVE" ? "bg-green-700/20 text-green-500 border-green-700/30" : ""}
                  >
                    {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                   {new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: product.priceRange.minVariantPrice.currencyCode 
                    }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {product.totalInventory ?? 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <p>No products found matching your search.</p>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
