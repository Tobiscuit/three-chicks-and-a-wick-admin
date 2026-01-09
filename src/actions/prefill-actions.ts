'use server';

/**
 * Prefill Server Actions
 * 
 * Handles temporary storage of images for product prefill flow.
 */

import { adminStorage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

type PrefillTokenResult = {
  success: boolean;
  token?: string;
  error?: string;
};

type ResolvePrefillResult = {
  success: boolean;
  url?: string;
  error?: string;
};

type CreateUploadUrlResult = {
  success: boolean;
  token?: string;
  uploadUrl?: string;
  error?: string;
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Stash an image in Firebase Storage for product prefill.
 * Returns a token that can be used to retrieve the image later.
 */
export async function stashProductPrefillImage(dataUri: string): Promise<PrefillTokenResult> {
  try {
    if (!dataUri?.startsWith('data:')) {
      return { success: false, error: 'Invalid image data.' };
    }
    
    const [meta, base64] = dataUri.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(meta || '');
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
    const ext = mimeType.split('/')[1] || 'webp';
    const token = uuidv4();
    const fileName = `prefill-product-images/${token}.${ext}`;
    const buffer = Buffer.from(base64, 'base64');

    const bucket = adminStorage.bucket();
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType: mimeType, resumable: false, public: false });

    return { success: true, token };
  } catch (e: any) {
    console.error('[stashProductPrefillImage Error]', e);
    return { success: false, error: e.message || 'Failed to stash prefill image.' };
  }
}

/**
 * Resolve a prefill token to a signed URL.
 */
export async function resolveProductPrefillImage(token: string): Promise<ResolvePrefillResult> {
  try {
    if (!token) return { success: false, error: 'Missing token.' };
    
    const bucket = adminStorage.bucket();
    const [files] = await bucket.getFiles({ prefix: `prefill-product-images/${token}` });
    const file = files[0];
    
    if (!file) return { success: false, error: 'Token not found or expired.' };
    
    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    return { success: true, url };
  } catch (e: any) {
    console.error('[resolveProductPrefillImage Error]', e);
    return { success: false, error: e.message || 'Failed to resolve prefill image.' };
  }
}

/**
 * Create a signed upload URL for direct client uploads.
 */
export async function createPrefillUploadUrl(contentType: string): Promise<CreateUploadUrlResult> {
  try {
    const ext = (contentType.split('/')[1] || 'webp').toLowerCase();
    const token = uuidv4();
    const fileName = `prefill-product-images/${token}.${ext}`;
    const bucket = adminStorage.bucket();

    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });
    
    return { success: true, token, uploadUrl: url };
  } catch (e: any) {
    console.error('[createPrefillUploadUrl Error]', e);
    return { success: false, error: e.message || 'Failed to create upload URL.' };
  }
}
