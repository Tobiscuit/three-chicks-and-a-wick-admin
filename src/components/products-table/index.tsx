
"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
// Removed env-config import for client-side component
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash,
  LayoutGrid,
  List,
  MoreVertical,
  Edit,
  ExternalLink,
  ClipboardCopy,
  Pencil,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ProductSearch } from "./product-search";
import { useInventoryStatus } from "@/hooks/use-inventory-status";
import { useProductImage } from "@/hooks/use-product-image";
import { useServerSentEvents } from "@/hooks/use-server-sent-events";
import { useUserSettings } from "@/hooks/use-user-settings";
import { deleteProductAction, quickUpdateInventoryAction, changeProductStatusAction } from "@/app/products/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton";
import { AddProductModal } from "@/components/products/add-product-modal";

// Subtle draft indicator - returns inline text instead of badge
function DraftIndicator({ product }: { product: ShopifyProduct }) {
  if (product.status === "ACTIVE") return null;
  
  return (
    <span className="text-xs text-muted-foreground ml-1">
      ({product.status.charAt(0) + product.status.slice(1).toLowerCase()})
    </span>
  );
}

// Check if product is a draft (for row opacity)
function isDraft(product: ShopifyProduct): boolean {
  return product.status !== "ACTIVE";
}

type ProductsTableProps = {
  products: ShopifyProduct[];
};

