
"use server";

import { createProduct, updateProduct, getPrimaryLocationId, updateInventoryItem, updateProductVariant, createProductVariantsBulk, setInventoryQuantity, getProductById, deleteProduct, getPublicationIds, publishProductToPublications } from "@/services/shopify";
import type { CreateProductInput, ProductUpdateInput, ProductVariantInput, CreateMediaInput, NewProductVariantInput } from "@/services/shopify";
import { adminStorage, adminDb } from "@/lib/firebase-admin"; // USE CENTRAL ADMIN SDK
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from "next/cache";
import { encodeShopifyId } from "@/lib/utils";
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


type ActionResult = {
  success: boolean;
  productId?: string;
  error?: string;
  errorFields?: string[];
};


async function uploadImageToFirebase(file: File): Promise<string> {
    // adminStorage is pre-initialized from our central file
    const bucket = adminStorage.bucket();
    // Sanitize the original file name to avoid spaces or unsafe URL chars
    const sanitized = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    const fileName = `product-images/${uuidv4()}-${sanitized}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
    });

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error("[Firebase Upload Error]", err);
            reject('Failed to upload image.');
        });

        blobStream.on('finish', async () => {
            try {
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(fileName)}`;
                resolve(publicUrl);
            } catch (error) {
                 console.error("[Firebase Make Public Error]", error);
                 reject('Failed to make image public.');
            }
        });

        blobStream.end(fileBuffer);
    });
}


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

export async function deleteProductAction(productId: string): Promise<ActionResult> {
    try {
        const resp = await deleteProduct(productId);
        const errors = resp.productDelete.userErrors || [];
        if (errors.length > 0) {
            const msgs = errors.map(e => e.message).join(', ');
            return { success: false, error: `Shopify errors: ${msgs}` };
        }
        if (!resp.productDelete.deletedProductId) {
            return { success: false, error: "Product delete did not return an id." };
        }
        return { success: true, productId: resp.productDelete.deletedProductId };
    } catch (e: any) {
        return { success: false, error: e.message || 'Unexpected error while deleting product.' };
    }
}

export async function quickUpdateInventoryAction(inventoryItemId: string, newQuantity: number): Promise<ActionResult> {
    if (!inventoryItemId || typeof newQuantity !== 'number' || newQuantity < 0) {
        return { success: false, error: "Invalid input for inventory update." };
    }

    try {
        const locationId = await getPrimaryLocationId();
        if (!locationId) {
            throw new Error("Could not determine primary location for inventory update.");
        }

        const invSet = await setInventoryQuantity({
            inventoryItemId,
            locationId,
            quantity: newQuantity,
        });

        const invErrors = invSet.inventorySetQuantities?.userErrors || [];
        if (invErrors.length > 0) {
            const msgs = invErrors.map(e => e.message).join(', ');
            throw new Error(`Inventory set errors: ${msgs}`);
        }
        
        // Update Firestore for real-time UI
        const docId = encodeShopifyId(inventoryItemId);
        await adminDb.collection('inventoryStatus').doc(docId).set({
            quantity: newQuantity,
            status: 'confirmed',
            updatedAt: Date.now(),
            source: 'quick_update'
        }, { merge: true });

        return { success: true };

    } catch (e: any) {
        console.error("[quickUpdateInventoryAction Error]", e);
        return { success: false, error: e.message || "An unexpected error occurred." };
    }
}
