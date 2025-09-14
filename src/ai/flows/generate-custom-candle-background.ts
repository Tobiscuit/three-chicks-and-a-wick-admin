'use server';
/**
 * @fileOverview Generates custom backgrounds for candle photos using text prompts.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

// Helper to convert a Data URL string into a Genkit Part object
function dataUrlToPart(dataUrl: string): Part {
    console.log('[dataUrlToPart] Input dataUrl:', dataUrl.substring(0, 100) + '...');
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        console.error('[dataUrlToPart] Failed to match data URL format. Full URL:', dataUrl);
        throw new Error('Invalid data URL format for generative part.');
    }
    console.log('[dataUrlToPart] Successfully parsed data URL. MimeType:', match[1]);
    return {
        inlineData: {
            mimeType: match[1],
            data: match[2]
        }
    };
}

const CandleAndContextSchema = z.object({
  background: z.string().describe('The user-provided background description'),
  candleImage1: z.string().describe('The primary user-uploaded candle image as a data URI'),
  candleImage2: z.string().optional().describe('The optional secondary candle image as a data URI'),
});

export const generateCustomCandleBackgroundFlow = ai.defineFlow(
  {
    name: 'generateCustomCandleBackgroundFlow',
    inputSchema: CandleAndContextSchema,
    outputSchema: z.custom<Part>(),
  },
  async ({ background, candleImage1, candleImage2 }) => {
    
    const redactData = (part: Part) => {
      if (part.inlineData && part.inlineData.data.length > 100) {
        return { ...part, inlineData: { ...part.inlineData, data: `[REDACTED_BASE64_DATA_LENGTH=${part.inlineData.data.length}]` } };
      }
      return part;
    };

    try {
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === 'true';
      const modelName = useGemini ? 'googleai/gemini-2.5-flash-image-preview' : 'googleai/imagen-3';
      console.log(`[Flow] Using image model: ${modelName}`);

      console.log('[Flow] Step 1: Generating background...');
      const bgPrompt = `Generate a background image for a product photo of a candle. The background should be clean, professional, and visually appealing. The user wants the following style: "${background}". Do not include the candle in the image.`;

      const bgImageResponse = await ai.generate({
        prompt: bgPrompt,
        model: modelName,
        output: { format: 'media' },
      });

      const bgImagePart = bgImageResponse.media;

      if (!bgImagePart?.url) {
        throw new Error('Could not generate background image. AI response did not contain media.');
      }

      console.log('[Flow] Step 1 SUCCESS: Background generated.');

      console.log('[Flow] Step 2: Composing final image...');
      
      const candleImage1Part = dataUrlToPart(candleImage1);
      const bgImageFinalPart = dataUrlToPart(bgImagePart.url);

      const context: Part[] = [candleImage1Part, bgImageFinalPart];
      let composePrompt = `Compose the candle image onto the background image, considering the user's desired style: "${background}". The candle should be centered and well-lit. The final image should look like a professional product photo.`;

      if (candleImage2) {
        const candleImage2Part = dataUrlToPart(candleImage2);
        context.push(candleImage2Part);
        composePrompt = `Compose the first candle image onto the background image, considering the user's desired style: "${background}". Use the second candle image as a crucial reference for lighting, shadows, and depth. The final composed image should only contain the first candle. The final image should look like a professional product photo.`
      }

      console.log('[Flow] Input Parts for composition:', JSON.stringify({ candleImage1: redactData(candleImage1Part), candleImage2: candleImage2 ? redactData(context[2]) : undefined, bgImagePart: redactData(bgImageFinalPart) }, null, 2));

      const finalImageResponse = await ai.generate({
        prompt: composePrompt,
        model: modelName,
        context: context,
      });

      const finalImagePart = finalImageResponse.media();

      if (!finalImagePart) {
        throw new Error('Could not compose final image. AI response did not contain media.');
      }

      console.log('[Flow] Step 2 SUCCESS: Final image composed.');

      return finalImagePart;
    } catch (error: any) {
      console.error("[Flow Error] An error occurred in generateCustomCandleBackgroundFlow:", error);
      throw new Error(`AI Flow Failed: ${error.message}`);
    }
  }
);