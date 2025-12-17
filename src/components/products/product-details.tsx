
"use client"

import type { ShopifyProduct } from "@/services/shopify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AIContentDisplay } from "@/components/ai-content-display";
import { isHtmlContent, getAIContentClassName } from "@/lib/ai-content-utils";
import { ExternalLink } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteProductAction } from "@/app/products/actions";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

type ProductDetailsProps = {
  product: ShopifyProduct;
};

function formatPrice(amount: string, currencyCode: string) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
    }).format(parseFloat(amount));
}


export function ProductDetails({ product }: ProductDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const shopifyAdminUrl = product.onlineStoreUrl 
    ? `https://admin.shopify.com/store/${product.onlineStoreUrl.split('/')[2]}/products/${product.id.split('/').pop()}`
    : '#';

  const sku = product.variants.edges[0]?.node.sku || "N/A";
  const confirmPhrase = useMemo(() => product.title.split(' ').slice(0, 2).join(' ').toLowerCase(), [product.title]);

  const handleConfirmDelete = async () => {
    if (confirmationText.toLowerCase() !== confirmPhrase) return;
    try {
      setIsDeleting(true);
      const res = await deleteProductAction(product.id);
      if (res.success) {
        toast({ title: "Product Deleted", description: "Product has been successfully deleted." });
        router.push('/products');
      } else {
        toast({ title: "Delete Failed", description: res.error || "Failed to delete product.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setConfirmationText("");
    }
  };
    
  return (
    <Card className="overflow-hidden">
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <CardTitle className="text-3xl font-bold">{product.title}</CardTitle>
                    <CardDescription className="mt-2">
                        <Badge 
                           variant={product.status === "ACTIVE" ? "default" : "secondary"}
                           className={product.status === "ACTIVE" ? "bg-green-700/20 text-green-500 border-green-700/30" : ""}
                        >
                            {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                        </Badge>
                    </CardDescription>
                </div>
                 <div className="flex flex-col items-end gap-2">
                    <span className="text-3xl font-light">
                        {formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button asChild>
                          <Link href={`/products/${encodeURIComponent(product.id)}/edit`}>
                              Edit Product
                          </Link>
                      </Button>
                      <AlertDialog open={isDeleteOpen} onOpenChange={(open) => { if (!open) setConfirmationText(""); setIsDeleteOpen(open); }}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete "{product.title}".
                              <br /><br />
                              <strong>Security Check:</strong> Type the first two words of the product name to confirm deletion.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-2">
                            <Input
                              placeholder={`Type: "${confirmPhrase}"`}
                              value={confirmationText}
                              onChange={(e) => setConfirmationText(e.target.value)}
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleConfirmDelete}
                              disabled={confirmationText.toLowerCase() !== confirmPhrase || isDeleting}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : ("Delete Product")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold text-lg mb-2">Description</h3>
                <ScrollArea className="h-40 w-full">
                    {product.description ? (
                        isHtmlContent(product.description) ? (
                            <AIContentDisplay 
                                content={product.description} 
                                className={getAIContentClassName('details')}
                            />
                        ) : (
                            <p className="text-sm whitespace-pre-wrap">
                                {product.description}
                            </p>
                        )
                    ) : (
                        <p className="text-sm text-muted-foreground">No description available.</p>
                    )}
                </ScrollArea>
            </div>
            <Separator />
            <div>
                 <h3 className="font-semibold text-lg mb-4">Details</h3>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="font-medium text-muted-foreground">SKU</div>
                    <div>{sku}</div>

                    <div className="font-medium text-muted-foreground">Inventory</div>
                    <div>{product.totalInventory ?? "Not Tracked"}</div>

                    <div className="font-medium text-muted-foreground">Product Type</div>
                    <div>{product.productType || "N/A"}</div>
                    
                    <div className="font-medium text-muted-foreground">Tags</div>
                    <div className="flex flex-wrap gap-1">
                        {product.tags.length > 0 ? product.tags.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                        )) : "No tags"}
                    </div>
                </div>
            </div>
        </CardContent>
        {product.onlineStoreUrl && (
             <CardFooter>
                <Button variant="outline" asChild className="w-full">
                    <a href={shopifyAdminUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2" />
                        View in Shopify Admin
                    </a>
                </Button>
            </CardFooter>
        )}
    </Card>
  );
}
