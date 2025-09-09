
"use server";

import 'server-only';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
    createProduct,
    updateProduct,
    deleteProduct,
    quickUpdateInventory,
} from '@/services/shopify';
import { adminDb } from '@/lib/firebase-admin';
import { encodeShopifyId } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const productSchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string(),
    price: z.string(),
    tags: z.string(),
    sku: z.string(),
    imageUrl: z.string().url().optional().nullable(),
});

export async function addProductAction(formData: z.infer<typeof productSchema>) {
    try {
        const product = productSchema.parse(formData);
        const result = await createProduct({
            title: product.title,
            body_html: product.description,
            tags: product.tags,
            variants: [{ price: product.price, sku: product.sku }],
            images: product.imageUrl ? [{ src: product.imageUrl }] : [],
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
        if (!product.id) {
            throw new Error('Product ID is required for updates.');
        }
        const result = await updateProduct(product.id, {
            title: product.title,
            body_html: product.description,
            tags: product.tags,
            variants: [{ price: product.price, sku: product.sku }],
            images: product.imageUrl ? [{ src: product.imageUrl }] : [],
        });
        revalidatePath('/products');
        return { success: true, product: result };
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
