
'use server';
/**
 * @fileOverview Generates custom backgrounds for candle photos using text prompts.
 *
 * - generateCustomCandleBackground - A function that handles the background generation process.
 * - GenerateCustomCandleBackgroundInput - The input type for the generateCustomCandleBackground function.
 * - GenerateCustomCandleBackgroundOutput - The return type for the generateCustomCandleBackground function.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const CandleAndContextSchema = z.object({
  background: z.string().describe('The user-provided background description'),
  candleImage1: z.string().describe('The primary user-uploaded candle image as a data URI'),
  candleImage2: z.string().optional().describe('The optional secondary candle image as a data URI'),
});

export const generateCustomCandleBackgroundFlow = ai.defineFlow(
  {
    name: 'generateCustomCandleBackgroundFlow',
    inputSchema: CandleAndContextSchema,
    outputSchema: z.string(),
  },
  async ({ background, candleImage1, candleImage2 }) => {
    
    const redactData = (uri: string) => {
      if (uri.length > 100) {
        return `${uri.substring(0, 50)}...[REDACTED_LENGTH=${uri.length}]`;
      }
      return uri;
    };

    try {
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === 'true';
      const modelName = useGemini ? 'gemini-2.5-flash-image-preview' : 'imagen-3';
      console.log(`[Flow] Using image model: ${modelName}`);

      console.log('[Flow] Step 1: Generating background...');
      const bgPrompt = `Generate a background image for a product photo of a candle. The background should be clean, professional, and visually appealing. The user wants the following style: "${background}". Do not include the candle in the image.`;

      const bgImageResponse = await ai.generate({
        prompt: bgPrompt,
        model: googleAI.model(modelName),
        output: { format: 'media' },
      });

      const bgImagePart = bgImageResponse.media;

      if (!bgImagePart?.url) {
        console.error('[Flow] Failed to extract media from background response.');
        const textResponse = bgImageResponse.text || '[No text content found in response]';
        console.error(`[Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not generate background image. AI response did not contain media.');
      }

      console.log('[Flow] Step 1 SUCCESS: Background generated.');

      console.log('[Flow] Step 2: Composing final image...');
      
      let composePrompt = `Compose the candle image onto the background image, considering the user's desired style: "${background}". The candle should be centered and well-lit. The final image should look like a professional product photo.`;

      const promptParts = [];
      promptParts.push({ text: composePrompt });
      promptParts.push({ media: { url: candleImage1 } });
      promptParts.push({ media: { url: bgImagePart.url } });

      if (candleImage2) {
        composePrompt = `Compose the first candle image onto the background image, considering the user's desired style: "${background}". Use the second candle image as a crucial reference for lighting, shadows, and depth. The final composed image should only contain the first candle. The final image should look like a professional product photo.`
        promptParts[0] = { text: composePrompt };
        promptParts.push({ media: { url: candleImage2 } });
      }

      console.log('[Flow] Input Parts for composition:', JSON.stringify(promptParts.map(p => p.text ? p : { media: { url: redactData(p.media.url) } }), null, 2));

      const finalImageResponse = await ai.generate({
        prompt: promptParts,
        model: googleAI.model(modelName),
        output: { format: 'media' },
      });

      const finalImagePart = finalImageResponse.media;

      if (!finalImagePart?.url) {
        console.error('[Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.text || '[No text content found in response]';
        console.error(`[Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not compose final image. AI response did not contain media.');
      }

      console.log('[Flow] Step 2 SUCCESS: Final image composed.');

      return finalImagePart.url;
    } catch (error: any) {
      console.error("[Flow Error] An error occurred in generateCustomCandleBackgroundFlow:", error);
      throw new Error(`AI Flow Failed: ${error.message}`);
    }
  }
);

    