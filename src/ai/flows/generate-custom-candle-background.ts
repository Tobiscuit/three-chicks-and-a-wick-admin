
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
import { Part } from 'genkit/ai';

const CandleAndContextSchema = z.object({
  background: z.string().describe('The user-provided background description'),
  candleImage: z.custom<Part>().describe('The user-uploaded candle image'),
});

export const generateCustomCandleBackgroundFlow = ai.defineFlow(
  {
    name: 'generateCustomCandleBackgroundFlow',
    inputSchema: CandleAndContextSchema,
    outputSchema: z.custom<Part>(),
  },
  async ({ background, candleImage }) => {
    try {
      console.log('[Flow] Step 1: Generating background...');
      const bgPrompt = `Generate a background image for a product photo of a candle. The background should be clean, professional, and visually appealing. The user wants the following style: "${background}". Do not include the candle in the image.`;

      const bgImageResponse = await ai.generate({
        prompt: bgPrompt,
        model: 'googleai/gemini-2.5-pro',
        config: {
          temperature: 0.9,
          maxOutputTokens: 1024,
        },
      });

      console.log('[Flow] Raw background response:', JSON.stringify(bgImageResponse, null, 2));

      const bgImagePart = bgImageResponse.media();
      if (!bgImagePart) {
        console.error('[Flow] Failed to extract media from background response.');
        throw new Error('Could not generate background image. AI response did not contain media.');
      }
      console.log('[Flow] Step 1 SUCCESS: Background generated.');

      console.log('[Flow] Step 2: Composing final image...');
      const composePrompt = `Compose the candle image onto the background image. The candle should be centered and well-lit. The final image should look like a professional product photo.`;

      const finalImageResponse = await ai.generate({
        prompt: composePrompt,
        model: 'googleai/gemini-2.5-pro',
        context: [candleImage, bgImagePart],
      });

      console.log('[Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));

      const finalImagePart = finalImageResponse.media();
      if (!finalImagePart) {
        console.error('[Flow] Failed to extract media from final image response.');
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

    