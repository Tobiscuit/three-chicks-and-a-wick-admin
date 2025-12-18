
import { getProductByHandle, getCollections } from '@/services/shopify';
import { notFound } from 'next/navigation';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { ProductForm } from '@/components/product-form';
import type { ShopifyCollection, ShopifyProduct } from '@/services/shopify';


export default async function ProductDetailPage({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    let product: ShopifyProduct | null = null;
    let collections: ShopifyCollection[] = [];
    let error = null;

    try {
        [product, collections] = await Promise.all([
            getProductByHandle(handle),
            getCollections()
        ]);

        console.log("[SERVER Edit Page] Product fetched by handle:", handle, product?.title);

    } catch (e: any) {
        error = e.message;
    }

    if (error) {
        return (
            <AuthWrapper>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Product Data</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </AuthWrapper>
        );
    }

    if (!product) {
        notFound();
    }
    
    return (
        <AuthWrapper>
            <ProductForm initialData={product} collections={collections} />
        </AuthWrapper>
    );
}
