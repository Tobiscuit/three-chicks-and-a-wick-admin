
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
import { Search, PlusCircle, Trash, LayoutGrid, List } from "lucide-react"
import { useInventoryStatus } from "@/hooks/use-inventory-status";
import { useServerSentEvents } from "@/hooks/use-server-sent-events";
import { deleteProductAction } from "@/app/products/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

function StatusCell({ product, inventoryItemId }: { product: ShopifyProduct; inventoryItemId?: string }) {
  const { status: inventoryStatus } = useInventoryStatus(inventoryItemId);

  // Show syncing status if inventory is syncing
  if (inventoryStatus === 'syncing') {
    return (
      <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30 animate-pulse">
        Syncing
      </Badge>
    );
  }

  // For non-active statuses, always show the badge
  if (product.status !== "ACTIVE") {
    return (
      <Badge variant="secondary">
        {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
      </Badge>
    );
  }

  // For "ACTIVE" status, show it only on medium screens and up
  return (
    <Badge
      variant="default"
      className="hidden md:inline-flex bg-green-700/20 text-green-500 border-green-700/30"
    >
      Active
    </Badge>
  );
}

type ProductsTableProps = {
  products: ShopifyProduct[];
};

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<'list' | 'grid'>('list');

  // Collect all inventory item IDs for SSE connection
  const inventoryItemIds = products
    .map(product => product.variants?.edges?.[0]?.node?.inventoryItem?.id)
    .filter(Boolean) as string[];

  // TEMPORARILY DISABLE SSE - focusing on core Firestore real-time updates
  // const { isConnected: sseConnected } = useServerSentEvents(inventoryItemIds);
  const sseConnected = true; // Fake it for now

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
    <>
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
            <div className="flex items-center gap-2">
                <Button variant={view === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setView('list')}>
                    <List className="h-4 w-4" />
                    <span className="sr-only">List View</span>
                </Button>
                <Button variant={view === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setView('grid')}>
                    <LayoutGrid className="h-4 w-4" />
                    <span className="sr-only">Grid View</span>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    Image
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Price</TableHead>
                  <TableHead>
                    #
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
                    <TableCell className="font-medium max-w-[150px] truncate">{product.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusCell
                        product={product}
                        inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                       {new Intl.NumberFormat('en-US', { 
                            style: 'currency', 
                            currency: product.priceRange.minVariantPrice.currencyCode 
                        }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                    </TableCell>
                    <TableCell>
                      <InventoryCell
                        inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                        fallback={product.totalInventory}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleDelete(e, product.id, product.title)}>
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductGridItem 
                  key={product.id}
                  product={product}
                  onRowClick={handleRowClick}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                  <p>No products found matching your search.</p>
              </div>
          )}
        </CardContent>
      </Card>
      <Link href="/products/new" className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-50">
          <PlusCircle className="h-6 w-6" />
          <span className="sr-only">Add Product</span>
      </Link>
    </>
  )
}

function ProductGridItem({ product, onRowClick, onDelete }: { product: ShopifyProduct; onRowClick: (id: string) => void; onDelete: (e: React.MouseEvent, id: string, title: string) => void; }) {
  return (
    <Card className="overflow-hidden cursor-pointer group" onClick={() => onRowClick(product.id)}>
      <div className="relative">
        <Image
          alt={product.title}
          className="aspect-square object-cover w-full transition-transform group-hover:scale-105"
          height="300"
          src={product.featuredImage?.url || 'https://placehold.co/300x300'}
          width="300"
        />
         <div className="absolute top-2 right-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => onDelete(e, product.id, product.title)}>
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate">{product.title}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
            <span>
                {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: product.priceRange.minVariantPrice.currencyCode
                }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
            </span>
             <InventoryCell
                inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                fallback={product.totalInventory}
            />
        </div>
      </CardContent>
    </Card>
  )
}


function InventoryCell({ inventoryItemId, fallback }: { inventoryItemId?: string; fallback: number | null }) {
  const { status, quantity } = useInventoryStatus(inventoryItemId);
  
  const displayValue = status === 'confirmed' && quantity !== null ? quantity : (fallback ?? 'N/A');

  console.log('[InventoryCell] Rendering for item:', inventoryItemId, 'status:', status, 'firestore_quantity:', quantity, 'shopify_fallback:', fallback, 'displayValue:', displayValue);

  return (
    <span className="inline-flex items-center gap-1">
      <span>
        {displayValue}
      </span>
      {status === 'error' && (
        <span className="text-xs text-red-600">⚠️</span>
      )}
      {status === 'confirmed' && quantity !== null && (
        <span className="text-xs text-green-600">✓</span>
      )}
    </span>
  );
}
