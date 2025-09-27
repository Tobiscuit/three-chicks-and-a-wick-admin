
'use server';

/**
 * @fileOverview A flow to refine a generated background image with contextual details.
 *
 * - refineGeneratedBackgroundWithContext - A function that refines a background image using contextual details.
 * - RefineGeneratedBackgroundWithContextInput - The input type for the refineGeneratedBackgroundWithContext function.
 * - RefineGeneratedBackgroundWithContextOutput - The return type for the refineGeneratedBackgroundWithContext function.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

const BackgroundAndContextSchema = z.object({
  background: z.custom<Part>().describe('The generated background image'),
  context: z.string().describe('The user-provided context'),
});

export const refineGeneratedBackgroundWithContextFlow = ai.defineFlow(
  {
    name: 'refineGeneratedBackgroundWithContextFlow',
    inputSchema: BackgroundAndContextSchema,
    outputSchema: z.object({
      url: z.string(),
      contentType: z.string().optional()
    }),
  },
  async ({ background, context }) => {
    const prompt = `Refine the provided background image with the following context: "${context}". The changes should be subtle and enhance the overall image.`;

    const refinedImage = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-pro',
      context: [background],
    });

    if (!refinedImage) {
      throw new Error('Could not refine background image');
    }
    
    const refinedImagePart = refinedImage.media();
    if (!refinedImagePart) {
      throw new Error('Could not refine background image');
    }
    return refinedImagePart;
  }
);

    