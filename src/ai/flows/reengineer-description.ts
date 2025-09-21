'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

const ReengineerDescriptionSchema = z.object({
  originalDescription: z.string().describe('The current product description'),
  userPrompt: z.string().describe('User\'s creative direction for re-engineering'),
  productContext: z.object({
    name: z.string().describe('Product name'),
    imageAnalysis: z.string().optional().describe('Original image analysis from product creation'),
    brandGuidelines: z.string().optional().describe('Brand voice and tone guidelines')
  })
});

export const reengineerDescriptionFlow = ai.defineFlow(
  {
    name: 'reengineerDescriptionFlow',
    inputSchema: ReengineerDescriptionSchema,
    outputSchema: z.object({
      reengineeredDescription: z.string().describe('The new re-engineered description'),
      reasoning: z.string().describe('Why these changes were made'),
      changes: z.array(z.string()).describe('List of key changes made')
    }),
  },
  async ({ originalDescription, userPrompt, productContext }) => {
    try {
      const prompt = `
You are a creative copywriter for "Three Chicks and a Wick" candle brand. Your job is to re-engineer product descriptions based on user feedback while maintaining brand consistency.

ORIGINAL DESCRIPTION:
${originalDescription}

PRODUCT CONTEXT:
- Name: ${productContext.name}
- Image Analysis: ${productContext.imageAnalysis || 'Not available'}
- Brand Guidelines: ${productContext.brandGuidelines || 'Premium, artisanal, luxurious candles with personality and charm'}

USER'S CREATIVE DIRECTION:
"${userPrompt}"

BRAND VOICE GUIDELINES:
- Playful yet sophisticated
- Conversational and engaging
- Emphasize unique materials and craftsmanship
- Include sensory details (scent, texture, visual)
- Use storytelling elements
- Maintain premium positioning
- Be authentic and genuine

TASK:
Re-engineer the original description based on the user's creative direction while maintaining:
- Brand voice and tone consistency
- Product accuracy and details
- SEO-friendly structure with proper HTML
- Professional quality and readability
- Engaging storytelling elements

RESPONSE FORMAT (JSON only):
{
  "reengineeredDescription": "The new description with proper HTML formatting",
  "reasoning": "Brief explanation of why these changes were made",
  "changes": ["Key change 1", "Key change 2", "Key change 3"]
}
`;

      console.log('[Reengineer Flow] Starting description re-engineering...');
      console.log('[Reengineer Flow] User prompt:', userPrompt);
      
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: prompt,
        config: {
          temperature: 0.8, // More creative
          maxOutputTokens: 2000
        }
      });

      console.log('[Reengineer Flow] Response object:', response);
      console.log('[Reengineer Flow] Response type:', typeof response);
      console.log('[Reengineer Flow] Response methods:', Object.getOwnPropertyNames(response));
      
      let content;
      if (typeof response.text === 'function') {
        content = response.text();
      } else if (response.text) {
        content = response.text;
      } else if (response.message?.content) {
        content = response.message.content;
      } else {
        console.error('[Reengineer Flow] Unknown response format:', response);
        throw new Error('Unknown response format from AI model');
      }
      
      console.log('[Reengineer Flow] Raw response content:', content);

      // Parse JSON response
      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        result = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[Reengineer Flow] JSON parse error:', parseError);
        
        // Fallback: return original with minimal changes
        result = {
          reengineeredDescription: originalDescription,
          reasoning: 'Unable to parse AI response, returning original description',
          changes: ['No changes made due to parsing error']
        };
      }

      console.log('[Reengineer Flow] Final result:', result);
      return result;

    } catch (error) {
      console.error('[Reengineer Flow] Error:', error);
      
      // Fallback result
      return {
        reengineeredDescription: originalDescription,
        reasoning: 'Error occurred during re-engineering, returning original description',
        changes: ['No changes made due to error']
      };
    }
  }
);
