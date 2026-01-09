'use server';

/**
 * AI Image Generation Server Actions
 * 
 * Handles AI-powered image generation and composition using Gemini.
 */

import { generateCustomCandleBackgroundFlow } from '@/ai/flows/generate-custom-candle-background';
import { composeWithGalleryBackgroundFlow } from '@/ai/flows/compose-with-gallery-background';
import { z } from 'zod';
import { Part } from '@google/generative-ai';

// ============================================================================
// Types
// ============================================================================

type GenerateImageInput = {
  background: string;
  angle1: string; // data URL
  angle2?: string; // data URL
};

type ComposeWithGalleryInput = {
  galleryBackgroundUrl: string;
  angle1: string; // data URL
  angle2?: string; // data URL
  context?: string;
};

type ImageActionResult = {
  imageDataUri?: string;
  error?: string;
};

// ============================================================================
// Validation Schema
// ============================================================================

const imageGenSchema = z.object({
  background: z.string().min(1, { message: 'Background prompt is required.' }),
  angle1: z.string().min(1, { message: 'Primary candle image is required.' }),
  angle2: z.string().optional(),
  context: z.string().optional(),
});

// ============================================================================
// Helpers
// ============================================================================

function dataUrlToPart(dataUrl: string): Part {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Invalid data URL: dataUrl is undefined or not a string');
  }

  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    console.error('Invalid data URL format:', dataUrl.substring(0, 100) + '...');
    throw new Error('Invalid data URL format for generative part.');
  }
  
  return {
    inlineData: {
      data: match[2],
      mimeType: match[1],
    },
  };
}

async function firebaseUrlToDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting Firebase URL to data URL:', error);
    throw new Error(`Failed to convert Firebase URL to data URL: ${error}`);
  }
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Generate a custom candle background image using AI.
 */
export async function generateImageAction(input: GenerateImageInput): Promise<ImageActionResult> {
  try {
    const validated = imageGenSchema.safeParse(input);

    if (!validated.success) {
      return { error: validated.error.errors.map((e) => e.message).join(', ') };
    }

    const { background, angle1, angle2, context } = validated.data;

    const imageDataUrl = await generateCustomCandleBackgroundFlow({
      background: background,
      contextualDetails: context,
      candleImage1: angle1,
      candleImage2: angle2,
    });

    if (!imageDataUrl) {
      return { error: 'The AI did not return a valid image.' };
    }

    const imageUrl = typeof imageDataUrl === 'string' ? imageDataUrl : imageDataUrl.url;
    const resultPart = dataUrlToPart(imageUrl);
    
    if (!resultPart?.inlineData) {
      return { error: 'The AI did not return a valid image.' };
    }

    return { imageDataUri: `data:${resultPart.inlineData.mimeType};base64,${resultPart.inlineData.data}` };
  } catch (error: any) {
    console.error('[generateImageAction Error]', error);
    if (error.message.includes('500') || error.message.includes('503')) {
      return { error: 'The AI image service is temporarily unavailable. Please try again later.' };
    }
    return { error: 'An unexpected error occurred during image generation.' };
  }
}

/**
 * Compose candle images with a gallery background using AI.
 */
export async function composeWithGalleryAction(input: ComposeWithGalleryInput): Promise<ImageActionResult> {
  try {
    const { galleryBackgroundUrl, angle1, angle2, context } = input;

    const galleryImageDataUrl = await firebaseUrlToDataUrl(galleryBackgroundUrl);

    const imageDataUrl = await composeWithGalleryBackgroundFlow({
      candleImage1: angle1,
      candleImage2: angle2,
      galleryImage: galleryImageDataUrl,
      contextualDetails: context,
    });

    if (!imageDataUrl) {
      return { error: 'The AI did not return a valid composite image.' };
    }

    if (!imageDataUrl.url) {
      return { error: 'The AI did not return a valid composite image.' };
    }

    console.log('[composeWithGalleryAction] Returning success with image data URI.');
    return { imageDataUri: imageDataUrl.url };
  } catch (error: any) {
    console.error('[composeWithGalleryAction Error]', error);
    return { error: `An unexpected error occurred during image composition: ${error.message}` };
  }
}
