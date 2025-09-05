
'use server';

/**
 * @fileOverview A flow to refine a generated background image with contextual details.
 *
 * - refineGeneratedBackgroundWithContext - A function that refines a background image using contextual details.
 * - RefineGeneratedBackgroundWithContextInput - The input type for the refineGeneratedBackgroundWithContext function.
 * - RefineGeneratedBackgroundWithContextOutput - The return type for the refineGeneratedBackgroundWithContext function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Part } from 'genkit';

const RefineGeneratedBackgroundWithContextInputSchema = z.object({
  primaryProductImageDataUri: z
    .string()
    .describe(
      "The primary photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  secondaryProductImageDataUri: z
    .string()
    .optional()
    .describe(
        "An optional second photo of the product from a different angle for reference, as a data URI."
    ),
  backgroundImageDataUri: z
    .string()
    .describe(
      "A photo of the background, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  contextualDetails: z.string().describe('Optional contextual details to incorporate into the background.'),
});
export type RefineGeneratedBackgroundWithContextInput = z.infer<
  typeof RefineGeneratedBackgroundWithContextInputSchema
>;

const RefineGeneratedBackgroundWithContextOutputSchema = z.object({
  refinedImageDataUri: z
    .string()
    .describe(
      'The refined image, with the product placed on the modified background, as a data URI.'
    ),
});
export type RefineGeneratedBackgroundWithContextOutput = z.infer<
  typeof RefineGeneratedBackgroundWithContextOutputSchema
>;

export async function refineGeneratedBackgroundWithContext(
  input: RefineGeneratedBackgroundWithContextInput
): Promise<RefineGeneratedBackgroundWithContextOutput> {
  return refineGeneratedBackgroundWithContextFlow(input);
}

const refineGeneratedBackgroundWithContextFlow = ai.defineFlow(
  {
    name: 'refineGeneratedBackgroundWithContextFlow',
    inputSchema: RefineGeneratedBackgroundWithContextInputSchema,
    outputSchema: RefineGeneratedBackgroundWithContextOutputSchema,
  },
  async input => {
    let promptText: string;
    const promptParts: Part[] = [];

    if (input.secondaryProductImageDataUri) {
        promptText = `Use the second image as the primary subject. Use the third image as a reference for the subject's shape, texture, and lighting. Isolate this subject from its original background. Now, realistically place that isolated subject onto a surface within the first image (the new background), as if it were a professional product photograph. Do not make the subject float; it must be sitting on something.`;
        promptParts.push({media: {url: input.backgroundImageDataUri}});
        promptParts.push({media: {url: input.primaryProductImageDataUri}});
        promptParts.push({media: {url: input.secondaryProductImageDataUri}});
    } else {
        promptText = `Analyze the second image to identify the primary product. Isolate this product from its original background. Now, realistically place that isolated product onto a surface within the first image (the new background), as if it were a professional product photograph. Do not make the product float; it must be sitting on something.`;
        promptParts.push({media: {url: input.backgroundImageDataUri}});
        promptParts.push({media: {url: input.primaryProductImageDataUri}});
    }

    if (input.contextualDetails) {
      promptText += `\nAdditionally, modify the new background to subtly incorporate the following detail: '${input.contextualDetails}'.`;
    }
    
    promptText += `\nEnsure the final composite image is photorealistic, with seamless lighting and shadows. The final output image must be in image/webp format.`;

    promptParts.unshift({ text: promptText });


    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: promptParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image refinement failed to return an image.');
    }

    return {refinedImageDataUri: media.url};
  }
);

    