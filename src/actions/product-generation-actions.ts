'use server';

/**
 * AI Product Generation Server Actions
 * 
 * Handles AI-powered product description generation and stashing.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminStorage, adminDb } from '@/lib/firebase-admin';
import { GOOGLE_AI_CONFIG } from '@/lib/env-config';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

type GenerateProductInput = {
  imageDataUrl: string;
  price: string;
  creatorNotes: string;
  quantity: number;
  sourceImageUrls?: string[];
};

type GenerateProductResult = {
  token?: string;
  error?: string;
};

type StashResult = {
  success: boolean;
  token?: string;
  error?: string;
};

type ResolveResult = {
  success: boolean;
  data?: any;
  error?: string;
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Generate product listing content from an image using AI.
 */
export async function generateProductFromImageAction(
  input: GenerateProductInput
): Promise<GenerateProductResult> {
  if (!GOOGLE_AI_CONFIG.API_KEY) {
    return { error: 'Gemini API key is not configured.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_CONFIG.API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const { creatorNotes, price, imageDataUrl, quantity, sourceImageUrls } = input;

    if (!creatorNotes || !price || !imageDataUrl || quantity === undefined) {
      return { error: 'Missing required fields for product generation.' };
    }

    console.log('[Product Generation] Starting AI generation...');

    const base64Data = imageDataUrl.match(/;base64,(.*)$/)?.[1];
    if (!base64Data) {
      throw new Error('Invalid image data URL format.');
    }

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg',
      },
    };

    const systemPrompt = getProductGenerationPrompt();
    const userMessage = `
      Here is the data for a new candle:
      - **Creator's Notes:** "${creatorNotes}"
      - **Price:** ${price}

      Please generate only the creative text fields for the Shopify product JSON.
    `;

    const result = await model.generateContent([
      systemPrompt,
      getOutputStructure(),
      imagePart,
      userMessage,
    ]);

    const text = await result.response.text();
    console.log('[Product Generation] AI response received');

    let creativeData;
    try {
      creativeData = JSON.parse(text);
    } catch (e: any) {
      console.error('[Product Generation] Failed to parse AI response:', text);
      throw new Error('The AI returned an invalid response. Please try again.');
    }

    const stashResult = await stashAiGeneratedProductAction(
      creativeData,
      imageDataUrl,
      price,
      quantity,
      sourceImageUrls
    );

    if (!stashResult.success || !stashResult.token) {
      throw new Error(stashResult.error || 'Failed to stash AI-generated data.');
    }

    return { token: stashResult.token };
  } catch (error: any) {
    console.error('[generateProductFromImageAction Error]', error);

    if (error.message.includes('503')) {
      return { error: 'The AI service is temporarily unavailable. Please try again later.' };
    }

    if (error.message.includes('token')) {
      return { error: 'The image is too large. Please try a smaller image.' };
    }

    return { error: 'An unexpected error occurred while generating the product.' };
  }
}

/**
 * Stash AI-generated product data in Firestore.
 */
export async function stashAiGeneratedProductAction(
  creativeData: any,
  imageDataUrl: string,
  price: string,
  quantity: number,
  sourceImageUrls?: string[]
): Promise<StashResult> {
  try {
    const bucket = adminStorage.bucket();
    const fileName = `product-images/ai-generated/${uuidv4()}.webp`;
    const imageBuffer = Buffer.from(imageDataUrl.split(',')[1], 'base64');

    await bucket.file(fileName).save(imageBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true,
    });

    const publicImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const token = uuidv4();
    const docRef = adminDb.collection('aiProductDrafts').doc(token);

    await docRef.set({
      ...creativeData,
      price,
      quantity,
      publicImageUrl,
      sourceImageUrls: sourceImageUrls || [],
      createdAt: new Date(),
    });

    return { success: true, token };
  } catch (error: any) {
    console.error('[stashAiGeneratedProductAction Error]', error);
    return { success: false, error: 'Failed to save AI-generated product data.' };
  }
}

/**
 * Resolve AI-generated product data from Firestore.
 */
export async function resolveAiGeneratedProductAction(token: string): Promise<ResolveResult> {
  try {
    if (!token) return { success: false, error: 'Missing token.' };

    const docRef = adminDb.collection('aiProductDrafts').doc(token);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Draft not found or already used.');
    }

    const data = doc.data();
    await docRef.delete();

    if (!data) {
      return { success: false, error: 'No data found for this draft.' };
    }

    // Remove Firestore Timestamp (not serializable)
    const { createdAt, ...rest } = data;
    return { success: true, data: rest };
  } catch (error: any) {
    console.error('[resolveAiGeneratedProductAction Error]', error);
    return { success: false, error: 'Failed to resolve AI-generated product data.' };
  }
}

/**
 * Upload an image to Firebase Storage.
 */
export async function uploadImageAction(imageDataUrl: string): Promise<string | null> {
  try {
    const bucket = adminStorage.bucket();
    const token = uuidv4();
    const fileName = `product-images/${token}-upload.webp`;
    const [meta, base64] = imageDataUrl.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(meta || '');
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
    const buffer = Buffer.from(base64, 'base64');

    await bucket.file(fileName).save(buffer, {
      contentType: mimeType,
      resumable: false,
      public: true,
    });

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  } catch (error) {
    console.error('[uploadImageAction Error]', error);
    return null;
  }
}

// ============================================================================
// Prompts
// ============================================================================

function getProductGenerationPrompt(): string {
  return `You are the brand voice and creative writer for "Three Chicks and a Wick," a boutique candle company.

**Your Persona:**
You are **The Creator** at heart, with a touch of **The Jester**. Your tone is warm, vibrant, and sophisticated, but also approachable and full of genuine delight.

**Your Writing Principles:**
1. **Immediacy:** Get straight to the heart of the scent. No generic introductions.
2. **Potency:** Condense descriptive imagery into impactful phrases.
3. **Active Language:** Use strong, direct verbs and vivid adjectives.
4. **Flow:** Vary sentence structure for pleasing rhythm.
5. **Structured Highlights:** Include a punchy bulleted list with The Scent, The Vibe, and The Vessel.
6. **Product Focus:** Focus on the product, not the background.

**Your Task:**
Transform raw data into a partial Shopify product listing as a valid JSON object.`;
}

function getOutputStructure(): string {
  return `**Output Structure:**
\`\`\`json
{
  "title": "A creative title (5-7 words max)",
  "body_html": "A story-driven description using HTML (<p>, <strong>, <ul>, <li>).",
  "pivotReason": "A note explaining creative pivots based on the image.",
  "tags": "Up to 5 SEO-friendly tags in Title Case, comma-separated.",
  "sku": "A simple SKU based on the title (e.g., AHC-01).",
  "image_alt": "Accessible alt-text for the product image."
}
\`\`\``;
}
