
'use server';
/**
 * @fileOverview Analyzes business data to generate strategic recommendations.
 *
 * - generateBusinessStrategy - A function that handles the strategy generation process.
 * - BusinessSnapshot - The input type for the generateBusinessStrategy function.
 * - StrategyOutput - The return type for the generateBusinessStrategy function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ShopifyOrder, ShopifyProduct } from '@/services/shopify';

// We define the input schema based on the data we get from Shopify
const ProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    totalInventory: z.number().nullable(),
    priceRange: z.object({
        minVariantPrice: z.object({
            amount: z.string(),
            currencyCode: z.string(),
        })
    }),
});

const OrderSchema = z.object({
    id: z.string(),
    processedAt: z.string(),
    totalPriceSet: z.object({
        shopMoney: z.object({
            amount: z.string(),
            currencyCode: z.string(),
        })
    }),
    lineItems: z.object({
        edges: z.array(z.object({
            node: z.object({
                quantity: z.number(),
                product: z.object({
                    id: z.string().nullable(),
                }).nullable(),
            })
        }))
    })
});


const BusinessSnapshotSchema = z.object({
  products: z.array(ProductSchema),
  orders: z.array(OrderSchema),
});
export type BusinessSnapshot = z.infer<typeof BusinessSnapshotSchema>;


const StrategyOutputSchema = z.object({
  pricing_recommendations: z.array(z.string()).describe("Suggestions for pricing adjustments, bundles, or discounts."),
  marketing_suggestions: z.array(z.string()).describe("Ideas for marketing campaigns, content, or promotions based on popular products."),
  inventory_alerts: z.array(z.string()).describe("Warnings about products that are low in stock and selling well."),
});
export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;


export async function generateBusinessStrategy(input: BusinessSnapshot): Promise<StrategyOutput> {
  return generateBusinessStrategyFlow(input);
}


const strategyGenerationPrompt = ai.definePrompt({
    name: 'strategyGenerationPrompt',
    input: { schema: BusinessSnapshotSchema },
    output: { schema: StrategyOutputSchema },
    prompt: `
        You are a business consultant for a small candle company called "Three Chicks and a Wick".
        Analyze the following business data and provide actionable recommendations.

        **Business Data:**

        **Products:**
        \`\`\`json
        {{{json products}}}
        \`\`\`

        **Recent Orders:**
        \`\`\`json
        {{{json orders}}}
        \`\`\`

        ---

        **Your Task:**

        Based on the data provided, generate a list of recommendations for each of the following categories:

        1.  **Pricing Recommendations:**
            *   Identify opportunities for product bundles (e.g., "The 'Fresh Linen' candle is popular. Suggest bundling it with the 'Ocean Breeze' wax melt for a 'Fresh Home' package.").
            *   Suggest discounts on less popular items to clear stock.
            *   Look at product prices and suggest if any seem too low or too high based on sales volume.

        2.  **Marketing Suggestions:**
            *   Identify top-selling products and suggest marketing campaigns around them (e.g., "Your 'Vanilla Bean' candle is a top seller. Recommend a social media campaign featuring customer reviews for this product.").
            *   Suggest content ideas based on product themes (e.g., "Create a blog post on 'The Perfect Scents for a Cozy Night In' featuring your lavender and sandalwood candles.").

        3.  **Inventory Alerts:**
            *   Cross-reference product sales from the orders with product inventory levels.
            *   If a popular product has low inventory (e.g., less than 10 units), create an alert (e.g., "Warning: 'Vanilla Bean' is selling fast and has only 5 units left. Recommend restocking soon.").
            *   If there are no urgent inventory issues, state that all inventory levels are healthy.

        Present your output in the format requested. Be concise and provide concrete, actionable advice.
    `,
});


const generateBusinessStrategyFlow = ai.defineFlow(
  {
    name: 'generateBusinessStrategyFlow',
    inputSchema: BusinessSnapshotSchema,
    outputSchema: StrategyOutputSchema,
  },
  async (input) => {
    const { output } = await strategyGenerationPrompt(input);
    if (!output) {
        throw new Error('The AI failed to generate a strategy.');
    }
    return output;
  }
);
