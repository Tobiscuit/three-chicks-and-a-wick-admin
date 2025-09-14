
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
    quickUpdateInventory,
} from '@/services/shopify';
import { adminDb } from '@/lib/firebase-admin';
import { encodeShopifyId } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const productSchema = z.object({
    id: z.string().optional(),
    inventoryItemId: z.string().optional(),
    inventory: z.number().optional(),
    title: z.string(),
    description: z.string(),
    price: z.string(),
    tags: z.string(),
    sku: z.string(),
    status: z.string(), // ADD THIS LINE - This was the missing piece!
    imageUrls: z.array(z.string().url()).optional().nullable(),
});

export async function addProductAction(formData: z.infer<typeof productSchema>) {
    try {
        const product = productSchema.parse(formData);
        const result = await createProduct({
            title: product.title,
            description: product.description,
            tags: product.tags,
            price: product.price,
            sku: product.sku,
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
        console.log("--- UPDATE ACTION (Server-Side) ---");
        console.log("Status received by action:", product.status);
        console.log("Full product data received:", product);
        
        const productId = product.id;
        if (!productId) {
            throw new Error('Product ID is required for updates.');
        }

        console.log("--- Starting Multi-Step Product Update ---");

        // Step 1: Update core product details (including the now-present status)
        console.log(`Step 1: Updating core details with status: ${product.status}`);
        await updateProduct(productId, {
            title: product.title,
            tags: product.tags,
            status: product.status, // This will now correctly pass the status
        });

        // Step 2: Update the description using its separate metafield mutation
        if (product.description) {
            console.log("Step 2: Updating description via metafield...");
            await updateProductDescription(productId, product.description);
        }

        // Step 3: Update inventory (this logic was already correct)
        if (product.inventoryItemId && typeof product.inventory === 'number') {
            console.log("Step 3: Updating inventory...");
            const locationId = await getPrimaryLocationId();
            if (!locationId) {
                throw new Error("Could not determine primary location for inventory update.");
            }
            await updateInventoryQuantity(product.inventoryItemId, product.inventory, locationId);
            
            // Also update Firestore for real-time UI
            const docId = encodeShopifyId(product.inventoryItemId);
            await adminDb.collection('inventoryStatus').doc(docId).set({
                quantity: product.inventory,
                status: 'confirmed',
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        // Note: Logic for updating price, SKU, images would go here as additional steps if needed.

        console.log("--- Product Update Successful ---");
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
        await quickUpdateInventory(inventoryItemId, quantity);

        // Update Firestore for real-time updates
        const docId = encodeShopifyId(inventoryItemId);
        const docRef = adminDb.collection('inventoryStatus').doc(docId);
        await docRef.set(
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
