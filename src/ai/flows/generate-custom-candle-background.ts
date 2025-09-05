
'use server';
/**
 * @fileOverview Generates custom backgrounds for candle photos using text prompts.
 *
 * - generateCustomCandleBackground - A function that handles the background generation process.
 * - GenerateCustomCandleBackgroundInput - The input type for the generateCustomCandleBackground function.
 * - GenerateCustomCandleBackgroundOutput - The return type for the generateCustomCandleBackground function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import type { Part } from 'genkit';

const GenerateCustomCandleBackgroundInputSchema = z.object({
  primaryProductPhotoDataUri: z
    .string()
    .describe(
      "A photo of the candle product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  secondaryProductPhotoDataUri: z
    .string()
    .optional()
    .describe(
        "An optional second photo of the candle from a different angle for reference, as a data URI."
    ),
  backgroundPrompt: z.string().describe('The text prompt for generating the background image.'),
  contextualDetails: z
    .string()
    .optional()
    .describe('Optional contextual details to subtly incorporate into the background.'),
});
export type GenerateCustomCandleBackgroundInput = z.infer<typeof GenerateCustomCandleBackgroundInputSchema>;

const GenerateCustomCandleBackgroundOutputSchema = z.object({
  compositeImageDataUri: z
    .string()
    .describe(
      'The composite image data URI, combining the product photo and generated background image.'
    ),
});
export type GenerateCustomCandleBackgroundOutput = z.infer<typeof GenerateCustomCandleBackgroundOutputSchema>;

export async function generateCustomCandleBackground(
  input: GenerateCustomCandleBackgroundInput
): Promise<GenerateCustomCandleBackgroundOutput> {
  return generateCustomCandleBackgroundFlow(input);
}

const generateCustomCandleBackgroundFlow = ai.defineFlow(
  {
    name: 'generateCustomCandleBackgroundFlow',
    inputSchema: GenerateCustomCandleBackgroundInputSchema,
    outputSchema: GenerateCustomCandleBackgroundOutputSchema,
  },
  async input => {
    // Step 1: Generate the background image from the text prompt.
    const { media: backgroundMedia } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Create a photorealistic, high-end, professional e-commerce product background. It should be beautifully lit, slightly out of focus, and suitable for a luxury brand. The background should contain a surface for a product to sit on. The user's request is: ${input.backgroundPrompt}`
    });

    if (!backgroundMedia?.url) {
      throw new Error('Background generation failed to return an image.');
    }
    const backgroundImageDataUri = backgroundMedia.url;
    
    // Step 2: Compose the product(s) onto the generated background.
    let promptText: string;
    const promptParts: Part[] = [];

    if (input.secondaryProductPhotoDataUri) {
        promptText = `Use the second image as the primary subject (a candle). Use the third image as a reference for the candle's shape, texture, and lighting. Isolate the candle from its original background. Now, realistically place that isolated candle onto a surface within the first image (the new background), as if it were a professional product photograph. Do not make the candle float; it must be sitting on something.`;
        promptParts.push({media: {url: backgroundImageDataUri}}); // Background
        promptParts.push({media: {url: input.primaryProductPhotoDataUri}}); // Primary Candle
        promptParts.push({media: {url: input.secondaryProductPhotoDataUri}}); // Secondary Candle
    } else {
        promptText = `Analyze the second image to identify the primary product, which is a candle. Isolate this candle, including its container and wick, from its original background. Discard any other items or clutter. Now, realistically place that isolated candle onto a surface within the first image (the new background), as if it were a professional product photograph. Do not make the candle float; it must be sitting on something.`;
        promptParts.push({media: {url: backgroundImageDataUri}}); // Background
        promptParts.push({media: {url: input.primaryProductPhotoDataUri}}); // Primary Candle
    }
    
    if (input.contextualDetails) {
        promptText += ` Additionally, modify the new background to subtly incorporate the following detail: '${input.contextualDetails}'.`;
    }
    promptText += ` Ensure the final composite image is photorealistic, with seamless lighting and shadows that match the new background's environment. The final output image must be in image/webp format.`;

    promptParts.unshift({ text: promptText });


    const { media: compositionMedia } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: promptParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!compositionMedia?.url) {
        throw new Error('Image composition failed to return an image.');
    }

    return {
      compositeImageDataUri: compositionMedia.url,
    };
  }
);

    