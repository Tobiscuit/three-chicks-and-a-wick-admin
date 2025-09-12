
'use server';
/**
 * @fileOverview Composes a product image with a pre-existing gallery background.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

const ComposeWithGallerySchema = z.object({
  candleImage1: z.custom<Part>().describe('The primary user-uploaded candle image'),
  candleImage2: z.custom<Part>().optional().describe('The optional secondary candle image'),
  galleryImage: z.custom<Part>().describe('The pre-existing gallery background image'),
});

export const composeWithGalleryBackgroundFlow = ai.defineFlow(
  {
    name: 'composeWithGalleryBackgroundFlow',
    inputSchema: ComposeWithGallerySchema,
    outputSchema: z.custom<Part>(),
  },
  async ({ candleImage1, candleImage2, galleryImage }) => {
    const redactData = (part: Part) => {
      if (part.inlineData && part.inlineData.data.length > 100) {
        return { ...part, inlineData: { ...part.inlineData, data: `[REDACTED_BASE64_DATA_LENGTH=${part.inlineData.data.length}]` } };
      }
      return part;
    };

    try {
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === 'true';
      const modelName = useGemini ? 'googleai/gemini-2.5-flash-image-preview' : 'googleai/imagen-3';
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

      const promptParts: Part[] = [];
      promptParts.push({ text: composePrompt });
      promptParts.push(galleryImage);
      promptParts.push(candleImage1);

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
        promptParts.push(candleImage2);
      }

      console.log('[Compose Flow] Input Parts for composition:', JSON.stringify(promptParts.map(redactData), null, 2));

      const finalImageResponse = await ai.generate({
        prompt: promptParts,
        model: modelName,
      });

      console.log('[Compose Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));

      // Manually find the media part in the response
      let finalImagePart = finalImageResponse.message.content.find(p => p.media)?.media;

      if (!finalImagePart) {
        console.error('[Compose Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.message?.content?.[0]?.text || '[No text content found in response]';
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
