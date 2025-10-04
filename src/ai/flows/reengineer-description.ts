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

export const rewriteDescriptionFlow = ai.defineFlow(
  {
    name: 'rewriteDescriptionFlow',
    inputSchema: ReengineerDescriptionSchema,
    outputSchema: z.object({
      reengineeredDescription: z.string().describe('The new rewritten description'),
      reasoning: z.string().describe('Why these changes were made'),
      changes: z.array(z.string()).describe('List of key changes made')
    }),
  },
  async ({ originalDescription, userPrompt, productContext }) => {
    try {
      const prompt = `Rewrite this candle description: "${userPrompt}"

${originalDescription}

Return JSON:
{"reengineeredDescription": "new text", "reasoning": "why", "changes": ["change"]}`;

      console.log('[Rewrite Flow] Starting description rewrite...');
      console.log('[Rewrite Flow] User prompt:', userPrompt);
      
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-pro',
        prompt: prompt,
        config: {
          temperature: 0.8, // More creative
          maxOutputTokens: 500, // Further reduced for very long inputs
          responseMimeType: "application/json"
        }
      });

      console.log('[Rewrite Flow] Response object:', response);
      console.log('[Rewrite Flow] Response type:', typeof response);
      console.log('[Rewrite Flow] Response methods:', Object.getOwnPropertyNames(response));
      
      let content;
      if (response.text) {
        content = response.text;
      } else if (response.message?.content) {
        content = response.message.content;
      } else {
        console.error('[Rewrite Flow] Unknown response format:', response);
        throw new Error('Unknown response format from AI model');
      }
      
      console.log('[Rewrite Flow] Raw response content:', content);

      // Parse JSON response
      let result;
      // Ensure content is a string
      const contentStr = typeof content === 'string' ? content : String(content);
      
      try {
        console.log('[Rewrite Flow] Content string length:', contentStr.length);
        console.log('[Rewrite Flow] Content string preview:', contentStr.substring(0, 500));
        
        // Handle truncated JSON responses (when finishReason is 'length')
        let jsonContent = contentStr;
        
        // Remove markdown code blocks if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '');
        }
        if (jsonContent.endsWith('```')) {
          jsonContent = jsonContent.replace(/\s*```$/, '');
        }
        
        // Find the opening brace
        const openBraceIndex = jsonContent.indexOf('{');
        if (openBraceIndex === -1) {
          console.error('[Rewrite Flow] No opening brace found in response. Full content:', jsonContent);
          throw new Error('No opening brace found in response');
        }
        
        // Extract everything after the opening brace
        let jsonStr = jsonContent.substring(openBraceIndex);
        
        // If the JSON is truncated (no closing brace), try to complete it
        if (!jsonStr.includes('}')) {
          console.log('[Rewrite Flow] JSON appears to be truncated, attempting to complete it');
          
          // Try to fix common truncation issues
          let fixedJson = jsonStr;
          
          // Fix truncated arrays in changes field
          if (fixedJson.includes('"changes": [')) {
            const changesStart = fixedJson.indexOf('"changes": [');
            const changesEnd = fixedJson.indexOf(']', changesStart);
            
            if (changesEnd === -1) {
              // Array was truncated, try to close it properly
              const lastCompleteItem = fixedJson.lastIndexOf('"');
              if (lastCompleteItem > changesStart) {
                // Find the last complete array item
                const lastComma = fixedJson.lastIndexOf(',', lastCompleteItem);
                if (lastComma > -1) {
                  // Remove the incomplete item and close the array
                  fixedJson = fixedJson.substring(0, lastComma) + ']';
                } else {
                  // No comma found, close the array
                  fixedJson = fixedJson.substring(0, lastCompleteItem + 1) + ']';
                }
              } else {
                // No complete items, close empty array
                fixedJson = fixedJson.substring(0, changesStart + 12) + ']';
              }
            }
          }
          
          // Add closing brace if missing
          if (!fixedJson.includes('}')) {
            fixedJson += '}';
          }
          
          jsonStr = fixedJson;
        }
        
        console.log('[Rewrite Flow] Attempting to parse JSON:', jsonStr);
        result = JSON.parse(jsonStr);
        console.log('[Rewrite Flow] JSON parsed successfully:', result);
      } catch (parseError) {
        console.error('[Rewrite Flow] JSON parse error:', parseError);
        console.error('[Rewrite Flow] Content that failed to parse:', contentStr);
        
        // Fallback: return original with minimal changes
        result = {
          reengineeredDescription: originalDescription,
          reasoning: 'Unable to parse AI response, returning original description',
          changes: ['No changes made due to parsing error']
        };
      }

      console.log('[Rewrite Flow] Final result:', result);
      return result;

    } catch (error) {
      console.error('[Rewrite Flow] Error:', error);
      
      // Fallback result
      return {
        rewrittenDescription: originalDescription,
        reasoning: 'Error occurred during rewrite, returning original description',
        changes: ['No changes made due to error']
      };
    }
  }
);
