
'use server';
/**
 * @fileOverview Composes a product image with a pre-existing gallery background.
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
        inlineData: {
            mimeType: match[1],
            data: match[2]
        }
    };
}

const ComposeWithGallerySchema = z.object({
  candleImage1: z.string().describe('The primary user-uploaded candle image as a data URI'),
  candleImage2: z.string().optional().describe('The optional secondary candle image as a data URI'),
  galleryImage: z.string().describe('The pre-existing gallery background image as a data URI'),
  contextualDetails: z.string().optional().describe('Optional contextual details to add around the candle (e.g., "vanilla stems around", "cinnamon sticks scattered")'),
});

export const composeWithGalleryBackgroundFlow = ai.defineFlow(
  {
    name: 'composeWithGalleryBackgroundFlow',
    inputSchema: ComposeWithGallerySchema,
    outputSchema: z.object({
      url: z.string(),
      contentType: z.string().optional()
    }),
  },
  async ({ candleImage1, candleImage2, galleryImage, contextualDetails }) => {
    
    const redactData = (part: Part) => {
      if (part.inlineData?.data?.length > 100) {
        return `${part.inlineData.data.substring(0, 50)}...[REDACTED_LENGTH=${part.inlineData.data.length}]`;
      }
      return part;
    };

    try {
      const modelName = 'googleai/gemini-2.5-flash-image-preview';
      console.log(`[Compose Flow] Using image model: ${modelName}`);

      console.log('[Compose Flow] Starting composition with gallery background...');
      
      // Build contextual details section
      const contextualSection = contextualDetails ? `
        **CONTEXTUAL DETAILS:** "${contextualDetails}" - Add these specific elements around the candle to enhance the scene. These should be subtle, professional, and complement the product without overwhelming it.
      ` : '';

      let composePrompt = `
        Create a professional product photography composition with these requirements:
        
        **PRIMARY SUBJECT:** The candle must be the MAIN FOCUS and CENTER STAGE of the image
        **POSITIONING:** Place the candle prominently in the center, taking up 40-60% of the image
        **COMPOSITION:** Rule of thirds, with the candle as the dominant element
        **LIGHTING:** Professional product lighting with soft, even illumination on the candle
        **QUALITY:** High-end e-commerce product photo quality
        ${contextualSection}
        
        Isolate the candle from its original background and place it onto the new background.
        Ensure the lighting, shadows, and perspective are seamless and consistent.
        The candle should be the clear hero of the image, not a small element.
        Make it look like a premium product that customers would want to buy.
        
        **Output only the final, composed image.**
        **Do not include any text, commentary, markdown, or any other content besides the image itself.**
      `;

      if (candleImage2) {
        composePrompt = `
          Create a professional product photography composition with these requirements:
          
          **PRIMARY SUBJECT:** The first candle must be the MAIN FOCUS and CENTER STAGE
          **POSITIONING:** Place the first candle prominently in the center, taking up 40-60% of the image
          **REFERENCE:** Use the second candle image as a crucial reference for accurate lighting, shadows, and depth
          **COMPOSITION:** Rule of thirds, with the candle as the dominant element
          **LIGHTING:** Professional product lighting with soft, even illumination on the candle
          **QUALITY:** High-end e-commerce product photo quality
          ${contextualSection}
          
          Isolate the first candle from its original background and place it onto the new background.
          Use the second candle image as a reference for the product's true appearance.
          The first candle should be the clear hero of the image, not a small element.
          Make it look like a premium product that customers would want to buy.
          
          **Output only the final, composed image containing the first candle.**
          **Do not include any text, commentary, markdown, or any other content besides the image itself.**
        `;
      }

      // Build the prompt array with the new URL-based syntax
      const prompt = [
        { text: composePrompt },
        { media: { url: galleryImage } }, // Pass the full data URL string
        { media: { url: candleImage1 } }, // Pass the full data URL string
      ];

      if (candleImage2) {
        prompt.push({ media: { url: candleImage2 } }); // Add the optional image
      }

      console.log('[Compose Flow] Calling ai.generate with URL-based media parts.');
      console.log('[Compose Flow] Prompt structure:', {
        textPrompt: !!prompt[0].text,
        mediaCount: prompt.filter(p => p.media).length,
        galleryImage: galleryImage.substring(0, 50) + '...',
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

      console.log('[Compose Flow] Raw final image response:', JSON.stringify(finalImageResponse, null, 2));
      
      // Extract media from the nested response structure
      // The media might be at content[0] or content[1], so we need to find it
      const content = finalImageResponse.message?.content || [];
      const finalImagePart = content.find((item: any) => item.media)?.media;
      
      if (!finalImagePart?.url) {
        console.error('[Compose Flow] Failed to extract media from final image response.');
        const textResponse = finalImageResponse.text || '[No text content found in response]';
        console.error(`[Compose Flow] AI text response was: "${textResponse}"`);
        throw new Error('Could not compose final image. AI response did not contain media.');
      }

      console.log('[Compose Flow] SUCCESS: Final image composed.');

      return finalImagePart;
    } catch (error: any) {
      console.error("[Compose Flow Error]", error);
      throw new Error(`AI Composition Flow Failed: ${error.message}`);
    }
  }
);
