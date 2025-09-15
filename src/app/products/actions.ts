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
        });
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
        const product = productSchema.parse(formData);
        const productId = product.id;
        if (!productId) {
            throw new Error('Product ID is required for updates.');
        }

        // Step 1: Update core product details (title, tags, status)
        await updateProduct(productId, {
            title: product.title,
            tags: product.tags,
            status: product.status,
        });

        // Step 2: Update the description using its separate metafield mutation
        if (product.description) {
            await updateProductDescription(productId, product.description);
        }

        // Step 3: Update inventory
        if (product.inventoryItemId && typeof product.inventory === 'number') {
            
            // --- ADD THIS LOG ---
            console.log(`[SERVER] updateProductAction: Updating inventory for item ${product.inventoryItemId} to quantity ${product.inventory}`);

            const locationId = await getPrimaryLocationId();
            if (!locationId) {
                throw new Error("Could not determine primary location for inventory update.");
            }
            await updateInventoryQuantity(product.inventoryItemId, product.inventory, locationId);
            
            const docId = encodeShopifyId(product.inventoryItemId);
            await adminDb.collection('inventoryStatus').doc(docId).set({
                quantity: product.inventory,
                status: 'confirmed',
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        
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
        await deleteProduct(productId);
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