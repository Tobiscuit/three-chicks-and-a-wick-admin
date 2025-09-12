
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
import { Part } from '@google/generative-ai';

const CandleAndContextSchema = z.object({
  background: z.string().describe('The user-provided background description'),
  candleImage1: z.custom<Part>().describe('The primary user-uploaded candle image'),
  candleImage2: z.custom<Part>().optional().describe('The optional secondary candle image'),
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
        config: {
          temperature: 0.9,
          maxOutputTokens: 1024,
        },
      });

      console.log('[Flow] Raw background response:', JSON.stringify(bgImageResponse, null, 2));

      let bgImagePart = bgImageResponse.message.content.find(p => p.media)?.media;

      if (!bgImagePart) {
        console.error('[Flow] Failed to extract media from background response.');
        const textResponse = bgImageResponse.message?.content?.[0]?.text || '[No text content found in response]';
        console.error(`[Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not generate background image. AI response did not contain media.');
      }

      if (bgImagePart.url?.startsWith('data:')) {
        const [meta, base64] = bgImagePart.url.split(',');
        const mimeType = /data:(.*?);base64/.exec(meta || '')?.[1] || 'image/png';
        bgImagePart = {
          inlineData: {
            data: base64,
            mimeType,
          }
        };
      }

      console.log('[Flow] Step 1 SUCCESS: Background generated.');

      console.log('[Flow] Step 2: Composing final image...');
      
      let composePrompt = `Compose the candle image onto the background image, considering the user's desired style: "${background}". The candle should be centered and well-lit. The final image should look like a professional product photo.`;

      const promptParts: Part[] = [];
      promptParts.push({ text: composePrompt });
      promptParts.push(candleImage1);
      promptParts.push(bgImagePart as Part);

      if (candleImage2) {
        composePrompt = `Compose the first candle image onto the background image, considering the user's desired style: "${background}". Use the second candle image as a crucial reference for lighting, shadows, and depth. The final composed image should only contain the first candle. The final image should look like a professional product photo.`
        promptParts[0] = { text: composePrompt };
        promptParts.push(candleImage2);
      }

      console.log('[Flow] Input Parts for composition:', JSON.stringify(promptParts.map(redactData), null, 2));

      const finalImageResponse = await ai.generate({
        prompt: promptParts,
        model: modelName,
      });

      console.log('[Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));

      let finalImagePart = finalImageResponse.message.content.find(p => p.media)?.media;

      if (!finalImagePart) {
        console.error('[Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.message?.content?.[0]?.text || '[No text content found in response]';
        console.error(`[Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not compose final image. AI response did not contain media.');
      }
      
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

      console.log('[Flow] Step 2 SUCCESS: Final image composed.');

      return finalImagePart;
    } catch (error: any) {
      console.error("[Flow Error] An error occurred in generateCustomCandleBackgroundFlow:", error);
      throw new Error(`AI Flow Failed: ${error.message}`);
    }
  }
);

    