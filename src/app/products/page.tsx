
import { ProductsTable } from '@/components/products-table';
import { getProducts } from '@/services/shopify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ShopifyProduct } from '@/services/shopify';
import { AuthWrapper } from '@/components/auth/auth-wrapper';

export const dynamic = 'force-dynamic';

// This is now an async Server Component.
// It fetches and transforms data on the server before rendering the page.
export default async function ProductsPage() {
    let products: ShopifyProduct[] = [];
    let error: string | null = null;

    try {
        // Step 1: Fetch raw products directly on the server.
        const rawProducts = await getProducts();
        
        products = rawProducts.map(product => {
            const rawPrice = product.priceRange?.minVariantPrice?.amount;
            const priceAsNumber = rawPrice ? parseFloat(rawPrice) : null;
           
            const formattedAmount = priceAsNumber !== null 
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: product.priceRange.minVariantPrice.currencyCode,
                  }).format(priceAsNumber)
                : '$NaN';

            return {
                ...product,
                priceRange: {
                    ...product.priceRange,
                    minVariantPrice: {
                        ...product.priceRange.minVariantPrice,
                        amount: priceAsNumber !== null ? String(priceAsNumber) : "0", // Store the corrected number as a string
                    }
                }
            }
        });
        
    } catch (e: any) {
        error = e.message;
        console.error("[ProductsPage] Error fetching or transforming products:", e);
    }

    return (
        <AuthWrapper>
           {error ? (
               <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error Fetching Products</AlertTitle>
                        <AlertDescription>
                            {error}
                            <br />
                            Please ensure your Shopify app has 'read_products' permission and your Admin Access Token is correct.
                        </AlertDescription>
                    </Alert>
               </div>
           ) : (
                <ProductsTable products={products} />
           )}
        </AuthWrapper>
    );
}
