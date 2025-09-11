
'use server';
/**
 * @fileOverview Composites a candle image with a generated background.
 *
 * - composeCandleWithGeneratedBackground - A function that handles the image composition process.
 * - ComposeCandleWithGeneratedBackgroundInput - The input type for the composeCandleWithGeneratedBackground function.
 * - ComposeCandleWithGeneratedBackgroundOutput - The return type for the composeCandleWithGeneratedBackground function.
 */

import {ai} from '@/ai/genkit';
import { buildImageStudioSystemMessage, buildImageStudioUserMessage } from '@/ai/prompts';
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

const composeCandleWithGeneratedBackgroundFlow = (await ai).defineFlow(
  {
    name: 'composeCandleWithGeneratedBackgroundFlow',
    inputSchema: ComposeCandleWithGeneratedBackgroundInputSchema,
    outputSchema: ComposeCandleWithGeneratedBackgroundOutputSchema,
  },
  async input => {
    console.log("[Compose Flow] start", {
      bgLength: input.generatedBackground?.length ?? 0,
      angle1Length: input.primaryCandleImage?.length ?? 0,
      angle2Length: input.secondaryCandleImage?.length ?? 0,
      hasContext: Boolean(input.contextualDetails),
    });

    const system = buildImageStudioSystemMessage();
    const user = buildImageStudioUserMessage({
        selectedBackgroundUrl: input.generatedBackground,
        candleAngle1Url: input.primaryCandleImage,
        candleAngle2Url: input.secondaryCandleImage,
        contextualDetails: input.contextualDetails,
    });

    const promptParts: Part[] = [
        { text: system },
        { text: user },
        { media: { url: input.generatedBackground } },
        { media: { url: input.primaryCandleImage } },
        ...(input.secondaryCandleImage ? [{ media: { url: input.secondaryCandleImage } }] as Part[] : []),
    ];

    console.log("[Compose Flow] prompt parts", {
      textChars: system.length + user.length,
      mediaCount: promptParts.filter(p => 'media' in p).length,
      totalParts: promptParts.length,
    });

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      prompt: promptParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
      generationConfig: {
        temperature: 0.6,
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

    