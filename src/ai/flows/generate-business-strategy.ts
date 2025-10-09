
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
  async (businessSnapshot) => {
    const prompt = `You are a business strategy consultant analyzing an e-commerce store's performance.

Business Data:
- Total Revenue: $${businessSnapshot.total_revenue?.toFixed(2) || '0.00'}
- Total Orders: ${businessSnapshot.orders?.length || 0}
- Average Order Value: $${businessSnapshot.average_order_value?.toFixed(2) || '0.00'}
- Total Products: ${businessSnapshot.products?.length || 0}
- Low Stock Products: ${businessSnapshot.low_stock_products?.length || 0}

Recent Sales Trends:
${businessSnapshot.sales_by_day ? JSON.stringify(businessSnapshot.sales_by_day, null, 2) : 'No recent sales data'}

Top Selling Products:
${businessSnapshot.top_products?.map((p: any, i: number) => `${i + 1}. ${p.title} (${p.sales} sales)`).join('\n') || 'No product data'}

Generate actionable business recommendations in JSON format with these categories:
{
  "pricing_recommendations": [list of 3-5 pricing strategy recommendations],
  "marketing_suggestions": [list of 3-5 marketing ideas to increase sales],
  "inventory_alerts": [list of inventory concerns or optimizations]
}

Focus on specific, actionable advice based on the data. Be concise and practical.`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.0-flash-exp',
      config: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        responseFormat: 'json',
      },
    });

    return llmResponse.text;
  }
);

// Export alias for compatibility
export const generateBusinessStrategy = generateBusinessStrategyFlow;
