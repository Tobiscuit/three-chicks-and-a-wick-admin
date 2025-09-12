
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
    const redactData = (part: Part) => {
      if (part.inlineData && part.inlineData.data.length > 100) {
        return { ...part, inlineData: { ...part.inlineData, data: `[REDACTED_BASE64_DATA_LENGTH=${part.inlineData.data.length}]` } };
      }
      return part;
    };

    try {
      console.log('[Compose Flow] Using image model: googleai/gemini-2.5-flash-image-preview');
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

      console.log('[Compose Flow] Input Parts for composition:', JSON.stringify({ galleryImage: redactData(galleryImage), candleImage: redactData(candleImage) }, null, 2));

      const finalImageResponse = await ai.generate({
        prompt: composePrompt,
        model: 'googleai/gemini-2.5-flash-image-preview',
        context: [galleryImage, candleImage],
      });

      console.log('[Compose Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));

      // Manually find the media part in the response
      let finalImagePart = finalImageResponse.message.content.find(p => p.media)?.media;

      if (!finalImagePart) {
        console.error('[Compose Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.text();
        console.error(`[Compose Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not compose final image. AI response did not contain media.');
      }

      // Normalize the response: Genkit can return a URL or inlineData. Actions expect inlineData.
      if (finalImagePart.url?.startsWith('data:')) {
        const [meta, base64] = finalImagePart.url.split(',');
        const mimeType = /data:(.*?);base64/.exec(meta || '')?.[1] || 'image/png';
        finalImagePart = {
          inlineData: {
            data: base64,
            mimeType,
          }
        };
      }

      console.log('[Compose Flow] SUCCESS: Final image composed.');

      return finalImagePart;
    } catch (error: any) {
      console.error("[Compose Flow Error]", error);
      throw new Error(`AI Composition Flow Failed: ${error.message}`);
    }
  }
);
