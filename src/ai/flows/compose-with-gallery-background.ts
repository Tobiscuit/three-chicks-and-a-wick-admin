
'use server';
/**
 * @fileOverview Composes a product image with a pre-existing gallery background.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ComposeWithGallerySchema = z.object({
  candleImage1: z.string().describe('The primary user-uploaded candle image as a data URI'),
  candleImage2: z.string().optional().describe('The optional secondary candle image as a data URI'),
  galleryImage: z.string().describe('The pre-existing gallery background image as a data URI'),
});

export const composeWithGalleryBackgroundFlow = ai.defineFlow(
  {
    name: 'composeWithGalleryBackgroundFlow',
    inputSchema: ComposeWithGallerySchema,
    outputSchema: z.string(),
  },
  async ({ candleImage1, candleImage2, galleryImage }) => {
    
    const redactData = (uri: string) => {
      if (uri.length > 100) {
        return `${uri.substring(0, 50)}...[REDACTED_LENGTH=${uri.length}]`;
      }
      return uri;
    };

    try {
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === 'true';
      const modelName = useGemini ? 'gemini-2.5-flash-image-preview' : 'imagen-3';
      console.log(`[Compose Flow] Using image model: ${modelName}`);

      console.log('[Compose Flow] Starting composition with gallery background...');
      
      let composePrompt = `
        Your task is to perform a photorealistic composition.
        You will be given two images: a background image and a product image.
        Isolate the primary product from the product image, discarding its original background.
        Realistically place that isolated product onto a surface within the new background image.
        Ensure the lighting, shadows, and perspective are seamless and consistent.

        **Output only the final, composed image.**
        **Do not include any text, commentary, markdown, or any other content besides the image itself.**
      `;

      const promptParts = [];
      promptParts.push({ text: composePrompt });
      promptParts.push({ media: { url: galleryImage } });
      promptParts.push({ media: { url: candleImage1 } });

      if (candleImage2) {
        composePrompt = `
          Your task is to perform a photorealistic composition.
          You will be given three images: a background, a primary product image, and a secondary product image for reference.
          Isolate the product from the primary product image, discarding its original background.
          Use the secondary product image as a crucial reference for the product's true lighting, shadows, and depth.
          Realistically place the isolated product (from the primary image) onto a surface within the background image.
          
          **Output only the final, composed image containing the primary product.**
          **Do not include any text, commentary, markdown, or any other content besides the image itself.**
        `;
        // Overwrite the prompt and add the third image
        promptParts[0] = { text: composePrompt };
        promptParts.push({ media: { url: candleImage2 } });
      }

      console.log('[Compose Flow] Input Parts for composition:', JSON.stringify(promptParts.map(p => p.text ? p : { media: { url: redactData(p.media.url) } }), null, 2));

      const finalImageResponse = await ai.generate({
        prompt: promptParts,
        model: googleAI.model(modelName),
        output: { format: 'media' },
      });
      
      const finalImagePart = finalImageResponse.media;
      
      if (!finalImagePart?.url) {
        console.error('[Compose Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.text || '[No text content found in response]';
        console.error(`[Compose Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not compose final image. AI response did not contain media.');
      }

      console.log('[Compose Flow] SUCCESS: Final image composed.');

      return finalImagePart.url;
    } catch (error: any) {
      console.error("[Compose Flow Error]", error);
      throw new Error(`AI Composition Flow Failed: ${error.message}`);
    }
  }
);
