
import { getProductById, getCollections } from '@/services/shopify';
import { notFound } from 'next/navigation';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { ProductForm } from '@/components/product-form';
import type { ShopifyCollection, ShopifyProduct } from '@/services/shopify';


export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const productId = decodeURIComponent(id);
    let product: ShopifyProduct | null = null;
    let collections: ShopifyCollection[] = [];
    let error = null;

    try {
        [product, collections] = await Promise.all([
            getProductById(productId),
            getCollections()
        ]);
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
