'use server';

import sharp from 'sharp';

/**
 * Post-processing configuration for generated images
 */
const IMAGE_CONFIG = {
  /** Target width for Full HD output */
  targetSize: 1920,
  /** WebP quality (0-100) */
  webpQuality: 90,
  /** Output format */
  format: 'webp' as const,
};

/**
 * Converts a data URL to a Buffer
 */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
  };
}

/**
 * Converts a Buffer to a data URL
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Post-processes a generated image:
 * - Resizes to Full HD (1920px)
 * - Converts to WebP at 90% quality
 * 
 * @param imageDataUrl - The input image as a data URL (typically PNG from Gemini)
 * @returns Processed image as a WebP data URL
 */
export async function postProcessGeneratedImage(imageDataUrl: string): Promise<string> {
  console.log('[Image Processing] Starting post-processing...');
  
  const { buffer: inputBuffer } = dataUrlToBuffer(imageDataUrl);
  console.log(`[Image Processing] Input size: ${(inputBuffer.length / 1024).toFixed(1)} KB`);
  
  const processedBuffer = await sharp(inputBuffer)
    .resize(IMAGE_CONFIG.targetSize, IMAGE_CONFIG.targetSize, {
      fit: 'inside', // Maintain aspect ratio, fit within bounds
      withoutEnlargement: false, // Allow upscaling if needed (shouldn't happen with 2K source)
    })
    .webp({ quality: IMAGE_CONFIG.webpQuality })
    .toBuffer();
  
  console.log(`[Image Processing] Output size: ${(processedBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`[Image Processing] Compression: ${((1 - processedBuffer.length / inputBuffer.length) * 100).toFixed(1)}% reduction`);
  
  return bufferToDataUrl(processedBuffer, 'image/webp');
}
