
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
      const composePrompt = `Compose the candle image (second image part) onto the background image (first image part). The candle should be centered and well-lit. The final image should look like a professional product photo.`;

      const finalImageResponse = await ai.generate({
        prompt: composePrompt,
        model: 'googleai/gemini-2.5-pro',
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
