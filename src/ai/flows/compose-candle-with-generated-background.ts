
'use server';
/**
 * @fileOverview Composites a candle image with a generated background.
 *
 * - composeCandleWithGeneratedBackground - A function that handles the image composition process.
 * - ComposeCandleWithGeneratedBackgroundInput - The input type for the composeCandleWithGeneratedBackground function.
 * - ComposeCandleWithGeneratedBackgroundOutput - The return type for the composeCandleWithGeneratedBackground function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Part } from 'genkit';

const ComposeCandleWithGeneratedBackgroundInputSchema = z.object({
  primaryCandleImage: z
    .string()
    .describe(
      "The primary photo of a candle, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  secondaryCandleImage: z
    .string()
    .optional()
    .describe(
      "An optional second photo of the candle from a different angle for reference, as a data URI."
    ),
  generatedBackground: z
    .string()
    .describe(
      "A generated background image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  contextualDetails: z.string().optional().describe('Optional contextual details to incorporate into the background.'),
});
export type ComposeCandleWithGeneratedBackgroundInput = z.infer<typeof ComposeCandleWithGeneratedBackgroundInputSchema>;

const ComposeCandleWithGeneratedBackgroundOutputSchema = z.object({
  compositeImage: z
    .string()
    .describe('The composite image of the candle and the generated background as a data URI.'),
});
export type ComposeCandleWithGeneratedBackgroundOutput = z.infer<typeof ComposeCandleWithGeneratedBackgroundOutputSchema>;

export async function composeCandleWithGeneratedBackground(input: ComposeCandleWithGeneratedBackgroundInput): Promise<ComposeCandleWithGeneratedBackgroundOutput> {
  return composeCandleWithGeneratedBackgroundFlow(input);
}

const composeCandleWithGeneratedBackgroundFlow = ai.defineFlow(
  {
    name: 'composeCandleWithGeneratedBackgroundFlow',
    inputSchema: ComposeCandleWithGeneratedBackgroundInputSchema,
    outputSchema: ComposeCandleWithGeneratedBackgroundOutputSchema,
  },
  async input => {

    let promptText: string;
    const promptParts: Part[] = [];

    if (input.secondaryCandleImage) {
        promptText = `Use the second image as the primary subject (a candle). Use the third image as a reference for the candle's shape, texture, and lighting. Isolate the candle from its original background. Now, realistically place that isolated candle onto a surface within the first image (the new background), as if it were a professional product photograph. Do not make the candle float; it must be sitting on something.`;
        promptParts.push({media: {url: input.generatedBackground}}); // Background
        promptParts.push({media: {url: input.primaryCandleImage}}); // Primary Candle
        promptParts.push({media: {url: input.secondaryCandleImage}}); // Secondary Candle
    } else {
        promptText = `Analyze the second image to identify the primary product, which is a candle. Isolate this candle, including its container and wick, from its original background. Discard any other items or clutter. Now, realistically place that isolated candle onto a surface within the first image (the new background), as if it were a professional product photograph. Do not make the candle float; it must be sitting on something.`;
        promptParts.push({media: {url: input.generatedBackground}}); // Background
        promptParts.push({media: {url: input.primaryCandleImage}}); // Primary Candle
    }
    
    if (input.contextualDetails) {
        promptText += ` Additionally, modify the new background to subtly incorporate the following detail: '${input.contextualDetails}'.`;
    }
    promptText += ` Ensure the final composite image is photorealistic, with seamless lighting and shadows that match the new background's environment. The final output image must be in image/webp format.`;
    
    promptParts.unshift({ text: promptText });


    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: promptParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image composition failed to return an image.');
    }

    return {
      compositeImage: media.url,
    };
  }
);

    