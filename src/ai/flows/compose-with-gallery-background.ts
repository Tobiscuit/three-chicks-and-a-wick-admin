
'use server';
/**
 * @fileOverview Composes a product image with a pre-existing gallery background.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit/ai';

const ComposeWithGallerySchema = z.object({
  candleImage: z.custom<Part>().describe('The user-uploaded candle image'),
  galleryImage: z.custom<Part>().describe('The pre-existing gallery background image'),
});

export const composeWithGalleryBackgroundFlow = ai.defineFlow(
  {
    name: 'composeWithGalleryBackgroundFlow',
    inputSchema: ComposeWithGallerySchema,
    outputSchema: z.custom<Part>(),
  },
  async ({ candleImage, galleryImage }) => {
    try {
      console.log('[Compose Flow] Starting composition with gallery background...');
      const composePrompt = `
        Your task is to perform a photorealistic composition.
        You will be given two images: a background image and a product image.
        Isolate the primary product from the product image, discarding its original background.
        Realistically place that isolated product onto a surface within the new background image.
        Ensure the lighting, shadows, and perspective are seamless and consistent.

        **Output only the final, composed image.**
        **Do not include any text, commentary, markdown, or any other content besides the image itself.**
      `;

      const finalImageResponse = await ai.generate({
        prompt: composePrompt,
        model: 'googleai/imagen-3',
        context: [galleryImage, candleImage],
      });

      console.log('[Compose Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));

      const finalImagePart = finalImageResponse.media();
      if (!finalImagePart) {
        console.error('[Compose Flow] Failed to extract media from final image response.');
        throw new Error('Could not compose final image. AI response did not contain media.');
      }
      console.log('[Compose Flow] SUCCESS: Final image composed.');

      return finalImagePart;
    } catch (error: any) {
      console.error("[Compose Flow Error]", error);
      throw new Error(`AI Composition Flow Failed: ${error.message}`);
    }
  }
);
