
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
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === 'true';
      const modelName = useGemini ? 'vertexai/gemini-2.5-flash-image-preview' : 'vertexai/imagen-3';
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
      console.log('[Compose Flow] Converting data URLs to Parts...');
      console.log('[Compose Flow] galleryImage type:', typeof galleryImage, 'length:', galleryImage?.length);
      console.log('[Compose Flow] candleImage1 type:', typeof candleImage1, 'length:', candleImage1?.length);
      console.log('[Compose Flow] candleImage2 type:', typeof candleImage2, 'length:', candleImage2?.length);
      
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

      console.log('[Compose Flow] Context array length:', context.length);
      console.log('[Compose Flow] Context array items:', context.map((part, index) => ({
        index,
        hasInlineData: !!part.inlineData,
        mimeType: part.inlineData?.mimeType,
        dataLength: part.inlineData?.data?.length
      })));

      console.log('[Compose Flow] Input Parts for composition:', JSON.stringify({ galleryImage: redactData(galleryImagePart), candleImage1: redactData(candleImage1Part), candleImage2: candleImage2 ? redactData(context[2]) : undefined }, null, 2));

      // Define the structured data payload with explicit roles
      const payload: {
        prompt: string;
        background: Part;
        product: Part;
        product_reference?: Part; // Optional reference image
      } = {
        prompt: composePrompt,
        background: galleryImagePart,
        product: candleImage1Part,
      };

      // Add the optional second image if it exists
      if (candleImage2) {
        const candleImage2Part = dataUrlToPart(candleImage2);
        payload.product_reference = candleImage2Part;
      }

      console.log('[Compose Flow] About to call ai.generate with structured payload.');
      console.log('[Compose Flow] Payload structure:', {
        hasPrompt: !!payload.prompt,
        hasBackground: !!payload.background,
        hasProduct: !!payload.product,
        hasProductReference: !!payload.product_reference
      });
      
      const finalImageResponse = await ai.generate({
        model: modelName,
        prompt: [{
          data: payload // Pass the entire structured payload as a 'data' part
        }],
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