// Secure Delete Dialog Component
function SecureDeleteDialog({ 
  product, 
  onDelete, 
  children 
}: { 
  product: ShopifyProduct; 
  onDelete: (e: React.MouseEvent, productId: string, title: string) => void;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get first two words of product title
  const firstTwoWords = product.title.split(' ').slice(0, 2).join(' ').toLowerCase();
  const isConfirmationValid = confirmationText.toLowerCase() === firstTwoWords;
  
  const handleDelete = async (e: React.MouseEvent) => {
    if (!isConfirmationValid) return;
    
    setIsDeleting(true);
    await onDelete(e, product.id, product.title);
    setIsDeleting(false);
    setIsOpen(false);
    setConfirmationText("");
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmationText("");
    }
    setIsOpen(open);
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {children}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the product "{product.title}".
            <br /><br />
            <strong>Security Check:</strong> Type the first two words of the product name to confirm deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            placeholder={`Type: "${firstTwoWords}"`}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Product"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Secure Bulk Delete Dialog Component - requires typing count to confirm
function SecureBulkDeleteDialog({ 
  count,
  onConfirm,
  children 
}: { 
  count: number;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const expectedValue = count.toString();
  const isConfirmationValid = confirmationText === expectedValue;
  
  const handleDelete = async () => {
    if (!isConfirmationValid) return;
    
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    setIsOpen(false);
    setConfirmationText("");
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmationText("");
    }
    setIsOpen(open);
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">⚠️ Delete {count} Products</AlertDialogTitle>
          <AlertDialogDescription>
            This action <strong>cannot be undone</strong>. This will permanently delete {count} product{count > 1 ? 's' : ''} from your Shopify store.
            <br /><br />
            <strong>Security Check:</strong> Type <span className="font-mono bg-muted px-1 rounded">{count}</span> to confirm deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            placeholder={`Type: ${count}`}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full font-mono text-center text-lg"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${count} Products`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { enableBulkSelection } = useUserSettings();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [quickEditProduct, setQuickEditProduct] = useState<ShopifyProduct | null>(null);
  const [deletedProductIds, setDeletedProductIds] = useState<Set<string>>(new Set());
  const [filteredProducts, setFilteredProducts] = useState<ShopifyProduct[]>(products);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL;

  // Handle filter changes from ProductSearch
  const handleFilterChange = useCallback((filtered: ShopifyProduct[]) => {
    // Apply deleted products filter on top
    setFilteredProducts(filtered.filter(p => !deletedProductIds.has(p.id)));
    // Clear selection when filter changes
    setSelectedIds(new Set());
  }, [deletedProductIds]);

  // Collect all inventory item IDs for SSE connection
  const inventoryItemIds = products
    .map(product => product.variants?.edges?.[0]?.node?.inventoryItem?.id)
    .filter(Boolean) as string[];

  // TEMPORARILY DISABLE SSE - focusing on core Firestore real-time updates
  // const { isConnected: sseConnected } = useServerSentEvents(inventoryItemIds);
  const sseConnected = true; // Fake it for now

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice(page * pageSize, (page + 1) * pageSize);
  
  // Bulk selection handlers
  const displayProducts = paginatedProducts;
  const allSelected = displayProducts.length > 0 && displayProducts.every(p => selectedIds.has(p.id));
  const someSelected = displayProducts.some(p => selectedIds.has(p.id));
  
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayProducts.map(p => p.id)));
    }
  };
  
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Reset page when filters change
  const handleFilterChangeWithReset = useCallback((filtered: ShopifyProduct[]) => {
    setFilteredProducts(filtered.filter(p => !deletedProductIds.has(p.id)));
    setSelectedIds(new Set());
    setPage(0); // Reset to first page
  }, [deletedProductIds]);

  const handleRowClick = (handle: string) => {
    router.push(`/products/${handle}`);
  };

  const handleDelete = async (e: React.MouseEvent, productId: string, title: string) => {
    e.stopPropagation();
    
    // Optimistic UI: Immediately remove from list
    setDeletedProductIds(prev => new Set([...prev, productId]));
    
    try {
      const res = await deleteProductAction(productId);
      if (res.success) {
        // Success: Keep the product removed, server will revalidate
        toast({
          title: "Product Deleted",
          description: "Product has been successfully deleted.",
        });
      } else {
        // Failure: Restore the product in the list
        setDeletedProductIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        
        toast({
          title: "Delete Failed",
          description: res.error || "Failed to delete product.",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Error: Restore the product in the list
      setDeletedProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      
      toast({
        title: "Delete Failed",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  // Note: displayProducts is defined above in bulk selection handlers section

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <ProductSearch products={products} onFilterChange={handleFilterChangeWithReset} />
            </div>
            <div className="flex items-center gap-2">
              <SegmentedControl
                value={view}
                onValueChange={setView}
                options={[
                  { value: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
                  { value: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4" /> },
                ]}
              />
              <AddProductModal />
            </div>
          </div>
        </CardHeader>
        
        {/* Product Counter with Pagination Info */}
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-b">
          <span>
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredProducts.length)} of {filteredProducts.length} products
          </span>
          {totalPages > 1 && (
            <span>{page + 1} of {totalPages} pages</span>
          )}
        </div>
        
        <CardContent className="p-2 sm:p-2">
          {view === 'list' ? (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] -mx-2 sm:mx-0">
              <Table className="w-full min-w-[320px]">
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                  <TableRow className="border-b">
                    {enableBulkSelection && (
                      <TableHead className="w-[40px] text-center">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead className="hidden w-[100px] sm:table-cell text-center font-medium text-xs text-muted-foreground uppercase tracking-wide">
                      Image
                    </TableHead>
                    <TableHead className="min-w-[100px] sm:min-w-[200px] font-medium text-xs text-muted-foreground uppercase tracking-wide">Name</TableHead>
                    <TableHead className="hidden md:table-cell font-medium text-xs text-muted-foreground uppercase tracking-wide">Price</TableHead>
                    <TableHead className="w-[35px] hidden sm:table-cell font-medium text-xs text-muted-foreground uppercase tracking-wide text-center">
                      Qty
                    </TableHead>
                    <TableHead className="text-right w-[35px]">
                      <MoreVertical className="h-4 w-4 mx-auto text-muted-foreground" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {displayProducts.map((product, index) => (
                  <TableRow 
                    key={product.id} 
                    className={`group cursor-pointer transition-colors duration-150 hover:bg-muted/50 ${selectedIds.has(product.id) ? 'bg-primary/10 hover:bg-primary/15' : ''} ${isDraft(product) ? 'opacity-60' : ''}`}
                    onClick={() => enableBulkSelection ? toggleSelect(product.id) : handleRowClick(product.handle)}
                  >
                    {enableBulkSelection && (
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                          aria-label={`Select ${product.title}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="hidden sm:table-cell text-center">
                      <div className="flex justify-center">
                        <ProductImageCell 
                          productId={product.id}
                          fallbackImageUrl={product.featuredImage?.url}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="relative sm:hidden">
                          <ProductImageCell 
                            productId={product.id}
                            fallbackImageUrl={product.featuredImage?.url}
                          />
                          <div className="absolute -top-1 -right-1">
                            <Badge variant="secondary" className="text-xs h-5 px-1 tabular-nums">
                              <InventoryCell
                                inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                                fallback={product.totalInventory}
                              />
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate max-w-[200px] sm:max-w-none">
                            {product.title}
                            <DraftIndicator product={product} />
                          </div>
                          <div className="flex items-center gap-2 text-sm sm:hidden">
                            <span className="data-money">
                              {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: product.priceRange.minVariantPrice.currencyCode 
                              }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                       <span className="data-money">
                         {new Intl.NumberFormat('en-US', { 
                              style: 'currency', 
                              currency: product.priceRange.minVariantPrice.currencyCode 
                          }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                       </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums">
                      <InventoryCell
                        inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                        fallback={product.totalInventory}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <SecureDeleteDialog product={product} onDelete={handleDelete}>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 bg-primary/10 border-primary/30 hover:bg-primary/20 touch-none" 
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => { if (e.pointerType === 'touch') e.preventDefault(); }}
                              >
                                  <MoreVertical className="h-4 w-4 text-primary" />
                                  <span className="sr-only">More options</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setQuickEditProduct(product); }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Quick Edit Inventory
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/products/${product.handle}`) }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                                  <span className="mr-2">📦</span>
                                  Change Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuRadioGroup value={product.status}>
                                    <DropdownMenuRadioItem 
                                      value="ACTIVE" 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        await changeProductStatusAction(product.id, 'ACTIVE');
                                      }}
                                    >
                                      Active
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem 
                                      value="DRAFT" 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        await changeProductStatusAction(product.id, 'DRAFT');
                                      }}
                                    >
                                      Draft
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem 
                                      value="ARCHIVED" 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        await changeProductStatusAction(product.id, 'ARCHIVED');
                                      }}
                                    >
                                      Archived
                                    </DropdownMenuRadioItem>
                                  </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              {storefrontUrl && (
                                <>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`${storefrontUrl}/products/${product.handle}`, '_blank'); }}>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View on Store
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${storefrontUrl}/products/${product.handle}`); }}>
                                      <ClipboardCopy className="mr-2 h-4 w-4" />
                                      Copy Link
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600" onClick={(e) => e.stopPropagation()}>
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      </SecureDeleteDialog>
                </TableCell>
              </TableRow>
            ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="@container overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className="grid grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 @xl:grid-cols-5 gap-3 sm:gap-4">
                {displayProducts.map((product, index) => (
                  <ProductGridItem 
                    key={product.id}
                    product={product}
                    onRowClick={handleRowClick}
                    onDelete={handleDelete}
                    onQuickEdit={() => setQuickEditProduct(product)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}
          {displayProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
                  <div className="text-6xl mb-4 motion-safe:animate-bounce" style={{ animationDuration: '2s' }}>📦</div>
                  <p className="text-lg font-semibold text-foreground">No products found</p>
                  <p className="text-sm mt-1 max-w-[280px] text-center">
                    Try adjusting your search or filters, or add a new product to get started.
                  </p>
              </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <span className="text-sm tabular-nums">
                {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      {quickEditProduct && (
        <QuickEditModal
          product={quickEditProduct}
          onClose={() => setQuickEditProduct(null)}
        />
      )}
      
      {/* Fixed Bottom Action Bar - slides up when items selected */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200 ease-out ${
          enableBulkSelection && selectedIds.size > 0 
            ? 'translate-y-0' 
            : 'translate-y-full'
        }`}
      >
        <div className="bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          <div className="max-w-screen-xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Selection count + clear */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary font-semibold text-sm">
                  {selectedIds.size}
                </div>
                <span className="text-sm font-medium hidden sm:inline">selected</span>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Clear</span>
                </Button>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Status Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      📦 <span className="hidden sm:inline ml-1">Status</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    <DropdownMenuItem onClick={async () => {
                      const ids = Array.from(selectedIds);
                      for (const id of ids) {
                        await changeProductStatusAction(id, 'ACTIVE');
                      }
                      clearSelection();
                      toast({ title: `${ids.length} products set to Active` });
                    }}>
                      ✅ Set all to Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      const ids = Array.from(selectedIds);
                      for (const id of ids) {
                        await changeProductStatusAction(id, 'DRAFT');
                      }
                      clearSelection();
                      toast({ title: `${ids.length} products set to Draft` });
                    }}>
                      📝 Set all to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      const ids = Array.from(selectedIds);
                      for (const id of ids) {
                        await changeProductStatusAction(id, 'ARCHIVED');
                      }
                      clearSelection();
                      toast({ title: `${ids.length} products archived` });
                    }}>
                      📦 Archive all
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete with confirmation */}
                <SecureBulkDeleteDialog 
                  count={selectedIds.size}
                  onConfirm={async () => {
                    const ids = Array.from(selectedIds);
                    for (const id of ids) {
                      setDeletedProductIds(prev => new Set([...prev, id]));
                      try {
                        await deleteProductAction(id);
                      } catch (e) {
                        console.error('Bulk delete error:', e);
                      }
                    }
                    clearSelection();
                    toast({ title: `${ids.length} products deleted` });
                  }}
                >
                  <Button variant="destructive" size="sm" className="h-8 gap-1">
                    <Trash className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </SecureBulkDeleteDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function ProductsTableSkeleton() {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="aspect-square">
                <Skeleton className="h-full w-full" />
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      <Skeleton className="fixed bottom-6 right-6 h-14 w-14 rounded-full" />
    </>
  )
}

