
import { Suspense } from 'react';
import { ProductsTable, ProductsTableSkeleton } from '@/components/products-table';
import { getProducts } from '@/services/shopify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ShopifyProduct } from '@/services/shopify';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { DiagnosticButton } from '@/components/diagnostic-button';

export const dynamic = 'force-dynamic';

async function ProductsData() {
    let products: ShopifyProduct[] = [];
    let error: string | null = null;

    try {
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
                        amount: priceAsNumber !== null ? String(priceAsNumber) : "0",
                    }
                }
            }
        });
        
    } catch (e: any) {
        error = e.message;
        console.error("[ProductsPage] Error fetching or transforming products:", e);
    }

    if (error) {
        return (
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
        );
    }

    return <ProductsTable products={products} />;
}

export default function ProductsPage() {
    return (
        <AuthWrapper>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-semibold">Products</h1>
                    <div className="flex gap-2">
                        <DiagnosticButton />
                        <Button asChild>
                            <Link href="/products/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Product
                            </Link>
                        </Button>
                    </div>
                </div>
                <Suspense fallback={<ProductsTableSkeleton />}>
                    <ProductsData />
                </Suspense>
            </div>
        </AuthWrapper>
    );
}
