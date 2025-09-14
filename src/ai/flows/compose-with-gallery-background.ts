
'use server';
/**
 * @fileOverview Composes a product image with a pre-existing gallery background.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

// Helper to convert a Data URL string into a Genkit Part object
function dataUrlToPart(dataUrl: string): Part {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid data URL format for generative part.');
    }
    return {
        inlineData: {
            mimeType: match[1],
            data: match[2]
        }
    };
}

const ComposeWithGallerySchema = z.object({
  candleImage1: z.string().describe('The primary user-uploaded candle image as a data URI'),
  candleImage2: z.string().optional().describe('The optional secondary candle image as a data URI'),
  galleryImage: z.string().describe('The pre-existing gallery background image as a data URI'),
});

export const composeWithGalleryBackgroundFlow = ai.defineFlow(
  {
    name: 'composeWithGalleryBackgroundFlow',
    inputSchema: ComposeWithGallerySchema,
    outputSchema: z.custom<Part>(),
  },
  async ({ candleImage1, candleImage2, galleryImage }) => {
    
    const redactData = (part: Part) => {
      if (part.inlineData?.data?.length > 100) {
        return `${part.inlineData.data.substring(0, 50)}...[REDACTED_LENGTH=${part.inlineData.data.length}]`;
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

      // Convert data URIs to Parts inside the flow
      const galleryImagePart = dataUrlToPart(galleryImage);
      const candleImage1Part = dataUrlToPart(candleImage1);

      const context: Part[] = [galleryImagePart, candleImage1Part];

      if (candleImage2) {
        const candleImage2Part = dataUrlToPart(candleImage2);
        context.push(candleImage2Part);
        composePrompt = `
          Your task is to perform a photorealistic composition.
          You will be given three images: a background, a primary product image, and a secondary product image for reference.
          Isolate the product from the primary product image, discarding its original background.
          Use the secondary product image as a crucial reference for the product's true lighting, shadows, and depth.
          Realistically place the isolated product (from the primary image) onto a surface within the background image.
          
          **Output only the final, composed image containing the primary product.**
          **Do not include any text, commentary, markdown, or any other content besides the image itself.**
        `;
      }

      console.log('[Compose Flow] Input Parts for composition:', JSON.stringify({ galleryImage: redactData(galleryImagePart), candleImage1: redactData(candleImage1Part), candleImage2: candleImage2 ? redactData(context[2]) : undefined }, null, 2));

      const finalImageResponse = await ai.generate({
        prompt: composePrompt,
        model: modelName,
        context: context,
      });

      console.log('[Compose Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));
      
      // Extract media from the nested response structure
      const finalImagePart = finalImageResponse.message?.content?.[0]?.media;
      
      if (!finalImagePart?.url) {
        console.error('[Compose Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.text || '[No text content found in response]';
        console.error(`[Compose Flow] AI text response was: "${textResponse}"`);
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
