import { adminDb } from '@/lib/firebase-admin';
import { encodeShopifyId } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'productDescriptions';

/**
 * Saves the authoritative HTML description to Firestore.
 * This acts as a "Shadow" description that bypasses Shopify's potential sanitization.
 */
export async function saveShadowDescription(productId: string, descriptionHtml: string) {
    if (!productId) return;
    
    try {
        const docId = encodeShopifyId(productId);
        await adminDb.collection(COLLECTION_NAME).doc(docId).set({
            descriptionHtml,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`[Shadow Description] Saved for product ${productId}`);
    } catch (error) {
        console.error(`[Shadow Description] Failed to save for product ${productId}:`, error);
        // We don't throw here because this is a secondary storage mechanism
        // and we don't want to block the main product update.
    }
}

/**
 * Loads the authoritative HTML description from Firestore.
 * Returns null if not found.
 */
export async function loadShadowDescription(productId: string): Promise<string | null> {
    if (!productId) return null;

    try {
        const docId = encodeShopifyId(productId);
        const doc = await adminDb.collection(COLLECTION_NAME).doc(docId).get();
        
        if (doc.exists) {
            const data = doc.data();
            return data?.descriptionHtml || null;
        }
        return null;
    } catch (error) {
        console.error(`[Shadow Description] Failed to load for product ${productId}:`, error);
        return null;
    }
}
