
import { getCollections } from '@/services/shopify';
import type { ShopifyCollection } from '@/services/shopify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { ProductForm } from '@/components/product-form';

export default async function NewProductPage() {
    let collections: ShopifyCollection[] = [];
    let error: string | null = null;

    try {
        collections = await getCollections();
    } catch (e: any) {
        console.error("Failed to fetch collections", e);
        error = e.message || "An unknown error occurred while fetching collections.";
    }

    return (
        <AuthWrapper>
            {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Fetching Collections</AlertTitle>
                  <AlertDescription>
                      {error}
                      <br />
                      Please ensure your Shopify app has 'read_products' permission.
                  </AlertDescription>
                </Alert>
            ) : (
                <ProductForm collections={collections} />
            )}
        </AuthWrapper>
    );
}
