
import { Suspense } from 'react';
import { ProductsTable, ProductsTableSkeleton } from '@/components/products-table';
import { getProducts } from '@/services/shopify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ShopifyProduct } from '@/services/shopify';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { AddProductModal } from '@/components/products/add-product-modal';


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
                {/* Header with title and Add Product inline */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
                    <AddProductModal />
                </div>
                <Suspense fallback={<ProductsTableSkeleton />}>
                    <ProductsData />
                </Suspense>
            </div>
        </AuthWrapper>
    );
}
