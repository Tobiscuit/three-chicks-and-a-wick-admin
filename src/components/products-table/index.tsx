
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
import { Search, PlusCircle, Trash } from "lucide-react"
import { useInventoryStatus } from "@/hooks/use-inventory-status";
import { deleteProductAction } from "@/app/products/actions";

type ProductsTableProps = {
  products: ShopifyProduct[];
};

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (productId: string) => {
    router.push(`/products/${encodeURIComponent(productId)}`);
  };

  const handleDelete = async (e: React.MouseEvent, productId: string, title: string) => {
    e.stopPropagation();
    const confirmDelete = confirm(`Delete "${title}"? This cannot be undone.`);
    if (!confirmDelete) return;
    const res = await deleteProductAction(productId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete product.");
    }
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
              <TableHead className="text-right">Actions</TableHead>
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
                  <InventoryCell
                    inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                    fallback={product.totalInventory}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={(e)=>handleDelete(e, product.id, product.title)}>
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
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

function InventoryCell({ inventoryItemId, fallback }: { inventoryItemId?: string; fallback: number | null }) {
  const { status, quantity } = useInventoryStatus(inventoryItemId);
  const displayValue = (typeof quantity === 'number') ? quantity : (fallback ?? 'N/A');

  return (
    <span className="inline-flex items-center gap-2">
      <span className={status === 'syncing' ? 'text-orange-600 font-medium' : ''}>
        {displayValue}
      </span>
      {status === 'syncing' && (
        <span className="text-xs text-orange-600 animate-pulse">(syncing…)</span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-600">(error)</span>
      )}
      {status === 'confirmed' && quantity !== null && (
        <span className="text-xs text-green-600">✓</span>
      )}
    </span>
  );
}
