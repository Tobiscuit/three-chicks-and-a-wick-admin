
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
    const bgPrompt = `Generate a background image for a product photo of a candle. The background should be clean, professional, and visually appealing. The user wants the following style: "${background}". Do not include the candle in the image.`;

    const bgImage = await ai.generate({
      prompt: bgPrompt,
      model: 'googleai/gemini-2.5-pro',
      config: {
        temperature: 0.9,
        maxOutputTokens: 1024,
      },
    });

    const bgImagePart = bgImage.media();
    if (!bgImagePart) {
      throw new Error('Could not generate background image');
    }

    const composePrompt = `Compose the candle image onto the background image. The candle should be centered and well-lit. The final image should look like a professional product photo.`;

    const finalImage = await ai.generate({
      prompt: composePrompt,
      model: 'googleai/gemini-2.5-pro',
      context: [candleImage, bgImagePart],
    });

    const finalImagePart = finalImage.media();
    if (!finalImagePart) {
      throw new Error('Could not compose final image');
    }

    return finalImagePart;
  }
);

    