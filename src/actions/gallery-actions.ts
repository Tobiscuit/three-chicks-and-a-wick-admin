'use server';

/**
 * Gallery Server Actions
 * 
 * Handles fetching gallery background images from Firebase Storage.
 */

import { adminStorage } from '@/lib/firebase-admin';

// ============================================================================
// Types
// ============================================================================

type GalleryActionResult = {
  success: boolean;
  images?: { name: string; url: string }[];
  error?: string;
  bucketName?: string;
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Get all gallery background images with signed URLs.
 */
export async function getGalleryImagesAction(): Promise<GalleryActionResult> {
  try {
    const bucket = adminStorage.bucket();
    console.log('[Gallery Action] Bucket name:', bucket.name);

    if (!bucket.name) {
      throw new Error('Admin bucket name is empty. Ensure FIREBASE_STORAGE_BUCKET_ADMIN is set.');
    }

    const prefix = 'gallery-backgrounds/';
    const [files] = await bucket.getFiles({ prefix });

    const imageFiles = files.filter((file) => !file.name.endsWith('/'));

    const signedUrls = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          });
          return { name: file.name, url };
        } catch (urlError: any) {
          console.error(`Failed to generate signed URL for ${file.name}:`, urlError.message);
          return { name: file.name, url: 'error' };
        }
      })
    );

    const validImages = signedUrls.filter((img) => img.url !== 'error');
    return { success: true, images: validImages, bucketName: bucket.name };
  } catch (error: any) {
    console.error('Failed to fetch gallery images:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
