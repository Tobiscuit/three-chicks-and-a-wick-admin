
'use server';
/**
 * @fileOverview Composes a product image with a pre-existing gallery background.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

// Helper to convert a Data URL string into a Genkit Part object
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
      const modelName = 'googleai/gemini-2.5-flash-image-preview';
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
      }

      // Build the prompt array with the new URL-based syntax
      const prompt = [
        { text: composePrompt },
        { media: { url: galleryImage } }, // Pass the full data URL string
        { media: { url: candleImage1 } }, // Pass the full data URL string
      ];

      if (candleImage2) {
        prompt.push({ media: { url: candleImage2 } }); // Add the optional image
      }

      console.log('[Compose Flow] Calling ai.generate with URL-based media parts.');
      console.log('[Compose Flow] Prompt structure:', {
        textPrompt: !!prompt[0].text,
        mediaCount: prompt.filter(p => p.media).length,
        galleryImage: galleryImage.substring(0, 50) + '...',
        candleImage1: candleImage1.substring(0, 50) + '...',
        candleImage2: candleImage2 ? candleImage2.substring(0, 50) + '...' : 'none'
      });
      
      const finalImageResponse = await ai.generate({
        model: modelName,
        prompt: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      console.log('[Compose Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));
      
      // Extract media from the nested response structure
      // The media might be at content[0] or content[1], so we need to find it
      const content = finalImageResponse.message?.content || [];
      const finalImagePart = content.find((item: any) => item.media)?.media;
      
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
