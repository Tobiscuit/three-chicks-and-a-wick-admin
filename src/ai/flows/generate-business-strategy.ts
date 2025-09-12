
'use server';
/**
 * @fileOverview Analyzes business data to generate strategic recommendations.
 *
 * - generateBusinessStrategy - A function that handles the strategy generation process.
 * - BusinessSnapshot - The input type for the generateBusinessStrategy function.
 * - StrategyOutput - The return type for the generateBusinessStrategy function.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';

export const generateBusinessStrategyFlow = ai.defineFlow(
  {
    name: 'generateBusinessStrategyFlow',
    inputSchema: z.any(),
    outputSchema: z.string(),
  },
  async (productInfo) => {
    const prompt = `You are a branding and marketing expert for e-commerce.
    When writing the description, use the "body_html" field.`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-pro',
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    return llmResponse.text();
  }
);
