'use server';

import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GOOGLE_AI_CONFIG } from '@/lib/env-config';

export async function rewriteDescriptionFlow({
  originalDescription,
  userPrompt,
  productContext
}: {
  originalDescription: string;
  userPrompt: string;
  productContext: {
    name: string;
    imageAnalysis?: string;
    brandGuidelines?: string;
  };
}) {
    try {
      if (!GOOGLE_AI_CONFIG.API_KEY) {
        throw new Error("Gemini API key is not configured.");
      }

      const genAI = new GoogleGenerativeAI(GOOGLE_AI_CONFIG.API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Rewrite this candle description: "${userPrompt}"

${originalDescription}

Return JSON:
{"reengineeredDescription": "new text", "reasoning": "why", "changes": ["change"]}`;

      console.log('[Rewrite Flow] Starting description rewrite...');
      console.log('[Rewrite Flow] User prompt:', userPrompt);
      
      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text();

      console.log('[Rewrite Flow] Raw response text:', text);

      // Parse JSON response
      let result;
      const contentStr = text;
      
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
