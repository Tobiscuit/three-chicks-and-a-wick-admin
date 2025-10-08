
"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link";
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
import {
  Search,
  PlusCircle,
  Trash,
  LayoutGrid,
  List,
  MoreVertical,
  Edit,
  ExternalLink,
  ClipboardCopy,
  Pencil,
  Loader2
} from "lucide-react";
import { useInventoryStatus } from "@/hooks/use-inventory-status";
import { useProductImage } from "@/hooks/use-product-image";
import { useServerSentEvents } from "@/hooks/use-server-sent-events";
import { deleteProductAction, quickUpdateInventoryAction } from "@/app/products/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [quickEditProduct, setQuickEditProduct] = useState<ShopifyProduct | null>(null);
  const [deletedProductIds, setDeletedProductIds] = useState<Set<string>>(new Set());
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL;

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

  const filteredProducts = products.filter((product) => {
    // First filter out deleted products
    if (deletedProductIds.has(product.id)) {
      return false;
    }
    
    // Then apply search filter
    const term = searchTerm.toLowerCase();
    const titleMatch = product.title.toLowerCase().includes(term);
    const tagMatch = product.tags.some(tag => tag.toLowerCase().includes(term));
    return titleMatch || tagMatch;
  });

  return (
    <>
      <Card>
        <CardHeader className="p-2 sm:p-6">
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or tag"
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center bg-muted rounded-full p-1">
                <Button 
                  variant={view === 'list' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-3 rounded-full"
                  onClick={() => setView('list')}
                >
                    <List className="h-4 w-4" />
                    <span className="sr-only">List View</span>
                </Button>
                <Button 
                  variant={view === 'grid' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-3 rounded-full"
                  onClick={() => setView('grid')}
                >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="sr-only">Grid View</span>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {view === 'list' ? (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table className="w-full min-w-[320px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      Image
                    </TableHead>
                    <TableHead className="min-w-[100px] sm:min-w-[200px]">Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Price</TableHead>
                    <TableHead className="w-[35px] hidden sm:table-cell">
                      #
                    </TableHead>
                    <TableHead className="text-right w-[35px]">
                      <MoreVertical className="h-4 w-4 mx-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow 
                    key={product.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(product.id)}
                  >
                    <TableCell className="hidden sm:table-cell">
                      <ProductImageCell 
                        productId={product.id}
                        fallbackImageUrl={product.featuredImage?.url}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <ProductImageCell 
                            productId={product.id}
                            fallbackImageUrl={product.featuredImage?.url}
                          />
                          <div className="absolute -top-1 -right-1 sm:hidden">
                            <Badge variant="secondary" className="text-xs h-5 px-1">
                              <InventoryCell
                                inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                                fallback={product.totalInventory}
                              />
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate max-w-[200px] sm:max-w-none">{product.title}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:hidden">
                            <span>
                              {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: product.priceRange.minVariantPrice.currencyCode 
                              }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                            </span>
                            <StatusCell
                              product={product}
                              inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id}
                            />
                          </div>
                        </div>
                      </div>
                    </TableCell>
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
                    <TableCell className="hidden sm:table-cell">
                      <InventoryCell
                        inventoryItemId={product.variants?.edges?.[0]?.node?.inventoryItem?.id as string | undefined}
                        fallback={product.totalInventory}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <SecureDeleteDialog product={product} onDelete={handleDelete}>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-3 w-3" />
                                  <span className="sr-only">More options</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setQuickEditProduct(product); }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Quick Edit Inventory
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/products/${product.id}`) }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                              </DropdownMenuItem>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductGridItem 
                  key={product.id}
                  product={product}
                  onRowClick={handleRowClick}
                  onDelete={handleDelete}
                  onQuickEdit={() => setQuickEditProduct(product)}
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
      {quickEditProduct && (
        <QuickEditModal
          product={quickEditProduct}
          onClose={() => setQuickEditProduct(null)}
        />
      )}
      <Link href="/products/new" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-primary text-primary-foreground rounded-full p-3 sm:p-4 shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-50">
          <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="sr-only">Add Product</span>
      </Link>
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

function ProductGridItem({ product, onRowClick, onDelete, onQuickEdit }: { 
  product: ShopifyProduct; 
  onRowClick: (id: string) => void; 
  onDelete: (e: React.MouseEvent, id: string, title: string) => void; 
  onQuickEdit: () => void;
}) {
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL;
  return (
    <SecureDeleteDialog product={product} onDelete={onDelete}>
      <Card className="overflow-hidden cursor-pointer group" onClick={() => onRowClick(product.id)}>
        <div className="relative">
          <ProductImageCell 
            productId={product.id}
            fallbackImageUrl={product.featuredImage?.url}
            isCardView={true}
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuickEdit(); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Quick Edit Inventory
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRowClick(product.id); }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                      </DropdownMenuItem>
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
