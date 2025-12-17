'use server';

import 'server-only';
import { fetchShopify } from '@/services/shopify';

/**
 * Bulk update Magic Request variant pricing
 * 
 * This is called from the Admin Panel when pricing configuration changes.
 * It updates Shopify variant prices to prevent cart manipulation.
 * 
 * Note: This is a LOCAL admin panel action. The actual bulk update logic
 * should also be implemented in the Storefront backend (Lambda) to trigger
 * automatically when AppSync config mutations are called.
 */

interface BulkPricingUpdate {
  productId: string;
  variantId: string;
  price: string;
}

const PRODUCT_VARIANTS_BULK_UPDATE = `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
        title
      }
      productVariants {
        id
        title
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_CUSTOM_CANDLE_PRODUCTS = `
  query GetCustomCandleProducts {
    products(first: 10, query: "title:Custom Candle") {
      edges {
        node {
          id
          title
          handle
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function bulkUpdateMagicRequestPricing(
  pricingConfig: {
    waxPricing: Record<string, { pricePerOz: number }>;
    wickPricing: Record<string, { price: number }>;
    jarPricing: Record<string, { price: number }>;
  }
) {
  try {
    console.log('[Bulk Pricing Update] Starting...');
    
    // 1. Get all custom candle products
    const response = await fetchShopify<any>(GET_CUSTOM_CANDLE_PRODUCTS, {});
    const products = response.products.edges.map((e: any) => e.node);
    
    console.log(`[Bulk Pricing Update] Found ${products.length} custom candle products`);
    
    // 2. Group updates by product
    const updatesByProduct: Record<string, BulkPricingUpdate[]> = {};
    let totalVariantsUpdated = 0;
    
    for (const product of products) {
      // Determine size from product title
      const sizeMatch = product.title.match(/(\d+)oz/i);
      if (!sizeMatch) {
        console.warn(`[Bulk Pricing Update] Could not determine size for ${product.title}`);
        continue;
      }
      const sizeOz = parseInt(sizeMatch[1]);
      
      const variants = product.variants.edges.map((e: any) => e.node);
      updatesByProduct[product.id] = [];
      
      for (const variant of variants) {
        // Extract options
        const options = variant.selectedOptions.reduce((acc: any, opt: any) => {
          acc[opt.name] = opt.value;
          return acc;
        }, {});
        
        const wick = options['Wick'] || options['Wick Type'];
        const jar = options['Jar'] || options['Jar Type'];
        const wax = options['Wax Type'] || options['Wax'];
        
        if (!wax || !wick || !jar) {
          console.warn(`[Bulk Pricing Update] Variant ${variant.id} missing options`, options);
          continue;
        }
        
        // Calculate new price
        const waxPerOz = pricingConfig.waxPricing[wax]?.pricePerOz || 0;
        const basePrice = waxPerOz * sizeOz;
        const wickPrice = pricingConfig.wickPricing[wick]?.price || 0;
        const jarPrice = pricingConfig.jarPricing[jar]?.price || 0;
        const finalPrice = basePrice + wickPrice + jarPrice;
        
        updatesByProduct[product.id].push({
          productId: product.id,
          variantId: variant.id,
          price: finalPrice.toFixed(2),
        });
        
        totalVariantsUpdated++;
      }
    }
    
    console.log(`[Bulk Pricing Update] Updating ${totalVariantsUpdated} variants across ${Object.keys(updatesByProduct).length} products`);
    
    // 3. Execute bulk updates (one API call per product)
    const results = await Promise.all(
      Object.entries(updatesByProduct).map(async ([productId, updates]) => {
        const variants = updates.map(u => ({
          id: u.variantId,
          price: u.price,
        }));
        
        console.log(`[Bulk Pricing Update] Updating ${variants.length} variants for product ${productId}`);
        
        const result = await fetchShopify<any>(PRODUCT_VARIANTS_BULK_UPDATE, {
          productId,
          variants,
        });
        
        if (result.productVariantsBulkUpdate.userErrors?.length > 0) {
          console.error('[Bulk Pricing Update] Errors:', result.productVariantsBulkUpdate.userErrors);
          throw new Error(result.productVariantsBulkUpdate.userErrors.map((e: any) => e.message).join(', '));
        }
        
        return result.productVariantsBulkUpdate;
      })
    );
    
    console.log(`[Bulk Pricing Update] Complete! Updated ${totalVariantsUpdated} variants in ${results.length} API calls`);
    
    return {
      success: true,
      variantsUpdated: totalVariantsUpdated,
      apiCalls: results.length,
    };
    
  } catch (error) {
    console.error('[Bulk Pricing Update] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update pricing',
    };
  }
}

