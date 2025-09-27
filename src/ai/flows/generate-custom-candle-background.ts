'use server';
/**
 * @fileOverview Generates custom backgrounds for candle photos using text prompts.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

// Helper to convert a Data URL string into a Genkit Part object
function dataUrlToPart(dataUrl: string): Part {
    if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Invalid data URL: dataUrl is undefined or not a string');
    }
    
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        console.error('Invalid data URL format:', dataUrl.substring(0, 100) + '...');
        throw new Error('Invalid data URL format for generative part.');
    }
    return {
        media: {
            url: dataUrl
        }
    };
}

const CandleAndContextSchema = z.object({
  background: z.string().describe('The user-provided background description'),
  contextualDetails: z.string().optional().describe('Optional contextual details to add around the candle (e.g., "vanilla stems around", "cinnamon sticks scattered")'),
  candleImage1: z.string().describe('The primary user-uploaded candle image as a data URI'),
  candleImage2: z.string().optional().describe('The optional secondary candle image as a data URI'),
});

export const generateCustomCandleBackgroundFlow = ai.defineFlow(
  {
    name: 'generateCustomCandleBackgroundFlow',
    inputSchema: CandleAndContextSchema,
    outputSchema: z.object({
      url: z.string(),
      contentType: z.string().optional()
    }),
  },
  async ({ background, contextualDetails, candleImage1, candleImage2 }) => {
    
    const redactData = (part: Part) => {
      if (part.media?.url && part.media.url.length > 100) {
        return { ...part, media: { ...part.media, url: `[REDACTED_URL_LENGTH=${part.media.url.length}]` } };
      }
      return part;
    };

    try {
      const modelName = 'googleai/gemini-2.5-flash-image-preview';
      console.log(`[Flow] Using image model: ${modelName}`);

      console.log('[Flow] Step 1: Generating background...');
      const bgPrompt = `
        Generate a professional product photography background with these specifications:
        
        **STYLE REQUIREMENTS:** "${background}" - incorporate these specific visual elements, colors, textures, and mood
        **PURPOSE:** This background will be used for a premium candle product photo
        **COMPOSITION:** Create a clean, uncluttered surface that will complement a centered candle
        **LIGHTING:** Soft, even lighting that won't compete with the product
        **QUALITY:** High-resolution, professional e-commerce photography quality
        **ELEMENTS:** Focus on the specific details mentioned in the style requirements
        
        Do not include any candles or products in the image - this is just the background.
        Make it look like a premium, high-end product photography setup.
      `;

      const bgImageResponse = await ai.generate({
        model: modelName,
        prompt: [
          { text: bgPrompt }
        ],
        output: { format: 'media' },
      });

      // Extract media from the nested response structure
      // The media might be at content[0] or content[1], so we need to find it
      const content = bgImageResponse.message?.content || [];
      const bgImagePart = content.find((item: any) => item.media)?.media;

      if (!bgImagePart?.url) {
        throw new Error('Could not generate background image. AI response did not contain media.');
      }

      console.log('[Flow] Step 1 SUCCESS: Background generated.');

      console.log('[Flow] Step 2: Composing final image...');
      
      const candleImage1Part = dataUrlToPart(candleImage1);
      const bgImageFinalPart = dataUrlToPart(bgImagePart.url);

      const context: Part[] = [candleImage1Part, bgImageFinalPart];
      // Build contextual details section
      const contextualSection = contextualDetails ? `
        **CONTEXTUAL DETAILS:** "${contextualDetails}" - Add these specific elements around the candle to enhance the scene. These should be subtle, professional, and complement the product without overwhelming it.
      ` : '';

      let composePrompt = `
        Create a professional product photography composition with these requirements:
        
        **PRIMARY SUBJECT:** The candle must be the MAIN FOCUS and CENTER STAGE of the image
        **POSITIONING:** Place the candle prominently in the center, taking up 40-60% of the image
        **STYLE CONTEXT:** "${background}" - incorporate these specific visual elements and mood
        **LIGHTING:** Professional product lighting with soft, even illumination on the candle
        **COMPOSITION:** Rule of thirds, with the candle as the dominant element
        **QUALITY:** High-end e-commerce product photo quality
        ${contextualSection}
        
        The candle should be the clear hero of the image, not a small element.
        Make it look like a premium product that customers would want to buy.
      `;

      if (candleImage2) {
        const candleImage2Part = dataUrlToPart(candleImage2);
        context.push(candleImage2Part);
        composePrompt = `
          Create a professional product photography composition with these requirements:
          
          **PRIMARY SUBJECT:** The first candle must be the MAIN FOCUS and CENTER STAGE
          **POSITIONING:** Place the first candle prominently in the center, taking up 40-60% of the image
          **STYLE CONTEXT:** "${background}" - incorporate these specific visual elements and mood
          **REFERENCE:** Use the second candle image as a crucial reference for accurate lighting, shadows, and depth
          **LIGHTING:** Professional product lighting with soft, even illumination on the candle
          **COMPOSITION:** Rule of thirds, with the candle as the dominant element
          **QUALITY:** High-end e-commerce product photo quality
          ${contextualSection}
          
          The first candle should be the clear hero of the image, not a small element.
          Make it look like a premium product that customers would want to buy.
        `;
      }

      console.log('[Flow] Input Parts for composition:', JSON.stringify({ candleImage1: redactData(candleImage1Part), candleImage2: candleImage2 ? redactData(context[2]) : undefined, bgImagePart: redactData(bgImageFinalPart) }, null, 2));

      // Build the prompt array with the new URL-based syntax
      const prompt = [
        { text: composePrompt },
        { media: { url: bgImageFinalPart.media?.url || '' } }, // Pass the full data URL string
        { media: { url: candleImage1 } }, // Pass the full data URL string
      ];

      if (candleImage2) {
        prompt.push({ media: { url: candleImage2 } }); // Add the optional image
      }

      console.log('[Flow] About to call ai.generate with URL-based media parts.');
      console.log('[Flow] Prompt structure:', {
        textPrompt: !!prompt[0].text,
        mediaCount: prompt.filter(p => p.media).length,
        backgroundImage: bgImageFinalPart.media?.url?.substring(0, 50) + '...' || 'none',
        candleImage1: candleImage1.substring(0, 50) + '...',
        candleImage2: candleImage2 ? candleImage2.substring(0, 50) + '...' : 'none'
      });
      
      const finalImageResponse = await ai.generate({
        model: modelName,
        prompt: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // Extract media from the nested response structure
      // The media might be at content[0] or content[1], so we need to find it
      const finalContent = finalImageResponse.message?.content || [];
      const finalImagePart = finalContent.find((item: any) => item.media)?.media;

      if (!finalImagePart?.url) {
        throw new Error('Could not compose final image. AI response did not contain media.');
      }

      console.log('[Flow] Step 2 SUCCESS: Final image composed.');

      return finalImagePart;
    } catch (error: any) {
      console.error("[Flow Error] An error occurred in generateCustomCandleBackgroundFlow:", error);
      throw new Error(`AI Flow Failed: ${error.message}`);
    }
  }
);