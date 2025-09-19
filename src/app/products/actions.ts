"use server";

import 'server-only';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
    createProduct,
    updateProduct,
    updateProductDescription,
    deleteProduct,
    getPrimaryLocationId,
    updateInventoryQuantity,
    getProductById,
    collectionAddProducts,
    collectionRemoveProducts,
} from '@/services/shopify';
import { adminDb } from '@/lib/firebase-admin';
import { encodeShopifyId } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const productSchema = z.object({
    id: z.string().optional(),
    inventoryItemId: z.string().optional(),
    inventory: z.number().optional(),
    title: z.string(),
    description: z.string().optional(),
    price: z.string(),
    tags: z.string().optional(),
    sku: z.string(),
    status: z.string(),
    imageUrls: z.array(z.string().url()).optional().nullable(),
    collections: z.array(z.string()).optional(),
});

export async function addProductAction(formData: z.infer<typeof productSchema>) {
    try {
        const product = productSchema.parse(formData);
        const result = await createProduct({
            title: product.title,
            description: product.description || '',
            tags: product.tags || '',
            price: product.price,
            sku: product.sku,
            status: product.status,
            inventory: product.inventory || 0,
            imageUrls: product.imageUrls || [],
            collections: product.collections || [],
        });
        
        // Write to Firestore for real-time updates
        if (result.product?.id) {
            const productDocId = encodeShopifyId(result.product.id);
            
            // Write image data
            await adminDb.collection('productImages').doc(productDocId).set({
                imageUrl: product.imageUrls?.[0] || null,
                status: 'confirmed',
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            
            // Note: Inventory data will be written by the createProduct function
            // which already handles inventoryStatus updates via updateInventoryQuantity
        }
        
        revalidatePath('/products');
        return { success: true, product: result };
    } catch (error) {
        console.error('Error adding product:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function updateProductAction(formData: z.infer<typeof productSchema>) {
    try {
        const productData = productSchema.parse(formData);
        const productId = productData.id;
        if (!productId) throw new Error('Product ID is required for updates.');

        // First, get the product's current collections
        const existingProduct = await getProductById(productId);
        const existingCollectionIds = new Set(existingProduct?.collections.edges.map(e => e.node.id) || []);
        const newCollectionIds = new Set(productData.collections || []);

        // Determine which collections to add the product to
        const collectionsToAdd = [...newCollectionIds].filter(id => !existingCollectionIds.has(id));
        // Determine which collections to remove the product from
        const collectionsToRemove = [...existingCollectionIds].filter(id => !newCollectionIds.has(id));

        // Perform all updates concurrently
        await Promise.all([
            // Update core details
            updateProduct(productId, {
                title: productData.title,
                tags: productData.tags,
                status: productData.status,
            }),
            // Update description metafield
            productData.description ? updateProductDescription(productId, productData.description) : Promise.resolve(),
            // Update inventory
            (productData.inventoryItemId && typeof productData.inventory === 'number') ? 
                (async () => {
                    console.log(`[SERVER] updateProductAction: Updating inventory for item ${productData.inventoryItemId} to quantity ${productData.inventory}`);
                    const locationId = await getPrimaryLocationId();
                    if (!locationId) throw new Error("Could not determine primary location.");
                    await updateInventoryQuantity(productData.inventoryItemId!, productData.inventory!, locationId);
                    
                    const docId = encodeShopifyId(productData.inventoryItemId!);
                    await adminDb.collection('inventoryStatus').doc(docId).set({
                        quantity: productData.inventory,
                        status: 'confirmed',
                        updatedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                })() 
                : Promise.resolve(),
            // Update product image in Firestore for real-time updates
            (async () => {
                const productDocId = encodeShopifyId(productId);
                await adminDb.collection('productImages').doc(productDocId).set({
                    imageUrl: productData.imageUrls?.[0] || null,
                    status: 'confirmed',
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
            })(),
            // Add to new collections
            ...collectionsToAdd.map(collectionId => collectionAddProducts(collectionId, [productId])),
            // Remove from old collections
            ...collectionsToRemove.map(collectionId => collectionRemoveProducts(collectionId, [productId]))
        ]);

        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function deleteProductAction(productId: string) {
    try {
        console.log(`[SERVER] Attempting to delete product: ${productId}`);
        const result = await deleteProduct(productId);
        console.log(`[SERVER] Delete result:`, result);
        
        // Check for user errors in the response
        if (result.userErrors && result.userErrors.length > 0) {
            const errorMessage = result.userErrors.map((e: any) => e.message).join(', ');
            console.error('Shopify delete errors:', errorMessage);
            return { success: false, error: errorMessage };
        }
        
        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function quickUpdateInventoryAction({
    inventoryItemId,
    quantity,
}: {
    inventoryItemId: string;
    quantity: number;
}) {
    try {
        // --- ADD THIS LOG ---
        console.log(`[SERVER] quickUpdateInventoryAction: Updating inventory for item ${inventoryItemId} to quantity ${quantity}`);

        const locationId = await getPrimaryLocationId();
        if (!locationId) {
            throw new Error("Could not determine primary location for inventory update.");
        }

        await updateInventoryQuantity(inventoryItemId, quantity, locationId);

        const docId = encodeShopifyId(inventoryItemId);
        await adminDb.collection('inventoryStatus').doc(docId).set(
            {
                quantity,
                status: 'confirmed',
                updatedAt: FieldValue.serverTimestamp(),
                source: 'quick_update',
            },
            { merge: true }
        );

        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        console.error('Quick inventory update error:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}