function ProductGridItem({ product, onRowClick, onDelete, onQuickEdit, index = 0 }: { 
  product: ShopifyProduct; 
  onRowClick: (handle: string) => void; 
  onDelete: (e: React.MouseEvent, id: string, title: string) => void; 
  onQuickEdit: () => void;
  index?: number;
}) {
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL;
  return (
    <SecureDeleteDialog product={product} onDelete={onDelete}>
      <Card 
        className="overflow-hidden cursor-pointer group motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 hover:shadow-lg transition-shadow" 
        style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
        onClick={() => onRowClick(product.handle)}
      >
        <div className="relative aspect-square">
          <ProductImageCell 
            productId={product.id}
            fallbackImageUrl={product.featuredImage?.url}
            isCardView={true}
          />
          <div className="absolute top-2 right-2">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 touch-none" 
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => { if (e.pointerType === 'touch') e.preventDefault(); }}
                      >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuickEdit(); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Quick Edit Inventory
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRowClick(product.id); }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                          <span className="mr-2">📦</span>
                          Change Status
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup value={product.status}>
                            <DropdownMenuRadioItem 
                              value="ACTIVE" 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                await changeProductStatusAction(product.id, 'ACTIVE');
                              }}
                            >
                              Active
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem 
                              value="DRAFT" 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                await changeProductStatusAction(product.id, 'DRAFT');
                              }}
                            >
                              Draft
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem 
                              value="ARCHIVED" 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                await changeProductStatusAction(product.id, 'ARCHIVED');
                              }}
                            >
                              Archived
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      {storefrontUrl && (
                          <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`${storefrontUrl}/products/${product.handle}`, '_blank'); }}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View on Store
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${storefrontUrl}/products/${product.handle}`); }}>
                                  <ClipboardCopy className="mr-2 h-4 w-4" />
                                  Copy Link
                              </DropdownMenuItem>
                          </>
                      )}
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600" onClick={(e) => e.stopPropagation()}>
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm leading-tight">{product.title}</h3>
          <div className="flex items-center justify-between text-xs mt-1">
              <span className="data-money">
                  {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: product.priceRange.minVariantPrice.currencyCode
                  }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
              </span>
              <span className="tabular-nums text-muted-foreground">
                <InventoryCell
                    inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                    fallback={product.totalInventory}
                />
              </span>
          </div>
        </CardContent>
      </Card>
    </SecureDeleteDialog>
  )
}

function QuickEditModal({ product, onClose }: { product: ShopifyProduct; onClose: () => void; }) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(product.totalInventory ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const inventoryItemId = product.variants?.edges?.[0]?.node?.inventoryItem?.id;

  const handleSave = async () => {
    if (!inventoryItemId) {
      toast({ variant: "destructive", title: "Error", description: "Inventory item ID not found." });
      return;
    }
    setIsSaving(true);
    try {
      const result = await quickUpdateInventoryAction({ inventoryItemId, quantity });
      if (result.success) {
        toast({ title: "Success", description: `Inventory for "${product.title}" updated.` });
        onClose();
      } else {
        throw new Error(result.error || "Failed to update inventory.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Edit: {product.title}</DialogTitle>
          <DialogDescription>
            Update the available inventory count. This will be reflected on your Shopify store.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            className="text-lg"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <MoreVertical className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function InventoryCell({ inventoryItemId, fallback }: { inventoryItemId?: string; fallback: number | null }) {
  const { status, quantity } = useInventoryStatus(inventoryItemId);
  
  const displayValue = quantity !== null ? quantity : (fallback ?? 'N/A');

  console.log('[InventoryCell] Rendering for item:', inventoryItemId, 'status:', status, 'firestore_quantity:', quantity, 'shopify_fallback:', fallback, 'displayValue:', displayValue);

  return (
    <span>
      {displayValue}
    </span>
  );
}

function ProductImageCell({ productId, fallbackImageUrl, isCardView = false }: { productId: string; fallbackImageUrl?: string; isCardView?: boolean }) {
  const { imageUrl, status } = useProductImage(productId);
  
  const displayImageUrl = imageUrl || fallbackImageUrl || (isCardView ? 'https://placehold.co/300x300' : 'https://placehold.co/64x64');
  
  return (
    <Image
      alt="Product"
      className={isCardView ? "aspect-square object-cover w-full transition-transform group-hover:scale-105" : "aspect-square rounded-md object-cover"}
      height={isCardView ? 300 : 64}
      src={displayImageUrl}
      width={isCardView ? 300 : 64}
    />
  );
}
