'use server';

import { ai } from '@/ai/genkit';
import { getTagPool, saveNewTags, type SmartTagResult, type TagPool } from './tag-learning';

export interface ProductData {
  name: string;
  description: string;
  scent?: string;
  price?: string;
  tags?: string;
}

export async function generateSmartTags(productData: ProductData): Promise<SmartTagResult> {
  try {
    const tagPool = await getTagPool();
    
    // Create a comprehensive prompt for the AI
    const prompt = `
You are a tag expert for "Three Chicks and a Wick" candle brand. Your job is to create 5 SEO-friendly, brand-aligned tags for a new candle product.

EXISTING TAG POOL:
${JSON.stringify(tagPool.existing_tags, null, 2)}

PRODUCT TO TAG:
- Name: "${productData.name}"
- Description: "${productData.description}"
- Scent: "${productData.scent || 'Not specified'}"
- Current Tags: "${productData.tags || 'None'}"

BRAND GUIDELINES:
- Focus on scent families, materials, occasions, moods, seasons, and brand values
- Tags should be SEO-friendly (lowercase, hyphenated, descriptive)
- Avoid generic terms like "candle" or "wax"
- Be specific and evocative
- Consider the target customer and use cases

TASK:
1. Select 0-5 relevant tags from the existing pool that match this product
2. Generate 2-5 new tags to reach exactly 5 total tags
3. New tags should be unique, brand-aligned, and SEO-friendly
4. Prioritize tags that will help customers find this product

RESPONSE FORMAT (JSON only, no other text):
{
  "selected_existing": ["tag1", "tag2"],
  "new_tags": ["newtag1", "newtag2", "newtag3"],
  "final_tags": ["tag1", "tag2", "newtag1", "newtag2", "newtag3"],
  "reasoning": "Selected floral and soy-wax because the description mentions lavender and premium materials. Added spa-night and zen because it's described as calming and luxurious."
}
`;

    console.log('[AI Tag Generator] Generating smart tags for:', productData.name);
    
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const content = response.text();
    console.log('[AI Tag Generator] Raw response:', content);

    // Parse the JSON response
    let result: SmartTagResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[AI Tag Generator] JSON parse error:', parseError);
      console.error('[AI Tag Generator] Raw content:', content);
      
      // Fallback: create basic tags
      result = {
        selected_existing: ['handmade', 'premium'],
        new_tags: ['luxury-candle', 'artisanal', 'premium-wax'],
        final_tags: ['handmade', 'premium', 'luxury-candle', 'artisanal', 'premium-wax'],
        reasoning: 'Fallback tags due to parsing error'
      };
    }

    // Validate the result
    if (!result.final_tags || result.final_tags.length !== 5) {
      console.warn('[AI Tag Generator] Invalid tag count, adjusting...');
      result.final_tags = result.final_tags?.slice(0, 5) || ['handmade', 'premium', 'luxury-candle', 'artisanal', 'premium-wax'];
    }

    // Save new tags to the pool
    if (result.new_tags && result.new_tags.length > 0) {
      await saveNewTags(result.new_tags, 'auto_generated');
      console.log('[AI Tag Generator] Saved new tags:', result.new_tags);
    }

    console.log('[AI Tag Generator] Final result:', result);
    return result;

  } catch (error) {
    console.error('[AI Tag Generator] Error:', error);
    
    // Fallback result
    return {
      selected_existing: ['handmade', 'premium'],
      new_tags: ['luxury-candle', 'artisanal', 'premium-wax'],
      final_tags: ['handmade', 'premium', 'luxury-candle', 'artisanal', 'premium-wax'],
      reasoning: 'Fallback tags due to error'
    };
  }
}

export async function getTagSuggestions(partialInput: string): Promise<string[]> {
  try {
    const tagPool = await getTagPool();
    const allTags = Object.values(tagPool.existing_tags).flat();
    
    // Filter tags that match the partial input
    const suggestions = allTags
      .filter(tag => tag.toLowerCase().includes(partialInput.toLowerCase()))
      .sort((a, b) => {
        // Sort by usage count (most used first)
        const countA = tagPool.usage_count[a] || 0;
        const countB = tagPool.usage_count[b] || 0;
        return countB - countA;
      })
      .slice(0, 10); // Return top 10 suggestions
    
    return suggestions;
  } catch (error) {
    console.error('Error getting tag suggestions:', error);
    return [];
  }
}
