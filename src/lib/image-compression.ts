'use client';

/**
 * Compress and resize an image file for faster uploads
 * Uses canvas to resize and quality reduction for JPEG/WebP compression
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputFormat?: 'image/webp' | 'image/jpeg';
  } = {}
): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    outputFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL with compression
        const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
        
        // Log compression stats for debugging
        const originalSize = e.target?.result?.toString().length || 0;
        const compressedSize = compressedDataUrl.length;
        const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(`[Image Compression] ${file.name}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${savings}% smaller)`);

        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image specifically for AI processing (smaller for faster API calls)
 */
export async function compressImageForAI(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    outputFormat: 'image/webp'
  });
}

/**
 * Compress image for storage (higher quality for product display)
 */
export async function compressImageForStorage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
    outputFormat: 'image/webp'
  });
}
